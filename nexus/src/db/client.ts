// Phase 2.2 — TypeDB client
// TODO: Implement session manager with readTransaction() / writeTransaction() helpers.
//
// Key constraints:
//   - TYPEDB_URL env var (default: localhost:1729)
//   - writeTransaction() must be used for all writes + audit appends in a shared transaction
//   - If either the business write or appendAuditEvent() fails, both roll back
//   - No TypeQL delete permitted from tool handlers (enforced here)

export {};
