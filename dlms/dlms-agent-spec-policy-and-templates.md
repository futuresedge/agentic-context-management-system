# DLMS Agent Specification Policy & Templates

> **SUPERSEDED — 2026-03-10**
> Part 1 (Agent Creation Policy) has been formalised as **DLMS-2026-0108** (`dlms/corpus/policies/DLMS-2026-0108-v0.1.0.md`).
> Parts 2 and 3 (Orchestrator and Subagent templates) will be formalised as **DLMS-2026-0113** (Agent Specification Template) and **DLMS-2026-0114** (Agent Instruction File Template) in Wave 15.
> This document is retained as a working reference only. Governance authority rests with the corpus documents above.

---

Below are three deliverables: the governance policy (DLMS-format), an Orchestrator Agent template, a Subagent template, and recommended additional templates with rationale.

***

## Part 1 — Agent Creation Policy

This policy is a Tier 3 Operational Lifecycle document, governed by DLMS-2026-0001. Assign a doc_id via the Naming Convention Enforcer before authoring. 

```markdown
---
doc_id:              DLMS-2026-00XX        # assigned by Naming Convention Enforcer
doc_type:            policy
status:              draft
version:             0.1.0
created_at:          2026-03-09T10:32:00+11:00
created_by:          bootstrap:design-team
approved_at:         null
approved_by:         null
verified_by:         null
template_id:         TMPL-policy-001
template_ver:        0.1.0
tags:                [policy, agents, governance, context-engineering, vscode-copilot]
supersedes:          null
superseded_by:       null
retention_class:     RC-permanent
context_eligible:    true
tier:                3
principles_enforced: [3, 7, 9]
dependencies:
  - doc_id: DLMS-2026-0001
    rel:    is-governed-by
  - doc_id: DLMS-2026-0003
    rel:    is-governed-by
  - doc_id: DLMS-2026-0004
    rel:    is-governed-by
agent_path:          /dlms/corpus/policies/DLMS-2026-00XX-v0.1.0.md
audit_ref:           AUDIT-DLMS-2026-00XX
---

## SUMMARY
This policy governs the creation, structure, naming, scoping, and tool assignment
of all VS Code Copilot custom agents operating within the DLMS and Nexus Framework.
It applies to all Tier 1–12 agents defined in the DLMS Agent Roster and any
future agents added to the roster. It enforces structural ethics (P3), context
minimisation (Principle 7), and capability-based authority (T3).

## SCOPE
Applies to: All `.agent.md` files created for the DLMS system stored in
  `.github/agents/` (workspace) or an organisation-level agents registry.
Applies to: All agent files in `.claude/agents/` using Claude subagent format.
Applies to: All SKILL.md files loaded by agents as progressive disclosure resources.
Excludes: Prompt files (`.prompt.md`) and instruction files (`.instructions.md`),
  which are governed by the Prompt and Instruction File Policy (DLMS-2026-00YY).
Excludes: MCP server configuration, governed by the MCP Server Policy (DLMS-2026-00ZZ).

## DEFINITIONS

Agent:
  A `.agent.md` file defining a named, scoped AI participant with declared tools,
  instructions, and boundaries. Not synonymous with a chat session or prompt.

Context Window (Agent):
  The totality of tokens loaded into an agent's working memory at invocation,
  including frontmatter instructions, task prompt, and any referenced files.
  A finite resource that degrades in signal-to-noise ratio as it grows.

Orchestrator:
  An agent whose sole function is to delegate subtasks to subagents, gate on
  their outputs, and route results. An orchestrator never reads document content
  — only file paths and gate conditions.

Progressive Disclosure:
  The practice of keeping agent body instructions thin and loading supplementary
  content (rubrics, lenses, checklists) via SKILL.md files only when a task
  requires them. Preserves context budget and enables prompt caching.

Skill File:
  A SKILL.md file containing substantive task-specific content (rubrics, templates,
  checklists, format specifications) that an agent loads on demand. Never loaded
  at agent startup unless the task explicitly requires it.

Structural Authority:
  An agent's capability is defined entirely by its declared `tools` list.
  An agent cannot take an action unless it holds the corresponding tool.
  Runtime permission assertions are not structural authority and must not
  be used as a substitute for correct tool assignment.

Subagent:
  An agent invoked by an orchestrator to perform a focused, isolated subtask
  in its own context window. Subagents report only their final result back to
  the orchestrator, not intermediate work. Subagents set `user-invocable: false`
  unless direct user invocation is explicitly required.

Tool Set:
  A named collection of related tools defined in a `.jsonc` tool set file,
  referenceable as a single unit in agent frontmatter or prompts.

## RULES

### File_and_Naming_Rules

R01:
  rule:       Every agent must be defined in a `.agent.md` file. Claude-format
              agents in `.claude/agents/` must use plain `.md` files following
              the Claude subagent format.
  test:       File extension is `.agent.md` OR (path contains `.claude/agents/`
              AND extension is `.md`)
  checked_by: Naming Convention Enforcer; Template Validator

R02:
  rule:       Agent file names must use kebab-case, match the agent's `name`
              frontmatter field (lowercased, hyphens for spaces), and must be
              unique within the agent registry. Workspace agents are stored in
              `.github/agents/`. Additional locations must be registered via
              `chat.agentFilesLocations`.
  test:       filename (sans extension) == name.lower().replace(' ', '-') AND
              no duplicate filenames exist in any registered agent location
  checked_by: Naming Convention Enforcer

R03:
  rule:       Every agent file must declare `name` and `description` in
              frontmatter. The `description` must be a single sentence that
              precisely states what the agent does AND when it is invoked —
              both are required so orchestrators can select the correct agent.
  test:       frontmatter.name != null AND frontmatter.description != null AND
              description.contains(what) AND description.contains(when)
  checked_by: Template Validator

### Context_Minimisation_Rules

R04:
  rule:       Every agent body must begin with a structured context declaration
              block (READS / WRITES / NEVER) before any other content. READS
              must name specific file paths, not categories. WRITES must name
              exactly one output artefact and its path. NEVER must enumerate
              any file the agent could theoretically access but must not.
  test:       Agent body line 1 begins with `READS:` AND `WRITES:` is present
              AND `NEVER:` is present AND READS contains specific paths, not
              category descriptions
  checked_by: Template Validator; Perspective Reviewer (lens-agent-readability)

R05:
  rule:       Agent body instructions must use structured declarative syntax
              (linter-config style). Prose role descriptions are prohibited.
              Critical rules appear at the top; boundaries at the bottom.
              No important instruction may appear in the middle third of the
              body when the body exceeds 200 tokens.
  test:       Agent body does not begin with "You are a..." OR "Your role is..."
              AND context declaration block is present at top
              AND NEVER block is the last substantive section
  checked_by: Perspective Reviewer (lens-agent-readability)

R06:
  rule:       Agent body instructions must not exceed 400 tokens (excluding
              the frontmatter). Content exceeding this limit must be moved
              to a referenced SKILL.md file and loaded via progressive disclosure.
  test:       token_count(agent_body) <= 400
  checked_by: Template Validator; Context Curator (any stage)

R07:
  rule:       Skill files (SKILL.md) must use progressive disclosure: the
              SKILL.md frontmatter `description` field alone is always loaded;
              the body is loaded only when the agent determines the task
              requires it. Agents must not pre-load skill files at startup.
  test:       Agent body does not contain the full text of any SKILL.md file
              AND skill references use the `SKILL_REFS` section with load
              condition specified
  checked_by: Perspective Reviewer (lens-agent-readability)

### Tool_Assignment_Rules

R08:
  rule:       An agent's `tools` list must contain only the tools required
              for its specific task. No tool may be assigned speculatively
              "in case it is needed." Over-permissioned tools are a policy
              violation even if the agent does not use them.
  test:       Every tool in frontmatter.tools can be traced to a specific
              step in the agent's ROUTING or OUTPUT_FORMAT section
  checked_by: Perspective Reviewer (lens-accuracy); SysAdmin Governance Agent

R09:
  rule:       No agent may hold both an execution tool AND the verification
              tool for the same artefact it produces. The agent that writes
              an artefact must not be the agent that verifies it.
  test:       For every write tool T in agent A's tools: the agent responsible
              for verifying A's output does not share agent identity with A
  checked_by: SysAdmin Governance Agent; Perspective Reviewer (lens-accuracy)

R10:
  rule:       Orchestrator agents must declare `tools: ['agent']` as their
              primary tool. Orchestrators must not hold file-read, file-write,
              or terminal tools. They may hold `search` or `fetch` only if
              required to resolve gate condition paths.
  test:       IF agent_type == 'orchestrator' THEN
              'editFiles' NOT IN tools AND 'terminal' NOT IN tools AND
              'agent' IN tools
  checked_by: Template Validator

R11:
  rule:       Orchestrator agents must declare an explicit `agents` list
              (not `*`) containing only the subagents they are permitted
              to invoke. Use of `agents: *` is prohibited.
  test:       frontmatter.agents is an array AND frontmatter.agents != '*'
  checked_by: Template Validator

### Invocability_Rules

R12:
  rule:       Any agent intended for subagent-only use must set
              `user-invocable: false`. Any agent intended for user-direct
              invocation only must set `disable-model-invocation: true`.
              The deprecated `infer` field must not be used.
  test:       'infer' NOT IN frontmatter AND
              (user-invocable is declared OR disable-model-invocation is declared)
  checked_by: Template Validator

R13:
  rule:       Subagents must receive only the minimum task prompt needed for
              their specific work. Orchestrators must not pass full conversation
              history or upstream context to subagents — only the specific
              input file path(s) and task directive.
  test:       Orchestrator ROUTING section specifies named file paths as
              subagent inputs, not "all context" or "full conversation"
  checked_by: Perspective Reviewer (lens-agent-readability)

### Model_Selection_Rules

R14:
  rule:       Model selection must match task complexity. Narrow executor
              agents (single-file transform, format validation, metric capture)
              must use a fast/efficient model. Synthesis agents (review synthesis,
              context compression, problem analysis) must use a capable model.
              Orchestrators use the default model picker unless a specific
              model improves routing reliability.
  test:       Agents with OUTPUT_FORMAT containing single-field transforms
              specify a fast model (Haiku-class or equivalent)
              Agents with multi-document synthesis specify Sonnet-class or above
  checked_by: Perspective Reviewer (lens-accuracy)

R15:
  rule:       Agents that process multiple similar tasks in sequence (batch
              processing) must be designed to warm a skill cache on the first
              invocation and reuse it for subsequent ones. Sequential batch
              agents must not be re-invoked fresh per task when their
              instructions are identical across tasks.
  test:       High-volume agents (Context Curator, Perspective Reviewers,
              Metrics Agents) process tasks as sequential batches
  checked_by: Metrics Aggregator; Knowledge Base Agent

### Handoff_Rules

R16:
  rule:       Handoffs between agents in sequential workflows must be declared
              explicitly in the orchestrator's `handoffs` frontmatter block.
              Implicit context carryover between agents is prohibited.
  test:       IF agent defines a multi-step workflow THEN
              each stage transition is declared in handoffs[] with label,
              agent, and prompt fields populated
  checked_by: Template Validator

R17:
  rule:       Handoff prompts must be specific and context-carrying.
              Generic prompts such as "continue" or "proceed" are prohibited.
              The prompt must identify what was completed and what is expected next.
  test:       handoffs[].prompt.length > 20 AND handoffs[].prompt does not
              match /^(continue|proceed|next|go|start)$/i
  checked_by: Perspective Reviewer (lens-agent-readability)

## EXCEPTIONS_PROCESS
Tier 3 policy. Exception requests must be submitted to the SysAdmin Escalation
pipeline (see SysAdmin Escalation Policy). The SysAdmin Governance Agent has
approval authority for time-limited rule exceptions. Exceptions produce an
`exception-grant.md` artefact with: rule_id, justification, expiry_date,
approved_by. No exception may last longer than 30 days without renewal.
Rules R09 (no self-verification) and R11 (explicit agents list) are
non-waivable — no exceptions apply.

## ENFORCEMENT
primary_agent:    Template Validator; Perspective Reviewer (lens-agent-readability)
gate_positions:
  - Pre-creation: Naming Convention Enforcer validates R01, R02 before Author activates
  - Post-draft: Template Validator checks R03–R07, R10–R13, R16–R17
  - Review stage: Perspective Reviewer (lens-accuracy) checks R08, R09, R14
  - Ongoing: SysAdmin Governance Agent audits tool assignments quarterly
audit:            All violations written to append-only audit-trail.log via
                  Audit Trail Agent with fields: rule_id, agent_file, violation_type,
                  timestamp, resolution_status
violation_type:   Tier 3 operational violation
escalation:       Per SysAdmin Escalation Policy (DLMS-2026-00ZZ)

## REVIEW_SCHEDULE
interval_max:     6 months
trigger_conditions:
  - VS Code custom agents API changes (new frontmatter fields, deprecated fields)
  - Addition of 10 or more new agents to the DLMS Agent Roster
  - Continuous Improvement synthesis identifies agent design pattern failures
  - Any rule violation rate exceeds 15% in a rolling 30-day window

## CHANGE_LOG
- v0.1.0 | 2026-03-09 | bootstrap:design-team | Initial draft
```

