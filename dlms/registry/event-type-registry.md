# Event Type Registry

**Registry ID:** ETR-001  
**Version:** 0.1.0  
**Status:** draft  
**Last updated:** 2026-03-09  
**Governed by:** DLMS-2026-0015 (Audit Trail Policy)  
**Consumed by:** `nexus/src/tools/shared/audit.ts`, `nexus/src/tools/shared/gateway.ts`

All `event_type` values in the DLMS audit trail must appear in this registry. Any audit event with an unregistered `event_type` is a schema violation and must be rejected at write time.

---

## Registry

| event_type | Description | Originating tier | Valid actor_id patterns |
|---|---|---|---|
| `document_imported` | Document entity created from seed import of a .md corpus file | Seed (one-time) | `seed:import-corpus` |
| `document_created` | New document entity created by an authoring agent through the Creation stage | Tier 4 | `agent:document-author` |
| `artefact_created` | Stage artefact entity written to TypeDB by a pipeline agent | Tiers 4–10 | `agent:{stage}-*` |
| `stage_dispatched` | Document routed to a new stage by an orchestrator | Tiers 1, 3 | `agent:system-orchestrator`, `agent:{stage}-orchestrator` |
| `stage_gate_opened` | Stage gate passed — all required artefacts present; stage verifier confirmed | Tiers 4–10 | `agent:{stage}-verifier` |
| `stage_gate_failed` | Stage gate failed — required artefact(s) absent; `StageGateError` thrown | Tiers 4–10 | `agent:{stage}-verifier`, any calling agent |
| `stage_metrics_recorded` | Stage metrics artefact written to TypeDB | Tiers 4–10 | `agent:{stage}-metrics-agent` |
| `tool_access_denied` | MCP Gateway rejected a tool call due to Tool Access Registry violation | Tier 2 (gateway) | `nexus:gateway` |
| `document_read` | Document entity read from TypeDB by a pipeline agent | Tier 2 | `agent:*` (any registered agent) |
| `corpus_queried` | Filtered query against document entities executed | Tier 2 | `agent:*` (any registered agent) |
| `index_updated` | One of the five index structures updated after indexing stage | Tier 7 | `agent:index-update-orchestrator` |
| `template_updated` | Template document entity updated in TypeDB | Tier 2 | `agent:template-manager` |
| `dod_retrieved` | DoD template entity read from TypeDB for a stage agent | Tier 2 | `agent:dod-registry-agent`, `agent:{stage}-dod-agent` |
| `knowledge_entry_created` | New knowledge entry entity written to TypeDB | Tier 12 | `agent:{stage}-verifier`, `agent:knowledge-base-agent` |
| `dependency_updated` | Dependency relation between two document entities upserted | Tier 7 | `agent:dependency-index-updater` |
| `document_version_committed` | Document entity version bumped; new version artefact written | Tier 8 | `agent:version-control-agent` |
| `document_archived` | Document entity status set to `archived`; archival log written | Tier 10 | `agent:archival-agent` |
| `governance_doc_updated` | Governance document entity updated in TypeDB by SysAdmin tier; render-back triggered | Tier 14 | `agent:policy-manager`, `agent:sla-manager`, `agent:guide-curator` |
| `context_requested` | Context request received; retrieval spec written to TypeDB | Tier 11 | `agent:context-request-handler` |
| `recency_validated` | Retrieved document set confirmed as latest versions | Tier 11 | `agent:recency-validator` |
| `accuracy_validated` | Retrieved document set confirmed as all having passing verification artefacts | Tier 11 | `agent:accuracy-validator` |
| `completeness_validated` | Retrieved document set confirmed as dependency-complete | Tier 11 | `agent:completeness-validator` |
| `format_validated` | Retrieved document set confirmed as agent-format compliant | Tier 11 | `agent:format-validator` |
| `context_package_compressed` | Context package produced by Context Compressor; delivery-ready | Tier 11 | `agent:context-compressor` |
| `context_package_delivered` | Delivery Verifier confirmed all 4 validation events present; delivery authorised | Tier 11 | `agent:delivery-verifier` |
| `ci_report_generated` | A CI monitor report artefact written to TypeDB for a given `cycleId` | Tier 13 | `agent:quality-monitor`, `agent:performance-monitor`, `agent:anomaly-detector`, `agent:bottleneck-analyst`, `agent:agent-behaviour-analyst` |
| `ci_synthesis_written` | CI Perspective Synthesizer produced `ci-synthesis` artefact | Tier 13 | `agent:ci-perspective-synthesizer` |
| `ci_recommendations_written` | Recommendation Generator produced `improvement-recommendations` artefact | Tier 13 | `agent:recommendation-generator` |
| `ci_cycle_complete` | CI Verifier confirmed all CI artefacts present for `cycleId` | Tier 13 | `agent:ci-verifier` |
| `config_updated` | System configuration changed by Configuration Controller following a change directive | Tier 14 | `agent:configuration-controller` |
| `governance_doc_read` | Governance document read by SysAdmin tier agent | Tier 14 | `agent:dlm-sysadmin-agent`, `agent:policy-manager`, `agent:sla-manager`, `agent:guide-curator`, `agent:sysadmin-activity-monitor` |

---

## Validation Rules

1. Every `event_type` value written to TypeDB must exactly match a slug in the registry table above. Case-sensitive. Underscores only — no hyphens.
2. The `actor_id` must match the pattern in the `Valid actor_id patterns` column. A wildcard `agent:*` means any agent registered in the Tool Access Registry may produce this event.
3. `nexus:gateway` is a system actor, not an agent. It may only produce `tool_access_denied`.
4. `seed:import-corpus` is a one-time system actor. It may only produce `document_imported`. Once seeding is complete, this actor_id is retired.
5. New event types must be added to this registry before the tool handler that produces them is deployed. Registry-first, not code-first.

---

## Change Log

| Version | Date | Author | Note |
|---|---|---|---|
| 0.1.0 | 2026-03-09 | seed:design-team | Initial registry — 31 event types covering all 14 tiers |
