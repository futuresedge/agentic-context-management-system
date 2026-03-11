# Infra Routing Instructions — Phase 0

**work_item_id:** INFRA-2026-0001  
**phase_id:** phase-0  
**phase_title:** Repository Foundation  
**timestamp:** 2026-03-10T14:00:00+11:00  
**issued_by:** nexus-infra-orchestrator  
**invoker:** human:FO

---

## Routing Decision

| Field | Value |
|---|---|
| `phase_id` | phase-0 |
| `impact_class` | RC-standard |
| `pipeline_variant` | standard |
| `status` | in-progress |

**Routing source:** nexus/.infra/infra-routing-registry.md row phase-0 — was `not-started`, transition to `in-progress` authorised.

**Invoker authorisation check:** PASS (actor: human:FO)

**Phase-0 pre-check:** All prerequisites satisfied — none declared for phase-0.

---

## Pipeline Sequence

```
STEP_01  Infra Context Curator    → infra-context-phase-0.md
STEP_02  Infra Planner            → infra-plan-phase-0.md
STEP_03  Infra DoD Agent          → infra-dod-phase-0.md   [RC-standard: single author]
STEP_04  Infra Executor           → TAR-001 v0.3.1 patch
PARALLEL Infra Code Reviewer      → infra-code-review-phase-0.md
         Infra Architecture Reviewer → infra-arch-review-phase-0.md
STEP_05  Infra Verifier           → infra-verification-phase-0.md + infra-learnings-phase-0.md
POST     Infra Metrics Agent      → infra-metrics-phase-0.md
         Infra Knowledge Curator  → KB entries (TypeDB-backed)
```

---

## Notes

Phase-0 is the bootstrap validation phase. Most outputs already exist from pre-agent
bootstrap work. The Executor's primary task is to remediate any gaps found by the Planner
during preparation — specifically gaps between DLMS-2026-0105 tool assignments and
TAR-001 permitted role declarations.