***

## Part 2 — Orchestrator Agent Template

Reflects the DLMS design decision that orchestrators are "the least intelligent-looking parts of the system — they hold almost no information." 

```markdown
---
name: [Stage-Name] Orchestrator
description: Routes [document type] through the [stage name] pipeline by activating [Worker-A], [Worker-B], [Worker-C] in sequence. Invoked by the DLM System Orchestrator when a document reaches [stage name] gate.
tools: ['agent']
agents: ['Worker-Agent-A', 'Worker-Agent-B', 'Worker-Agent-C', 'Stage-Verifier']
user-invocable: false          # Orchestrators are invoked by the System Orchestrator
disable-model-invocation: false
model: Claude Sonnet 4.6      # Capable enough for gate logic; not needed for content
handoffs:
  - label: Advance to [Next-Stage]
    agent: [next-stage-orchestrator]
    prompt: >
      [Stage-Name] complete. Verification passed. Document at
      [stage-output-path]. Proceed with [next-stage-name].
    send: false
---
READS:   [stage-name]-gate-conditions.md | routing-registry.md
WRITES:  [stage-name]-routing-instructions.md
NEVER:   Document body content; any file not listed above; upstream stage outputs

## GATE_CONDITIONS
# All conditions must be TRUE before this orchestrator activates.
# Check these before invoking any subagent.
GATE_IN:
  - [prerequisite-file-path] exists AND status == 'verified'
  - [dod-file-path] exists AND approved_by != null

## ROUTING
# Sequential steps. Each step receives ONLY the named file path, not content.
STEP_01:
  invoke:  [Worker-Agent-A]
  pass:    [exact/path/to/input-file.md]
  gate:    [Worker-Agent-A output path] exists AND result == 'PASS'

STEP_02:
  invoke:  [Worker-Agent-B]
  pass:    [exact/path/to/worker-a-output.md]
  gate:    [Worker-Agent-B output path] exists AND result != 'BLOCKED'

# Parallel group — invoke concurrently, wait for all before continuing
PARALLEL_GROUP_01:
  invoke:  ['[Perspective-Reviewer-A]', '[Perspective-Reviewer-B]', '[Perspective-Reviewer-C]']
  pass:    [exact/path/to/context-package.md]
  gate:    all three output files exist

STEP_03:
  invoke:  [Synthesizer-Agent]
  pass:    [reviewer-a-output.md] | [reviewer-b-output.md] | [reviewer-c-output.md]
  gate:    synthesis-output.md exists

STEP_04:
  invoke:  [Stage-Verifier]
  pass:    [synthesis-output.md] | [stage-dod.md]
  gate:    verification-output.md exists AND status == 'VERIFIED'

## FAILURE_HANDLING
ON_GATE_FAIL:
  action:  halt pipeline
  write:   FAIL reason to [stage-name]-routing-instructions.md
  escalate: SysAdmin Escalation Policy (DLMS-2026-00ZZ)
  never:   skip a gate; mark a gate as passed without subagent output

## OUTPUT_FORMAT
[stage-name]-routing-instructions.md:
  status:    COMPLETE | FAILED | PENDING
  stage:     [stage-name]
  doc_id:    [document being processed]
  steps_completed: [list]
  failure_reason:  null | [reason]
  next_stage_input: [file path for next orchestrator]
```

