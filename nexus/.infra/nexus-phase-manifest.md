# Nexus Phase Manifest

**Registry ID:** NPM-001  
**Version:** 0.1.0  
**Status:** bootstrap  
**Governed by:** DLMS-2026-0104 (Nexus Infrastructure Agent Governance Policy)  
**Consumed by:** Nexus Infrastructure Orchestrator (validates incoming phase_id; selects pipeline variant)

All valid `phase_id` values are declared here. An infra_work_item referencing a phase_id
not in this manifest is rejected by the Orchestrator as an invalid routing target.
`impact_class` per phase is computed per DLMS-2026-0107 (Impact × Uncertainty matrix).

---

## Phases

### Phase 0 — Repository Foundation

```yaml
phase_id:        phase-0
title:           Repository Foundation
impact_class:    RC-standard
  # Low impact (no downstream dependents exist yet) + Low uncertainty (clear directory
  # structure, registry formats defined in 0104/0105). Standard single-DoD pipeline.
status:          not-started
prerequisites:   none
pipeline_variant: standard
outputs:
  - nexus/ directory tree (stubs)
  - dlms/registry/event-type-registry.md   # already exists (ETR-001 v0.3.0)
  - dlms/registry/tool-access-registry.md  # already exists (TAR-001 v0.3.0)
  - .vscode/mcp.json (disabled stubs)
  - nexus/.infra/ directory with bootstrap files
notes: |
  ETR-001 and TAR-001 were created in bootstrap (pre-agent) mode this session.
  Phase 0 validates they are correct and the directory tree is complete.
  Verification gate: all files exist; .vscode/mcp.json is valid JSON;
  both registries are well-formed.
```

---

### Phase 1 — TypeDB Schema & Corpus Import

```yaml
phase_id:        phase-1
title:           TypeDB Schema and Corpus Import
impact_class:    RC-high-impact
  # High impact (all subsequent phases depend on schema correctness; 107 documents
  # imported) + Medium uncertainty (schema is well-specified in roadmap; TypeDB 3.x
  # patterns not yet proven in this codebase). Either dimension being high → RC-high-impact.
status:          not-started
prerequisites:
  - phase-0: complete
pipeline_variant: high-impact
outputs:
  - nexus/src/db/schema.tql
  - nexus/src/seed/parse-frontmatter.ts
  - nexus/src/seed/import-corpus.ts
  - TypeDB populated: 107 document entities + dependency relations + 107 audit events
docker_prerequisite: |
  TypeDB 3.x must be running via Docker before Phase 1 can be verified.
  Human-executed: docker compose up typedb
  Port: 1729 (default)
verification_gate: |
  match $d isa document; get $d; → 107 results
  Dependency traversal for DLMS-2026-0098 returns correct upchain
  audit_event count = 107, event_type: document_imported
notes: |
  Schema covers all 6 ONE ontology dimensions. The nexus-phase-patterns skill
  should be referenced by the Planner for TypeDB entity/relation patterns.
```

---

### Phase 2 — Internal MCP Server: Core Infrastructure

```yaml
phase_id:        phase-2
title:           MCP Core Infrastructure
impact_class:    RC-critical
  # Auto-classification: touches gateway.ts (OCAP enforcement), audit.ts (audit trail
  # atomicity), gate.ts (stage gate integrity). Both Impact and Uncertainty are high.
  # Security overlay mandatory (gateway.ts + audit.ts). Human review gate required
  # before Executor is invoked.
status:          not-started
prerequisites:
  - phase-1: complete
pipeline_variant: high-impact   # RC-critical uses high-impact pipeline with 3 DoD authors
security_overlay: true
security_overlay_triggers:
  - gateway.ts (D-008, OCAP enforcement)
  - audit.ts (audit trail atomicity, compliance chain)
  - gate.ts (stage gate structural integrity)
outputs:
  - nexus/src/server.ts
  - nexus/src/db/client.ts
  - nexus/src/tools/shared/audit.ts
  - nexus/src/tools/shared/gateway.ts
  - nexus/src/tools/shared/gate.ts
  - audit_append_event tool registered in server.ts
verification_gate: |
  MCP server starts, TypeDB connects
  audit_append_event: correct role → event in TypeDB
  audit_append_event: wrong role → ToolAccessDeniedError + tool_access_denied in TypeDB
  Stage gate: no artefacts for TEST-001 → StageGateError on any submitVerification call
  Atomicity: forced audit failure → business write also absent from TypeDB
non_waivable_dod_criteria:
  - Audit atomicity (shared transaction — bidirectional rollback)
  - Gateway enforces TAR-001 (denial audited even when op never executes)
```

---

### Phase 3 — Cross-Cutting Tools: Tier 12

