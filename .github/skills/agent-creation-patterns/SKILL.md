# SKILL: agent-creation-patterns

**Domain:** Tier 15B agent creation pipeline — TypeDB `agent_artefact` write/read patterns  
**Loaded by:** All 9 Tier 15B agents (agent-creation-orchestrator, agent-request-handler, agent-problem-analyst, agent-specification-author, agent-specification-reviewer, agent-instruction-author, agent-specification-verifier, agent-registry-updater, agent-retirement-coordinator)  
**Governed by:** DLMS-2026-0108, DLMS-2026-0112, DLMS-2026-0113, DLMS-2026-0115

---

## ARTEFACT_TYPE CONTROLLED VOCABULARY

Only these 7 values are valid for `artefact_type` on an `agent_artefact` entity.
Any other value must be rejected at the Zod layer before a TypeDB transaction opens.

```
agent-request-record        Written by: agentcreation.writeRequest
agent-problem-analysis      Written by: agentcreation.writeProblemAnalysis
agent-spec                  Written by: agentcreation.writeSpec
agent-spec-review           Written by: agentcreation.submitReview
agent-instruction-record    Written by: agentcreation.writeInstruction
agent-verification-record   Written by: agentcreation.submitVerification
agent-retirement-record     Written by: agentcreation.writeRetirement
```

Each `artefact_type` maps to exactly one MCP write tool. A write tool must never
write any `artefact_type` other than its designated type.

---

## AGENTCREATION.GETARTEFACT — READ PATTERN

Two query modes. Use the appropriate mode:

```typescript
// Mode 1: latest artefact by role_id + artefact_type (most common)
// Returns: most recently created agent_artefact for this role+type
agentcreation.getArtefact({ role_id: 'my-role-id', artefact_type: 'agent-spec' })

// Mode 2: specific artefact by artefact_id (for cross-reference checks)
// Returns: exact agent_artefact entity keyed by artefact_id
agentcreation.getArtefact({ artefact_id: 'uuid-v4-here' })
```

No audit event is emitted on read. The `content` field is returned as a parsed
JSON object. If no matching entity exists, the tool returns `null` — not an error.

---

## ASSERTAGENTARTEFACTEXISTS — GATE PATTERN

```typescript
import { assertAgentArtefactExists, AgentGateError } from '../shared/gate.js';

// Basic existence check
await assertAgentArtefactExists(roleId, 'agent-spec');

// Content-level gate (e.g. result: PASS required)
await assertAgentArtefactExists(roleId, 'agent-spec-review', { result: 'PASS' });
await assertAgentArtefactExists(roleId, 'agent-verification-record', { result: 'PASS' });
```

`AgentGateError` is thrown when the gate fails. It carries:
- `roleId`: the role_id being processed
- `missingArtefact`: the `artefact_type` that was not found or did not satisfy content check
- `constraint` (optional): description of the content-level constraint that failed

Gates that use `requiredContent` (result-level checks):
- `agentcreation.writeInstruction` gate: `agent-spec-review` must exist with `result: PASS`
- `agentcreation.updateRegistry` gate: `agent-verification-record` must exist with `result: PASS`

---

## AGENTCREATION WRITE TOOL PATTERN

Every `agentcreation.*` write tool follows the same atomic transaction pattern:

```typescript
import { checkToolAccess } from '../shared/gateway.js';
import { assertAgentArtefactExists, AgentGateError } from '../shared/gate.js';
import { appendAuditEvent } from '../shared/audit.js';
import { client, DATABASE_NAME } from '../../db/client.js';
import { SessionType, TransactionType } from 'typedb-driver';
import { v4 as uuidv4 } from 'uuid';

async function writeArtefactHandler(input: MyInput, agentRole: string) {
  const parsed = MyInputSchema.parse(input);          // 1. Zod validation
  checkToolAccess('agentcreation.myTool', agentRole); // 2. Gateway check

  // 3. Gate check — verifies prior-stage artefact exists in TypeDB
  await assertAgentArtefactExists(parsed.role_id, 'prior-artefact-type');
  // For result-level gates:
  // await assertAgentArtefactExists(parsed.role_id, 'agent-spec-review', { result: 'PASS' });

  const artefactId = uuidv4();
  const session = await client.session(DATABASE_NAME, SessionType.DATA);
  const tx = await session.transaction(TransactionType.WRITE);

  try {
    // 4. Insert agent_artefact entity
    await tx.query.insert(`
      insert $a isa agent_artefact,
        has artefact_id "${artefactId}",
        has role_id "${parsed.role_id}",
        has artefact_type "my-artefact-type",
        has content "${JSON.stringify(parsed.content).replace(/"/g, '\\"')}",
        has created_by "${agentRole}",
        has created_at "${new Date().toISOString()}";
    `);

    // 5. Audit event — reuse tx, NEVER open its own transaction
    await appendAuditEvent(tx, {
      event_type: 'artefact_created',        // exact slug from event-type-registry
      actor_id: agentRole,
      target_id: parsed.role_id,
      payload: { artefact_type: 'my-artefact-type', artefact_id: artefactId }
    });

    await tx.commit(); // 6. Atomic commit
    return { artefact_id: artefactId };
  } catch (err) {
    await tx.close();
    throw err;
  } finally {
    await session.close();
  }
}
```

