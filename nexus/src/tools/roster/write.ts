// roster.write — Insert or update an agent_class entity in the TypeDB roster.
//
// Permitted roles (1): agent-registry-updater only.
// See tool-access-registry.md § Agent Creation & Lifecycle — Tier 15B.
//
// This tool is called internally by agentcreation.updateRegistry — it must not
// be called directly outside of that workflow context. The gateway check enforces
// the single-role constraint; additional workflow context enforcement is noted in
// the scope_constraint of the tool-access-registry entry.
//
// Pattern: zod parse → checkToolAccess → atomic writeTransaction + appendAuditEvent
// Audit event: agent_deployed (event_type from event-type-registry.md)

import { z } from 'zod';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { checkToolAccess } from '../shared/gateway.js';
import { writeTransaction } from '../../db/client.js';
import { appendAuditEvent } from '../shared/audit.js';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const RosterWriteSchema = z.object({
  /** Calling agent's role slug — must be "agent-registry-updater". */
  agent_role: z.string().min(1, 'agent_role is required'),
  /** actor_id in agentcreation: namespace format. */
  actor_id: z.string().regex(
    /^agentcreation:[a-z0-9-]+$/,
    'actor_id must be in agentcreation:{role-slug} format',
  ),
  /** The approval_artefact_id from the originating agent request (DLMS-2026-0112). */
  approval_artefact_id: z.string().min(1, 'approval_artefact_id is required'),

  // --- Core agent_class fields ---
  role_id: z.string().regex(
    /^[a-z0-9-]+$/,
    'role_id must be kebab-case: only lowercase alphanumeric and hyphens',
  ),
  tier: z.number().int().positive(),
  tier_label: z.string().min(1),
  tool_list_json: z.string().min(2), // JSON array string e.g. '["roster.get"]'
  agent_status: z.enum(['proposed', 'approved', 'active', 'retired']),

  // --- Lifecycle metadata ---
  agent_description: z.string().min(1),
  spec_doc_id: z.string().regex(
    /^DLMS-\d{4}-\d{4}$/,
    'spec_doc_id must match DLMS-YYYY-NNNN format',
  ),
  instruction_path: z.string().min(1),
  agent_created_by: z.string().min(1),

  // --- Optional retirement fields (omitted for active agents) ---
  agent_retired_by: z.string().optional(),
});

export type RosterWriteInput = z.infer<typeof RosterWriteSchema>;

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const ROSTER_WRITE_TOOL: Tool = {
  name: 'roster.write',
  description:
    'Insert or update an agent_class entity in the TypeDB roster. ' +
    'Permitted to agent-registry-updater only. ' +
    'Atomic: roster write and agent_deployed audit event share one transaction.',
  inputSchema: {
    type: 'object',
    properties: {
      agent_role: { type: 'string', description: 'Calling agent role (must be agent-registry-updater).' },
      actor_id: { type: 'string', description: 'Actor ID in agentcreation:{role-slug} format.' },
      approval_artefact_id: { type: 'string', description: 'Audit event ID of the originating approval.' },
      role_id: { type: 'string', description: 'Kebab-case role_id for the new agent class.' },
      tier: { type: 'integer', description: 'Tier integer.' },
      tier_label: { type: 'string', description: 'Tier label string (e.g. "15B").' },
      tool_list_json: { type: 'string', description: 'JSON array of permitted tool names.' },
      agent_status: { type: 'string', enum: ['proposed', 'approved', 'active', 'retired'] },
      agent_description: { type: 'string', description: 'Single-sentence agent description.' },
      spec_doc_id: { type: 'string', description: 'DLMS corpus doc_id for the agent specification.' },
      instruction_path: { type: 'string', description: 'Path to .agent.md instruction file.' },
      agent_created_by: { type: 'string', description: 'actor_id of the creator.' },
      agent_retired_by: { type: 'string', description: 'actor_id of the retiring agent (if applicable).' },
    },
    required: [
      'agent_role', 'actor_id', 'approval_artefact_id',
      'role_id', 'tier', 'tier_label', 'tool_list_json', 'agent_status',
      'agent_description', 'spec_doc_id', 'instruction_path', 'agent_created_by',
    ],
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleRosterWrite(raw: unknown): Promise<CallToolResult> {
  // 1. Zod validation.
  const input = RosterWriteSchema.parse(raw);

  // 2. Gateway access check — only agent-registry-updater may call roster.write.
  checkToolAccess('roster.write', input.agent_role);

  // 3. Validate tool_list_json is parseable JSON array before writing.
  const toolList: unknown = JSON.parse(input.tool_list_json);
  if (!Array.isArray(toolList) || toolList.some((t) => typeof t !== 'string')) {
    throw new Error('tool_list_json must be a JSON array of strings');
  }

  // 4. Atomic write transaction — business write + appendAuditEvent share
  //    one transaction. Both roll back on failure (client.ts constraint).
  const result = await writeTransaction(async (tx) => {
    // TypeQL insert: create the agent_class entity with all provided attributes.
    // TypeDB 3.x: use `insert` to create a new entity.
    // If the role_id already exists (re-registration scenario), `insert` will add
    // a duplicate @key, which TypeDB will reject — callers should use roster.get
    // first to verify the role_id is not already registered.
    const insertQuery = `
      insert $a isa agent_class,
        has role_id "${input.role_id}",
        has tier ${input.tier},
        has tier_label "${escapeString(input.tier_label)}",
        has tool_list_json "${escapeString(input.tool_list_json)}",
        has agent_status "${input.agent_status}",
        has agent_description "${escapeString(input.agent_description)}",
        has spec_doc_id "${input.spec_doc_id}",
        has instruction_path "${escapeString(input.instruction_path)}",
        has agent_created_by "${escapeString(input.agent_created_by)}";
    `;
    await tx.query.insert(insertQuery);

    // Append agent_deployed audit event in the same transaction.
    // Both writes are committed together or both roll back.
    const event = await appendAuditEvent(tx, {
      event_type: 'agent_deployed',
      actor_id: input.actor_id,
      target_id: input.role_id,
      target_version: '1.0.0',
      payload: {
        approval_artefact_id: input.approval_artefact_id,
        tier: input.tier,
        tier_label: input.tier_label,
        spec_doc_id: input.spec_doc_id,
        instruction_path: input.instruction_path,
      },
    });

    return { role_id: input.role_id, event_id: event.event_id };
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          role_id: result.role_id,
          event_id: result.event_id,
          message: `Agent class "${result.role_id}" registered; agent_deployed event recorded.`,
        }),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Utility: prevent TypeQL string injection by escaping backslash and double-quote.
// ---------------------------------------------------------------------------

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
