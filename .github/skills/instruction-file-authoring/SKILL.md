# SKILL: instruction-file-authoring

**Domain:** Agent instruction file (.agent.md) authoring per DLMS-2026-0114 FORMAT_A  
**Loaded by:** agent-instruction-author  
**Governed by:** DLMS-2026-0114, DLMS-2026-0108 R06

---

## AUTHORING_SEQUENCE

1. Retrieve approved `agent-spec` from TypeDB via `agentcreation.getArtefact`
2. Retrieve approved `agent-spec-review` — confirm `result: PASS`
3. Translate spec sections to FORMAT_A — do not invent beyond the spec
4. Self-count body tokens before calling `agentcreation.writeInstruction`
5. If body exceeds 400 tokens, extract overflow content to a SKILL.md companion (FORMAT_B)
6. Write instruction file to `.github/agents/{role_id}.agent.md`
7. Call `agentcreation.writeInstruction` with `agent-instruction-record` content

---

## FORMAT_A STRUCTURE

File path: `.github/agents/{role_id}.agent.md`

### Required Frontmatter
```yaml
---
name: {Title Case name — matches agent roster entry}
description: "{Single sentence: exact function AND invocation condition.}"
tools: [{exact tools from TOOL_ASSIGNMENT in spec — no additions, no omissions}]
model: Claude Sonnet 4.6 | Claude Haiku 4.5
user-invocable: false
disable-model-invocation: false
---
```
**`description` must be an inline single-line string.** Do NOT use `>` or `|` block scalar notation — the runtime silently drops the value. Quote the string if it contains colons.

Model selection: Sonnet for orchestrators, synthesis, review; Haiku for narrow executors.

### Required Body Sections (in order)
```
READS:   {specific file path or tool identifier}
WRITES:  {specific output target}
NEVER:   {hard prohibition}

## GATE_CONDITIONS        ← FIRST section always
- {precondition from spec STAGE_GATES/PRECONDITIONS}

## OUTPUT_FORMAT
result:      PASS | FAIL | BLOCKED
agent_id:    {role_id}
...

## RULES                  ← PENULTIMATE or final section always
MUST:
  - {positive obligation from spec}
NEVER:
  - {prohibition from spec CONTEXT_BOUNDARY/NEVER}

## SKILL_REFS             ← FINAL section only if skills present
```

---

## ORDERING_RULES (DLMS-2026-0114)

| ID | Rule | Test |
|---|---|---|
| ORDERING_RULE_01 | READS/WRITES/NEVER is first body content | Line 1 after `---` matches `/^READS:/` |
| ORDERING_RULE_02 | `## RULES` is penultimate or final section | No normative `##` heading follows `## RULES` |
| ORDERING_RULE_03 | `## GATE_CONDITIONS` immediately follows context declaration | First `##` heading is `## GATE_CONDITIONS` |
| ORDERING_RULE_04 | `## SKILL_REFS` is the final section if present | No `##` heading follows `## SKILL_REFS` |

---

## PROHIBITED_PATTERNS (DLMS-2026-0114)

| ID | Pattern | Reason |
|---|---|---|
| PROHIBITED_01 | `"You are a..."` | Prose role description |
| PROHIBITED_02 | `"Your role is..."` / `"Your job is..."` / `"As an agent..."` | Prose role description |
| PROHIBITED_03 | `"If relevant, load SKILL.md"` | Non-specific skill load condition |
| PROHIBITED_04 | Frontmatter tool with no matching MUST step or OUTPUT_FORMAT field | Speculative tool assignment |
| PROHIBITED_05 | Category refs in READS (e.g. "all policies", "relevant context") | Violates Named-Resource Rule |

---

## TOKEN_BUDGET_ENFORCEMENT

- **Target:** 400 tokens (from first char after frontmatter `---` to end of file)
- **Hard ceiling:** 440 tokens (10% tolerance for first draft)
- **Comments** (lines beginning `#`) count toward the budget
- If body exceeds 400 tokens: extract overflow to companion SKILL.md (FORMAT_B)
- Body between 400–440 tokens: flag as budget warning in `agent-instruction-record`
- Body exceeding 440 tokens: do not submit; refactor first

**Self-counting method:** Count before calling `agentcreation.writeInstruction`.
Record count as `body_token_count` in the `agent-instruction-record` content.

---

## VALIDATION_CHECKLIST (V01–V16)

Check all 16 before writing the instruction file. Return `result: FAIL` if any fail.

```
V01: File path = .github/agents/{role_id}.agent.md
V02: Frontmatter has name, description, tools, model, user-invocable
V03: tools[] exactly matches TOOL_ASSIGNMENT in approved spec
V04: model is Claude Haiku 4.5 or Claude Sonnet 4.6
V05: user-invocable is false unless spec explicitly states otherwise
V06: Body begins with READS: as first content
V07: Body has WRITES: and NEVER: in context declaration block
V08: ## GATE_CONDITIONS is first ## section
V09: ## RULES is penultimate or final ## section
V10: Body token count ≤ 440 (400 target)
V11: No PROHIBITED_01–PROHIBITED_05 patterns present
V12: Every frontmatter tool appears in at least one MUST rule or OUTPUT_FORMAT field
V13: SKILL_REFS entries (if present) have path, load_when, pinned_version
V14: Companion SKILL.md (if present) has correct frontmatter
V15: Companion SKILL.md body begins with ## PURPOSE
V16: Companion SKILL.md body ≤ 800 tokens
```

---

## AGENT-INSTRUCTION-RECORD CONTENT

The `agent-instruction-record` TypeDB payload written by `agentcreation.writeInstruction`:

```json
{
  "role_id":                 "{role_id}",
  "spec_review_artefact_id": "{UUID of the agent-spec-review artefact}",
  "instruction_path":        ".github/agents/{role_id}.agent.md",
  "body_token_count":        440,
  "format_a_conformant":     true,
  "author_actor_id":         "{this agent's actor_id}"
}
```

Gate for `agentcreation.writeInstruction`:
`assertAgentArtefactExists(role_id, 'agent-spec-review', { result: 'PASS' })`
