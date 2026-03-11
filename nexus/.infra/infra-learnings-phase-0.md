# Infra Learnings — Phase 0

**Artefact:** infra-learnings-phase-0  
**Phase:** phase-0 — Repository Foundation  
**Produced by:** infra-verifier (concurrent with verification artefact)  
**Timestamp:** 2026-03-10T14:30:00+11:00

---

## Learnings

### L01 — TAR-001 cross-cutting tool gap pattern

**subject:** TAR-001 cross-tier role coverage  
**phase_id:** phase-0  
**finding_type:** pattern_failed  
**finding:** When a new agent tier is added to the system (Tier 15 in this case), the
Cross-Cutting Services section of TAR-001 is not automatically updated. The Tier 15
Nexus Infrastructure section was added in v0.2.0–v0.3.0 but the existing
`knowledge.readEntry` and `knowledge.writeEntry` rows (authored at Tier 12 establishment
time) were not updated to include the new Tier 15 roles. The agents declared the tools
in their tool lists (per DLMS-2026-0105), but the gateway would have denied all
knowledge tool calls if Phase 2 had been reached without the fix.

**recommendation:** When onboarding any new agent tier, explicitly audit all
Cross-Cutting Services tools in TAR-001 and add the new tier's roles where appropriate
before the tier's first pipeline run reaches Phase D validation. Consider adding a
"cross-cutting tool audit" step to the DLMS-2026-0106 VALIDATION_CHECKLIST.

---

### L02 — Phase D validation sequence effectiveness

**subject:** Phase D validation timing  
**phase_id:** phase-0  
**finding_type:** pattern_worked  
**finding:** Running the DLMS-2026-0106 checklist as the first action of Phase D (before
the Orchestrator invocation) successfully surfaced the TAR-001 gap. The gap was
remediated within the phase-0 pipeline run itself, meaning the fix was governed by
the pipeline (plan → DoD → execute → review → verify), not applied ad-hoc. This
confirms the value of the validation-before-invocation sequence.

**recommendation:** Maintain this sequence: checklist validation first, then first
invocation. The validation acts as a pre-flight check that catches structural gaps
before they become runtime failures.

---

### L03 — Bootstrap mode artefact density

**subject:** nexus/.infra/ artefact production  
**phase_id:** phase-0  
**finding_type:** constraint_discovered  
**finding:** Each pipeline run for a phase produces approximately 9–10 artefact files
in nexus/.infra/. For 12 phases, this results in ~110 files. At Phase 5+, these artefacts
should migrate to TypeDB stage_artefact entities. The flat-file bootstrap store is
appropriate through Phase 1 only; Phase 2 (TypeDB operational) is the right migration
point.

**recommendation:** Include a cleanup step in the Phase 2 DoD: confirm all bootstrap
artefacts from phases 0 and pre-phase-0 are imported into TypeDB as stage_artefact
entities, and document the flat-file bootstrap store as deprecated after Phase 2 verification.
