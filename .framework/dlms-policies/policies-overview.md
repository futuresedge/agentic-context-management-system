# DLMS corpus policies

The DLMS corpus policies fall naturally into **nine governance domains**. Each policy is itself a DLMS document — versioned, reviewed, indexed, and audited through the same pipeline it governs. 

***

## A. Document Lifecycle Governance

| Policy | Governs | Key Provisions |
|---|---|---|
| **Document Creation Policy** | Who and what can initiate creation | Required inputs before Author Agent activates; mandatory template assignment; Naming Convention Enforcer must pass before Author proceeds |
| **Document Classification Policy** | Typing and retention-class assignment | Approved `doc_type` values; classification rules per content type; which types are `context_eligible`; who can reclassify |
| **Document Status Transition Policy** | Valid state changes and their conditions | Permitted transitions (`draft → under_review → approved → archived → superseded`); gate conditions at each transition; which agents may trigger transitions; no backward transitions without SysAdmin directive |
| **Document Versioning Policy** | Semver rules and supersession rules | What constitutes `major` (structural change), `minor` (content change), `patch` (correction); when a new version supersedes vs amends; maximum version chain length before a new document is required |
| **Document Retention Policy** | How long each document type is retained | Retention class definitions (`RC-1` through `RC-n`); retention period per class; what triggers archival; exceptions process   |
| **Document Archival Policy** | Conditions and process for archival | Triggers (time-based, event-based, supersession); Retention Evaluator authority; what must be confirmed before `Status Transition Agent` acts |

***

## B. Quality & Verification

| Policy | Governs | Key Provisions |
|---|---|---|
| **Verification Independence Policy** | Structural separation of producer and verifier | No agent may verify its own output; verifier agents may not share instruction files with their paired executor; violation triggers audit alert (Principles 1, 4) |
| **Definition of Done Policy** | How DoDs are created, approved, and used | DoD must exist before any executor activates; DoD templates are maintained by `DoD Custodian`; DoD may not be modified after work begins; what constitutes a valid DoD (measurable, pre-specified, doc-type-specific) (Principle 11) |
| **Review Standards Policy** | Minimum review rigour per document type | Minimum number of Perspective Reviewers per doc type (e.g. policy docs require 4 lenses, reference docs require 2); mandatory lenses per doc type; conditions under which a `Revision Agent` cycle is triggered vs. a rejection |
| **Quality Threshold Policy** | Acceptable quality rates before a stage advances | Minimum verification pass rate before a batch of documents proceeds; what happens when a document fails verification twice; escalation path to SysAdmin |

***

## C. Agent Behaviour & Context

| Policy | Governs | Key Provisions |
|---|---|---|
| **Agent Context Boundary Policy** | What each agent class is permitted to read | Enforces `READS / WRITES / NEVER` per agent class; agents reading outside declared scope triggers audit alert; Context Curators are the only agents permitted to read upstream of their stage (Principle 9)   |
| **Audit Trail Policy** | What is logged, payload requirements, immutability | Every state change, output, resource consumption, and information access must be logged; required payload fields (`agent_id`, `action`, `doc_id`, `timestamp`, `output_path`); no deletion or amendment of log entries; log format specification (Principle 3) |
| **Agent Verification Policy** | Structural independence requirements | Defines "structurally separate" — separate instruction files, separate invocation, no shared memory state; applies to all producer/verifier pairs; `CI Verifier` applies same rule to CI recommendations (Principles 1, 4) |
| **Multi-Perspective Policy** | When multiple cognitive perspectives are required | Defines which doc types and decisions require multi-perspective review; minimum perspective count; what constitutes a distinct perspective (separate lens skill file); `CI Perspective Synthesizer` scope (Principle 5) |

***

## D. Naming, Schema & Format

| Policy | Governs | Key Provisions |
|---|---|---|
| **Naming Convention Policy** | All document IDs, file names, slugs, paths | ID format (`DLMS-YYYY-NNNN`); file naming patterns per doc type; slug character rules; path structure; `Naming Convention Enforcer` is authoritative; convention changes require migration plan |
| **Metadata Standard Policy** | Required vs optional fields, value constraints | Which frontmatter fields are mandatory per doc type; allowed values for enumerated fields (`status`, `doc_type`, `retention_class`); metadata completeness is a gate condition for the Indexing stage |
| **Document Schema Policy** | Canonical agent-friendly schema specification | Full schema definition; required sections per doc type; what constitutes a valid `SUMMARY` block (max 3 sentences, no narrative); `CHANGE_LOG` format; `DEPENDENCIES` block format |
| **Taxonomy Policy** | Approved classification vocabulary | Authoritative tag list; how new tags are proposed and approved; tag deprecation process; `Tag Index Agent` is bound to this policy; wildcard tags are forbidden |

***

## E. Access & Security

