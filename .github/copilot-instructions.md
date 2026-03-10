# GitHub Copilot Instructions — Ethical Edge / DLMS

## What This Project Is

This workspace contains two things: a **Document Lifecycle Management System (DLMS)** — a governance framework for coordinating autonomous agents and humans in knowledge work — and an **Astro web application** that will eventually surface it.

The DLMS is the primary focus. The Astro app (`src/`) is a thin delivery layer; the DLMS corpus (`dlms/`) is where all substantive work happens.

---

## Project Structure

```
dlms/                               # The DLMS framework — primary work area
  corpus/
    corpus-index.md                 # Authoritative index of all 103 corpus documents, by tier
    policies/                       # Policies, SLAs, taxonomy, reference documents
    templates/                      # Document templates (TMPL-*) and artefact templates
    dod-templates/                  # Definition of Done templates (one per lifecycle stage)
    guides/                         # Procedures and onboarding guides (Wave 14)
  framework-principles.md           # 11 foundation principles — read this first
  dlms-agent-roster.md              # Full agent architecture and tier design (Tiers 1–14)
  context-engineering-approach.md   # Core philosophy: minimal scoped context
  gap-register.md                   # Corpus authoring history — all 103 docs drafted
  dlms-file-creation-process.md     # Wave dependency ordering (historical reference)
src/                                # Astro + React + TypeScript web app
  components/ui/                    # shadcn/ui components
  pages/
  layouts/
  styles/
.github/agents/                     # Agent instruction files (not yet authored)
```

---

## Document Conventions

### File Naming
All corpus documents follow strict naming:
```
{doc_id}-v{version}.md
```
Example: `DLMS-2026-0001-v0.1.0.md`

- `doc_id` format: `DLMS-{YYYY}-{NNNN}` (zero-padded to 4 digits)
- `version` format: semver `major.minor.patch`
  - Major: structural change
  - Minor: content change
  - Patch: correction

### Frontmatter Schema
Every DLMS document opens with a YAML frontmatter block. The 20 core fields are defined in `DLMS-2026-0004`. Key fields:

```yaml
---
doc_id:           DLMS-2026-NNNN
title:            Human Readable Document Name
doc_type:         policy | template | reference | taxonomy | standard | procedure | pattern | sla | report | specification
status:           draft | under_review | approved | superseded | archived
version:          0.1.0
created_at:       2026-03-08T10:00:00+11:00
created_by:       bootstrap:design-team
approved_at:      null
approved_by:      null
verified_by:      null
template_id:      TMPL-policy-001          # or bootstrap for Wave 1
template_ver:     0.1.0
tags:             [tag-one, tag-two]
supersedes:       null
superseded_by:    null
retention_class:  RC-permanent             # see DLMS-2026-0022 for retention classes
context_eligible: true
dependencies:
  - doc_id: DLMS-2026-0001
    rel:    is-governed-by               # is-governed-by | implements | references | supersedes
agent_path:       /dlms/corpus/policies/DLMS-2026-NNNN-vX.X.X.md
audit_ref:        AUDIT-DLMS-2026-NNNN
---
```

### Body Section Headings
Sections use `## UPPER_SNAKE_CASE` headings. These are machine-readable keys, not prose headings. Do not use Title Case or sentence case for section headings.

```markdown
## SUMMARY
## SCOPE
## DEFINITIONS
## RULES
## ENFORCEMENT
## DEPENDENCIES
## CHANGE_LOG
```

`SUMMARY` must be 3 sentences maximum, dense, no narrative.

---

## Authoring New Documents

**Current corpus state:** All 14 waves are complete — 103 documents drafted (DLMS-2026-0001 through DLMS-2026-0103). The next available doc_id is `DLMS-2026-0104`.

Before authoring any document:
1. Check `dlms/corpus/corpus-index.md` to confirm the doc_id is not already taken and to find the correct tier for the new document
2. Use the assigned template for the document's `doc_type` (see Wave 2 templates)
3. Assign the next sequential `doc_id` — currently `DLMS-2026-0104` and incrementing
4. Bootstrap documents (Wave 1) use `template_id: bootstrap`; all others reference their TMPL doc ID

**Template IDs by doc_type:**

