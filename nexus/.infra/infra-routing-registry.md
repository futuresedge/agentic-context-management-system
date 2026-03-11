# Infra Routing Registry

**Registry ID:** IRR-001  
**Version:** 0.2.0  
**Status:** bootstrap  
**Governed by:** DLMS-2026-0104 (Nexus Infrastructure Agent Governance Policy)  
**Consumed by:** Nexus Infrastructure Orchestrator — validates routing decisions, selects pipeline variant, records phase status transitions

---

## Purpose

The Orchestrator reads this file to:
1. Confirm a `phase_id` is a valid routing target (present in this registry)
2. Determine which pipeline variant to use (`standard` or `high-impact`)
3. Check current phase status before accepting a new work item (prevents duplicate execution)
4. Record status transitions as phases progress

Phase definitions, prerequisites, and outputs live in `nexus-phase-manifest.md`.
This file records the **live operational state** — statuses and routing decisions only.

---

## Pipeline Variant Reference

| variant | When used | DoD authorship |
|---|---|---|
| `standard` | RC-standard phases | 1 × Completeness author → canonical DoD direct |
| `high-impact` | RC-high-impact and RC-critical phases | Parallel authors (2 or 3) + Synthesizer → canonical DoD; RC-critical adds human review gate |

---

## Phase Routing Table

| phase_id | impact_class | pipeline_variant | current_status | last_updated | notes |
|---|---|---|---|---|---|
| phase-0 | RC-standard | standard | complete | 2026-03-10 | VERIFIED — TAR-001 v0.3.1 patch; all 18 DoD criteria passed; infra_verified logged |
| phase-1 | RC-high-impact | high-impact | not-started | 2026-03-10 | Requires Docker + TypeDB running (human prerequisite) |
| phase-2 | RC-critical | high-impact | not-started | 2026-03-10 | Security overlay mandatory; human DoD review gate required |
| phase-3 | RC-critical | high-impact | not-started | 2026-03-10 | Security overlay mandatory |
| phase-4 | RC-high-impact | high-impact | not-started | 2026-03-10 | — |
| phase-5 | RC-high-impact | high-impact | not-started | 2026-03-10 | — |
| phase-6 | RC-high-impact | high-impact | not-started | 2026-03-10 | 6 parallel sub-tasks within phase |
| phase-7 | RC-high-impact | high-impact | not-started | 2026-03-10 | Build after phase-6 (real audit events needed) |
| phase-8 | RC-high-impact | high-impact | not-started | 2026-03-10 | — |
| phase-9 | RC-high-impact | high-impact | not-started | 2026-03-10 | Parallel with phases 7–8 |
| phase-10 | RC-critical | high-impact | not-started | 2026-03-10 | Human review gate required; all tools must be final |
| phase-11 | RC-critical | high-impact | not-started | 2026-03-10 | Human review gate required; final self-hosting gate |

---

## Status Values

| status | Meaning |
|---|---|
| `not-started` | No infra_work_item has been accepted for this phase |
| `in-progress` | An active pipeline run exists for this phase (artefacts being produced) |
| `blocked` | Pipeline halted at a gate failure; requires remediation before resuming |
| `complete` | Infra Verifier issued VERIFIED; nexus_phase_completed event logged |
| `superseded` | Phase was completed then replaced by a maintenance task |

---

## Active Work Items

| work_item_id | phase_id | pipeline_started | current_step | status |
|---|---|---|---|---|
| INFRA-2026-0001 | phase-0 | 2026-03-10T14:00:00+11:00 | POST_GATE (complete) | complete |

---

## Gate Failure Log

| work_item_id | phase_id | failed_step | failed_gate_condition | reason | timestamp | resolution_status |
|---|---|---|---|---|---|---|
| INFRA-2026-0001 | phase-0 | 2026-03-10T14:00:00+11:00 | POST_GATE (complete) | complete | — | — |

---

## Orchestrator Instructions

**Accepting a new work item:**
1. Check `phase_id` exists in Phase Routing Table above — reject if absent
2. Check `current_status` is `not-started` or `blocked` (for retry) — reject if `in-progress` or `complete`
3. Read `impact_class` and `pipeline_variant` from this table
4. Write `infra-routing-instructions-[phase].md` with routing decision before invoking any pipeline agent
5. Update `current_status` to `in-progress` in this file

**On gate failure:**
- Update `current_status` to `blocked`
- Append row to Gate Failure Log above
- Write `infra-routing-instructions-[phase].md` with `status: FAILED`

**On VERIFIED:**
- Update `current_status` to `complete`
- Log `nexus_phase_completed` event in `audit-trail.md`

---

## Change Log

| Version | Date | Author | Note |
|---|---|---|---|
| 0.2.0 | 2026-03-10 | agent:nexus-infra-orchestrator | phase-0 complete — INFRA-2026-0001 VERIFIED; TAR-001 v0.3.1 patched |
| 0.1.0 | 2026-03-10 | bootstrap:design-team | Initial registry — 12 phases, all not-started |