| Policy | Governs | Key Provisions |
|---|---|---|
| **Access Control Policy** | Who and what can access which documents | Role-based access tiers; need-to-know principle for agent access; `Access Control Agent` is bound to this policy; access manifest format and authority |
| **Confidentiality Classification Policy** | Document sensitivity levels and handling rules | Classification levels (e.g. `open`, `internal`, `restricted`, `confidential`); handling rules per level; which levels are `context_eligible`; how classification affects Distribution stage routing |

***

## F. SLA & Performance

| Policy | Governs | Key Provisions |
|---|---|---|
| **Stage SLA Policy** | Maximum time-in-stage per document type | Time limits per lifecycle stage per doc type; breach escalation threshold (warning vs critical); `Performance Monitor` is bound to this policy; SLA targets reviewed quarterly by `SLA Manager`   |
| **Context Delivery SLA Policy** | Quality and speed of context packages delivered to non-DLM agents | Maximum delivery latency; required quality properties (up-to-date, accurate, complete, formatted, legible, succinct, structured); conditions under which delivery is refused (e.g. accuracy validation fails) |
| **CI Cycle Policy** | Frequency and scope of continuous improvement monitoring | CI cycle cadence (time-based or event-triggered); thresholds that trigger immediate vs scheduled reporting; minimum evidence required before `Recommendation Generator` acts; `SysAdmin Activity Monitor` scope |

***

## G. Knowledge & Learning

| Policy | Governs | Key Provisions |
|---|---|---|
| **Knowledge Base Contribution Policy** | What enters the KB, format, and provenance | Only verified learnings from `[Stage] Verifier` agents may enter the KB; format requirements for `learnings.md`; KB entries are immutable once written (append-only per doc type / stage key); Principle 8 |
| **Learning Synthesis Policy** | How learnings are aggregated and applied | Minimum sample size before a pattern is treated as a KB insight; `Learning Synthesizer` cycle frequency; how KB insights are surfaced to Context Curators; how outdated insights are flagged (not deleted) |
| **Template Governance Policy** | How templates are created, versioned, and retired | Template creation requires full DLMS lifecycle; template versions use semver; breaking template changes require migration assessment by `Template Version Controller`; deprecated templates stay in archive |

***

## H. Dependency & Relationships

| Policy | Governs | Key Provisions |
|---|---|---|
| **Document Dependency Policy** | How dependencies are declared and validated | All inter-document relationships must be declared in the `DEPENDENCIES` block; circular dependencies are forbidden; `Dependency Index Agent` validates on every Indexing stage; valid relationship types (`implements`, `references`, `supersedes`, `is-governed-by`) |
| **Impact Assessment Policy** | What happens downstream when a document changes | When an approved document changes version, `Dependency Index Agent` produces an impact list; all downstream documents with `rel: implements` or `rel: governed-by` are flagged for review; `Distribution Agent` notifies dependents |

***

## I. DLMS Meta-Governance
# DLMS corpus policies


These are the policies that govern the policies — the meta-layer. 

| Policy | Governs | Key Provisions |
|---|---|---|
| **Policy Governance Policy** | How policies in this corpus are created, reviewed, approved, and retired | All policies are DLMS documents subject to full lifecycle; policy hierarchy (this policy is authoritative over all others); minimum review cycle frequency per policy type; `Policy Manager` agent authority and limits |
| **Change Management Policy** | How SysAdmin directives are prioritized, tracked, and closed | Directive priority levels and response SLAs; which change types require multi-perspective review before directive is issued; `SysAdmin Activity Monitor` reports against this policy; no directive may modify `Audit Trail Policy` or `Verification Independence Policy` without a quorum of CI evidence |
| **SysAdmin Escalation Policy** | What CI findings require immediate vs routine SysAdmin attention | Defines escalation thresholds (e.g. quality drop > 15% in one cycle = immediate; single anomaly = routine); `Anomaly Detector` is bound to this policy; escalation path and response SLA per tier |
| **SLA Breach Response Policy** | What happens when any SLA is breached | Breach notification payload; `SLA Manager` authority to propose SLA revision vs. investigate root cause; `Bottleneck Analyst` is activated on every critical breach |

***

## Policy Hierarchy
# DLMS corpus policies


Not all policies are equal. A policy hierarchy prevents conflicts: 

1. **Meta-governance** (`Policy Governance Policy`) — authoritative over all others
2. **Principles-derived** (`Verification Independence Policy`, `Audit Trail Policy`, `Agent Context Boundary Policy`) — cannot be overridden by operational policies; map directly to your 11 principles
3. **Operational lifecycle** (`Creation Policy`, `Versioning Policy`, `Retention Policy`, etc.) — subject to SysAdmin change via full CI + directive process
4. **Technical standards** (`Naming Convention Policy`, `Metadata Standard Policy`, `Schema Policy`, `Taxonomy Policy`) — subject to change with impact assessment
5. **SLA & performance targets** (`Stage SLA Policy`, `Delivery SLA Policy`) — most frequently revised; lightest change process

This hierarchy means the `Change Management Policy` must enforce that no operational or technical change can override a principles-derived policy. The `DoD Custodian` would hold this as a hard constraint in every DoD it generates for policy documents themselves.