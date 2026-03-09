
This is a dependency-ordering problem. The key constraint is that **a document cannot be correctly authored if the standard it must conform to doesn't yet exist.** I'll work through the dependency chain wave by wave.

***

## The Bootstrapping Problem

There are four documents that have no internal dependencies — they define the standards by which all other documents are created. These cannot enter the DLMS through the standard pipeline because the pipeline doesn't exist yet. They are **founding documents**, created through a manual bootstrap process, reviewed and approved by the SysAdmin team, then entered as the first records in the system. Everything else flows from them.

| # | Document | Why It Must Be First |
|---|---|---|
| 1 | `Policy Governance Policy` | Defines how all policies are created, approved, and reviewed. Every subsequent policy is subject to it. |
| 2 | `TMPL-template-001` (meta-template) | Defines how all templates are structured. Every template is created using it. |
| 3 | `Naming Convention Policy` | Without this, every document created before it may need to be renamed. Rework risk is total. |
| 4 | `Document Schema Policy` | Defines the canonical frontmatter schema. Every document created before it may have a non-compliant schema. |

These four are mutually independent but must all exist before Wave 2 begins.

***

## Wave 2 — Content Templates

**Dependency:** `TMPL-template-001`, `Naming Convention Policy`, `Document Schema Policy`

All content templates are created using the meta-template. They must exist before any governance documents can be consistently authored. Creating policies before their template exists means either free-form authoring (which causes structural drift) or rework when the template is later defined.

| # | Document | Notes |
|---|---|---|
| 5 | `TMPL-policy-001` | Highest priority — all principles-derived policies depend on it |
| 6 | `TMPL-standard-001` | Used for rules, technical standards |
| 7 | `TMPL-procedure-001` | Used for guides and procedures |
| 8 | `TMPL-pattern-001` | Used for design patterns |
| 9 | `TMPL-sla-001` | Used for all SLA documents |
| 10 | `TMPL-reference-001` | Used for taxonomy, retention schedule, controlled vocabulary |
| 11 | `TMPL-report-001` | Used for all report documents |
| 12 | `TMPL-taxonomy-001` | Used for the controlled vocabulary |
| 13 | `TMPL-specification-001` | Used for technical specs |

***

## Wave 3 — Principles-Derived Policies

**Dependency:** `TMPL-policy-001`

These are non-negotiable constraints that every subsequent policy must respect. They must exist before operational policies so those policies can correctly reference and defer to them. If created after operational policies, those policies must be reviewed for compliance — creating rework.

| # | Document | Why Here |
|---|---|---|
| 14 | `Verification Independence Policy` | All stage and delivery DoDs are constrained by this. Must exist before DoD templates. |
| 15 | `Audit Trail Policy` | Defines what every agent must log. Must exist before any artefact template that produces an audit payload. |
| 16 | `Agent Context Boundary Policy` | Defines `READS/WRITES/NEVER` rules. Must exist before any agent instruction is authored. |
| 17 | `Multi-Perspective Policy` | Defines minimum perspective requirements. Must exist before Review Standards Policy. |

***

## Wave 4 — Technical Standards

**Dependency:** `TMPL-standard-001`, Wave 1 policies

These define structural rules that shape how metadata, taxonomy, and dependencies are recorded. They must exist before any reference documents derived from them.

| # | Document | Why Here |
|---|---|---|
| 18 | `Metadata Standard Policy` | Defines required/optional fields and value constraints. Must exist before `TMPL-metadata-final-001`. |
| 19 | `Taxonomy Policy` | Defines how the controlled vocabulary is governed. Must exist before the taxonomy document itself. |
| 20 | `Document Dependency Policy` | Defines `DEPENDENCIES` block rules and valid relationship types. Must exist before any document declares dependencies. |

***

## Wave 5 — Foundational Reference Documents

**Dependency:** Wave 4 standards

These are not policies — they are reference data that agents directly consume. They must exist before the operational pipeline uses them.

| # | Document | Why Here |
|---|---|---|
| 21 | `Taxonomy / Controlled Vocabulary` (v1) | `Classification Agent` and `Tag Index Agent` are bound to this. Must exist before indexing can operate. |
| 22 | `Retention Schedule` | `Retention Evaluator` and `Document Retention Policy` both reference this. Must precede the retention policy. |

***

## Wave 6 — Foundational Artefact Templates

