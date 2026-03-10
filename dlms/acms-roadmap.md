# Autonomous Context Management System - a roadmap

Your documents already contain the migration path explicitly, broken into phases. Here's how to sequence that into an actionable implementation roadmap, incorporating the intention that internal agents have their own MCP server for structural `CONTEXTBOUNDARY` enforcement. 

***

## The Core Insight First

Your documents already define **two distinct MCP servers**: 

- **Internal MCP Server** — serves pipeline agents; enforces `READS/WRITES/NEVER` at the tool level, not just declaratively in instruction files
- **External MCP Server** — serves non-DLMS agents; exposes only `corpus.getcontextpackage` and query tools; the corpus is completely opaque to consumers

The MCP Gateway Agent is the single enforcement point for both. This is the most important piece to get right before anything else, because once it exists, all downstream `CONTEXTBOUNDARY` violations become structurally impossible rather than merely policy violations. 

***

## Phase 0 — Repository & Corpus Bootstrap
*Prerequisite: nothing runs until this is in place*

- Establish the canonical directory structure matching `agentpath` conventions from DLMS-2026-0003 
- Import all completed documents into the corpus with correct file paths
- Bootstrap the audit trail with retroactive `AUDIT-BOOTSTRAP-NNNN` entries for all Wave 1–5 documents per the exception clause in DLMS-2026-0015 
- Create the Event Type Registry (`dlms/registry/event-type-registry.md`) — required before the Audit Trail Agent can validate any `eventtype` field
- Create the Tool Access Registry (`dlms/registry/tool-access-registry.md`) — the MCP Gateway Agent's primary reference on every call

***

## Phase 1 — Internal MCP Server
*The structural backbone. No agent implementations until this works.*

The shift your documents describe: `CONTEXTBOUNDARY` evolves from file paths → tool scopes: 

```yaml
# Before (declarative only)
reads:
  - dlms/corpus/policies/DLMS-2026-0001-v1.0.0.md

# After (structurally enforced)
reads:
  - tool: corpus.getdocument
    scope: approved documents, own stage inputs
```

**Implement in this order:**

1. **Audit Trail infrastructure** — append-only log at `dlms/audit/`; the Audit Trail Agent is the sole writer; no agent (including the MCP server itself) may delete or update entries 
2. **MCP Gateway Agent** — validates every tool call against the Tool Access Registry before execution; logs every call via audit trail before passing through 
3. **Core pipeline tools**:
   - `corpus.getdocument` — read by docid + version
   - `pipeline.writeartefact` — write stage artefacts (pipeline agents only)
   - `pipeline.transitionstatus` — trigger status transitions (Status Transition Agent only)
   - `audit.logevent` — append audit entry (Audit Trail Agent exclusively)
4. **Tool Access Registry Agent** — maintains which agent roles may call which tools with which scopes; consulted by MCP Gateway on every call 
5. **Verify structural enforcement** — attempt a boundary violation from a test agent (e.g., call `audit.logevent` from a non-Audit-Trail-Agent identity) and confirm it is rejected before the audit entry is written

***

## Phase 2 — External MCP Server
*Expose the Context Delivery Layer to the outside world*

- Add consumer-facing tools to a separate server (or separate tool namespace): 
  - `corpus.getcontextpackage` — non-DLMS agents exclusively
  - `corpus.querybytag` — Context Curator + non-DLMS agents
  - `corpus.getdependencygraph` — Dependency Index Agent + reviewers
  - `registry.gettaxonomy` — Classification Agent + validators
  - `audit.query` — CI agents + SysAdmin only
- Non-DLMS agents never receive `pipeline.*` or `audit.logevent` tool tokens — they physically cannot call them 
- Add three new agents introduced by the MCP layer: **MCP Gateway Agent**, **Context Package Builder**, **Tool Access Registry Agent** 

***

## Phase 3 — Governance Layer (Tier 2) Agents
*Always-on; must be operational before any stage can run*

Implement all 12 Governance Layer agents using the internal MCP server. Priority order driven by dependencies: 

1. **Naming Convention Enforcer + Registry Agent** — gates every Creation stage before Document Author activates
2. **Template Manager + Template Validator** — required for any document to be created through the pipeline
3. **DoD Registry Agent** — must exist before Stage Orchestrators can request stage DoDs
4. **Index agents** (Master, Type, Status, Tag, Dependency) + **Index Update Orchestrator**
5. **Metrics Aggregator** — last; depends on stage metrics being produced first