***

## Part 3 — Subagent Template

The body is a linter config, not a job description — per the context engineering principle. See available tools for agents with their explanations at the bottom of this document. Subagents are not user-invocable and must be designed for progressive disclosure — only loading the skill files they need when they need them.

```markdown
---
name: [Precise-Task Agent]
description: [Single sentence: exact function] when [exact trigger/invocation condition]. Returns [exact output artefact name]. [One sentence on what it does NOT do.]
tools: ['read/readFile']      # include only tools this agent actually uses
user-invocable: false              # subagent-only; hidden from agent picker
disable-model-invocation: false    # orchestrators may invoke this agent
model: Claude Haiku 4.5            # fast model for narrow executor tasks
                                   # upgrade to sonnet for synthesis tasks
---
READS:   [exact/path/to/input-file.md]
         # Name the file, not a category. One or two files maximum.
WRITES:  [exact/path/to/output-file.md]
         # One artefact. One location. Never more.
NEVER:   [upstream-context-file.md]; [any file not listed in READS]
         # Explicit prohibitions prevent accidental context loading.

## OUTPUT_FORMAT
# Precise schema for the output artefact. No ambiguity.
# Use field: value pairs. Declare all required fields.
result:        PASS | FAIL | BLOCKED
agent_id:      [this agent's name]
doc_id:        [document being processed]
input_path:    [path received from orchestrator]
output_path:   [exact path this agent writes to]
findings:      [structured field — define structure below]
  # findings schema:
  field_name:  [type and constraints]
  field_name:  [type and constraints]
timestamp:     ISO-8601
notes:         [optional free-text — non-normative only]

## RULES
# Declarative constraints. Not explanations.
MUST:
  - [Specific positive obligation — what agent must always produce/check]
  - [Specific positive obligation]
NEVER:
  - [Hard prohibition — what agent must never do]
  - [Hard prohibition]
  - read any file not listed in READS above
  - mark result as PASS if any required field in OUTPUT_FORMAT is null

## SKILL_REFS
# Skills loaded on demand only. Not pre-loaded at startup.
# Load condition must be specific — not "if relevant."
skills:
  - name:      [skill-name]
    path:      .github/skills/[skill-name]/SKILL.md
    load_when: "[Exact condition that triggers this skill load]"
```

