# SKILL: nexus-code-review

**Domain:** Nexus MCP server — code review checklist and test patterns  
**Loaded by:** infra-code-reviewer (always, at invocation)  
**Governed by:** DLMS-2026-0104, DLMS-2026-0107, platform-constraints.md

---

## REVIEW SEQUENCE

Run checks in this order. Fail-fast: if any BLOCKER is found, stop and return findings immediately.

```
1. TypeQL injection check          ← BLOCKER on any violation
2. Shared-transaction atomicity    ← BLOCKER on any violation
3. MCP handler contract            ← BLOCKER on missing schema or error types
4. Event type slug validation      ← BLOCKER on any mismatch
5. Gateway denial audit            ← BLOCKER if denial not audited before throw
6. OWASP scoped checks             ← BLOCKER on access control; WARNING on others
7. Positive / negative test cases  ← WARNING if missing; BLOCKER if present but wrong
```

---

## 1. TYPEQL INJECTION CHECKLIST

TypeQL queries must NEVER interpolate user-supplied values as raw strings.

**FAIL — string interpolation (injection risk):**
```typescript
// NEVER do this
tx.query.insert(`insert $x isa entity, has name "${userInput}";`);
tx.query.match(`match $x isa entity, has id "${request.docId}"; get $x;`);
```

**PASS — parameterised via TypeDB concept API or pre-validated enum:**
```typescript
// Option A: Validate input is a controlled enum value before use
const VALID_DOC_TYPES = ['policy', 'template', 'procedure'] as const;
if (!VALID_DOC_TYPES.includes(parsed.docType)) throw new Error('Invalid doc_type');
// ^ Now safe to use parsed.docType in a query — value space is bounded

// Option B: Use TypeDB ConceptMap — retrieve entity by known attribute, mutate via API
const entity = await tx.concepts.getAttributeType('doc_id');
```

**Check rule:** For every string value interpolated into a TypeQL query, verify that the value was either:
- Validated against a closed enum/allowlist before query construction, OR
- Retrieved from TypeDB in the same transaction (not from user input)

User-supplied free-text fields (title, description, payload strings) must NEVER appear in TypeQL query strings under any circumstance.

---

## 2. SHARED-TRANSACTION ATOMICITY

Every write handler must have a single transaction covering both the business write and the audit event.

**What to verify:**
- `appendAuditEvent()` is called with `tx` as first argument (not creating its own session)
- `tx.commit()` is called exactly once, after both writes
- `tx.close()` is called only in the `catch` block (not in `finally`)
- No intermediate `try/catch` between the business write and `appendAuditEvent()` call

**Atomicity test pattern:**
```typescript
// Test A: Force audit failure → business write must be absent
// Mock appendAuditEvent to throw before commit
// Assert: TypeDB entity NOT found after the failed call

// Test B: Force business failure → audit event must be absent
// Mock the business insert to throw before appendAuditEvent is called
// Assert: No audit_event entity in TypeDB after the failed call

// Test C: Both succeed → both present
// Normal invocation
// Assert: business entity found AND audit_event found in TypeDB
```

Absence of Test A and Test B is a WARNING (not BLOCKER) if the handler is a stub. Presence but incorrect assertions is a BLOCKER.

---

## 3. MCP HANDLER CONTRACT

Every registered tool must satisfy:

| Contract item | Requirement |
|---|---|
| `inputSchema` | JSON Schema object; NOT `{}` or omitted |
| `agentRole` field | Required string in input schema; used for gateway check |
| Error on bad input | Zod parse failure or equivalent before any TypeDB I/O |
| Error on denied access | `ToolAccessDeniedError` (from `gateway.ts`); never a generic Error |
| Error on missing gate artefact | `StageGateError` (from `gate.ts`); never a silent no-op |
| Return type | `{ content: [{ type: 'text', text: JSON.stringify(result) }] }` |

**BLOCKER:** Any handler that catches `ToolAccessDeniedError` or `StageGateError` and swallows them.  
**BLOCKER:** Any handler that returns a success response on input validation failure.

---

## 4. EVENT TYPE SLUG VALIDATION

All `event_type` values passed to `appendAuditEvent()` must exactly match a slug from the Event Type Registry (`dlms/registry/event-type-registry.md`).

**Rules:**
- Lowercase only
- Underscores only — no hyphens, no spaces, no dots
- Case-sensitive: `tool_access_denied` ≠ `Tool_Access_Denied`
- Must exist in ETR-001 — do not invent new slugs without a registry patch

**How to verify:**
1. Grep all `appendAuditEvent()` calls in the file under review
2. Extract each `event_type` string literal
3. Cross-reference against the `EVENT_TYPES` table in `dlms/registry/event-type-registry.md`
4. Flag any slug not found in the registry as a BLOCKER

---

## 5. GATEWAY DENIAL AUDIT

When `checkToolAccess()` denies a call, it must:
1. Insert an `audit_event` with `event_type: 'tool_access_denied'` before throwing
2. Throw `ToolAccessDeniedError` — never return a success value

The denial audit opens its own short-lived transaction (separate from the business write transaction, which never starts on denial). This is the one permitted exception to the shared-transaction rule.

**Verify in `gateway.ts` (Phase 2.4):**
```typescript
// The denial path must be:
//   1. Open short-lived write tx
//   2. appendAuditEvent(tx, { event_type: 'tool_access_denied', ... })
//   3. tx.commit()
//   4. throw new ToolAccessDeniedError(toolName, agentRole)
// NOT the other way around (throw before audit)
```

---

## 6. OWASP CHECKS (SCOPED TO TYPEDB + MCP)

| OWASP Category | Check |
|---|---|
| **A01 Broken Access Control** | BLOCKER: any handler that skips `checkToolAccess()` call; any role check done in handler code rather than gateway (gateway must be the single enforcement point) |
| **A03 Injection** | BLOCKER: TypeQL string interpolation of user input (see section 1) |
| **A09 Security Logging Failures** | BLOCKER: any write handler missing `appendAuditEvent()` in the shared transaction; denial path missing audit |
| **A05 Security Misconfiguration** | WARNING: `inputSchema: {}` on any registered tool; missing `agentRole` in schema |
| **A02 Cryptographic Failures** | N/A for current scope (no secrets in TypeDB or MCP layer) |

---

## 7. POSITIVE AND NEGATIVE TEST CASES

Every tool handler must have at least:

**Positive test (correct role):**
```
Given: agentRole matches TAR-001 permitted role for the tool
When: handler is called with valid input
Then: business entity created in TypeDB AND audit_event created with correct event_type
```

**Negative test (wrong role):**
```
Given: agentRole does NOT match any permitted role for the tool
When: handler is called
Then: ToolAccessDeniedError thrown AND tool_access_denied audit_event in TypeDB AND business entity NOT created
```

**Negative test (invalid input):**
```
Given: input fails schema validation (e.g., missing required field)
When: handler is called
Then: validation error thrown BEFORE TypeDB session is opened (no transaction created)
```

If tests are present, verify assertions match the above. Missing tests = WARNING (Phase 2 stubs accepted); wrong assertions = BLOCKER.

---

## REVIEW VERDICT FORMAT

Return findings in this exact structure:

```
VERDICT: PASS | FAIL | PASS_WITH_WARNINGS

BLOCKERS:
  - [section number] [finding description] [file:line]

WARNINGS:
  - [section number] [finding description] [file:line]

RECOMMENDATION:
  [One paragraph: what must change before executor proceeds]
```

`FAIL` if any BLOCKER is present. `PASS_WITH_WARNINGS` if warnings only. `PASS` if clean.
