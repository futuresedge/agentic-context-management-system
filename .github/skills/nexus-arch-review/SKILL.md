# SKILL: nexus-arch-review

**Domain:** Nexus MCP server — architectural review against platform constraints  
**Loaded by:** infra-architecture-reviewer (always, at invocation)  
**Governed by:** DLMS-2026-0104, DLMS-2026-0107, platform-constraints.md

---

## REVIEW SEQUENCE

Run checks in this order. Stop and return findings at first BLOCKER in sections 1–3.  
Sections 4–7 are run regardless.

```
1. D-005 boundary check    ← BLOCKER: any non-code write bypassing MCP
2. D-008 identity check    ← BLOCKER: any runtime identity check in handler code
3. Two-Layer boundary      ← BLOCKER: wrong layer writing to wrong location
4. OCAP verification       ← BLOCKER: tool possession assumption violated
5. Audit atomicity matrix  ← BLOCKER: any write handler without shared-tx audit
6. Stage gate structure    ← BLOCKER: assertStageArtefactExists silently passing
7. TAR-001 load pattern    ← BLOCKER: per-call registry load
```

---

## 1. D-005 BOUNDARY CHECK

**Constraint (platform-constraints.md D-005):** The edit tool is binary and unscoped — any agent with the edit tool can modify any file. For this reason, all non-code writes (DLMS corpus documents, registry files, artefact files) must go through MCP tools, never the VS Code edit tool directly.

**What to check:**

For every artefact write in the phase plan:

| Artefact type | Permitted write mechanism |
|---|---|
| `nexus/src/**` code files | VS Code edit tool (Executor role) |
| `dlms/corpus/**` documents | MCP tool: `infra.writeCorpusDoc` (when Phase 5 complete) |
| `dlms/registry/**` files | MCP tool: `infra.updateRegistry` (when Phase 5 complete) |
| `nexus/.infra/**` bootstrap files | VS Code edit tool (bootstrap mode only, during Phase A) |
| `.github/agents/**` agent files | VS Code edit tool (Executor role) |
| `.github/skills/**` skill files | VS Code edit tool (Executor role) |

**BLOCKER:** Any plan step that uses the edit tool to write to `dlms/corpus/` or `dlms/registry/` outside of bootstrap mode.  
**BLOCKER:** Any plan step that uses an MCP tool to write to `nexus/src/` (MCP layer does not write its own source).

**Bootstrap mode exception:** During Phases A–C (before Phase 5 is operational), all writes to bootstrap files (`nexus/.infra/`) via VS Code edit tool are permitted by convention. This exception ends when Phase 5 MCP tools are live.

---

## 2. D-008 IDENTITY CHECK

**Constraint (platform-constraints.md D-008):** Tool possession = identity. An agent is identified solely by which tools it holds. There must be no runtime `agentId` or `userId` check in handler code — only `agentRole` (derived from which tool the agent called) is valid.

**What to check in handler code:**

**FAIL — runtime identity check:**
```typescript
// NEVER do this
if (request.params.agentId === 'infra-planner') { ... }
if (context.userId === EXPECTED_USER_ID) { ... }
```

**PASS — role derived from tool call:**
```typescript
// agentRole comes from the tool input — it is the responsibility of the
// TAR-001 gateway to verify that the calling agent is permitted to call this tool.
// The handler trusts agentRole because the gateway has already checked it.
const agentRole = (args as any).agentRole as string;
checkToolAccess(toolName, agentRole);  // gateway is the enforcement point
```

**BLOCKER:** Any code that checks a hardcoded agent ID, session token, or user ID in a handler.  
**BLOCKER:** Any code that re-implements access control logic that belongs in `gateway.ts`.

---

## 3. TWO-LAYER BOUNDARY

**Architecture (platform-constraints.md):**
- **VS Code layer:** `.github/agents/`, `.github/skills/`, `.vscode/` — agent instruction files, skill files, workspace config
- **Nexus MCP layer:** `nexus/src/`, `dlms/`, `dlms/registry/` — server code, corpus, registries

**Boundary rules:**

| Write direction | Permitted? |
|---|---|
| VS Code layer → code files in `nexus/src/` | YES (Executor writes source) |
| VS Code layer → `.github/agents/` agent files | YES (Executor writes agent files) |
| VS Code layer → `dlms/` directly (non-bootstrap) | NO after Phase 5 |
| Nexus MCP layer → `nexus/src/` (self-modification) | NO (server cannot rewrite its own source) |
| Nexus MCP layer → `dlms/corpus/` via MCP tools | YES (by design — write-through MCP) |
| Nexus MCP layer → `.github/agents/` | NO (MCP layer does not write VS Code layer files) |