***

## Part 4 — Suggested Additional Templates

These templates address patterns that recur across the DLMS 98-agent roster. Each maps to a distinct agent archetype. 

### 4a — Context Curator Agent Template

Every lifecycle stage has a Context Curator whose "input is intentionally larger than its output." This template enforces that contract. 

```markdown
---
name: Context Curator ([Stage-Name])
description: Compresses all available [stage-name] intake materials into a minimum-sufficient context package for [downstream-agent]. Invoked first in every [stage-name] pipeline run. Returns context-package.md only.
tools: ['read/readFile', 'edit/createFile', edit/editFile]
user-invocable: false
model: Claude Sonnet 4.6     # needs capability to identify signal vs noise
---
READS:   [intake-file-1.md] | [intake-file-2.md] | [intake-file-3.md]
         # List ALL files this curator may receive. It reads broadly to compress narrowly.
WRITES:  [stage-name]-context.md
NEVER:   Pass full intake content downstream. The output MUST be smaller than the input.

## COMPRESSION_RULES
INCLUDE:
  - Information the downstream agent [downstream-agent-name] needs to do its task
  - Relevant constraints from [policy-doc-id]
  - Prior learnings from Knowledge Base Agent (query on demand for this doc-type)
EXCLUDE:
  - Metadata not relevant to the task
  - Historical versions unless version delta is the subject of analysis
  - Sections of source documents not referenced by the downstream agent's task

## OUTPUT_FORMAT
[stage-name]-context.md:
  doc_id:        [document being processed]
  doc_type:      [type]
  task_brief:    [1–3 sentence summary of what the downstream agent must do]
  relevant_content:
    [section-key]: [compressed extract — not full section verbatim]
  constraints:   [list of applicable rules from relevant policies]
  patterns:      [0–3 prior learnings from knowledge base, if relevant]
  excluded:      [brief note on what was intentionally excluded and why]

## RULES
MUST:
  - Query Knowledge Base Agent for prior learnings before writing output
  - Produce output that is token-count smaller than aggregate input
  - Include a populated `excluded` field explaining compression decisions
NEVER:
  - Pass intake files directly to downstream agents
  - Include patterns that are not relevant to this document type and stage
  - Omit the task_brief field
```

