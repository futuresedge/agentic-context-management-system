# Nexus Knowledge Base

**Bootstrap substitute for TypeDB `knowledge_entry` entities.**  
**Migrated to TypeDB:** Phase 1 complete — import-corpus.ts run.  
**Governed by:** DLMS-2026-0105 (Infra Knowledge Curator role)  
**Write access:** `infra-knowledge-curator` only (via `knowledge.writeEntry` — bootstrap: direct append)

---

## Schema

Each entry:

```
entry_id:       KB-INFRA-{YYYY}-{NNNN}   # sequential, zero-padded
subject_stage:  phase-{N} | maintenance
subject_area:   {TypeDB | MCP | gateway | audit | gate | schema | registry | general}
insight:        {concise statement of the learning — one paragraph max}
pattern:        {optional — reusable pattern extracted from the insight}
recommendation: {optional — what future agents should do differently}
confidence:     high | medium | low
source_artefact: {path to infra-learnings-*.md that produced this entry}
created_at:     ISO-8601+TZ
created_by:     {agent:infra-knowledge-curator | bootstrap:design-team}
```

---

## Entries

<!-- Append new entries below this line. Do not edit entries above. -->
