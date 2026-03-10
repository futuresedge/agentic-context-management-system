// Phase 2.5 — Stage gate helper
// TODO: Implement after TypeDB schema and stage_artefact entities are populated.
//
// assertStageArtefactExists(stage, docId, artefactType):
//   - Queries TypeDB for stage_artefact entity with matching doc_id, stage, artefact_type
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
export {};
