# Nexus Audit Trail

**Bootstrap substitute for TypeDB `audit_event` entities.**  
**Migrated to TypeDB:** Phase 1 complete — import-corpus.ts run.  
**Governed by:** ETR-001 (dlms/registry/event-type-registry.md)  
**Format:** Append-only. One entry per event. Never delete or edit existing entries.

All `event_type` values must be registered in ETR-001 before use.  
All `actor_id` values must match a registered agent role in TAR-001.

---

## Schema

Each entry:

```
event_id:       AUDIT-{YYYY}-{NNNN}   # sequential, zero-padded
event_type:     {slug from ETR-001}
actor_id:       {agent:{role} | system:{component} | seed:{source} | human:{identifier}}
target_id:      {phase_id | doc_id | artefact_id | tool_name}
target_version: {semver | null}
timestamp:      ISO-8601+TZ
payload:        {inline YAML or null}
```

---

## Entries

<!-- Append new entries below this line. Do not edit entries above. -->
