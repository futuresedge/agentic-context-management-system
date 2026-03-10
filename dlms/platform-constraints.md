# Platform Constraints and Architectural Responses

**Version:** 0.1
**Status:** Active
**Principles implemented:** P3, P4, P5, P12, P16
**Last Updated:** 2026-03-03

---

## Purpose

This document records the real constraints of the platform the framework
runs on — VS Code Agent Mode with MCP — and documents the architectural
decisions made in direct response to those constraints.

This document is not aspirational. It describes what the platform actually
does, what it cannot do, and why those gaps shaped every design decision in
the framework. Any designer adding a new tool, policy, or agent class must
read this document first. Decisions made without understanding the platform
constraints will silently violate them.

---

## Part 1: What VS Code Agent Mode Can and Cannot Do

### The Edit Tool Is Binary

VS Code Agent Mode provides agents with a built-in `edit` tool that allows
an agent to create and modify files anywhere in the workspace. This tool
has exactly two states: **granted** or **not granted**. There is no
mechanism to scope it — you cannot say "this agent may edit files in
`/src/` but not in `/.framework/`."

**Consequence:** Any agent that holds the edit tool can modify any file in
the workspace, including governance documents, policies, agent templates,
and the framework manifest. This cannot be prevented at the VS Code layer.

**Architectural response:** The edit tool is granted to **exactly two agent
classes**, and only for the duration of work that requires direct filesystem
writes:

| Agent Class | Why edit is granted | Scope of legitimate use |
|---|---|---|
| Task Performer (code tasks) | Must write source code and test files | `/src/`, `/tests/`, task branch only |
| Agent Template Creator | Must write `.agent.md` files to `.github/agents/` | `.framework/agent-classes/` only |

All other agents — the FOA, Agent Spec QA, Context Agent, QA Definition,
QA Execution, Uncertainty Owner — **do not hold the edit tool**. Every
write they perform goes through a Nexus MCP tool. This is the only
mechanism available to enforce their write boundaries.

> **This is the foundational reason the Nexus MCP server exists.**
> Without MCP-mediated writes, there is no way to enforce write authority
> boundaries between agents. The MCP server is not a convenience layer —
> it is the access control boundary.

---

### Built-in Read Tools Are Also Unscoped

VS Code Agent Mode provides built-in tools for reading files, listing
directories, and searching the workspace. These tools are also not
scopeable. An agent without the edit tool can still, in principle, read
any file in the workspace using these built-in tools.

**Consequence:** The `READS:` list in an agent template is a declaration
of intent and a context-loading instruction — it is not a structural
enforcement of read access at the VS Code layer.

**Architectural response:** This is a known and accepted limitation. The
framework's response is layered:

1. **MCP `read_` tools** — for governed documents (task specs, proofs,
   context cards), agents are given MCP `read_` tools that return only
   the specific document they are designed for. An agent with only
   `read_task_spec_task_07` cannot call `read_proof_template_task_08`
   because that tool does not exist in its registry.

2. **Context cards** — agents receive context cards that declare their
   READS list. The card is what the agent uses to know what it should
   read. Agents operating in good faith do not read outside their
   declared scope.

3. **Audit coverage** — every MCP `read_` call produces an audit entry.
   Direct filesystem reads via VS Code built-ins do not. This asymmetry
   means that undeclared reads are invisible to the audit log. This is an
   accepted gap for the current platform.

**The honest position:** Read access is enforced at the MCP tool layer for
governed documents. It is not enforced at the filesystem layer. An agent
instructed to stay within its READS list will do so; an agent that
circumvents this is operating outside the framework's trust model and will
produce an audit trail that cannot account for its information sources.
Detecting this requires observing that an agent's output references content
that was not in any of its declared READS or MCP tool calls.

---

### Agent Identity Does Not Exist at Runtime

The VS Code MCP stack has no mechanism for an agent to prove its identity
to the MCP server. The MCP spec explicitly prohibits using session IDs for
authorisation. OAuth tokens identify VS Code (the host), not the agent
running inside it. STDIO transport has no authentication layer.

