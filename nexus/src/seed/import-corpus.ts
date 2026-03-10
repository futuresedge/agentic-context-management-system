// Phase 1.3 — Corpus importer (run once)
// TODO: Implement after schema.tql and parse-frontmatter.ts are complete.
//
// Input:  dlms/corpus/**/*.md (103 files across policies/, templates/, dod-templates/, guides/)
// Output: TypeDB populated with 103 document entities, dependency relations, 103 audit events
//
// Logic:
//   - Walk 4 corpus directories
//   - Call parseFrontmatter() per file
//   - Bulk-insert document entities in TypeDB (batch 10 per transaction)
//   - Insert dependency relations from each document's dependencies block
//   - Insert audit_event per document: { event_type: document_imported, actor_id: seed:import-corpus }
//
// Run via: pnpm seed

export {};
