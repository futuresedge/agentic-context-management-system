# DLMS Architecture — Full Agent Roster & Design
***

## Foundational Design Decisions

Before listing agents, three architectural decisions shape everything else:

**1. Single canonical source, two renders.** The agent-friendly version is the canonical document. It is authored first, governed, versioned, and verified. The human-friendly version is *rendered from* the canonical — it is never authored independently. There is no synchronisation problem because there is only one truth. This is the same principle as how trace:original handles legal documents: same source data, two format layers, signed together. 

**2. No disposal stage — immutable record is the disposal.** When a document reaches end-of-life, it is marked `status: superseded` or `status: archived` in the registry with a full audit trail entry. The document itself persists. The audit record *is* the disposal record. Principle 3 eliminates the need for destruction agents.

**3. Context Delivery is a first-class layer.** Non-DLM agents are treated as primary consumers. The delivery layer is not a retrieval wrapper — it is a verification and packaging pipeline that guarantees recency, accuracy, completeness, format compliance, and compression *before* any context leaves the DLMS.

***

## Canonical Document Schema

The agent-friendly schema uses structured YAML frontmatter + linter-style section keys. Every field is explicit, typed, and machine-parseable. Human-readable sections use natural language but under machine-readable headings. 

```yaml
---
doc_id:          DLMS-2026-0042
doc_type:        policy | procedure | specification | template | reference | report
status:          draft | under_review | approved | superseded | archived
version:         2.1.0          # semver: major=structural, minor=content, patch=correction
created_at:      2026-03-08T00:00:00+11:00
created_by:      agent:document-author
approved_at:     2026-03-08T01:00:00+11:00
approved_by:     agent:approval-gate
verified_by:     agent:review-verifier
template_id:     TMPL-policy-001
template_ver:    1.2.0
tags:            [governance, agent-context, policy]
supersedes:      DLMS-2025-0042
superseded_by:   null
retention_class: RC-7
context_eligible: true
dependencies:
  - doc_id: DLMS-2026-0011
    rel:    implements
  - doc_id: DLMS-2026-0019
    rel:    references
agent_path:   /docs/agent/DLMS-2026-0042-v2.1.0.md
audit_ref:    AUDIT-2026-0042
---

## SUMMARY
[3 sentences max. Dense. No narrative.]

## CONTENT
### [SECTION_KEY]
[content under machine-readable section headings]

## DEPENDENCIES
- DLMS-2026-0011 | implements | [one-line description]

## CHANGE_LOG
- v2.1.0 | 2026-03-08 | agent:author | [change note]
- v2.0.0 | 2026-01-15 | agent:author | [change note]
```

***

## Full Agent Roster

### Tier 1 — System Orchestrator

| Agent | Reads | Writes | Role |
|---|---|---|---|
| `DLM System Orchestrator` | Registry paths, gate conditions only | Routing instructions | Routes documents between stage orchestrators; never reads document content |

***

### Tier 2 — Governance Layer *(always-on)*

These agents maintain the standards that all other agents operate within.

| Agent | Reads | Writes |
|---|---|---|
| `DoD Registry Agent` | Stage type + doc type | `[stage]-dod.md` per document per stage |
| `Template Manager` | Template requests + learnings | `TMPL-[type]-[id].md` versioned templates |
| `Template Version Controller` | Template history | `template-version-log.md`, migration flags |
| `Template Validator` | Document draft + assigned template | `template-compliance.md` |
| `Naming Convention Registry Agent` | Convention rules store | Updated `naming-conventions.md` |
| `Naming Convention Enforcer` | Proposed document name + `naming-conventions.md` | `name-validation.md` (pass/fail + corrected name) |
| `Master Index Agent` | All approved `metadata-final.md` files | `master-index.md` |
| `Type Index Agent` | `metadata-final.md` | `index-by-type.md` |
| `Status Index Agent` | Registry status fields | `index-by-status.md` |
| `Tag Index Agent` | Tag fields from all docs | `index-by-tag.md` |
| `Dependency Index Agent` | Dependency blocks from all docs | `dependency-graph.md` |
| `Metrics Aggregator` | All `[stage]-metrics.md` files | `metrics-report.md`, `metrics-trends.md` |

