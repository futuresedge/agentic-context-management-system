// roster.retire — Set an agent_class entity to status: retired and record the
// retirement timestamp and actor. This is a terminal operation.
//
// Permitted roles (1): agent-retirement-coordinator only.
// See tool-access-registry.md § Agent Creation & Lifecycle — Tier 15B.
//
// Critical assertion (DLMS-2026-0110 R01):
//   When the retiring agent has tier ≤ 14, sysadmin_approval_artefact_id MUST
//   be non-null. The handler asserts this before calling writeTransaction.
//   This is the last gate before a Tier 1–14 retirement becomes irreversible.
//
// Pattern: zod parse → checkToolAccess → tier ≤ 14 assertion → readTransaction
//          (verify target exists + is active) → atomic writeTransaction +
//          appendAuditEvent(agent_retired)

import { z } from 'zod';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { checkToolAccess } from '../shared/gateway.js';
import { readTransaction, writeTransaction } from '../../db/client.js';
import { appendAuditEvent } from '../shared/audit.js';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const RosterRetireSchema = z.object({
  /** Calling agent's role slug — must be "agent-retirement-coordinator". */
  agent_role: z.string().min(1, 'agent_role is required'),
  /** actor_id in agentcreation: namespace format. */
  actor_id: z.string().regex(
    /^agentcreation:[a-z0-9-]+$/,
    'actor_id must be in agentcreation:{role-slug} format',
  ),
  /** role_id of the agent class to retire. */
  role_id: z.string().regex(
    /^[a-z0-9-]+$/,
    'role_id must be kebab-case: only lowercase alphanumeric and hyphens',
  ),
  /**
   * Audit event ID of the SysAdmin approval artefact.
   * REQUIRED when the retiring agent's tier is ≤ 14 (DLMS-2026-0110 R01).
   * MAY be null for Tier 15B self-governed retirements.
   * The handler validates the tier from TypeDB and asserts non-null when needed.
   */
  sysadmin_approval_artefact_id: z.string().nullable(),
  /**
   * Path where the instruction file has been archived.
   * Convention: .github/agents/retired/{role_id}.agent.md (DLMS-2026-0110 R07).
   * Provided by the agent-retirement-coordinator after archival.
   */
  archived_instruction_path: z.string().min(1),
});

export type RosterRetireInput = z.infer<typeof RosterRetireSchema>;

// ---------------------------------------------------------------------------
// Tool definition (for ListTools response)
// ---------------------------------------------------------------------------

export const ROSTER_RETIRE_TOOL: Tool = {
  name: 'roster.retire',
  description:
    'Set an agent_class entity to status: retired. Terminal operation — irreversible. ' +
    'For agents with tier ≤ 14: sysadmin_approval_artefact_id must be non-null. ' +
    'Permitted to agent-retirement-coordinator only. ' +
    'Atomic: status update and agent_retired audit event share one transaction.',
  inputSchema: {
    type: 'object',
    properties: {
      agent_role: { type: 'string', description: 'Calling agent role (must be agent-retirement-coordinator).' },
      actor_id: { type: 'string', description: 'Actor ID in agentcreation:{role-slug} format.' },
      role_id: { type: 'string', description: 'role_id of the agent class to retire.' },
      sysadmin_approval_artefact_id: {
        type: ['string', 'null'],
        description:
          'Audit event ID of the SysAdmin approval. Required (non-null) when retiring an agent with tier ≤ 14.',
      },
      archived_instruction_path: {
        type: 'string',
        description: 'Path where the instruction file has been archived (.github/agents/retired/{role_id}.agent.md).',
      },
    },
    required: ['agent_role', 'actor_id', 'role_id', 'sysadmin_approval_artefact_id', 'archived_instruction_path'],
  },
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleRosterRetire(raw: unknown): Promise<CallToolResult> {
  // 1. Zod validation.
  const input = RosterRetireSchema.parse(raw);

  // 2. Gateway access check — only agent-retirement-coordinator may call roster.retire.
  checkToolAccess('roster.retire', input.agent_role);

  // 3. Read the current agent_class to verify it exists, is active, and get its tier.
  //    This is a pre-write guard — we never attempt to retire an agent that is already
  //    retired or does not exist.
  const current = await readTransaction(async (tx) => {
    const query = `
      match
        $a isa agent_class,
          has role_id "${input.role_id}",
          has tier $t,
          has agent_status $s;
      fetch $a: tier, agent_status;
    `;
    const results = await tx.query.fetch(query).collect();
    return results[0] ?? null;
  });

  if (!current) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            role_id: input.role_id,
            error: `agent_class "${input.role_id}" not found in roster`,
          }),
        },
      ],
    };
  }

  const currentTier: number = current['$a']['tier'][0]['value'];
  const currentStatus: string = current['$a']['agent_status'][0]['value'];

  // Guard: do not retire an already-retired agent (DLMS-2026-0110 R05).
  if (currentStatus === 'retired') {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            role_id: input.role_id,
            error: `agent_class "${input.role_id}" is already retired. Retired status is terminal.`,
          }),
        },
      ],
    };
  }

  // 4. CRITICAL assertion — DLMS-2026-0110 R01.
  //    Tier 1–14 retirements require SysAdmin approval artefact.
  //    This is the last gate before the irreversible write.
  if (currentTier <= 14 && !input.sysadmin_approval_artefact_id) {
    throw new Error(
      `DLMS-2026-0110 R01 violation: retiring agent "${input.role_id}" (tier ${currentTier}) ` +
      `requires a non-null sysadmin_approval_artefact_id. ` +
      `Obtain SysAdmin approval before calling roster.retire.`,
    );
  }

  // 5. Atomic write transaction — update agent_status + set retirement metadata +
  //    appendAuditEvent(agent_retired) — all in one transaction.
  //    Both roll back on failure; an audit gap is structurally impossible.
  const now = new Date().toISOString();

  const result = await writeTransaction(async (tx) => {
    // TypeQL: update the agent_status attribute and add retirement metadata.
    // TypeDB 3.x does not have a native UPDATE — pattern is delete old value
    // then insert new value in the same transaction.
    const updateQuery = `
      match
        $a isa agent_class,
          has role_id "${input.role_id}",
          has agent_status $old_status;
      delete $a has agent_status $old_status;
      insert $a has agent_status "retired",
             has agent_retired_at ${now},
             has agent_retired_by "${escapeString(input.actor_id)}",
             has instruction_path "${escapeString(input.archived_instruction_path)}";
    `;
    await tx.query.update(updateQuery);

    // Append agent_retired audit event in the same transaction.
    const event = await appendAuditEvent(tx, {
      event_type: 'agent_retired',
      actor_id: input.actor_id,
      target_id: input.role_id,
      target_version: '',
      payload: {
        tier: currentTier,
        sysadmin_approval_artefact_id: input.sysadmin_approval_artefact_id,
        archived_instruction_path: input.archived_instruction_path,
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
          message:
            `Agent class "${result.role_id}" set to retired. ` +
            `agent_retired event recorded. This operation is irreversible.`,
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