**Consequence:** The Nexus MCP server cannot verify that the agent calling
`submit_proof_task_07` is actually a Task Performer, and not a different
agent that happens to have been given that tool by mistake.

**Architectural response:** This is the discovery from Experiment 01 that
reframed the problem entirely [file:3]. The correct response is not to add
identity infrastructure — it is to recognise that **tool possession is
stronger than identity**. If only the Task Performer agent spec includes
`submit_proof_task_07`, then only an agent instantiated from that spec can
call it. The boundary is in the tool registry, not in a runtime identity
check. OCAP turns the absence of identity into a structural guarantee.

**What this means in practice:** The trust model is:
- The agent spec is the identity document
- The tool list in the spec is the capability grant
- VS Code enforces the tool list at the client layer before any MCP call
- The audit log records the tool name — which encodes role, scope, and
  task — providing chain of custody without identity tokens

---

### VS Code Reloads Agent Specs and Tools Live

When a `.agent.md` file is created or modified in `.github/agents/`, VS
Code detects the filesystem change and makes the agent available in the
`@` selector without restarting. When `tools/list_changed` is sent by the
MCP server, VS Code refreshes its tool registry live.

**Consequence (positive):** Per-task agent instantiation works cleanly.
`activate_task` generates an agent spec, writes it to `.github/agents/`,
registers task-scoped tools, sends `tools/list_changed` — and the agent
appears fully-formed in VS Code within seconds.

**Consequence (risk):** Any process that can write to `.github/agents/`
can inject an agent spec into VS Code. This is the write access concern
from the edit tool section above — an agent with the edit tool could in
principle write its own agent spec with elevated tools.

**Architectural response:** The edit tool is only granted to agents that
have a legitimate reason to write to `.github/agents/` (the Agent Template
Creator). All other agents cannot write to that directory because they
lack both the edit tool and any Nexus MCP tool scoped to that path.

---

## Part 2: The Two-Layer Architecture

Given these constraints, the framework operates across two distinct layers.
Understanding the boundary between them is essential for every design
decision.

```
┌─────────────────────────────────────────────────────────┐
│                   VS CODE LAYER                         │
│                                                         │
│  What lives here:                                       │
│  .github/agents/          ← agent spec files           │
│  .github/skills/          ← loadable skill files       │
│  .github/instructions/    ← VS Code instruction files  │
│  .github/copilot-instructions.md  ← always-on rules    │
│  .vscode/mcp.json         ← MCP server registrations   │
│                                                         │
│  WHY: VS Code reads these directly from the            │
│  filesystem. They cannot be served through MCP.        │
│  They are the configuration layer that tells VS Code   │
│  what agents exist and what servers to connect to.     │
│                                                         │
│  ACCESS CONTROL: None at the platform layer.           │
│  Governed by: who holds the edit tool.                 │
└─────────────────────────────────────────────────────────┘
                           │
                           │ MCP tools are the boundary
                           │
┌─────────────────────────────────────────────────────────┐
│                   NEXUS MCP LAYER                       │
│                                                         │
│  What lives here (all writes go through MCP tools):    │
│  .framework/              ← all governance artefacts   │
│  nexus.db                 ← all runtime state          │
│  task documents           ← specs, proofs, reviews     │
│  context cards            ← generated, versioned       │
│  audit log                ← immutable, append-only     │
│  observable stream        ← plain-English events       │
│                                                         │
│  WHY: MCP tools enforce the write authority model.     │
│  An agent without the right tool cannot write to       │
│  these artefacts regardless of what it is instructed   │
│  to do. The boundary is structural, not instructed.    │
│                                                         │
│  ACCESS CONTROL: Tool possession (OCAP).               │
│  Governed by: which tools appear in the agent spec.    │
└─────────────────────────────────────────────────────────┘
```

**The boundary rule:** If an artefact needs controlled write access between
agent classes, it must live in the Nexus MCP layer and be written only
through MCP tools. If an artefact needs to be loaded by VS Code directly
(agent specs, skills, instructions), it lives in the VS Code layer.

