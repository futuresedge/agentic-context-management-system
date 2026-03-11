# Infra Definition of Done — Phase 0

**Artefact:** infra-dod-phase-0  
**Phase:** phase-0 — Repository Foundation  
**Produced by:** infra-dod-agent  
**Timestamp:** 2026-03-10T14:15:00+11:00  
**impact_class:** RC-standard  
**security_overlay:** false  
**DoD template:** retrieved via dod.getTemplate

---

## Criteria

All criteria are binary (PASS / FAIL). Each must be independently verifiable without
reading the plan or context artefacts.

| # | Criterion | Verification method |
|---|---|---|
| C01 | `dlms/registry/tool-access-registry.md` exists and header `Version:` field reads `0.3.1` | grep `\*\*Version:\*\* 0.3.1` in file |
| C02 | `knowledge.readEntry` row in TAR-001 includes `infra-context-curator` in `permitted_agent_roles` | grep `infra-context-curator` in TAR-001 |
| C03 | `knowledge.writeEntry` row in TAR-001 includes `infra-verifier` in `permitted_agent_roles` | grep `infra-verifier` in TAR-001 knowledge.writeEntry row |
| C04 | `knowledge.writeEntry` row in TAR-001 includes `infra-knowledge-curator` in `permitted_agent_roles` | grep `infra-knowledge-curator` in TAR-001 knowledge.writeEntry row |
| C05 | TAR-001 Change Log contains a `0.3.1` entry | grep `\| 0.3.1 \|` in TAR-001 |
| C06 | `nexus/src/server.ts` exists and contains `import` statement(s) | file exists + grep `import` |
| C07 | `nexus/src/db/client.ts` exists and contains `export` declaration | file exists + grep `export` |
| C08 | `nexus/src/tools/shared/audit.ts` exists and contains `export` declaration | file exists + grep `export` |
| C09 | `nexus/src/tools/shared/gateway.ts` exists and declares `ToolAccessDeniedError` | file exists + grep `ToolAccessDeniedError` |
| C10 | `nexus/src/tools/shared/gate.ts` exists and declares `StageGateError` | file exists + grep `StageGateError` |
| C11 | `.vscode/mcp.json` is valid JSON | parse file — no JSON syntax error |
| C12 | `.vscode/mcp.json` has `nexus-internal.disabled: true` | read `servers.nexus-internal.disabled` field |
| C13 | `.vscode/mcp.json` has `nexus-external.disabled: true` | read `servers.nexus-external.disabled` field |
| C14 | `nexus/.infra/audit-trail.md` exists and contains `Registry ID: ...` or header block | file exists + grep `audit` |
| C15 | `nexus/.infra/knowledge-base.md` exists | file exists |
| C16 | `nexus/.infra/nexus-phase-manifest.md` exists and contains `phase-0` entry | file exists + grep `phase-0` |
| C17 | `nexus/.infra/infra-routing-registry.md` exists and contains routing table for phase-0 | file exists + grep `phase-0` |
| C18 | `dlms/registry/event-type-registry.md` exists and header `Version:` field reads `0.3.0` or higher | grep Version field |

---

## Non-waivable Criteria

None — this is an RC-standard phase with no security-boundary-adjacent changes.

---

## Pass Threshold

All 18 criteria must PASS. Partial pass is FAILED overall.