***

## Phase 4 — Document Lifecycle Pipeline
*Build stages in dependency order, not arbitrary order*

Each stage requires its orchestrator first (thin router, holds only file paths and gate conditions) then its executor and verifier agents. Build in this sequence because each stage produces inputs for the next: 

| Order | Stage | Key gate to verify |
|---|---|---|
| 1 | **Creation** (7 agents) | Naming Enforcer → Problem Analysis → DoD → Author → Template Validator → Verifier |
| 2 | **Review/Approval** (11 agents) | 4 Perspective Reviewers → Synthesizer → Revision → Approval Gate (independence check) |
| 3 | **Indexing/Classification** (12 agents) | Metadata Extractor → Classification → Taxonomy Validator → 5 Index Updaters |
| 4 | **Storage/Versioning** (7 agents) | Version Control → Access Control → Version Registry Updater |
| 5 | **Distribution** (7 agents) | Distribution Planner → Agent → Change Notification |
| 6 | **Archival** (7 agents) | Retention Evaluator → Archival → Status Transition |

**Gate test after Phase 4**: Run the first full lifecycle on a real document — use one of your governance docs that needs an update. The document must travel creation → archival with a verified audit trail and all index updates confirmed. 

***

## Phase 5 — Cross-Cutting Services (Tier 12)
*These agents receive events from all others; implement after pipeline exists*

- **Audit Trail Agent** — already partially implemented in Phase 1 as infrastructure; now implement as a full agent with event payload validation against the Event Type Registry 
- **Knowledge Base Agent** — accumulates all `stage-learnings.md` files by doc-type/stage key; queried (not loaded) by Context Curators and Context Compressor 
- **Document Relationship Agent** — processes every dependency-graph update; flags orphans and circular dependencies 

***

## Phase 6 — Context Delivery Layer (Tier 11)
*The external-facing quality pipeline; implements via the External MCP Server*

Build in pipeline sequence: 

1. Context Request Handler → Document Retrieval Agent
2. Recency Validator → Accuracy Validator → Completeness Validator → Format Validator
3. **Context Compressor** — the delivery equivalent of the Context Curator; input intentionally larger than output; queries Knowledge Base Agent for prior learnings about this doc-type/agent-class combination
4. Delivery Verifier (final gate)

**Gate test**: An external agent (simulated) calls `corpus.getcontextpackage`. Verify the returned package is: current (recency pass), verified (not just drafted), complete (no missing dependencies), format-compliant, and compressed.

***

## Phase 7 — CI & SysAdmin Tiers
*Depends on the pipeline having produced learnings, metrics, and audit events to analyse*

**CI Tier (10 agents)** — implement monitor agents first, synthesis agents second: 
- Quality Monitor, Performance Monitor, Learning Synthesizer, Anomaly Detector, Bottleneck Analyst, Agent Behaviour Analyst
- Then: CI Perspective Synthesizer → Recommendation Generator → CI Verifier → SysAdmin Briefing Agent

**SysAdmin Tier (7 agents)** — implement after CI produces its first briefing: 
- DLM SysAdmin Agent (reads briefing only) → SysAdmin Verifier
- Policy Manager, SLA Manager, Rules/Patterns Agent, Guide Curator, Configuration Controller, DoD Custodian
- SysAdmin Activity Monitor (feeds back into CI Perspective Synthesizer — closes the recursive loop)

***

## Phase 8 — Self-Hosting Verification
*The system is only technically complete when it governs itself*

- Run a governance document through the pipeline (e.g., update a policy in response to a CI recommendation)
- The CI tier produces a recommendation → SysAdmin Briefing Agent compresses it → DLM SysAdmin Agent accepts it → Policy Manager authors a draft → full Creation/Review/Approval/Indexing pipeline runs on the new policy → the system's own governance corpus is now self-audited
- Confirm the audit trail contains a complete, unbroken chain from CI cycle trigger to policy approval 

This is the moment the system becomes self-describing and self-improving as designed — and the technical completeness DoD is met.

***

## Phase 9 — DB Layer (Optional, Phase 4 migration)
*Invisible to agents; only the MCP server's internal implementation changes* 

Implement only when flat-file query performance becomes a bottleneck (dependency graph traversal, cross-corpus tag queries, audit trail integrity checks at scale). The Schema Sync Agent keeps the DB as a derived index from flat files — flat files remain the permanent source of truth and the DB can be fully reconstructed if lost. 