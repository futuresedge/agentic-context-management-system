// roster.get — Return a single agent_class entity by role_id.
//
// Permitted roles (9): agent-creation-orchestrator, agent-request-handler,
//   agent-problem-analyst, agent-specification-author, agent-registry-updater,
//   agent-retirement-coordinator, dlm-sysadmin, agent-behaviour-analyst,
//   system-orchestrator.
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

const RosterGetSchema = z.object({
  /** role_id of the agent class to retrieve. */
  role_id: z.string().min(1, 'role_id is required'),
  /** Calling agent's role slug — validated by the MCP Gateway. */
  agent_role: z.string().min(1, 'agent_role is required'),
});

export type RosterGetInput = z.infer<typeof RosterGetSchema>;

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const ROSTER_GET_TOOL: Tool = {
  name: 'roster.get',
  description:
    'Return a single agent_class entity from the TypeDB roster by role_id. ' +
    'Returns all lifecycle attributes including agent_status, instruction_path, and spec_doc_id. ' +
    'Available to 9 named roles only — not all registered agents.',
  inputSchema: {
    type: 'object',
    properties: {
      role_id: {
        type: 'string',
        description: 'The role_id of the agent class to retrieve.',
      },
      agent_role: {
        type: 'string',
        description: 'The calling agent\'s role slug (used by the MCP Gateway for access control).',
      },
    },
    required: ['role_id', 'agent_role'],
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleRosterGet(raw: unknown): Promise<CallToolResult> {
  // 1. Zod validation — reject malformed input before hitting the gateway.
  const input = RosterGetSchema.parse(raw);

  // 2. Gateway access check — throws ToolAccessDeniedError + appends
  //    tool_access_denied audit event if agent_role is not in permitted list.
  checkToolAccess('roster.get', input.agent_role);

  // 3. Read transaction — no TypeDB write; no audit event required for reads.
  const agentClass = await readTransaction(async (tx) => {
    // TypeQL: match a single agent_class by its @key attribute.
    // All owned attributes are fetched via the fetch keyword in TypeDB 3.x.
    const query = `
      match
        $a isa agent_class,
          has role_id "${escapeTypeQL(input.role_id)}";
      fetch
        $a: role_id, tier, tool_list_json,
            tier_label, agent_status, agent_description,
            spec_doc_id, instruction_path,
            agent_created_at, agent_created_by,
            agent_retired_at, agent_retired_by;
    `;
    // TODO: when client.ts readTransaction is implemented, tx.query.fetch(query)
    // returns an async stream of ConceptMap objects. Collect the first result.
    const results = await tx.query.fetch(query).collect();
    return results[0] ?? null;
  });

  if (!agentClass) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ found: false, role_id: input.role_id }) }],
      isError: true,
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify({ found: true, agent_class: agentClass }) }],
  };
}

// ---------------------------------------------------------------------------
// Utility: prevent TypeQL injection by rejecting characters outside the safe set.
// role_id values are kebab-case slugs — only a-z, 0-9, and hyphens are valid.
// ---------------------------------------------------------------------------

function escapeTypeQL(value: string): string {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error(`Invalid role_id format: "${value}" — only lowercase alphanumeric and hyphens permitted`);
  }
  return value;
}
