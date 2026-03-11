# Tool Access Registry

**Registry ID:** TAR-001  
**Version:** 0.5.0  
**Status:** draft  
**Last updated:** 2026-03-11  
**Governed by:** platform-constraints.md (OCAP model)  
**Consumed by:** `nexus/src/tools/shared/gateway.ts` (loaded into memory at server start)

The MCP Gateway validates every incoming tool call against this registry before the handler executes. A call not matching a row is denied unconditionally. Denial is audited as `tool_access_denied` even though the operation never executed.

**Column definitions:**
- `tool_name` — exact MCP tool identifier
- `permitted_agent_roles` — exact `agent_role` values that may call this tool (comma-separated)
- `r/w` — R = read (no TypeDB write), W = write (TypeDB write + audit event required)
- `scope_constraint` — additional structural constraints enforced by the tool handler

---

## Cross-Cutting Services — Tier 12

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `audit_append_event` | `audit-trail-agent` | W | Append-only. No reads. `event_type` must match Event Type Registry. |
| `knowledge.readEntry` | `context-curator-creation`, `context-curator-review`, `context-curator-indexing`, `context-curator-storage`, `context-curator-distribution`, `context-curator-archival`, `context-compressor`, `infra-context-curator` | R | Filter by `subject_doc_type` + `subject_stage` only; `infra-context-curator` filters by `phase_id`. |
| `knowledge.writeEntry` | `creation-verifier`, `review-verifier`, `indexing-verifier`, `storage-verifier`, `distribution-verifier`, `archival-verifier`, `ci-verifier`, `infra-verifier`, `infra-knowledge-curator` | W | Stage verifiers and Tier 15 infra agents only. |
| `relationship.queryDependencies` | `dependency-index-agent`, `completeness-validator`, `system-orchestrator` | R | Depth-limited traversal. No writes. |
| `relationship.upsertDependency` | `dependency-index-updater` | W | Tier 7 (Indexing) only. Must supply `rel` value from controlled vocabulary. |

---

## Governance Layer — Tier 2

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `registry.getDocument` | all registered agent roles | R | Returns document entity. No writes. Read event audited. |
| `registry.queryDocuments` | all registered agent roles | R | Filtered TypeDB query only. No mutation. Audit event appended. |
| `registry.getDependencyGraph` | all registered agent roles | R | Delegates to `relationship.queryDependencies`. No writes. |
| `index.readMaster` | all registered agent roles | R | No writes. No audit on reads. |
| `index.readByType` | all registered agent roles | R | No writes. No audit on reads. |
| `index.readByStatus` | all registered agent roles | R | No writes. No audit on reads. |
| `index.readByTag` | all registered agent roles | R | No writes. No audit on reads. |
| `index.updateMaster` | `index-update-orchestrator` | W | Only called after `indexing-verification` artefact exists for the target doc. |
| `index.updateByType` | `index-update-orchestrator` | W | Only called after `indexing-verification` artefact exists for the target doc. |
| `index.updateByTag` | `index-update-orchestrator` | W | Only called after `indexing-verification` artefact exists for the target doc. |
| `template.read` | all authoring agent roles, all dod agent roles, `template-validator` | R | No writes. |
| `template.write` | `template-manager` | W | Template documents only. Triggers `template_updated` event. |
| `template.getMigrationFlags` | `template-version-controller` | R | Returns list of documents using older template versions. No writes. |
| `naming.validate` | `naming-convention-enforcer` | R | Called internally by `creation.writeDraft` regardless of whether agent calls it directly. |
| `dod.getTemplate` | `dod-registry-agent`, `creation-dod-agent`, `review-dod-agent`, `indexing-dod-agent`, `storage-dod-agent`, `distribution-dod-agent`, `archival-dod-agent`, `infra-dod-agent`, `infra-dod-author-completeness`, `infra-dod-author-adversarial`, `infra-dod-author-efficiency` | R | Returns DoD template entity. Triggers `dod_retrieved` event. |
| `metrics.aggregate` | `metrics-aggregator` | R | TypeDB event query only. No writes. |

