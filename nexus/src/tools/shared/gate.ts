// Phase 2.5 — Stage gate helpers
// Two gate functions covering the two artefact stores:
//
//   assertStageArtefactExists — document pipeline (stage_artefact, keyed by doc_id)
//   assertAgentArtefactExists — agent creation pipeline (agent_artefact, keyed by role_id)
//
// Both throw their respective error class and are called inside tool handlers
// before any write executes. Gate failures are not audited — they never reach
// the write transaction.

// ---------------------------------------------------------------------------
// Document pipeline gate (stage_artefact)
// ---------------------------------------------------------------------------

// TODO: Implement after TypeDB schema and stage_artefact entities are populated.
//
// assertStageArtefactExists(stage, docId, artefactType):
//   - Queries TypeDB for stage_artefact with matching doc_id, stage, artefact_type
//   - Throws StageGateError if not found
//   - Called inside submitVerification handlers for each stage (Phases 6.1–6.6)

export class StageGateError extends Error {
  constructor(
    public readonly stage: string,
    public readonly docId: string,
    public readonly missingArtefact: string
  ) {
    super(`Stage gate failed at ${stage} for ${docId}: missing ${missingArtefact}`);
    this.name = 'StageGateError';
  }
}

// assertStageArtefactExists(stage: string, docId: string, artefactType: string): Promise<void>

// ---------------------------------------------------------------------------
// Agent creation pipeline gate (agent_artefact)
// ---------------------------------------------------------------------------

// TODO: Implement after Phase 2 (MCP core) and Phase A schema migration are complete.
//
// assertAgentArtefactExists(roleId, artefactType):
//   - Queries TypeDB for agent_artefact with matching role_id and artefact_type
//   - Returns the most recently created match (ordered by created_at desc, limit 1)
//   - Throws AgentGateError if not found
//   - Optionally accepts a required `result` field value to assert content-level gates
//     (e.g. assertAgentArtefactExists('my-agent', 'agent-spec-review', { result: 'PASS' }))
//
// Controlled artefact_type values — see schema.tql § agent_artefact comment block
// and .github/skills/agent-creation-patterns/SKILL.md § ARTEFACT_CONTENT_SCHEMAS.

export class AgentGateError extends Error {
  constructor(
    public readonly roleId: string,
    public readonly missingArtefact: string,
    public readonly constraint?: string
  ) {
    const detail = constraint ? ` (required: ${constraint})` : '';
    super(`Agent gate failed for ${roleId}: missing ${missingArtefact}${detail}`);
    this.name = 'AgentGateError';
  }
}

// assertAgentArtefactExists(
//   roleId: string,
//   artefactType: string,
//   requiredContent?: Record<string, unknown>
// ): Promise<void>

export {};