***

### Tier 3 — Stage Orchestrators

Each is a thin router. Holds only file paths and stage gate conditions. 

- `Creation Orchestrator`
- `Review & Approval Orchestrator`
- `Dual-Version Production Orchestrator`
- `Indexing & Classification Orchestrator`
- `Storage & Versioning Orchestrator`
- `Distribution Orchestrator`
- `Archival Orchestrator`

***

### Tier 4 — Creation Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Creation)` | All intake materials | `creation-context.md` (compressed minimum) | 7, 9 |
| `Problem Analysis Agent` | `creation-context.md` + `analysis-lenses/` (skill files) | `problem-analysis.md` (multi-perspective) | 5, 10 |
| `DoD Agent (Creation)` | `problem-analysis.md` + doc type | `creation-dod.md` | 11 |
| `Document Author` | `creation-context.md` + assigned template only | `draft-v0.1-agent.md` (canonical) | 9 |
| `Template Validator` | `draft-v0.1-agent.md` + template | `template-compliance.md` | 1 |
| `Creation Verifier` | `draft-v0.1-agent.md` + `creation-dod.md` + `template-compliance.md` | `creation-verification.md` + `creation-learnings.md` | 1, 2, 4 |
| `Creation Metrics Agent` | Creation stage event log | `creation-metrics.md` | 8 |

The `Problem Analysis Agent` loads analysis lenses as skill files on demand — accuracy lens, completeness lens, audience lens — keeping its base context thin. 

***

### Tier 5 — Review & Approval Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Review)` | `draft-v0.1-agent.md` | `review-context.md` | 7, 9 |
| `DoD Agent (Review)` | `review-context.md` + doc type | `review-dod.md` | 11 |
| `Perspective Reviewer A` | `review-context.md` + `lens-accuracy.md` (skill) | `review-accuracy.md` | 5 |
| `Perspective Reviewer B` | `review-context.md` + `lens-completeness.md` (skill) | `review-completeness.md` | 5 |
| `Perspective Reviewer C` | `review-context.md` + `lens-agent-readability.md` (skill) | `review-readability.md` | 5 |
| `Perspective Reviewer D` | `review-context.md` + `lens-structure.md` (skill) | `review-structure.md` | 5 |
| `Review Synthesizer` | All `review-*.md` files | `review-synthesis.md` | 5 |
| `Revision Agent` | `review-synthesis.md` + `draft-v0.1-agent.md` | `draft-v0.2-agent.md` (revised canonical) | — |
| `Approval Gate Agent` | `review-synthesis.md` + `review-dod.md` | `approval-status.md` | 1, 11 |
| `Review Verifier` | `approval-status.md` + `review-dod.md` | `review-verification.md` + `review-learnings.md` | 1, 2, 4 |
| `Review Metrics Agent` | Review stage event log | `review-metrics.md` | 6, 8 |

Each Perspective Reviewer loads its lens as a **skill file on demand** — same base instructions, different skill loaded per invocation. Batch processing of similar document types warms the skill cache on the first document, then pays ~10% cost on subsequent ones. 

***

### Tier 6 — Human-friendly Document Production Stage (Out of scope for this phase)

***

### Tier 7 — Indexing & Classification Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Indexing)` | Both verified versions | `indexing-context.md` | 7, 9 |
| `DoD Agent (Indexing)` | Doc type | `indexing-dod.md` | 11 |
| `Metadata Extractor` | `indexing-context.md` only | `metadata-raw.md` | 9 |
| `Classification Agent` | `metadata-raw.md` + `taxonomy.md` (skill) | `metadata-final.md` | — |
| `Taxonomy Validator` | `metadata-final.md` + `taxonomy.md` | `taxonomy-validation.md` | 1 |
| `Indexing Verifier` | `metadata-final.md` + `indexing-dod.md` | `indexing-verification.md` + `indexing-learnings.md` | 1, 2, 4 |
| `Index Update Orchestrator` | `indexing-verification.md` | Routes to index update agents below | — |
| `Master Index Updater` | `metadata-final.md` + current master index | Updated `master-index.md` | 3 |
| `Type Index Updater` | `metadata-final.md` + current type index | Updated `index-by-type.md` | 3 |
| `Tag Index Updater` | `metadata-final.md` + current tag index | Updated `index-by-tag.md` | 3 |
| `Dependency Index Updater` | Dependency block + current dependency graph | Updated `dependency-graph.md` | 3 |
| `Indexing Metrics Agent` | Stage event log | `indexing-metrics.md` | 8 |

