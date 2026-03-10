# SKILL: nexus-phase-patterns

**Domain:** Nexus MCP server — implementation patterns for all build phases  
**Loaded by:** infra-planner (always), infra-executor (always)  
**Governed by:** DLMS-2026-0104, platform-constraints.md

---

## PHASE DEPENDENCY ORDER

Within Phase 2 (Nexus Core Build), files must be authored in this strict order.  
Each file has a compile-time dependency on the file before it.

```
1. nexus/src/db/client.ts       ← TypeDB client singleton, TYPEDB_URL env var
2. nexus/src/tools/shared/audit.ts     ← appendAuditEvent() — depends on client
3. nexus/src/tools/shared/gateway.ts   ← TAR-001 loader + ToolAccessDeniedError — depends on audit
4. nexus/src/tools/shared/gate.ts      ← assertStageArtefactExists + StageGateError — depends on client
5. nexus/src/server.ts          ← registers all tools, calls gateway init — depends on all above
```

For subsequent phases (4–9), the tool handler file for that phase is authored after server.ts exists.  
Each tool handler file is self-contained after import of audit/gateway/gate.

---

## TYPEDB WRITE TRANSACTION PATTERN

Every tool handler that mutates TypeDB data MUST follow this exact pattern.  
Business write and audit event share ONE transaction. If either fails, both roll back.

```typescript
// Canonical write handler pattern
async function myWriteHandler(input: MyInput, agentRole: string) {
  // 1. Validate input schema (zod or equivalent) — throw before opening transaction
  const parsed = MyInputSchema.parse(input);

  // 2. Gateway check — throws ToolAccessDeniedError + audits denial on failure
  //    Gateway audit opens its own short-lived transaction for denial events.
  checkToolAccess('my.toolName', agentRole);

  // 3. Open ONE shared transaction
  const session = await client.session(DATABASE_NAME, SessionType.DATA);
  const tx = await session.transaction(TransactionType.WRITE);

  try {
    // 4. Business write — insert/update TypeDB entities
    await tx.query.insert(`insert $x isa my_entity, has attribute "${parsed.field}";`);

    // 5. Audit event — MUST reuse tx, NEVER open its own transaction
    await appendAuditEvent(tx, {
      event_type: 'my_event_type',    // exact slug from ETR-001
      actor_id: agentRole,
      target_id: parsed.docId,
      payload: { /* relevant metadata */ }
    });

    // 6. Commit — both writes commit atomically
    await tx.commit();
  } catch (err) {
    await tx.close();
    throw err;
  } finally {
    await session.close();
  }
}
```

**Critical constraints:**
- `appendAuditEvent()` receives `tx` as first argument — it NEVER opens its own transaction
- No `try/catch` between business write and `appendAuditEvent()` call — they must both be inside the same `try` block
- `tx.commit()` is called exactly once; `tx.close()` is called only in the `catch` path

---

## TYPEDB READ TRANSACTION PATTERN

Read operations do NOT generate audit events.  
They use `TransactionType.READ` and do NOT call `appendAuditEvent()`.

```typescript
async function myReadHandler(input: MyInput, agentRole: string) {
  const parsed = MyInputSchema.parse(input);
  checkToolAccess('my.toolName', agentRole);   // gateway check still required

  const session = await client.session(DATABASE_NAME, SessionType.DATA);
  const tx = await session.transaction(TransactionType.READ);

  try {
    const iterator = tx.query.match(`match $x isa my_entity; get $x;`);
    const results = await iterator.collect();
    return results.map(/* map to return type */);
  } finally {
    await tx.close();
    await session.close();
  }
}
```

---

## MCP TOOL HANDLER SCAFFOLD

When registering a new tool in `server.ts`, follow this scaffold exactly.

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const agentRole = (args as any).agentRole as string;  // D-008: identity from tool call args

  switch (name) {
    case 'my.toolName': {
      const result = await myWriteHandler(args, agentRole);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    // ... other cases
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});
```

Tool registration (`server.setRequestHandler(ListToolsRequestSchema, ...)`) must declare:
- `name`: exact slug matching TAR-001
- `inputSchema`: JSON Schema object — never omit; never use `{}` (too permissive)
- `description`: one sentence; agent-readable

---

## TAR-001 LOAD PATTERN

TAR-001 is loaded into memory at server startup, not per-call. This prevents TOCTOU risk.

```typescript
// Called once in server.ts main() before server.connect()
async function loadToolAccessRegistry(): Promise<ToolAccessRegistry> {
  const raw = await fs.readFile(TAR_001_PATH, 'utf-8');
  return parseToolAccessRegistry(raw);  // parse YAML/MD table into lookup map
}
```

`checkToolAccess(toolName, agentRole)` uses the in-memory registry — no file I/O per call.

---

## ROLLBACK COMMANDS

If a Phase 2 file is found to be non-compliant after commit, roll back the specific file:

```bash
# Roll back a single file to last good commit
git checkout HEAD -- nexus/src/tools/shared/audit.ts

# Roll back multiple files
git checkout HEAD -- nexus/src/db/client.ts nexus/src/tools/shared/audit.ts

# If TypeDB schema was migrated and needs reverting
# Stop TypeDB, drop database, recreate from last known good schema file
docker compose -f nexus/docker-compose.yml down
docker compose -f nexus/docker-compose.yml up -d
# Then re-run schema migration from the previous version
```

Roll back at the file granularity listed in the dependency order. Rolling back `gateway.ts` requires also rolling back `server.ts`.

---

## ENV VAR REQUIREMENTS

| Variable | Default | Required by |
|---|---|---|
| `TYPEDB_URL` | `localhost:1729` | `nexus/src/db/client.ts` |
| `TYPEDB_DATABASE` | `nexus` | `nexus/src/db/client.ts` |

No other env vars are declared at the nexus layer. Do not add env vars without updating this skill.

---

## WHAT NOT TO DO

- Do NOT call `appendAuditEvent()` without passing the shared transaction
- Do NOT open a second transaction inside a handler that already has one open
- Do NOT string-interpolate user-supplied values directly into TypeQL queries (see nexus-code-review skill for full injection checklist)
- Do NOT register a tool in `server.ts` before its handler file compiles successfully
- Do NOT use `TypeQL delete` statements in any handler — schema mutation is Phase 3 only