### 4b — Perspective Reviewer Agent Template

Maps directly to the Tier 5 review pattern where multiple reviewers run in parallel, each loading a different lens as a skill file. 

```markdown
---
name: Perspective Reviewer ([Lens-Name])
description: Reviews [document type] through the [lens-name] lens (e.g. accuracy, completeness, agent-readability, structure). Invoked in parallel with other Perspective Reviewers by the Review Orchestrator. Loads lens skill file on demand.
tools: ['read/readFile', 'edit/createFile', edit/editFile]
user-invocable: false
model: Claude Sonnet 4.6 
---
READS:   [stage-name]-context.md
         # Reads the curated context package ONLY — not the draft document directly.
WRITES:  review-[lens-name].md
NEVER:   Read draft document directly; read other reviewers' outputs; share findings
         before writing own output (independence must be preserved)

## LENS
# This reviewer applies exactly one lens. The lens is loaded as a skill file.
active_lens: [lens-name]
skill_ref:   .github/skills/lens-[lens-name]/SKILL.md
load_when:   always (lens is required for every review invocation)

## OUTPUT_FORMAT
review-[lens-name].md:
  reviewer:      [this agent name]
  lens:          [lens-name]
  doc_id:        [document being reviewed]
  result:        PASS | FAIL | CONDITIONAL
  findings:
    critical:    [list — must-fix issues blocking approval]
    advisory:    [list — should-fix issues not blocking approval]
    commendable: [list — what the document does well under this lens]
  recommendation: APPROVE | REVISE | REJECT
  confidence:    HIGH | MEDIUM | LOW
  timestamp:     ISO-8601

## RULES
MUST:
  - Apply ONLY the lens declared in active_lens
  - Distinguish critical (approval-blocking) from advisory findings
  - Populate commendable — reviewers must acknowledge strengths
  - Load the lens skill file before writing any finding
NEVER:
  - Apply multiple lenses in a single review pass
  - Read other reviewers' outputs before writing own output
  - Mark result as PASS if any critical finding is present
```