**Dependency:** Waves 3–5 policies and standards

These are the structural schemas for the most critical agent outputs. They must exist before the policies that reference them — and before any stage begins operating.

| # | Document | Why Here |
|---|---|---|
| 23 | `TMPL-audit-event-001` | Audit Trail Policy is written; now the schema that fulfils it is defined. |
| 24 | `TMPL-dod-creation-001` through `TMPL-dod-archival-001` (×6) | DoD templates are foundational to every stage gate. Must exist before DoD policy. |
| 25 | `TMPL-verification-001` | All verifier agents produce this. Must exist before Review Standards and Quality Threshold policies. |
| 26 | `TMPL-metadata-raw-001` | Depends on Metadata Standard Policy (Wave 4). |
| 27 | `TMPL-metadata-final-001` | Depends on `TMPL-metadata-raw-001` and Taxonomy. |
| 28 | `TMPL-index-entry-001` | Depends on `TMPL-metadata-final-001`. |
| 29 | `TMPL-learnings-001` | Depends on `TMPL-verification-001` (learnings reference verification outcomes). |

***

## Wave 7 — Operational Lifecycle Policies

**Dependency:** `TMPL-policy-001`, Wave 3–6 documents

Now that the technical foundations are in place, lifecycle policies can be authored without risk of structural drift. The `Retention Schedule` (Wave 5) must exist before `Document Retention Policy` so the policy can reference actual retention classes.

| # | Document | Depends On |
|---|---|---|
| 30 | `Document Creation Policy` | Schema Policy, Naming Convention Policy, DoD templates |
| 31 | `Document Classification Policy` | Taxonomy, Metadata Standard Policy |
| 32 | `Document Status Transition Policy` | Schema Policy (status field values) |
| 33 | `Document Versioning Policy` | Schema Policy (version field, semver rules) |
| 34 | `Document Retention Policy` | Retention Schedule (Wave 5) |
| 35 | `Document Archival Policy` | Retention Policy, Status Transition Policy |

***

## Wave 8 — Agent Behaviour Policies

**Dependency:** Waves 3, 6, 7 documents

These policies reference specific templates and lifecycle policies. Creating them before Wave 6 templates would mean writing criteria without a schema to point to.

| # | Document | Depends On |
|---|---|---|
| 36 | `Definition of Done Policy` | All 6 DoD templates (Wave 6) |
| 37 | `Review Standards Policy` | Multi-Perspective Policy (Wave 3), `TMPL-verification-001` |
| 38 | `Quality Threshold Policy` | `TMPL-verification-001`, Stage SLA Policy (Wave 10 — flag this dependency; may need a provisional SLA target) |
| 39 | `Access Control Policy` | Confidentiality Classification Policy (authored together, cross-dependent) |
| 40 | `Confidentiality Classification Policy` | Access Control Policy (authored together) |

***

## Wave 9 — Stage Artefact Templates

**Dependency:** Waves 7–8 policies

These templates define the artefacts produced at each stage. They depend on lifecycle and behaviour policies to correctly specify their fields and constraints.

| # | Document | Stage |
|---|---|---|
| 41 | `TMPL-creation-context-001` | Creation |
| 42 | `TMPL-problem-analysis-001` | Creation |
| 43 | `TMPL-review-perspective-001` | Review |
| 44 | `TMPL-review-synthesis-001` | Review |
| 45 | `TMPL-approval-status-001` | Review / Approval |
| 46 | `TMPL-version-log-001` | Storage |
| 47 | `TMPL-access-manifest-001` | Storage |
| 48 | `TMPL-distribution-plan-001` | Distribution |
| 49 | `TMPL-distribution-log-001` | Distribution |
| 50 | `TMPL-archival-recommendation-001` | Archival |
| 51 | `TMPL-archival-log-001` | Archival |

***

## Wave 10 — SLA Policies

**Dependency:** All stage artefact templates, operational lifecycle policies

SLAs cannot be meaningfully set until the stages they govern are fully defined.

| # | Document | Notes |
|---|---|---|
| 52 | `Stage SLA Policy` | One SLA per stage; references stage artefact templates for measurement points |
| 53 | `Context Delivery SLA Policy` | References delivery layer quality properties and artefact templates |