```yaml
phase_id:        phase-3
title:           Cross-Cutting Tools — Knowledge Base and Relationship
impact_class:    RC-critical
  # High impact: knowledge.writeEntry is used by all stage verifiers; relationship tools
  # used by Dependency Index Agent and Completeness Validator — blast radius = all tiers.
  # High uncertainty: first TypeDB entity insertion tools beyond audit; shared-transaction
  # pattern must be correctly applied. Both dimensions high → RC-critical.
status:          not-started
prerequisites:
  - phase-2: complete
pipeline_variant: high-impact   # RC-critical
outputs:
  - knowledge.readEntry, knowledge.writeEntry tools
  - relationship.queryDependencies, relationship.upsertDependency tools
verification_gate: |
  knowledge.writeEntry from context-curator → KB entry in TypeDB, knowledge_entry_created event
  knowledge.writeEntry from non-verifier role → ToolAccessDeniedError
  relationship.queryDependencies for DLMS-2026-0001 → correct dependency chain returned
```

---

### Phase 4 — Governance Layer Tools: Tier 2

```yaml
phase_id:        phase-4
title:           Governance Layer Tools — Registry, Index, Template, Naming, DoD, Metrics
impact_class:    RC-high-impact
  # High impact: these tools are consumed by every pipeline stage. Medium uncertainty:
  # all patterns are read/write TypeDB entity operations following Phase 2/3 patterns.
  # Impact is high; uncertainty decreased by prior phases. Either dimension high → RC-high-impact.
status:          not-started
prerequisites:
  - phase-3: complete
pipeline_variant: high-impact
outputs:
  - registry.getDocument, registry.queryDocuments, registry.getDependencyGraph
  - index.read* (4 tools), index.update* (3 tools)
  - template.read, template.write, template.getMigrationFlags
  - naming.validate
  - dod.getTemplate
  - metrics.aggregate
```

---

### Phase 5 — Orchestrator Tools: Tiers 1 & 3

```yaml
phase_id:        phase-5
title:           Orchestrator Routing Tools
impact_class:    RC-high-impact
  # High impact: routing.dispatchStage is the document state machine — all pipeline
  # stage transitions depend on it. Medium uncertainty: follows Phase 2 gateway pattern.
status:          not-started
prerequisites:
  - phase-4: complete
pipeline_variant: high-impact
outputs:
  - routing.getRegistryPaths
  - routing.dispatchStage
```

---

### Phase 6 — Stage Pipeline Tools: Tiers 4–10

```yaml
phase_id:        phase-6
title:           Stage Pipeline Tools — Creation through Archival
impact_class:    RC-high-impact
  # High impact: these tools operate the full document lifecycle. Medium uncertainty:
  # all 6 stage modules follow the same 4-tool pattern from Phase 5; pattern exists.
  # 6 modules can be built in parallel within this phase.
status:          not-started
prerequisites:
  - phase-5: complete
pipeline_variant: high-impact
outputs:
  - creation.* (8 tools — Tier 4)
  - review.* (9 tools — Tier 5)
  - indexing.* (6 tools — Tier 7)
  - storage.* (7 tools — Tier 8)
  - distribution.* (7 tools — Tier 9)
  - archival.* (7 tools — Tier 10)
notes: |
  6 stage modules are parallel sub-tasks within Phase 6.
  Infra Planner should declare the parallel sub-tasks in infra-plan-phase-6.md.
```

---

### Phase 7 — CI Tools: Tier 13

```yaml
phase_id:        phase-7
title:           Continuous Improvement Tools
impact_class:    RC-high-impact
  # High impact: CI cycle drives all governance evolution. Medium uncertainty: read
  # tools are TypeDB audit event queries; write tools follow stage artefact pattern.
status:          not-started
prerequisites:
  - phase-6: complete
pipeline_variant: high-impact
outputs:
  - ci.readQualityMetrics, ci.readPerformanceMetrics, ci.readAnomalySignals
  - ci.readBottleneckData, ci.readAgentBehaviourData
  - ci.writeReport, ci.writeSynthesis, ci.writeRecommendations
  - ci.writeSysAdminBriefing, ci.submitCIVerification
notes: |
  Build after Phase 6 so real audit events exist to query during verification.
```

---

### Phase 8 — SysAdmin Tools + Render-back: Tier 14

```yaml
phase_id:        phase-8
title:           SysAdmin Tools and Render-back Engine
impact_class:    RC-high-impact
  # High impact: sysadmin.writeGovernanceDoc triggers render-back — the mechanism
  # that keeps .md files in sync with TypeDB. Medium uncertainty: follows established
  # TypeDB entity update pattern + new render-back filesystem write component.
status:          not-started
prerequisites:
  - phase-7: complete
pipeline_variant: high-impact
outputs:
  - sysadmin.readGovernanceDoc, sysadmin.readAuditEvents, sysadmin.readSysAdminBriefing
  - sysadmin.writeGovernanceDoc, sysadmin.writeChangeDirective, sysadmin.updateConfig
  - nexus/src/render/render-doc.ts (render-back engine)
```