### 4c — Verifier / DoD Gate Agent Template

Appears in every stage as the structural independence gate. Critical: this agent must never share tools with the executor it verifies. 

```markdown
---
name: [Stage-Name] Verifier
description: Performs independent verification of [stage-name] output against the pre-defined Definition of Done ([stage-name]-dod.md). Invoked as the final gate in every [stage-name] pipeline run. Produces a binary VERIFIED/FAILED result. Does not revise or fix — only verifies.
tools: ['read/readFile', 'edit/createFile', edit/editFile]
  # MUST NOT include any tool also held by the agent being verified.
user-invocable: false
model: Claude Sonnet 4.6 
---
READS:   [stage-output-file.md] | [stage-name]-dod.md
         # The output being verified AND the DoD it must be verified against.
         # Nothing else. Never the full document history.
WRITES:  [stage-name]-verification.md
         [stage-name]-learnings.md
NEVER:   Revise or edit [stage-output-file.md]; access upstream stage outputs;
         verify against criteria not present in [stage-name]-dod.md

## VERIFICATION_PROTOCOL
FOR EACH criterion in [stage-name]-dod.md:
  1. Locate corresponding evidence in [stage-output-file.md]
  2. Assess: evidence present AND evidence satisfies criterion (binary)
  3. Record result per criterion in verification output

RESULT_LOGIC:
  VERIFIED:  ALL criteria have evidence AND all evidence satisfies criterion
  FAILED:    ANY criterion has no evidence OR evidence does not satisfy criterion
  PARTIAL:   prohibited — result is always binary

## OUTPUT_FORMAT
[stage-name]-verification.md:
  verifier:     [this agent name]
  stage:        [stage-name]
  doc_id:       [document verified]
  dod_version:  [version of DoD used]
  result:       VERIFIED | FAILED
  criteria_results:
    - criterion_id:  [id from DoD]
      evidence_ref:  [section in stage-output-file.md containing evidence]
      satisfied:     true | false
      notes:         [optional — only for failed criteria]
  timestamp:    ISO-8601

[stage-name]-learnings.md:
  pattern:      [what worked well or failed in this stage run]
  doc_type:     [document type processed]
  stage:        [stage-name]
  outcome:      VERIFIED | FAILED
  root_cause:   [if FAILED: what caused the failure]
  recommendation: [if pattern is recurrent: proposed improvement]

## RULES
MUST:
  - Check every criterion in the DoD — no criterion may be skipped
  - Write a learnings entry regardless of verification result
  - Submit learnings to Knowledge Base Agent after writing
NEVER:
  - Mark VERIFIED if any criterion is unsatisfied
  - Modify the artefact being verified
  - Use judgment to "pass close enough" — binary only
```