| doc_type | template_id |
|---|---|
| policy | TMPL-policy-001 (DLMS-2026-0005) |
| standard | TMPL-standard-001 (DLMS-2026-0006) |
| procedure | TMPL-procedure-001 (DLMS-2026-0007) |
| pattern | TMPL-pattern-001 (DLMS-2026-0008) |
| sla | TMPL-sla-001 (DLMS-2026-0009) |
| reference | TMPL-reference-001 (DLMS-2026-0010) |
| report | TMPL-report-001 (DLMS-2026-0011) |
| taxonomy | TMPL-taxonomy-001 (DLMS-2026-0012) |
| specification | TMPL-specification-001 (DLMS-2026-0013) |

---

## Context Engineering Principles

This project applies a strict **minimal viable context** discipline to all agent instructions. When helping author agent files:

- An agent READS named files only — never categories or "all policies"
- An agent WRITES exactly one artefact to one location
- The NEVER field enumerates what the agent must not access even if reachable
- Instructions are written linter-style, not prose:

```
READS: creation-context.md only
WRITES: .framework/features/[slug]/draft-v0.1.md
FORMAT: per TMPL-policy-001
NEVER: read parent context packages or upstream artefacts
```

Critical rules go at the top of any instruction file. Boundaries go at the bottom. Nothing important in the middle.

---

## Corpus Completion Status

All 14 authoring waves are complete as of 2026-03-09. The wave dependency ordering is documented in `dlms/dlms-file-creation-process.md` for historical reference. All dependencies are now satisfied — new documents can reference any existing corpus doc without wave-blocking constraints.

The completed wave chain was:
- Wave 1 (Bootstrap) → Wave 2 (Content Templates) → Wave 3 (Principles-Derived Policies) → Wave 4 (Technical Standards) → Wave 5 (Reference Documents) → Wave 6 (Foundational Artefact Templates) → Wave 7 (Operational Lifecycle Policies) → Wave 8 (Agent Behaviour Policies) → Wave 9 (Stage Artefact Templates) → Wave 10 (SLA Policies) → Wave 11 (Knowledge & Learning Policies) → Wave 12 (CI Artefact Templates) → Wave 13 (CI & SysAdmin Policies) → Wave 14 (Procedures & Guides)

---

## Document Dependency Relationships

Valid `rel` values in the `dependencies` block (governed by DLMS-2026-0020):

| Relationship | Meaning |
|---|---|
| `is-governed-by` | This document is subject to the rules of the referenced document |
| `implements` | This document is the concrete realisation of the referenced document |
| `references` | This document cites the referenced document without formal governance |
| `supersedes` | This document replaces the referenced document |

---

## Tags

Tags use lowercase hyphen-separated slugs. Controlled vocabulary is defined in DLMS-2026-0021 (Taxonomy). Do not invent new tags without checking the taxonomy first. Each document should have at least one tag identifying its tier (e.g., `tier-4`, `tier-13`) and its doc_type (e.g., `policy`, `procedure`, `template`).

---

## Status Transitions

```
draft → under_review → approved → superseded | archived
```

All documents in the corpus are currently `draft`. Status transitions require a verification agent and an approval gate (pipeline work not yet operational).

---

## Things to Avoid

- Do not use prose section headings in DLMS documents (`## My Section` → wrong; `## MY_SECTION` → correct)
- Do not assign a doc_id without checking `corpus/corpus-index.md` for the highest existing ID (currently 0103; next is 0104)
- Do not add fields to frontmatter that are not defined in DLMS-2026-0004 unless the template for that doc_type specifies them
- Do not write narrative summaries longer than 3 sentences
- Do not create loose files in the corpus root — use the correct subdirectory:
  - `corpus/policies/` — policies, SLAs, taxonomy, reference documents
  - `corpus/templates/` — content templates (TMPL-*) and shared artefact templates
  - `corpus/dod-templates/` — Definition of Done templates only
  - `corpus/guides/` — procedures, operating guides, onboarding procedures

---

## Web App (Astro)

The Astro app uses:
- **Framework:** Astro 5 with React integration
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (add with `pnpm dlx shadcn@latest add [component]`)
- **Language:** TypeScript throughout

The app is in early scaffold state. The DLMS corpus is the live work area; the web app will eventually render and surface corpus documents.