---

### Phase 9 — External MCP Server: Context Delivery Layer (Tier 11)

```yaml
phase_id:        phase-9
title:           External MCP Server — Context Delivery Layer
impact_class:    RC-high-impact
  # High impact: external-facing server — non-DLMS agents depend on the quality pipeline.
  # Medium uncertainty: all tool patterns follow Phase 2 gateway + Phase 6 artefact pattern.
  # External server requires strict namespace isolation from internal server.
status:          not-started
prerequisites:
  - phase-6: complete   # approved documents must exist in TypeDB
pipeline_variant: high-impact
outputs:
  - nexus-external server activated in .vscode/mcp.json
  - context.requestPackage, context.retrieveDocuments
  - context.validateRecency, context.validateAccuracy
  - context.validateCompleteness, context.validateFormat
  - context.compressPackage, context.writeDeliveryVerification
  - context.queryByTag, context.getDependencyGraph
notes: |
  Parallel with Phases 7–8 (only dependency is Phase 6).
  External server exposes Tier 11 tools ONLY — never pipeline.*, sysadmin.*, audit_append_event.
```

---

### Phase 10 — Agent Spec Stubs

```yaml
phase_id:        phase-10
title:           Agent Specification Files (.agent.md)
impact_class:    RC-critical
  # High impact: .agent.md files are the OCAP capability grant — incorrect tool lists
  # give agents wrong authority or wrong exclusions. High uncertainty: first time
  # authoring real operational agent specs (Tier 15 bootstrap specs were authored
  # by human, not by pipeline). Both dimensions high → RC-critical.
status:          not-started
prerequisites:
  - phase-2: complete   # all declared tools must exist before specs reference them
  - phase-9: complete   # all tool namespaces must be final
pipeline_variant: high-impact   # RC-critical
outputs:
  - One .github/agents/{tier-name}.agent.md per active tier (13 agent files)
  - Tiers: system-orchestrator, governance-layer, stage-orchestrators, creation-stage,
    review-stage, indexing-stage, storage-stage, distribution-stage, archival-stage,
    context-delivery, cross-cutting-services, ci-tier, sysadmin-tier
notes: |
  Tool list in .agent.md must exactly match TAR-001 rows for that tier.
  Tier 15 .agent.md files are authored in the Tier 15 bootstrap plan (separate track).
```

---

### Phase 11 — Self-Hosting Verification Gate

```yaml
phase_id:        phase-11
title:           Self-Hosting Verification Gate
impact_class:    RC-critical
  # High impact: confirms the entire system is functioning end-to-end.
  # High uncertainty: first full pipeline run on a real governance document with
  # real CI recommendation as input. Both dimensions high → RC-critical.
  # Also: render-back writes .md to filesystem — a cross-boundary operation.
status:          not-started
prerequisites:
  - phase-10: complete
pipeline_variant: high-impact   # RC-critical
outputs:
  - First real governance document update through full pipeline
  - Unbroken audit trail from ci_report_generated → document_version_committed
  - SysAdmin Activity Monitor reads the update → next CI cycle seeded
verification_gate: |
  Audit trail: complete chain from CI trigger to policy approval, no gaps.
  All event_type values in trail match ETR-001.
  All actor_id tool calls match TAR-001 permitted roles.
  render-back: updated .md file at agent_path matches TypeDB document entity.
```

---

## Summary Table

| phase_id | Title | impact_class | Pipeline | Status |
|---|---|---|---|---|
| phase-0 | Repository Foundation | RC-standard | standard | not-started |
| phase-1 | TypeDB Schema & Corpus Import | RC-high-impact | high-impact | not-started |
| phase-2 | MCP Core Infrastructure | RC-critical | high-impact | not-started |
| phase-3 | Cross-Cutting Tools (Tier 12) | RC-critical | high-impact | not-started |
| phase-4 | Governance Layer Tools (Tier 2) | RC-high-impact | high-impact | not-started |
| phase-5 | Orchestrator Tools (Tiers 1, 3) | RC-high-impact | high-impact | not-started |
| phase-6 | Stage Pipeline Tools (Tiers 4–10) | RC-high-impact | high-impact | not-started |
| phase-7 | CI Tools (Tier 13) | RC-high-impact | high-impact | not-started |
| phase-8 | SysAdmin + Render-back (Tier 14) | RC-high-impact | high-impact | not-started |
| phase-9 | Context Delivery Layer (Tier 11) | RC-high-impact | high-impact | not-started |
| phase-10 | Agent Spec Files | RC-critical | high-impact | not-started |
| phase-11 | Self-Hosting Verification Gate | RC-critical | high-impact | not-started |

---

## Change Log

| Version | Date | Author | Note |
|---|---|---|---|
| 0.1.0 | 2026-03-10 | bootstrap:design-team | Initial manifest — 12 phases; impact_class assigned per DLMS-2026-0107 |