### 4d — SKILL.md (Agent Skill File) Template

This is the progressive disclosure layer — the substantive content that agents load on demand rather than at startup. Maps directly to the context engineering caching strategy. 

```markdown
---
name: [skill-name]           # kebab-case; must match parent directory name
description: [What this skill enables the loading agent to do] when [specific condition].
  Load this skill when [precise trigger condition — be specific enough that the agent can make an unambiguous load/no-load decision]. Maximum 1024 characters.
---

# [Skill Name]

## PURPOSE
[One paragraph. What this skill enables. When to use it. What it does NOT cover.]

## WHEN_TO_LOAD
Load this skill when:
- [Specific condition 1]
- [Specific condition 2]
Do NOT load when:
- [Condition where a different skill applies]

## [CORE_CONTENT_SECTION]
# Replace with actual skill content: rubric, checklist, format spec, etc.
# Keep declarative and structured. Prose rationale belongs in NOTES, not here.

### [Sub-section]
[Content]

## OUTPUT_EXPECTATIONS
# What the loading agent should produce after applying this skill.
[Expected output structure or delta to the agent's standard output format]

## EXAMPLES
# Optional but high-value for skills with complex outputs.
# One minimal example: input snippet → expected output snippet.
INPUT:  [minimal example]
OUTPUT: [expected result]

## NOTES
# Non-normative. Rationale, edge cases, known limitations.
# This section does not constitute instructions.
```

***

## Other Templates Worth Creating

Beyond the four above, these additional templates address specific roster archetypes and would complete the agent authoring kit. 

| Template | Roster Agents It Serves | Key Design Constraint |
|---|---|---|
| **DoD Agent Template** | `DoD Agent (Creation)`, `DoD Agent (Review)`, etc. | Must write DoD *before* executor activates; reads doc-type + analysis output only |
| **Metrics Agent Template** | All `[Stage] Metrics Agents`, `Metrics Aggregator` | Read-only on event log; write structured metrics; never read document content |
| **Index Updater Agent Template** | `Master Index Updater`, `Tag Index Updater`, etc. | Atomic append-only writes; must check for duplicates; tool set: `readFiles + editFiles` on index files only |
| **Tool Set Definition Template** | Reusable across all tiers | Groups read-only tools (`readFiles`, `search`, `usages`) vs write tools (`editFiles`) to enforce capability separation at the tool-set level |
| **Audit/Cross-Cutting Agent Template** | `Audit Trail Agent`, `Knowledge Base Agent` | Append-only writes; receive events, never initiate; must not gate or block any pipeline |

The **Tool Set Definition Template** is particularly high-value: defining canonical `dlms-read-only` and `dlms-write` tool sets means orchestrators can assign pre-validated tool bundles rather than composing tool lists individually, reducing R08 violations at scale. 


## Available Tools for Agents included in VSCode Copilot custom agents API. Each tool must be explicitly declared in the agent's `tools` frontmatter field to be used.

```
vscode/askQuestions: allows agent to ask human user questions in the chat tool
vscode/runCommand: allows agent to run a command in the terminal
read/readFile: allows agent to read the contents of a file
sequentialthinking/sequentialthinking: allows agent to break down a complex task into smaller steps and execute them in order
edit/createDirectory: allows agent to create a new directory
edit/createFile: allows agent to create a new file
edit/editFiles: allows agent to edit existing files
search/changes: allows agent to search for recent changes in the codebase
search/codebase: allows agent to search for specific code snippets or patterns in the codebase
search/fileSearch: allows agent to search for files by name or content
search/listDirectory: allows agent to list the contents of a directory
search/searchResults: allows agent to view and navigate search results
search/textSearch: allows agent to search for specific text in the codebase
search/usages: allows agent to find all usages of a specific function, variable, or class in the codebase
todo: allows agent to create and manage a to-do list for tracking tasks and subtasks
```