**Critical constraints:**
- `appendAuditEvent()` receives `tx` as first argument — never opens its own transaction
- `assertAgentArtefactExists` must be called BEFORE the transaction opens (it uses its own read transaction internally)
- `artefact_id` is UUID v4 generated at write time; it becomes the TypeDB `@key`
- `content` is stored as a JSON string; callers receive it parsed

---

## ARTEFACT_CONTENT_SCHEMAS

Full JSON schemas for each `artefact_type`. All fields required unless marked nullable.

### agent-request-record
```json
{
  "request_id":                  "string (UUID v4)",
  "request_type":                "new_agent | retire_agent",
  "requesting_principal":        "string",
  "proposed_role_id":            "string (slug: /^[a-z][a-z0-9-]+$/)",
  "proposed_tier":               "integer",
  "proposed_tier_label":         "string",
  "problem_statement":           "string (2–5 sentences)",
  "evidence_of_need":            "string (valid CI report or SysAdmin directive doc_id)",
  "urgency":                     "routine | elevated | critical",
  "affected_tiers":              "integer[] (non-empty)",
  "status":                      "submitted | approved | rejected",
  "approval_artefact_id":        "string (UUID v4) | null",
  "sysadmin_approval_artefact_id": "string (UUID v4) | null (required non-null when request_type=retire_agent AND proposed_tier<=14)"
}
```

### agent-problem-analysis
```json
{
  "role_id":                  "string",
  "request_artefact_id":      "string (UUID v4)",
  "capability_gap":           "string (1 sentence)",
  "tier_assignment":          "integer",
  "tier_label":               "string",
  "recommendation":           "proceed_with_creation | modify_existing | reject",
  "dependency_risk":          "string[] (role_ids of affected agents)",
  "evidence_base":            "string[] (doc_ids)",
  "roster_confirmation":      "string (confirmation that no duplicate role exists)"
}
```

### agent-spec
```json
{
  "role_id":                      "string",
  "problem_analysis_artefact_id": "string (UUID v4)",
  "author_actor_id":              "string",
  "sections": {
    "AGENT_IDENTITY":       "string",
    "PURPOSE":              "string",
    "CONTEXT_BOUNDARY":     "string",
    "TOOL_ASSIGNMENT":      "string (markdown table)",
    "GOVERNING_POLICIES":   "string",
    "STAGE_GATES":          "string",
    "KNOWN_CONSTRAINTS":    "string",
    "CHANGE_LOG":           "string"
  }
}
```

### agent-spec-review
```json
{
  "role_id":               "string",
  "spec_artefact_id":      "string (UUID v4)",
  "reviewer_actor_id":     "string",
  "author_actor_id":       "string",
  "independence_confirmed": "boolean (true = reviewer ≠ author)",
  "nr_checks_passed":      "integer (0–14)",
  "failed_checks":         "string[] | null (NR IDs that failed; null if PASS)",
  "result":                "PASS | FAIL",
  "findings":              "string | null"
}
```

### agent-instruction-record
```json
{
  "role_id":                  "string",
  "spec_review_artefact_id":  "string (UUID v4)",
  "instruction_path":         "string (.github/agents/{role_id}.agent.md)",
  "body_token_count":         "integer (≤ 440)",
  "format_a_conformant":      "boolean",
  "author_actor_id":          "string"
}
```

### agent-verification-record
```json
{
  "role_id":                       "string",
  "instruction_artefact_id":       "string (UUID v4)",
  "verifier_actor_id":             "string",
  "instruction_author_actor_id":   "string",
  "independence_confirmed":        "boolean (true = verifier ≠ instruction author)",
  "vc_checks_passed":              "integer (0–7)",
  "failed_checks":                 "string[] | null (VC IDs that failed; null if PASS)",
  "result":                        "PASS | FAIL",
  "findings":                      "string | null"
}
```

### agent-retirement-record
```json
{
  "role_id":                       "string",
  "request_artefact_id":           "string (UUID v4)",
  "retiring_tier":                 "integer",
  "sysadmin_approval_artefact_id": "string (UUID v4) | null (required non-null when retiring_tier ≤ 14)",
  "dependents_resolved":           "boolean",
  "retirement_reason":             "string",
  "retired_actor_id":              "string"
}
```

---

## INDEPENDENCE ASSERTION RULES

Two stages require actor independence. Checked via content field comparison:

| Gate | Checked at | Rule |
|---|---|---|
| Spec review (STEP_04) | `agentcreation.submitReview` | `content.reviewer_actor_id` ≠ `agent-spec.content.author_actor_id` |
| Verification (STEP_06) | `agentcreation.submitVerification` | `content.verifier_actor_id` ≠ `agent-instruction-record.content.author_actor_id` |

Both checks use `agentcreation.getArtefact` to retrieve the prior-stage artefact
and compare actor IDs before any write occurs. If identity cannot be confirmed,
return `result: BLOCKED` — do not write the review/verification artefact.