---

## Orchestrators — Tiers 1 & 3

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `routing.getRegistryPaths` | `system-orchestrator`, `creation-orchestrator`, `review-orchestrator`, `indexing-orchestrator`, `storage-orchestrator`, `distribution-orchestrator`, `archival-orchestrator` | R | Returns current status + valid next stages. No writes. |
| `routing.dispatchStage` | `system-orchestrator`, `creation-orchestrator`, `review-orchestrator`, `indexing-orchestrator`, `storage-orchestrator`, `distribution-orchestrator`, `archival-orchestrator` | W | `targetStage` must be in `validNextStages` for current document status. Triggers `stage_dispatched` event (subtype: `stage_transition`). |

---

## Creation Stage — Tier 4

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `creation.readContext` | all creation stage agent roles | R | Returns `creation-context` artefact for the target `doc_id`. |
| `creation.writeContext` | `context-curator-creation` | W | One `creation-context` artefact per `doc_id`. |
| `creation.writeProblemAnalysis` | `problem-analysis-agent` | W | Requires `creation-context` artefact to exist for target `doc_id`. |
| `creation.writeDraft` | `document-author` | W | Calls `naming.validate()` internally; rejects if name invalid. Triggers `document_created` event. |
| `creation.writeArtefact` | `template-validator`, `creation-dod-agent` | W | `artefact_type` must be valid for creation stage. Triggers `artefact_created` event. |
| `creation.submitVerification` | `creation-verifier` | W | Gate: `draft-v0.1-agent` + `template-compliance` + `creation-dod` artefacts must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `creation.writeMetrics` | `creation-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Review & Approval Stage — Tier 5

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `review.readContext` | all review stage agent roles | R | Returns `review-context` artefact for the target `doc_id`. |
| `review.writeContext` | `context-curator-review` | W | One `review-context` artefact per `doc_id`. |
| `review.writePerspective` | `perspective-reviewer-a`, `perspective-reviewer-b`, `perspective-reviewer-c`, `perspective-reviewer-d` | W | `lens` must be one of: `accuracy`, `completeness`, `agent-readability`, `structure`. |
| `review.writeSynthesis` | `review-synthesizer` | W | Gate: all 4 perspective artefacts (`review-accuracy`, `review-completeness`, `review-readability`, `review-structure`) must exist. |
| `review.writeRevision` | `revision-agent` | W | Requires `review-synthesis` artefact to exist. |
| `review.writeArtefact` | `review-dod-agent` | W | `artefact_type` must be valid for review stage. |
| `review.submitApprovalGate` | `approval-gate-agent` | W | Independence check: `actor_id` of this call must differ from `actor_id` of `draft-v0.1-agent` artefact (queried from audit events). |
| `review.submitVerification` | `review-verifier` | W | Gate: `approval-status` with `decision: approved` + `review-dod` must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `review.writeMetrics` | `review-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Indexing & Classification Stage — Tier 7

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `indexing.readContext` | all indexing stage agent roles | R | Returns `indexing-context` artefact for the target `doc_id`. |
| `indexing.writeContext` | `context-curator-indexing` | W | One `indexing-context` artefact per `doc_id`. |
| `indexing.writeMetadataRaw` | `metadata-extractor` | W | Requires `indexing-context` artefact to exist. |
| `indexing.writeMetadataFinal` | `classification-agent` | W | Updates `document` entity attributes in TypeDB. Requires `taxonomy-validation` artefact. |
| `indexing.writeArtefact` | `taxonomy-validator`, `indexing-dod-agent` | W | `artefact_type` must be valid for indexing stage. |
| `indexing.dispatchIndexUpdates` | `index-update-orchestrator` | W | Calls `index.updateMaster`, `index.updateByType`, `index.updateByTag` and `relationship.upsertDependency` internally. Requires `metadata-final` artefact. |
| `indexing.submitVerification` | `indexing-verifier` | W | Gate: `metadata-final` + `taxonomy-validation` + `indexing-dod` must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `indexing.writeMetrics` | `indexing-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Storage & Versioning Stage — Tier 8

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `storage.readContext` | all storage stage agent roles | R | Returns `storage-context` artefact for the target `doc_id`. |
| `storage.writeContext` | `context-curator-storage` | W | One `storage-context` artefact per `doc_id`. |
| `storage.commitVersion` | `version-control-agent` | W | Bumps `version` attribute on document entity. Triggers `document_version_committed` event. Semver enforced: major.minor.patch. |
| `storage.writeAccessManifest` | `access-control-agent` | W | Requires `metadata-final` artefact to exist. |
| `storage.updateVersionRegistry` | `version-registry-updater` | W | Requires `version-log` artefact to exist. |
| `storage.writeArtefact` | `storage-dod-agent` | W | `artefact_type` must be valid for storage stage. |
| `storage.submitVerification` | `storage-verifier` | W | Gate: `version-log` + `access-manifest` + `storage-dod` must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `storage.writeMetrics` | `storage-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Distribution Stage — Tier 9

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `distribution.readContext` | all distribution stage agent roles | R | Returns `distribution-context` artefact for the target `doc_id`. |
| `distribution.writeContext` | `context-curator-distribution` | W | One `distribution-context` artefact per `doc_id`. |
| `distribution.writePlan` | `distribution-planner` | W | Requires `distribution-context` artefact to exist. |
| `distribution.writeLog` | `distribution-agent` | W | Requires `distribution-plan` artefact to exist. Triggers `artefact_created` event. |
| `distribution.notifyChange` | `change-notification-agent` | W | Requires `distribution-log` artefact to exist. |
| `distribution.writeArtefact` | `distribution-dod-agent` | W | `artefact_type` must be valid for distribution stage. |
| `distribution.submitVerification` | `distribution-verifier` | W | Gate: `distribution-log` + `distribution-dod` must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `distribution.writeMetrics` | `distribution-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Archival Stage — Tier 10

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `archival.readContext` | all archival stage agent roles | R | Returns `archival-context` artefact for the target `doc_id`. |
| `archival.writeContext` | `context-curator-archival` | W | One `archival-context` artefact per `doc_id`. |
| `archival.evaluateRetention` | `retention-evaluator` | R | Reads retention schedule entity from TypeDB. Returns recommendation only — no writes. |
| `archival.commitArchival` | `archival-agent` | W | Gate: `archival-recommendation` artefact with `recommendation: archive` must exist. Updates document `status` to `archived`. Triggers `document_archived` event. |
| `archival.updateStatusRegistry` | `status-transition-agent` | W | Requires `archival-log` artefact to exist. |
| `archival.writeArtefact` | `archival-dod-agent` | W | `artefact_type` must be valid for archival stage. |
| `archival.submitVerification` | `archival-verifier` | W | Gate: `archival-log` + `archival-dod` must exist. Triggers `stage_gate_opened` or `stage_gate_failed`. |
| `archival.writeMetrics` | `archival-metrics-agent` | W | Stage metrics artefact only. Triggers `stage_metrics_recorded` event. |

---

## Continuous Improvement — Tier 13

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `ci.readQualityMetrics` | `quality-monitor` | R | Time-windowed TypeDB event query. No writes. |
| `ci.readPerformanceMetrics` | `performance-monitor` | R | Time-windowed TypeDB event query. No writes. |
| `ci.readAnomalySignals` | `anomaly-detector` | R | Queries `stage_gate_failed`, `tool_access_denied`, `StageGateError` events. No writes. |
| `ci.readBottleneckData` | `bottleneck-analyst` | R | Queries stage dwell times from event timestamps. No writes. |
| `ci.readAgentBehaviourData` | `agent-behaviour-analyst` | R | Queries `actor_id × tool_name × target_id` distribution. Filtered audit trail slice only. No writes. |
| `ci.writeReport` | `quality-monitor`, `performance-monitor`, `anomaly-detector`, `bottleneck-analyst`, `agent-behaviour-analyst` | W | `report_type` must be one of: `quality`, `performance`, `anomaly`, `bottleneck`, `behaviour`. Triggers `ci_report_generated` event. |
| `ci.writeSynthesis` | `ci-perspective-synthesizer` | W | Gate: all 5 monitor report artefacts for the `cycleId` must exist. Triggers `ci_synthesis_written` event. |
| `ci.writeRecommendations` | `recommendation-generator` | W | Gate: `ci-synthesis` artefact for `cycleId` must exist. Triggers `ci_recommendations_written` event. |
| `ci.writeSysAdminBriefing` | `sysadmin-briefing-agent` | W | Gate: `improvement-recommendations` artefact for `cycleId` must exist. |
| `ci.submitCIVerification` | `ci-verifier` | W | Gate: `sysadmin-briefing` artefact for `cycleId` must exist. Triggers `ci_cycle_complete` event. |

---

## SysAdmin & Governance — Tier 14

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `sysadmin.readGovernanceDoc` | `dlm-sysadmin-agent`, `policy-manager`, `sla-manager`, `guide-curator`, `rules-patterns-agent`, `dod-custodian`, `sysadmin-activity-monitor` | R | SysAdmin tier only. Triggers `governance_doc_read` event. |
| `sysadmin.readAuditEvents` | `dlm-sysadmin-agent`, `sysadmin-activity-monitor`, `infra-metrics-agent` | R | Time-windowed audit query. Filter by `actor_id`, `event_type`, or `target_id`. No writes. `infra-metrics-agent` restricted to Tier 15 event types by phase_id filter. |
| `sysadmin.readSysAdminBriefing` | `dlm-sysadmin-agent` | R | Reads briefing artefact from TypeDB. No writes. |
| `sysadmin.writeGovernanceDoc` | `policy-manager`, `sla-manager`, `guide-curator`, `agent-registry-updater` | W | Updates document entity in TypeDB; triggers render-back to .md file. Triggers `governance_doc_updated` event. NOT available to `dlm-sysadmin-agent` (reads only). `agent-registry-updater` scope is restricted to dlms-agent-roster.md only. |
| `sysadmin.writeChangeDirective` | `dlm-sysadmin-agent` | W | Requires `sysadmin-briefing` artefact to exist as source. |
| `sysadmin.updateConfig` | `configuration-controller` | W | Gate: `change-directive` artefact for `changeDirectiveId` must exist. Triggers `config_updated` event. |

---

## Nexus Infrastructure — Tier 15

These tools are consumed exclusively by Tier 15 agents. The Infra Executor's write tools
must have zero overlap with the Infra Verifier's tools (DLMS-2026-0104 R04).

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `infra.readContext` | `nexus-infra-orchestrator`, `infra-context-curator`, `infra-planner`, `infra-dod-agent`, `infra-dod-author-completeness`, `infra-dod-author-adversarial`, `infra-dod-author-efficiency`, `infra-dod-synthesizer`, `infra-executor`, `infra-code-reviewer`, `infra-architecture-reviewer`, `infra-verifier`, `infra-metrics-agent`, `infra-knowledge-curator` | R | Returns `infra-context-[phase]` artefact. No writes. |
| `infra.writeContext` | `infra-context-curator` | W | One `infra-context-[phase]` artefact per phase_id. Output must be smaller than combined inputs. Triggers `artefact_created` event. |
| `infra.writePlan` | `infra-planner` | W | Requires `infra-context-[phase]` artefact to exist. Plan must include `rollback_procedure`. Triggers `infra_plan_created` event. |
| `infra.writeDoD` | `infra-dod-agent` | W | RC-standard work items only. Requires `infra-plan-[phase]` artefact to exist. Requires `impact_class: RC-standard` declared in plan. Calls `dod.getTemplate` internally. Triggers `infra_dod_created` event. |
| `infra.writeDraftDoD` | `infra-dod-author-completeness`, `infra-dod-author-adversarial`, `infra-dod-author-efficiency` | W | RC-high-impact and RC-critical only. Writes to orientation-scoped draft path only (infra-dod-draft-[orientation]-[phase].md). Requires `infra-plan-[phase]` artefact to exist. Authors must not read each other's draft paths — scope constraint enforced by handler. Triggers `infra_dod_draft_created` event. |
| `infra.synthesizeDoD` | `infra-dod-synthesizer` | W | RC-high-impact and RC-critical only. Gate: all required draft DoD artefacts for the phase_id must exist (completeness + adversarial for RC-high-impact; + efficiency for RC-critical). Reads all draft artefacts. Writes final infra-dod-[phase].md with impact_class and security_overlay fields. Must NOT be held by any `infra-dod-author-*` role. Triggers `infra_dod_created` event. |
| `infra.writeImplementation` | `infra-executor` | W | Write-scoped to `nexus/src/` and `.vscode/mcp.json` only. Requires `infra-dod-[phase]` artefact to exist (gate check). Must NOT have scope overlap with `infra.submitVerification`. Triggers `infra_implementation_completed` event. |
| `infra.updateRegistry` | `infra-executor` | W | Write-scoped to `dlms/registry/tool-access-registry.md` and `dlms/registry/event-type-registry.md` only. Requires `infra-plan-[phase]` artefact specifying registry changes. Triggers `artefact_created` event (subtype: registry_update). |
| `infra.writeReview` | `infra-code-reviewer`, `infra-architecture-reviewer` | W | One review artefact per reviewer per phase_id. Reviewer type (`code` or `architecture`) recorded in artefact. Triggers `infra_review_submitted` event. |
| `infra.submitVerification` | `infra-verifier` | W | Gate: `infra-code-review-[phase]` AND `infra-arch-review-[phase]` artefacts must exist. Checks all infra_dod criteria. Writes `infra-verification-[phase]` and `infra-learnings-[phase]`. Triggers `infra_verified` or `infra_verification_failed` event. Must NOT be held by `infra-executor`. |
| `infra.writeMetrics` | `infra-metrics-agent` | W | Stage metrics artefact only. Reads from `sysadmin.readAuditEvents` (filtered by phase_id). Triggers `artefact_created` event. |

---

## Agent Creation & Lifecycle — Tier 15B

Tier 15B has structural write isolation: each `agentcreation.*` write tool is permitted to exactly one agent role, enforcing the independence requirements of DLMS-2026-0108 (R05, R07) and DLMS-2026-0111 (NR09). No agent holds both a write tool and the corresponding verification tool for the same artefact type. The 9 named roles for `roster.get` and `roster.list` are defined explicitly — these tools are not available to all registered agents.

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `agentcreation.getArtefact` | `agent-creation-orchestrator`, `agent-request-handler`, `agent-problem-analyst`, `agent-specification-author`, `agent-specification-reviewer`, `agent-instruction-author`, `agent-specification-verifier`, `agent-registry-updater`, `agent-retirement-coordinator` | R | Two query modes: (1) supply `role_id` + `artefact_type` → returns most-recently-created matching `agent_artefact` entity; (2) supply `artefact_id` → returns specific entity by key. Returns full `content` JSON payload. No writes. No audit event on read. `artefact_type` must be from controlled vocabulary in schema.tql § agent_artefact. |
| `agentcreation.writeRequest` | `agent-request-handler` | W | Writes `agent_artefact` entity with `artefact_type: agent-request-record` conforming to DLMS-2026-0112 content schema. Validates proposed_role_id uniqueness against all active and retired `agent_class` entities before writing. Triggers `agent_request_received` event. |
| `agentcreation.writeProblemAnalysis` | `agent-problem-analyst` | W | Writes `agent_artefact` entity with `artefact_type: agent-problem-analysis`. Gate: `agent-request-record` for this `role_id` must exist in TypeDB with `approval_artefact_id` non-null (assertAgentArtefactExists). Triggers `artefact_created` event. |
| `agentcreation.writeSpec` | `agent-specification-author` | W | Writes `agent_artefact` entity with `artefact_type: agent-spec` conforming to DLMS-2026-0113 content schema. Gate: `agent-problem-analysis` for this `role_id` must exist in TypeDB (assertAgentArtefactExists). Triggers `agent_spec_created` event. |
| `agentcreation.submitReview` | `agent-specification-reviewer` | W | Writes `agent_artefact` entity with `artefact_type: agent-spec-review`. Gate: `agent-spec` for this `role_id` must exist in TypeDB. `reviewer_actor_id` in content must differ from `author_actor_id` in the referenced `agent-spec` (independence check, DLMS-2026-0108 R05). Triggers `artefact_created` event. |
| `agentcreation.writeInstruction` | `agent-instruction-author` | W | Writes `agent_artefact` entity with `artefact_type: agent-instruction-record`. Gate: `agent-spec-review` for this `role_id` must exist with `result: PASS` in content (assertAgentArtefactExists with requiredContent). Enforces `body_token_count ≤ 440` in content at write time. Triggers `agent_instruction_created` event. |
| `agentcreation.submitVerification` | `agent-specification-verifier` | W | Writes `agent_artefact` entity with `artefact_type: agent-verification-record`. Gate: `agent-instruction-record` for this `role_id` must exist in TypeDB. `verifier_actor_id` in content must differ from `author_actor_id` in the referenced `agent-instruction-record` (DLMS-2026-0108 R07). Triggers `agent_spec_verified` event. |
| `agentcreation.updateRegistry` | `agent-registry-updater` | W | Atomic transaction: writes `agent_class` entity to TypeDB + updates tool-access-registry entries + updates dlms-agent-roster.md. Gate: `agent-verification-record` for this `role_id` must exist with `result: PASS` in content (assertAgentArtefactExists with requiredContent). Triggers `agent_deployed` event. Calls `roster.write` internally. |
| `agentcreation.writeRetirement` | `agent-retirement-coordinator` | W | Writes `agent_artefact` entity with `artefact_type: agent-retirement-record`. Gate: for tier ≤ 14, `sysadmin_approval_artefact_id` must be non-null in the `agent-request-record` (DLMS-2026-0110 R01). Triggers `agent_retired` event. Calls `roster.retire` internally. |
| `roster.get` | `agent-creation-orchestrator`, `agent-request-handler`, `agent-problem-analyst`, `agent-specification-author`, `agent-registry-updater`, `agent-retirement-coordinator`, `dlm-sysadmin`, `agent-behaviour-analyst`, `system-orchestrator` | R | Returns single agent_class entity by role_id. Returns all attributes including agent_status, instruction_path, and spec_doc_id. No writes. No audit event on read. |
| `roster.list` | `agent-creation-orchestrator`, `agent-request-handler`, `agent-problem-analyst`, `agent-specification-author`, `agent-registry-updater`, `agent-retirement-coordinator`, `dlm-sysadmin`, `agent-behaviour-analyst`, `system-orchestrator` | R | Returns array of agent_class entities. Filter by tier, tier_label, or agent_status. No writes. No audit event on read. |
| `roster.write` | `agent-registry-updater` | W | Writes or updates agent_class entity in TypeDB. Gate: agentcreation.updateRegistry workflow context must exist for this role_id (prevents direct roster manipulation outside the creation workflow). Atomic with `agent_deployed` audit event. |
| `roster.retire` | `agent-retirement-coordinator` | W | Sets agent_class agent_status to retired; populates agent_retired_at and agent_retired_by. Gate: retirement artefact for this role_id must exist. For tier ≤ 14: sysadmin_approval_artefact_id must be non-null (DLMS-2026-0110 R01). Atomic with `agent_retired` audit event. |

---

## Context Delivery Layer — Tier 11 (nexus-external)

These tools are exposed on the nexus-external server only. They are not available on nexus-internal.

| tool_name | permitted_agent_roles | r/w | scope_constraint |
|---|---|---|---|
| `context.requestPackage` | `context-request-handler` | W | Writes `retrieval-spec` artefact. Triggers `context_requested` event. |
| `context.retrieveDocuments` | `document-retrieval-agent` | R | Requires `retrieval-spec` artefact. Returns only `status: approved` + `context_eligible: true` documents. |
| `context.validateRecency` | `recency-validator` | W | Confirms retrieved versions are latest. Triggers `recency_validated` event. |
| `context.validateAccuracy` | `accuracy-validator` | W | Confirms all docs have passing `{stage}_verification` artefact. Triggers `accuracy_validated` event. |
| `context.validateCompleteness` | `completeness-validator` | W | Calls `relationship.queryDependencies`. Flags missing dependencies. Triggers `completeness_validated` event. |
| `context.validateFormat` | `format-validator` | W | Checks `sections` JSON structure. Triggers `format_validated` event. |
| `context.compressPackage` | `context-compressor` | W | Calls `knowledge.readEntry` for priors. Produces `context-package` artefact. Triggers `context_package_compressed` event. |
| `context.writeDeliveryVerification` | `delivery-verifier` | W | Gate: all 4 validation events (`recency_validated`, `accuracy_validated`, `completeness_validated`, `format_validated`) must exist for the `packageId`. Partial delivery is structurally prohibited. Triggers `context_package_delivered` event. |
| `context.queryByTag` | `non-dlms-consumer` | R | Tag-based corpus query. Returns `context_eligible: true` documents only. No writes. |
| `context.getDependencyGraph` | `non-dlms-consumer` | R | Dependency traversal for non-DLMS agents. No writes. |

---

## Gateway Enforcement Rules

1. Every tool call must supply `tool_name` and `agent_role` in the calling context.
2. The gateway looks up the row in this registry where `tool_name` matches. If no row exists, the call is denied unconditionally.
3. If the row exists but `agent_role` is not in the `permitted_agent_roles` list, the call is denied and `tool_access_denied` event is appended to TypeDB before throwing `ToolAccessDeniedError`.
4. If the call is permitted, the gateway passes through to the tool handler. The handler enforces any `scope_constraint` listed.
5. Denial audit events are written even when the underlying operation never executed. The attempt is a fact.
6. This registry is loaded into memory at server start. Changes require a server restart.

---

## Change Log

| Version | Date | Author | Note |
|---|---|---|---|
| 0.5.0 | 2026-03-11 | bootstrap:design-team | Added `agentcreation.getArtefact` R tool (all 9 Tier 15B roles); updated all 8 `agentcreation.*` scope constraints to reference `agent_artefact` TypeDB entity (not `stage_artefact`, not files); gate language updated to use `assertAgentArtefactExists` with `requiredContent` where applicable |
| 0.4.0 | 2026-03-11 | bootstrap:design-team | Added Tier 15B section: 8 agentcreation.* write tools (one role each) + roster.get + roster.list (9 named roles each) + roster.write + roster.retire = 12 new tools; added `agent-registry-updater` to `sysadmin.writeGovernanceDoc` permitted roles (dlms-agent-roster.md scope only) |
| 0.3.1 | 2026-03-10 | agent:infra-executor | Added `infra-context-curator` to `knowledge.readEntry` permitted roles; added `infra-verifier` and `infra-knowledge-curator` to `knowledge.writeEntry` permitted roles; updated scope constraints; found during Phase D validation (infra_work_item: phase-0) |
| 0.3.0 | 2026-03-10 | bootstrap:design-team | Added `infra.writeDraftDoD` and `infra.synthesizeDoD` tools for multi-perspective DoD pipeline; extended `infra.readContext` and `dod.getTemplate` permitted roles; updated `infra.writeDoD` scope constraint; per DLMS-2026-0107 |
| 0.2.0 | 2026-03-10 | bootstrap:design-team | Added Tier 15 tool section (10 tools); added `infra-metrics-agent` to `sysadmin.readAuditEvents` permitted roles |
| 0.1.0 | 2026-03-09 | seed:design-team | Initial registry — all tools across Tiers 1–14 |
