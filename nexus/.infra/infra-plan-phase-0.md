# Infra Plan — Phase 0

**Artefact:** infra-plan-phase-0  
**Phase:** phase-0 — Repository Foundation  
**Produced by:** infra-planner  
**Timestamp:** 2026-03-10T14:10:00+11:00  
**impact_class:** RC-standard  
**security_overlay:** false

---

## Classification

Impact × Uncertainty matrix (DLMS-2026-0107):

| Axis | Assessment | Value |
|---|---|---|
| Blast radius | All files are existing stubs; no downstream dependents yet | Low |
| Reversibility | All changes are trivially reversible (delete file; revert text patch) | Low |
| Security boundary | No gateway.ts, audit.ts, or gate.ts changes in this phase | No |
| Cross-cutting | TAR-001 patch affects all tiers — but is additive-only (relaxing a deny, not tightening) | Low |
| Feature novelty | All patterns established in prior bootstrap work | Low |
| Pattern coverage | nexus-phase-patterns SKILL.md exists; TAR-001 update format known | High |
| First-time execution | This is the first live pipeline run | Low (adds uncertainty but not high) |
| External interface change | No external interface touched | No |

**Result:** Impact LOW × Uncertainty LOW → **RC-standard** ✓ (consistent with nexus-phase-manifest.md)

---

## Ordered Output List

### Task 1: Patch TAR-001 to v0.3.1

**File:** `dlms/registry/tool-access-registry.md`  
**Change:** Additive patch — two rows in Cross-Cutting Services section
**Dependency:** None (standalone text edit)  
**Test criteria:**
  - `knowledge.readEntry` permitted roles include `infra-context-curator` — grep confirmable
  - `knowledge.writeEntry` permitted roles include `infra-verifier` AND `infra-knowledge-curator` — grep confirmable
  - Change log entry for v0.3.1 present  
  - TAR-001 header version field reads `0.3.1`

### Task 2: Verify nexus/ directory structure

**Files to confirm exist:**
  - `nexus/src/server.ts`
  - `nexus/src/db/client.ts`
  - `nexus/src/tools/shared/audit.ts`
  - `nexus/src/tools/shared/gateway.ts`
  - `nexus/src/tools/shared/gate.ts`

**Test criteria:** Each listed file exists and exports at least one symbol (not a completely empty file)

### Task 3: Verify .vscode/mcp.json

**File:** `.vscode/mcp.json`  
**Test criteria:**
  - File parses as valid JSON (no syntax errors)
  - `nexus-internal.disabled` === `true`
  - `nexus-external.disabled` === `true`

### Task 4: Verify nexus/.infra/ bootstrap files

**Files to confirm exist:**
  - `nexus/.infra/audit-trail.md`
  - `nexus/.infra/knowledge-base.md`
  - `nexus/.infra/nexus-phase-manifest.md`
  - `nexus/.infra/infra-routing-registry.md`

**Test criteria:** Each file exists and contains the correct Registry ID header

---

## Rollback Procedure

```bash
# Roll back TAR-001 patch (Task 1) — revert to v0.3.0
git checkout HEAD -- dlms/registry/tool-access-registry.md

# No other file changes to roll back — Tasks 2–4 are read-only verification
# If Task 2 stubs are missing and were created, roll them back:
git checkout HEAD -- nexus/src/
```

## rollback_trigger_conditions
  - infra_verification_failed for phase-0
  - result: FAIL from Infra Verifier
  - Manual FO directive

---

## Notes

The only substantive action in this phase is the TAR-001 v0.3.1 patch. All other tasks
are verification-only. The TAR-001 patch is additive (adds roles to permitted lists) and
does not remove any existing access grants. Risk is low; rollback is a single git revert.