**BLOCKER:** Any MCP tool handler that writes to `.github/` paths.  
**BLOCKER:** Any phase plan that proposes executing `nexus/src/` code modifications via an MCP tool.

---

## 4. OCAP VERIFICATION

**Model:** Object Capability (OCAP) — an agent can call a tool if and only if it possesses that tool. Possession = authorisation. There is no separate authorisation check at the VS Code layer.

**Architectural verification questions:**

1. Does the agent file (`*.agent.md`) list only the tools that TAR-001 grants to that role?
2. Does any tool listed in an agent file exceed what TAR-001 permits for that role?
3. Does the gateway (`gateway.ts`) enforce TAR-001 as the single source of access truth?
4. Is TAR-001 loaded at startup (not per-call)?

**BLOCKER:** Agent file lists a tool not permitted by TAR-001 for that role.  
**BLOCKER:** Gateway reads TAR-001 on every call rather than at startup (creates TOCTOU window and performance issue).  
**WARNING:** TAR-001 path hardcoded in gateway rather than from env var or config constant.

---

## 5. AUDIT ATOMICITY MATRIX

Every tool handler that writes data must appear in this matrix. Use it to verify completeness.

| Handler type | Business write? | Audit event? | Same transaction? |
|---|---|---|---|
| Data insert (corpus doc, registry entry, etc.) | YES | YES | REQUIRED |
| Data update (version bump, status change) | YES | YES | REQUIRED |
| Read-only query | NO | NO | N/A |
| Access denial (gateway) | NO (denied) | YES (denial) | Separate short-lived tx |
| Stage gate check (assertStageArtefactExists) | NO | NO (check only) | N/A |

**Verify for each write handler in scope:**
1. Locate the `appendAuditEvent()` call
2. Confirm it receives the same `tx` variable as the business write
3. Confirm `tx.commit()` follows both calls

**BLOCKER:** Any write handler missing from the matrix (no audit event at all).  
**BLOCKER:** `appendAuditEvent()` not receiving `tx` (opening its own transaction).

---

## 6. STAGE GATE STRUCTURE

`assertStageArtefactExists()` (from `gate.ts`) must:
- Throw `StageGateError` if the required artefact is not found
- NEVER return `false` or `null` on failure
- NEVER be wrapped in a `try/catch` that swallows `StageGateError`

**BLOCKER:** Any call to `assertStageArtefactExists()` where the `StageGateError` is caught and suppressed.  
**BLOCKER:** Any `submitVerification` handler that proceeds to commit when `assertStageArtefactExists()` would fail.  
**WARNING:** Stage gate called after the business write has already started (gate must be called first, before the transaction opens).

**Recommended gate pattern:**
```typescript
// 1. Assert gate (before opening any transaction)
await assertStageArtefactExists(stage, docId, artefactType);  // throws if missing

// 2. Only then open transaction and proceed
const tx = await session.transaction(TransactionType.WRITE);
```

---

## 7. TAR-001 LOAD PATTERN

TAR-001 must be loaded once at server startup, stored in memory, and referenced by all `checkToolAccess()` calls.

**BLOCKER:** `gateway.ts` reads TAR-001 from disk inside `checkToolAccess()` (per-call file I/O).  
**BLOCKER:** `gateway.ts` reads TAR-001 inside a tool handler rather than at startup.  
**WARNING:** No error thrown if TAR-001 file is missing at startup (server should refuse to start).

**Correct pattern:**
```typescript
// server.ts main():
const registry = await loadToolAccessRegistry(TAR_001_PATH);  // once at startup
initGateway(registry);  // gateway stores reference in module scope
await server.connect(transport);  // only then accept connections
```

---

## ARCHITECTURAL VERDICT FORMAT

Return findings in this exact structure:

```
VERDICT: PASS | FAIL | PASS_WITH_WARNINGS

BLOCKERS:
  - [section number] [D-00X / rule reference] [finding] [file or plan step]

WARNINGS:
  - [section number] [finding] [file or plan step]

ARCHITECTURAL_RISK:
  [One paragraph: what structural risk remains even after blockers are resolved]

RECOMMENDATION:
  [One paragraph: what must change before executor proceeds]
```

`FAIL` if any BLOCKER is present. `PASS_WITH_WARNINGS` if warnings only. `PASS` if clean.