**Nothing crosses both.** A file cannot be both a VS Code-loaded resource
and a Nexus-controlled artefact. If you find yourself wanting to write a
skill file through an MCP tool and have VS Code load it, you need two
artefacts: the MCP-controlled source (the canonical version) and a VS Code
layer copy generated from it. The generation step requires an agent with
the edit tool and produces an audit entry.

---

## Part 3: What This Means for Skills and Instructions

Skills (`.github/skills/*.skill.md`) and instructions
(`.github/instructions/*.instructions.md`) live in the VS Code layer.
They must be on the filesystem because VS Code loads them at agent
instantiation time. They cannot be served through MCP.

**Consequence for governance:** Skills and instructions are not governed
artefacts in the Nexus sense — they do not have write authority controlled
by MCP tools, they do not have audit entries for reads, and they are not
versioned through the documents table. They are filesystem resources.

**The correct mental model:**

| Artefact type | Layer | Written by | Audit coverage |
|---|---|---|---|
| Skill files (`.skill.md`) | VS Code | Agent Template Creator (edit tool) or FO manually | GitHub commit history only |
| Instruction files | VS Code | FO manually | GitHub commit history only |
| Agent spec templates | VS Code | Agent Template Creator (edit tool) — via Zone 0 | GitHub commit history + AgentClassCreated stream event |
| Context cards | Nexus MCP | Context Agent (MCP write tool) | Full — every get_context_card call audited |
| Task documents | Nexus MCP | Role-specific agents (MCP tools) | Full — every read and write audited |
| Framework policies | Nexus MCP | FOA (MCP write tool) — via Zone 0 | Full — every read and write audited |

**What this means for skill documentation:** A skill file's content is on
the filesystem and governed only by Git. Its *existence* — that it was
commissioned, reviewed, and approved — is governed by the Zone 0 process
and recorded in the Pattern Library and Observable Stream. The skill file
itself is the VS Code artefact; the Zone 0 audit trail is the governance
record. These are complementary, not redundant.

---

## Part 4: The Residual Gaps

This section names the gaps honestly. They are accepted limitations of the
current platform, not framework defects.

**Gap 1 — Unscoped filesystem reads**
Agents with VS Code built-in tools can read any file. MCP `read_` tools
scope governed reads, but built-in reads are unaudited and unscoped. Agents
operating in good faith stay within their declared READS list. Detection of
out-of-scope reads requires inference from outputs rather than direct
observation.

*Accepted:* Yes, at current scale. *Revisit when:* Agent autonomy increases
to the point where inferred-from-output detection is insufficient.

**Gap 2 — Skill and instruction files are not Nexus-governed**
VS Code layer files have no MCP audit coverage. Their change history is Git
only. Malicious or accidental modification of a skill file used by many
agents could affect all agents loading that skill, with no Nexus audit
entry.

*Accepted:* Yes. *Mitigated by:* Zone 0 process governs the creation and
approval of skill files. All skill file changes go through the Agent
Template Creator (edit tool holder) and produce a Zone 0 audit event even
if the file-level write is unaudited. *Revisit when:* Skills become
sufficiently complex that file-level audit is warranted.

**Gap 3 — Agent spec files are filesystem-writable by edit tool holders**
The Agent Template Creator holds the edit tool and writes to
`.github/agents/`. A malfunctioning or compromised Agent Template Creator
could write arbitrary agent specs. There is no MCP-layer gate on writes to
`.github/agents/`.

*Accepted:* Yes. *Mitigated by:* Zone 0 process requires Agent Spec QA
review of every template before it is activated. The Agent Template Creator
cannot activate its own template — activation requires an FOA call to
`activate_task`, which is an MCP-governed action. *Revisit when:* The
activation model becomes more automated.

**Gap 4 — FO has no governed observation layer**
The FO cannot currently observe stream events or the audit log through a
Nexus-governed interface. Observation requires direct database access. This
means FO decisions — which require observation per P10 — are made without
a complete audited view.