***

### Tier 8 — Storage & Versioning Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Storage)` | Both verified versions + `metadata-final.md` | `storage-context.md` | 7, 9 |
| `DoD Agent (Storage)` | Doc type + access policy | `storage-dod.md` | 11 |
| `Version Control Agent` | `storage-context.md` + version history | `doc-[id]-v[n]-agent.md`, `doc-[id]-v[n]-human.md`, `version-log.md` | 3, 23 |
| `Access Control Agent` | `metadata-final.md` + `access-policy.md` (skill) | `access-manifest.md` | — |
| `Version Registry Updater` | `version-log.md` | Updated `version-registry.md` | 3 |
| `Storage Verifier` | `version-log.md` + `storage-dod.md` | `storage-verification.md` + `storage-learnings.md` | 1, 2, 4 |
| `Storage Metrics Agent` | Stage event log | `storage-metrics.md` | 8 |

Versioning uses semver: `major.minor.patch`. Major = structural change, minor = content change, patch = correction. Both human and agent versions carry the same version number — they are two files of the same version. 

***

### Tier 9 — Distribution Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Distribution)` | `access-manifest.md` + `metadata-final.md` | `distribution-context.md` | 7, 9 |
| `DoD Agent (Distribution)` | Distribution type | `distribution-dod.md` | 11 |
| `Distribution Planner` | `distribution-context.md` + `recipient-registry.md` | `distribution-plan.md` | — |
| `Distribution Agent` | `distribution-plan.md` only | `distribution-log.md` | 3 |
| `Change Notification Agent` | `distribution-log.md` + subscriber list | Change notification events | 3 |
| `Distribution Verifier` | `distribution-log.md` + `distribution-dod.md` | `distribution-verification.md` + `distribution-learnings.md` | 1, 2, 4 |
| `Distribution Metrics Agent` | Stage event log | `distribution-metrics.md` | 8 |

***

