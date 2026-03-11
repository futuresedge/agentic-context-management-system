# SKILL: spec-verification-criteria

**Domain:** Agent specification verification — 7 VC criteria and independence rules  
**Loaded by:** agent-specification-verifier  
**Governed by:** DLMS-2026-0115 GATE_05, DLMS-2026-0114, DLMS-2026-0108 R07–R08

---

## VERIFICATION_SEQUENCE

1. Confirm identity independence BEFORE any other step
2. Retrieve `agent-instruction-record` from TypeDB via `agentcreation.getArtefact`
3. Read deployed instruction file at `.github/agents/{role_id}.agent.md`
4. Retrieve `agent-spec` from TypeDB for content comparison
5. Evaluate all 7 VC criteria — record pass/fail for each
6. If all 7 pass: write `agent-verification-record` with `result: PASS`
7. If any fail: write `agent-verification-record` with `result: FAIL` + `failed_checks` + `findings`
8. Call `agentcreation.submitVerification`

Do NOT edit the instruction file under any circumstance. Return FAIL with findings.

---

## INDEPENDENCE_CHECK (DLMS-2026-0108 R07)

Must be asserted before any VC evaluation begins.

```
1. getArtefact(role_id, 'agent-instruction-record') → content.author_actor_id
2. Compare with own verifier_actor_id
3. If verifier_actor_id == author_actor_id → return result: BLOCKED
   (cannot verify own work — escalate to agent-creation-orchestrator)
4. If identities differ → record independence_confirmed: true and proceed
```

Partial PASS is not permitted. BLOCKED is not PASS. Do not proceed past independence check if blocked.

---

## VC CRITERIA (7 mandatory, all-or-nothing)

| ID | Criterion | Test |
|---|---|---|
| VC-01 | Instruction file conforms to DLMS-2026-0114 FORMAT_A structure | All V01–V16 validation rules from DLMS-2026-0114 pass |
| VC-02 | Body token count ≤ 440 | Count tokens from first char after frontmatter `---` to EOF |
| VC-03 | READS/WRITES/NEVER is first body content | First line after frontmatter `---` matches `/^READS:/` |
| VC-04 | Every frontmatter tool justified by a MUST step or OUTPUT_FORMAT field | Cross-reference frontmatter `tools[]` against RULES and OUTPUT_FORMAT |
| VC-05 | No prohibited patterns (PROHIBITED_01–PROHIBITED_05) present | Scan body for each prohibited pattern; fail if any match found |
| VC-06 | Instruction content matches approved spec — no invented content | Compare each frontmatter field, READS/WRITES/NEVER, MUST/NEVER rules against `agent-spec.content.sections` |
| VC-07 | All 7 DLMS-2026-0115 gate conditions satisfied for this role_id | Check TypeDB: agent-request-record, agent-problem-analysis, agent-spec, agent-spec-review (PASS), agent-instruction-record all exist |

---

## VC-01 vs VC-06 DISTINCTION

**VC-01** asks: is the instruction file structurally valid per DLMS-2026-0114 FORMAT_A?  
**VC-06** asks: does the instruction file faithfully represent the approved spec?

VC-01 is a format check. VC-06 is a fidelity check. Both must pass independently.

VC-06 failures (invented content examples):
- A `READS` entry that does not appear in spec `CONTEXT_BOUNDARY`
- A tool in `tools[]` absent from spec `TOOL_ASSIGNMENT`
- A `MUST` rule not derivable from spec `STAGE_GATES` or `KNOWN_CONSTRAINTS`
- A `NEVER` prohibition omitted from spec's `CONTEXT_BOUNDARY/NEVER`

---

## VERIFICATION-RECORD CONTENT

The `agent-verification-record` TypeDB payload written by `agentcreation.submitVerification`:

```json
{
  "role_id":                       "{role_id}",
  "instruction_artefact_id":       "{UUID of agent-instruction-record}",
  "verifier_actor_id":             "{this agent's actor_id}",
  "instruction_author_actor_id":   "{author_actor_id from agent-instruction-record}",
  "independence_confirmed":        true,
  "vc_checks_passed":              7,
  "failed_checks":                 null,
  "result":                        "PASS",
  "findings":                      null
}
```

On FAIL:
```json
{
  "vc_checks_passed": 5,
  "failed_checks":    ["VC-06", "VC-04"],
  "result":           "FAIL",
  "findings":         "VC-06: instruction READS block includes registry.getDocument not in spec CONTEXT_BOUNDARY. VC-04: agentcreation.writeSpec declared in tools[] with no corresponding MUST step."
}
```

Gate for `agentcreation.submitVerification`:
`assertAgentArtefactExists(role_id, 'agent-instruction-record')`
(no requiredContent check — the verification record itself is what records result)

---

## GATE_07 SATISFACTION CHECK (VC-07 detail)

VC-07 requires all 7 DLMS-2026-0115 gates to be satisfied. Query sequence:

```
1. assertAgentArtefactExists(role_id, 'agent-request-record')           → GATE-01
2. assertAgentArtefactExists(role_id, 'agent-problem-analysis')         → GATE-02
3. assertAgentArtefactExists(role_id, 'agent-spec') +
   assertAgentArtefactExists(role_id, 'agent-spec-review', { result: 'PASS' }) → GATE-03
4. File .github/agents/{role_id}.agent.md exists                        → GATE-04
5. (this verification is GATE-05 — verified by VC-01 through VC-06 passing)
6-7: GATE-06 and GATE-07 are post-verification — not yet evaluable at this stage
```

VC-07 passes when GATE-01 through GATE-04 are all satisfied. GATE-06 and GATE-07
are downstream of verification and are not checked here.