*Note: `Quality Threshold Policy` (Wave 8 #38) has a dependency on SLA targets. After Wave 10, revisit #38 to confirm thresholds are consistent with the now-formalised SLAs. This is the one deliberate forward reference in the ordering — it is contained and bounded.*

***

## Wave 11 — Knowledge & Learning Policies

**Dependency:** `TMPL-learnings-001` (Wave 6), KB and synthesis artefacts implied

| # | Document | Notes |
|---|---|---|
| 54 | `Knowledge Base Contribution Policy` | Governs what enters KB and its format. Depends on `TMPL-learnings-001`. |
| 55 | `Learning Synthesis Policy` | Governs how KB is aggregated. Depends on KB Contribution Policy. |
| 56 | `Template Governance Policy` | Governs how templates are created, versioned, and retired. Can now reference all existing templates. |

***

## Wave 12 — CI Artefact Templates

**Dependency:** All operational policies and stage artefacts, `TMPL-report-001`

CI report templates must precisely match the fields that CI monitor agents will populate, which depend on all upstream stages being defined.

| # | Document |
|---|---|
| 57 | `TMPL-quality-report-001` |
| 58 | `TMPL-performance-report-001` |
| 59 | `TMPL-anomaly-report-001` |
| 60 | `TMPL-bottleneck-report-001` |
| 61 | `TMPL-agent-behaviour-report-001` |
| 62 | `TMPL-ci-synthesis-001` |
| 63 | `TMPL-recommendations-001` |
| 64 | `TMPL-sysadmin-briefing-001` |
| 65 | `TMPL-change-directive-001` |

***

## Wave 13 — CI & SysAdmin Policies

**Dependency:** Wave 12 templates, SLA policies

| # | Document | Depends On |
|---|---|---|
| 66 | `CI Cycle Policy` | CI report templates, SLA Policy |
| 67 | `Impact Assessment Policy` | Dependency Policy (Wave 4), `TMPL-distribution-log-001` |
| 68 | `SLA Breach Response Policy` | Stage SLA Policy, `TMPL-anomaly-report-001`, CI Cycle Policy |
| 69 | `Change Management Policy` | `TMPL-change-directive-001`, all prior policies |
| 70 | `SysAdmin Escalation Policy` | CI Cycle Policy, Anomaly report template, SLA Breach Response Policy |

***

## Wave 14 — Procedures & Guides

**Dependency:** All policies and templates

Operational guides can only be written once all policies and templates are finalized — a guide that describes how to use a template that later changes requires rewriting the guide.

| # | Document |
|---|---|
| 71 | `Agent Onboarding Guide` (per agent class) |
| 72 | `Stage Operating Procedure` (per stage) |
| 73 | `SysAdmin Operations Guide` |
| 74 | `CI Cycle Operating Procedure` |
| 75 | `Context Delivery Guide` |

***

## Summary

| Wave | Documents | Key Gate Condition |
|---|---|---|
| 1 — Bootstrap | 4 | Manual founding process; all four must exist simultaneously |
| 2 — Content Templates | 9 | `TMPL-template-001` exists |
| 3 — Principles-Derived Policies | 4 | `TMPL-policy-001` exists |
| 4 — Technical Standards | 3 | Principles-derived policies exist |
| 5 — Reference Documents | 2 | Technical standards exist |
| 6 — Foundational Artefact Templates | 7 | Audit Trail + Verification Independence policies exist |
| 7 — Operational Lifecycle Policies | 6 | All Wave 6 templates exist |
| 8 — Agent Behaviour Policies | 5 | DoD templates + lifecycle policies exist |
| 9 — Stage Artefact Templates | 11 | Behaviour policies exist |
| 10 — SLA Policies | 2 | All stages fully defined |
| 11 — Knowledge & Learning Policies | 3 | Learnings template exists |
| 12 — CI Artefact Templates | 9 | All operational stages defined |
| 13 — CI & SysAdmin Policies | 5 | CI templates exist |
| 14 — Procedures & Guides | 5+ | Everything else exists |
| **Total** | **75+** | |

The only deliberate forward reference in the entire ordering is `Quality Threshold Policy` (Wave 8) which references SLA targets that aren't formalized until Wave 10. This is bounded and flagged — it can be authored with provisional thresholds and formally updated in Wave 10 without any other document needing to change.


### Wave 2 Template Corpus — Complete

| Doc ID         | File                     | Template ID        | Path                    |
| -------------- | ------------------------ | ------------------ | ----------------------- |
| DLMS-2026-0005 | DLMS-2026-0005-v0.1.0.md | TMPL-policy-001    | /dlms/corpus/templates/ |
| DLMS-2026-0006 | DLMS-2026-0006-v0.1.0.md | TMPL-standard-001  | /dlms/corpus/templates/ |
| DLMS-2026-0007 | DLMS-2026-0007-v0.1.0.md | TMPL-procedure-001 | /dlms/corpus/templates/ |
| DLMS-2026-0008 | DLMS-2026-0008-v0.1.0.md | TMPL-pattern-001   | /dlms/corpus/templates/ |
| DLMS-2026-0009 | DLMS-2026-0009-v0.1.0.md | TMPL-sla-001       | /dlms/corpus/templates/ |
| DLMS-2026-0010 | DLMS-2026-0010-v0.1.0.md | TMPL-reference-001 | /dlms/corpus/templates/ |
| DLMS-2026-0011 | DLMS-2026-0011-v0.1.0.md | TMPL-report-001    | /dlms/corpus/templates/ |

All nine Wave 2 content templates are now drafted. Two doc_types remain without templates — taxonomy and specification — but those are Wave 2 stragglers you can add at any time. The Wave 3 priorities (Principles-Derived Policies) can proceed now as TMPL-policy-001 is available, which is the only template they depend on.


### Wave 2 Template Corpus — Now Complete
All nine content doc_types now have templates. Full corpus:

| Doc ID         | Template ID            | Doc Type      | File                     |
| -------------- | ---------------------- | ------------- | ------------------------ |
| DLMS-2026-0005 | TMPL-policy-001        | policy        | DLMS-2026-0005-v0.1.0.md |
| DLMS-2026-0006 | TMPL-standard-001      | standard      | DLMS-2026-0006-v0.1.0.md |
| DLMS-2026-0007 | TMPL-procedure-001     | procedure     | DLMS-2026-0007-v0.1.0.md |
| DLMS-2026-0008 | TMPL-pattern-001       | pattern       | DLMS-2026-0008-v0.1.0.md |
| DLMS-2026-0009 | TMPL-sla-001           | sla           | DLMS-2026-0009-v0.1.0.md |
| DLMS-2026-0010 | TMPL-reference-001     | reference     | DLMS-2026-0010-v0.1.0.md |
| DLMS-2026-0011 | TMPL-report-001        | report        | DLMS-2026-0011-v0.1.0.md |
| DLMS-2026-0012 | TMPL-taxonomy-001      | taxonomy      | DLMS-2026-0012-v0.1.0.md |
| DLMS-2026-0013 | TMPL-specification-001 | specification | DLMS-2026-0013-v0.1.0.md |


Two things worth noting. First, the taxonomy template's singleton constraint (V03) makes the Approval Gate Agent the enforcer of DLMS-wide uniqueness — that gate check is worth adding to the Approval Gate Agent's specification when you author it. Second, the specification template's CONTEXT_BOUNDARY section is designed to be the direct source material for agent instruction authoring — when you write any agent's instruction file, its READS/WRITES/NEVER block comes verbatim from the corresponding agent specification's CONTEXT_BOUNDARY. That closes the loop between the spec corpus and the live agent instructions.

Wave 3 (Principles-Derived Policies) can now begin in full — all four policies need only TMPL-policy-001, which has been available since DLMS-2026-0005.

Wave 3 Progress
Doc ID	Document	Tier	Principles
DLMS-2026-0014	Verification Independence Policy	2	
​
DLMS-2026-0015	Audit Trail Policy	2	
​
Two design notes worth flagging. First, R11 in the Audit Trail Policy (audit queries are themselves audited) creates a clean self-referential closure — nothing touches the audit trail without leaving a trace, including reads. Second, the ENFORCEMENT note on the audit paradox is intentional: the Audit Trail Agent cannot fully self-verify its own integrity — that check must come from outside (Agent Behaviour Analyst in the CI cycle), which is itself an instance of Verification Independence (R05 in DLMS-2026-0014). The two policies reinforce each other structurally.

The remaining Wave 3 Tier 2 policies to author are whatever other principles from DLMS-2026-0001 still need direct enforcement — likely candidates being the Agent Context Boundary Policy (Principles 7 and 9), the DoD Policy (Principle 11), and the Retention Policy. Let me know which to tackle next.


### Wave 3 Progress — Updated

| Doc ID         | Document                         | Tier | Principles                |
| -------------- | -------------------------------- | ---- | ------------------------- |
| DLMS-2026-0014 | Verification Independence Policy | 2    | thedigitalprojectmanager​ |
| DLMS-2026-0015 | Audit Trail Policy               | 2    | docsie​                   |
| DLMS-2026-0016 | Agent Context Boundary Policy    | 2    | docparsemagic+1           |
| DLMS-2026-0017 | Multi-Perspective Review Policy  | 2    | jobrouter​                |

Three structural notes worth flagging across both documents.

First, DLMS-2026-0016 R04 and R05 make the reads/never boundary exhaustive and specific — this is intentional. A category-level reads declaration (e.g. "all approved policies") is a context overload risk because the set is unbounded as the corpus grows. Specificity at the specification level is the enforcement mechanism.

Second, DLMS-2026-0017 R12 creates a clean separation of concerns: the Approval Gate Agent evaluates the synthesis, not the document. This means the gate agent's context package is narrow and its decision surface is well-defined — it is not re-doing the review, it is evaluating whether the review was complete and passed. That is itself an application of Principles 7 and 9, making DLMS-2026-0017 and DLMS-2026-0016 mutually reinforcing.

Third, R09 in DLMS-2026-0017 deliberately allows conflicts to surface rather than suppressing them. Conflicts between independently-reached lens verdicts are signals, not failures — they reveal genuine ambiguity or tension in the document that silent averaging would hide.

The remaining Wave 3 candidates are the DoD Policy (Principle 11) and the Retention Policy, plus any other principles from DLMS-2026-0001 still needing direct Tier 2 enforcement.

---

### Wave 4 Progress


| Doc ID         | Document                 | Tier | Path                   |
| -------------- | ------------------------ | ---- | ---------------------- |
| DLMS-2026-0018 | Metadata Standard Policy | 4    | /dlms/corpus/policies/ |
| DLMS-2026-0019 | Taxonomy Policy          | 3    | /dlms/corpus/policies/ |

Three structural notes across both documents.

First, DLMS-2026-0018 deliberately does not define the content of the Retention Schedule (retention class definitions for RC-1 through RC-7) — it only enforces that RC-permanent is mandatory for the correct doc_types. The full retention schedule is Wave 5 material. R20 is written to be extensible when that schedule lands.

Second, DLMS-2026-0019 R03 introduces an important asymmetry: the Author Agent may propose tags at creation, but the Classification Agent has assignment authority. This separates intent (author) from controlled vocabulary enforcement (agent) — keeping the author in the creative path without letting them bypass taxonomy governance.

Third, R01 and R15 together create a forcing function on taxonomy major versions: you cannot approve a new major taxonomy version without a migration assessment, and you cannot have two approved taxonomies simultaneously. This makes taxonomy upgrades consequential and planned — never accidental.

### Wave 4 — Complete

| Doc ID         | Document                   | Tier | Path                   |
| -------------- | -------------------------- | ---- | ---------------------- |
| DLMS-2026-0018 | Metadata Standard Policy   | 4    | /dlms/corpus/policies/ |
| DLMS-2026-0019 | Taxonomy Policy            | 3    | /dlms/corpus/policies/ |
| DLMS-2026-0020 | Document Dependency Policy | 3    | /dlms/corpus/policies/ |

Three structural notes worth flagging.

First, R07 and R08 together form a two-layer cycle guard — R07 is the computational check (topological sort fails = cycle exists), while R08 is the semantic guard (hierarchy inversions in is-governed-by relationships are prohibited before they can even create a cycle). R08 catches the most common class of accidental cycle at declaration time rather than detection time.

Second, R13 and R14 together implement a change propagation discipline. When anything in the governance hierarchy changes, the full downstream impact is assessed before the change lands — not discovered afterward. This is the dependency graph's primary value beyond validation: it makes the cost of change visible before commitment.

Third, R15 closes a gap that would otherwise exist between body content and frontmatter: a rule can reference a doc_id in its checked_by field without the document ever formally declaring that relationship. Without R15, the dependency graph would be systematically incomplete — accurate in frontmatter but blind to the web of body-level references that constitute the real operational dependency structure.

---

### Wave 5