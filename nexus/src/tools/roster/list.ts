// roster.list — Return an array of agent_class entities, with optional filters.
//
// Permitted roles (9): same as roster.get.
// See tool-access-registry.md § Agent Creation & Lifecycle — Tier 15B.
//
// Pattern: zod parse → checkToolAccess → readTransaction → TypeQL get → return

import { z } from 'zod';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { checkToolAccess } from '../shared/gateway.js';
import { readTransaction } from '../../db/client.js';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const RosterListSchema = z.object({
  /** Calling agent's role slug — validated by the MCP Gateway. */
  agent_role: z.string().min(1, 'agent_role is required'),
  /** Optional: filter by tier integer. */
  tier: z.number().int().positive().optional(),
  /** Optional: filter by tier_label string (e.g. "15B", "13"). */
  tier_label: z.string().optional(),
  /** Optional: filter by lifecycle status. */
  agent_status: z.enum(['proposed', 'approved', 'active', 'retired']).optional(),
});

export type RosterListInput = z.infer<typeof RosterListSchema>;

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const ROSTER_LIST_TOOL: Tool = {
  name: 'roster.list',
  description:
    'Return an array of agent_class entities from the TypeDB roster. ' +
    'Supports optional filtering by tier (integer), tier_label (string), or agent_status. ' +
    'Available to 9 named roles only — not all registered agents.',
  inputSchema: {
    type: 'object',
    properties: {
      agent_role: {
        type: 'string',
        description: 'The calling agent\'s role slug (used by the MCP Gateway for access control).',
      },
      tier: {
        type: 'integer',
        description: 'Filter results to agent classes at this tier number.',
      },
      tier_label: {
        type: 'string',
        description: 'Filter results to agent classes with this tier_label (e.g. "15B", "13").',
      },
      agent_status: {
        type: 'string',
        enum: ['proposed', 'approved', 'active', 'retired'],
        description: 'Filter results to agent classes with this lifecycle status.',
      },
    },
    required: ['agent_role'],
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleRosterList(raw: unknown): Promise<CallToolResult> {
  // 1. Zod validation.
  const input = RosterListSchema.parse(raw);

  // 2. Gateway access check.
  checkToolAccess('roster.list', input.agent_role);

  // 3. Read transaction — build a TypeQL query with optional filter clauses.
  const agentClasses = await readTransaction(async (tx) => {
    // Build filter constraints dynamically. Only add clauses for supplied filters.
    const filters: string[] = [];

    if (input.tier !== undefined) {
      filters.push(`$a has tier ${input.tier};`);
    }
    if (input.tier_label !== undefined) {
      filters.push(`$a has tier_label "${escapeStringTypeQL(input.tier_label)}";`);
    }
    if (input.agent_status !== undefined) {
      // agent_status is validated by zod to a closed enum — safe to inline.
      filters.push(`$a has agent_status "${input.agent_status}";`);
    }

    const filterClause = filters.length > 0 ? filters.join('\n        ') : '';

    const query = `
      match
        $a isa agent_class;
        ${filterClause}
      fetch
        $a: role_id, tier, tool_list_json,
            tier_label, agent_status, agent_description,
            spec_doc_id, instruction_path,
            agent_created_at, agent_created_by,
            agent_retired_at, agent_retired_by;
    `;
    // TODO: when client.ts readTransaction is implemented, tx.query.fetch(query)
    // returns an async stream. Collect all results.
    return tx.query.fetch(query).collect();
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ count: agentClasses.length, agent_classes: agentClasses }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Utility: reject characters that could inject into TypeQL string literals.
// Used for tier_label only — tier (integer) and agent_status (closed enum)
// are safe without this check.
// ---------------------------------------------------------------------------

function escapeStringTypeQL(value: string): string {
  // Disallow backslash and double-quote to prevent TypeQL string injection.
  if (/[\\"]/.test(value)) {
    throw new Error(`Invalid filter value: "${value}" contains disallowed characters`);
  }
  return value;
}
