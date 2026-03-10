// Phase 2.3 — Audit helper (build before any tool handler)
// TODO: Implement using TypeDB write transaction shared with the business write.
//
// CRITICAL: appendAuditEvent() and the business write share ONE transaction.
//           If either fails, both roll back. An audit gap is not possible.
//
// Input:  { event_type, actor_id, target_id, target_version?, payload? }
// Output: Inserts audit_event entity in TypeDB; returns { event_id, timestamp }
//
// event_type values must match the Event Type Registry (dlms/registry/event-type-registry.md)

export {};