*Accepted:* Yes, temporarily. *Status:* Named as P10 gap. Designing the FO
observation layer is a priority item before the first real project runs.

---

## Part 5: Named Decision Record

These decisions are recorded in the manifest as D-005 through D-008.

**D-005 — MCP-first for all non-code writes**
All writes to governed artefacts go through Nexus MCP tools. The edit tool
is granted only to agents that must write code or agent spec files to the
filesystem. This is the only mechanism available to enforce write authority
boundaries on the current platform.
*Principle:* P3 — Structure Over Instruction.

**D-006 — Skills and instructions live in the VS Code layer**
Skill and instruction files must be readable by VS Code at agent load time.
They cannot be mediated through MCP. Their change governance is Zone 0
process + Git history, not Nexus audit entries.
*Principle:* P12 — Conventions Are Load-Bearing.

**D-007 — Built-in VS Code read tools are an accepted gap**
Unscoped filesystem reads via VS Code built-in tools are an accepted
platform limitation. MCP `read_` tools govern audited reads of governed
documents. Good-faith agents operate within their declared READS list.
*Principle:* P5 partial compliance — accepted gap, named explicitly.

**D-008 — Agent identity is expressed through tool possession, not tokens**
Runtime agent identity does not exist on this platform. The agent spec is
the identity document. The tool list in the spec is the capability grant.
OCAP tool possession is structurally stronger than any identity check that
could be added.
*Principle:* P3 — Structure Over Instruction.
```

***

## How This Changes the Directory Structure

The two-layer model requires one clarification to the directory layout — splitting what was loosely called `.github/` into an explicit picture of what belongs where:

```
.github/
├── copilot-instructions.md   ← always-on workspace rules (VS Code layer)
├── agents/                   ← ACTIVE generated instances only (VS Code layer)
│   └── task-performer-task-07.agent.md   ← generated, ephemeral
└── skills/                   ← VS Code layer — loaded at agent instantiation
    └── nexus-tool-grammar.skill.md

.framework/
├── agent-classes/            ← CANONICAL approved templates (Nexus MCP layer)
│   ├── zone-0/               ← written through MCP by Agent Template Creator
│   └── ...                   ← these are the source of truth; .github/agents/
│                                instances are generated FROM these
```

The key distinction that was implicit before but must now be explicit: [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_168390a0-2fa2-46bc-b85d-bb5896b959b2/8bb338b2-a022-4205-a573-0f4fd7b41a07/NexusDecisionsRationale.md)

- `.github/agents/` — **ephemeral, generated instances**. What VS Code loads right now. Created by `activate_task`, deleted by `deactivate_task`.
- `.framework/agent-classes/` — **canonical approved templates**. The source of truth. Written through MCP tools via Zone 0. Never modified directly.

An agent spec in `.github/agents/` is always derived from a template in `.framework/agent-classes/`. The canonical version lives in the Nexus layer; the VS Code layer holds the live instance. This means the edit tool holder (Agent Template Creator) writes to `.framework/agent-classes/` — and `activate_task` generates the `.github/agents/` instance from it automatically, without any agent needing the edit tool at activation time. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/collection_168390a0-2fa2-46bc-b85d-bb5896b959b2/ac666dd5-14f0-4ba4-9347-99010ced28ba/Nexus-exp01-retro.md)

---

### Skill Files Are Injected by the VS Code Host Layer

VS Code loads skill files referenced in agent configurations and
injects their content into the agent's context before execution.
This does not require the agent to hold any read tool and produces
no audit entry.

**Consequence (positive):** Skills are a clean, zero-overhead
delivery mechanism for role knowledge. Agent files stay thin.
Context cards stay focused on task data, not general capability.
The edit tool restriction (no read tools on executor agents) does
not prevent skill access.

**Consequence for audit design:** Skill reads are intentionally
unaudited. This is correct by design — skills are stable role
knowledge, not task-specific decisions. The audit log records
what the agent decided and produced, not the professional
knowledge it applied.

**Confirmed:** 2026-03-04, H-SKILLS-01, manual test by FO.