### Tier 10 — Archival Stage

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Context Curator (Archival)` | `metadata-final.md` + `version-log.md` | `archival-context.md` | 7, 9 |
| `DoD Agent (Archival)` | Retention class | `archival-dod.md` | 11 |
| `Retention Evaluator` | `archival-context.md` + `retention-schedule.md` (skill) | `archival-recommendation.md` | 6 |
| `Archival Agent` | `archival-recommendation.md` only | `archival-log.md`, status update → `archived` | 3 |
| `Status Transition Agent` | `archival-log.md` | Updated registry status entry | 3 |
| `Archival Verifier` | `archival-log.md` + `archival-dod.md` | `archival-verification.md` + `archival-learnings.md` | 1, 2, 4 |
| `Archival Metrics Agent` | Stage event log | `archival-metrics.md` | 8 |

The `Retention Evaluator` reasons across the full document lifecycle — not just the current status — to make its recommendation, directly instantiating Principle 6 (efficiency measured across the full lifecycle).

***

### Tier 11 — Context Delivery Layer

This layer exists entirely for non-DLM agents. It is the most quality-critical layer in the system because failures here propagate downstream into important agent tasks. Every non-DLM agent request flows through this pipeline.

| Agent | Reads | Writes | Quality Property |
|---|---|---|---|
| `Context Request Handler` | Incoming request + `master-index.md` | `retrieval-spec.md` (structured retrieval plan) | Fast — prevents unnecessary downstream work |
| `Document Retrieval Agent` | `retrieval-spec.md` + `index-by-status.md` | `retrieved-docs-raw/` | Current — uses status index to guarantee latest approved version |
| `Recency Validator` | `retrieved-docs-raw/` + `version-registry.md` | `recency-report.md` (confirms latest version) | Up-to-date |
| `Accuracy Validator` | `retrieved-docs-raw/` + verification records | `accuracy-report.md` (confirms all docs are verified, not merely drafted) | Accurate |
| `Completeness Validator` | `retrieved-docs-raw/` + `dependency-graph.md` | `completeness-report.md` (flags missing dependencies) | Complete |
| `Format Validator` | `retrieved-docs-raw/` + `agent-format-spec.md` | `format-report.md` (confirms agent-friendly compliance) | Correctly formatted |
| `Context Compressor` | All validated docs + requesting agent's task spec | `context-package.md` (final compressed, delivery-ready package) | Succinct, legible, well-structured |
| `Delivery Verifier` | `context-package.md` + delivery DoD | `delivery-verification.md` | Accurate — final gate before delivery |

The `Context Compressor` is the delivery layer's equivalent of the Context Curator from your context engineering framework  — its input is intentionally larger than its output. It also queries the `Knowledge Base Agent` to determine if any prior learnings about this document type or requesting agent class should influence how the package is structured. 

***

### Tier 12 — Cross-Cutting Services

These agents receive events from all other agents. They never route or decide within any stage.

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `Audit Trail Agent` | Event payloads from all agents: `{agent_id, action, doc_id, timestamp, output_path}` | Append-only `audit-trail.log` | 3 |
| `Knowledge Base Agent` | All `[stage]-learnings.md` files | `knowledge-base/[doc-type]/[stage].md` | 8, 9 |
| `Document Relationship Agent` | All `dependency-graph.md` updates | `relationship-map.md` + orphan/circular dependency flags | — |

***

## Governance System Detail

### Template Management
Templates are versioned documents in the DLMS itself — they go through the full lifecycle. When a template is updated, the `Template Version Controller` writes a migration flag to all documents using the old version. On next update of those documents, `Template Validator` enforces migration. 

### Naming Convention System
The naming convention is a document in the DLMS. The `Naming Convention Enforcer` runs at the start of every Creation stage before the `Document Author` is activated. It outputs either a validated name or a corrected name — the `Creation Orchestrator` holds the gate until this passes.

### Indexing System
Five concurrent indexes — master, type, status, tag, dependency — are maintained by dedicated agents and updated at the end of every Indexing stage. All indexes use the agent-friendly schema and are context-delivery eligible, so the `Document Retrieval Agent` can query them directly. 

### Metrics System
Per-stage metrics agents capture: time-in-stage, verification pass/fail rate, revision cycle count, access frequency, version count, and context package delivery time. The `Metrics Aggregator` produces lifecycle reports and bottleneck analysis  and writes structured learnings back to the `Knowledge Base Agent` — so the system optimises its own throughput over time. 

***

## Principle Compliance Matrix

| Principle | Agent(s) That Instantiate It |
|---|---|
| 1 — No self-certification | Every `[Stage] Verifier`; `Delivery Verifier` |
| 2 — Output is verified evidence | All stage gates use `verification.md`, not the work artefact |
| 3 — Immutable audit trail | `Audit Trail Agent`; all log-writing agents write append-only records; no disposal stage |
| 4 — Separate producer and verifier | No agent holds both Author and Verifier roles anywhere in the system |
| 5 — Multiple perspectives | Perspective Reviewers A–D each load different lens skill files |
| 6 — Lifecycle efficiency | `Retention Evaluator` reasons across full lifecycle; `Metrics Aggregator` tracks cross-stage efficiency |
| 7 — Minimise tokens/steps | All `Context Curators`; linter-style agent instructions; skill files loaded on demand; batch caching of similar doc types   |
| 8 — Structured learnings | Every `[Stage] Verifier` writes `learnings.md`; `Knowledge Base Agent` accumulates; `Metrics Aggregator` and `Context Compressor` query it |
| 9 — Narrow context, broad knowledge | Every agent has explicit `READS/WRITES/NEVER`; Context Curators compress; Knowledge Base is queried not loaded |
| 10 — Problem-first | `Problem Analysis Agent` runs before `Document Author`; `DoD Agent` follows |
| 11 — DoD before execution | `DoD Agent` per stage gates every Stage Orchestrator before any executor activates |

***

## Change 1 — Human-Friendly Layer Deferred

The following are **removed** from scope:

- `Human Renderer`
- `Human Version Verifier`
- `Version Consistency Checker`
- `Dual-Version Production Orchestrator` (entire stage removed)
- `human_path` field from the canonical schema

**What is preserved for the future JIT phase:**
The agent-friendly canonical schema is designed to be *renderable* — rich YAML frontmatter, structured section keys, and a `CHANGE_LOG` block are sufficient for a future Human Observer Service to render on-demand without modifying any upstream agent. No future migration is required. The canonical is already the single source of truth; the JIT service will simply be a stateless renderer that reads it.

The `Dual-Version Metrics Agent` is also removed. The remaining six per-stage metrics agents are unaffected.

***

## Change 2 — Continuous Improvement Tier

This tier runs asynchronously — it does not block any document lifecycle stage. It observes, synthesizes, and reports. It never modifies the DLMS directly; all changes flow through the SysAdmin tier (Change 3).

Consistent with Principles 5 and 10, the CI tier uses **multiple specialist monitors** to build a multi-perspective picture before any recommendation is synthesized. No single monitor agent can trigger a recommendation alone.

### CI Monitor Agents *(observe and report)*

| Agent | Reads | Writes |
|---|---|---|
| `Quality Monitor` | All `[stage]-verification.md` files + historical quality-report | `quality-report.md` (pass/fail rates, recurring failure patterns, DoD breach frequency) |
| `Performance Monitor` | All `[stage]-metrics.md` + `sla-registry.md` | `performance-report.md` (time-in-stage, SLA compliance rate, throughput trends) |
| `Learning Synthesizer` | `knowledge-base/` (all accumulated learnings) | `learning-synthesis.md` (cross-stage, cross-doc-type patterns in learnings) |
| `Anomaly Detector` | `quality-report.md` + `performance-report.md` + historical baseline | `anomaly-report.md` (deviations beyond threshold from baseline; flags sudden quality drops, SLA spikes) |
| `Bottleneck Analyst` | `performance-report.md` + `metrics-trends.md` | `bottleneck-report.md` (stages with highest dwell time, highest revision cycles, highest verifier failure rate) |
| `Agent Behaviour Analyst` | All agent event logs from `audit-trail.log` (filtered slice only) | `agent-behaviour-report.md` (unexpected patterns: agents reading outside their declared scope, retry rates, context overruns) |

### CI Synthesis Agents *(synthesize findings into recommendations)*

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `CI Perspective Synthesizer` | All six CI monitor reports | `ci-synthesis.md` (integrated multi-perspective view; no recommendations yet) | 5, 10 |
| `Recommendation Generator` | `ci-synthesis.md` + current `dlms-policies/` + current `sla-registry.md` | `improvement-recommendations.md` (structured: issue, evidence, proposed change, expected impact, priority) | 10 |
| `CI Verifier` | `improvement-recommendations.md` + `recommendation-dod.md` | `ci-verification.md` + `ci-learnings.md` | 1, 2, 4 |
| `SysAdmin Briefing Agent` | `ci-verification.md` + `improvement-recommendations.md` | `sysadmin-briefing.md` (compressed, prioritized, actionable — one brief per CI cycle) | 7, 9 |

The `Recommendation Generator` is the only CI agent that reads current policies — it must know what already exists before recommending changes to it. All other CI agents are blind to policy content so they report on observed reality, not on what *should* be true.

***

## Change 3 — DLM SysAdmin & Governance Tier

The SysAdmin tier has two responsibilities: **acting on CI recommendations** and **maintaining the DLMS's own internal governance corpus** (policies, guides, rules, patterns, SLAs, templates). 

Critically, all internal DLMS governance documents are **documents within the DLMS itself** — they go through the standard lifecycle (creation → review → indexing → storage → archival). The SysAdmin tier authors them; the standard pipeline governs them. This means the DLMS is self-describing and self-auditing.

### SysAdmin Decision Agents

| Agent | Reads | Writes | Principle |
|---|---|---|---|
| `DLM SysAdmin Agent` | `sysadmin-briefing.md` only | `change-directives.md` (structured: accepted/deferred/rejected, rationale, assigned governance agent, priority) | 9 |
| `SysAdmin Verifier` | `change-directives.md` + directive DoD | `sysadmin-verification.md` | 1, 4 |

The `DLM SysAdmin Agent` reads *only the briefing* — not the raw CI reports. The `SysAdmin Briefing Agent` compresses upstream intelligence before it reaches here, consistent with your context engineering principles. 

### Governance Execution Agents *(receive change directives, manage internal documents)*

| Agent | Reads | Writes | Governs |
|---|---|---|---|
| `Policy Manager` | Assigned change directive + current policy doc | Draft updated policy → feeds into standard DLMS creation pipeline | `dlms-policies/` |
| `SLA Manager` | Assigned change directive + current SLA doc + `performance-report.md` | Draft updated SLA → feeds into standard pipeline | `sla-registry.md` |
| `Rules & Patterns Agent` | Assigned change directive + current rules/patterns docs | Draft updated rules or patterns → standard pipeline | `dlms-rules/`, `dlms-patterns/` |
| `Guide Curator` | Assigned change directive + current guide | Draft updated guide → standard pipeline | `dlms-guides/` |
| `Configuration Controller` | Assigned change directive only | `config-change-log.md` + updated system config | System configuration |
| `DoD Custodian` | Assigned change directive + all `[stage]-dod-templates.md` | Draft updated DoD templates → standard pipeline | Stage DoD templates |

### SysAdmin Monitoring Agent

| Agent | Reads | Writes |
|---|---|---|
| `SysAdmin Activity Monitor` | `change-directives.md` + `sysadmin-verification.md` + directive completion logs | `sysadmin-activity-report.md` (tracks: directives issued, resolved, deferred, overdue; SysAdmin SLA compliance) |

The `SysAdmin Activity Monitor` closes the loop — it watches whether the SysAdmin tier itself is performing against its own SLAs. It feeds back into the `CI Perspective Synthesizer` on the next CI cycle, making the improvement process genuinely recursive.

***

## Internal DLMS Document Corpus

The governance corpus maintained by the SysAdmin tier — all managed as DLMS documents with full lifecycle:

- `dlms-policies/` — operational rules with regulatory or compliance weight
- `dlms-slas/` — performance targets per stage and for the delivery layer
- `dlms-guides/` — how-to documentation for each agent class
- `dlms-rules/` — hard constraints (e.g. naming conventions, access control rules)
- `dlms-patterns/` — recommended approaches for recurring design problems
- `dlms-templates/` — canonical document templates per doc type
- `dlms-dod-templates/` — stage DoD templates per doc type, maintained by `DoD Custodian`

Because these are documents in the DLMS, they are versioned, indexed, verified, and audited like any other document. When a policy changes, the version history is immutable. The `Knowledge Base Agent` accumulates learnings from their review cycles. The `Dependency Index Agent` tracks which other DLMS documents reference them — so when an SLA changes, downstream impact is immediately visible.

***

## Updated Architecture Overview

| Tier | Agents | Change |
|---|---|---|
| System Orchestrator | 1 | Unchanged |
| Governance Layer | 12 | Unchanged |
| Stage Orchestrators | 6 | ▼ Removed Dual-Version Orchestrator |
| Creation Stage | 7 | Unchanged |
| Review & Approval Stage | 11 | Unchanged |
| ~~Dual-Version Production~~ | ~~8~~ | ✕ Removed entirely |
| Indexing & Classification | 12 | Unchanged |
| Storage & Versioning | 7 | Unchanged |
| Distribution Stage | 7 | Unchanged |
| Archival Stage | 7 | Unchanged |
| Context Delivery Layer | 8 | Unchanged |
| **Continuous Improvement** | **10** | ✦ New |
| **DLM SysAdmin & Governance** | **7** | ✦ New |
| Cross-Cutting Services | 3 | Unchanged |
| **Total** | **98** | Net +8 from v1 |

The removal of the 8-agent dual-version stage and the addition of 17 new agents across CI and SysAdmin tiers nets to **98 agents total**. The system is now operationally self-aware: it monitors its own quality and performance, synthesizes improvements from multiple perspectives, and manages its own governance corpus through the same lifecycle it governs.



---
