# Nexus Internal MCP Server — Implementation Roadmap

**Status:** Draft  
**Date:** 2026-03-09  
**Supercedes:** `acms-roadmap.md` (broader context), synthesises with `platform-constraints.md`  
**Focus:** Internal MCP server only. External MCP server (Context Delivery Layer) is Phase 9.

---

## Architectural Commitments

Before reading the phases, these decisions are fixed and every step below depends on them.

| Decision | Rationale |
|---|---|
| TypeDB is the system of record | Documents, artefacts, audit events, and agent registry are all graph-queryable entities, not flat files |
| .md files are rendered outputs | SysAdmin write → TypeDB update → render-back writes .md; agents never read .md files directly |
| MCP Gateway precedes every tool call | The only structural enforcement of READS/WRITES/NEVER; declarative policy alone is not sufficient |
| Audit is atomic with the write | A write that does not produce an audit event is rolled back; the audit trail gap is a harder boundary than a policy violation |
| Tool possession is identity | The agent spec's tool list is the capability grant; VS Code enforces it at the client layer before any MCP call reaches the server |
| Stage gates are structural | Calling `{stage}.submitVerification` before the required preceding artefacts exist throws `StageGateError`; it is not a policy check |
| Two MCP servers | nexus-internal (pipeline agents, all tiers) and nexus-external (non-DLMS consumer agents, Tier 11 surface only) |
| Six-dimension schema | TypeDB schema covers all 6 ONE ontology dimensions: Things, People, Groups, Connections, Events, Knowledge |

---

## Phase 0 — Repository Foundation

**Purpose:** Establish the directory structure, registries, and VS Code configuration before any code is written. Nothing can be built without the Event Type Registry (Audit Trail Agent needs it) and Tool Access Registry (MCP Gateway needs it on every call).

**Prerequisites:** None.

### Phase 0 Steps

#### 0.1 — Create `nexus/` directory structure

- Input: None
- Output: Empty directory tree at workspace root:

  ```shell
  nexus/
    docker-compose.yml
    package.json
    tsconfig.json
    src/
      server.ts
      db/
        client.ts
        schema.tql
      seed/
        parse-frontmatter.ts
        import-corpus.ts
      render/
        render-doc.ts
      tools/
        shared/
          gateway.ts
          gate.ts
          audit.ts
        cross-cutting/
        governance/
        orchestrator/
        creation/
        review/
        indexing/
        storage/
        distribution/
        archival/
        ci/
        sysadmin/
        context-delivery/
  ```

#### 0.2 — Create Event Type Registry

- Input: Agent roster (tier definitions), DLMS-2026-0015 (Audit Trail Policy)
- Output: `dlms/registry/event-type-registry.md` — controlled vocabulary of all valid `event_type` values
- Schema: `event_type slug | description | originating tier | valid actor_id patterns`
- Types include: `document_imported`, `document_created`, `artefact_created`, `stage_dispatched`, `stage_gate_opened`, `stage_gate_failed`, `stage_metrics_recorded`, `tool_access_denied`, `document_version_committed`, `document_archived`, `governance_doc_updated`, `context_requested`, `context_package_delivered`, `knowledge_entry_created`, `dependency_updated`, `ci_report_generated`, `ci_cycle_complete`

#### 0.3 — Create Tool Access Registry

- Input: Agent roster (tiers 1–14 + tool scope), platform-constraints.md (OCAP model)
- Output: `dlms/registry/tool-access-registry.md` — table of `{ tool_name | permitted_agent_roles | scope_constraint }`
- This is the MCP Gateway's primary reference. Every tool call is validated against a row in this file before execution.
- Example rows:
  - `audit_append_event | audit-trail-agent | append-only; no reads`
  - `creation_write_draft | document-author | own stage; requires valid naming.validate() pass`
  - `sysadmin_write_governance_doc | policy-manager, sla-manager, guide-curator | governance corpus only`

#### 0.4 — Create `.vscode/mcp.json`

- Input: nexus/ server entry point path
- Output: `.vscode/mcp.json` registering the nexus-internal server (and nexus-external stub for Phase 9)

**Verification gate:** Both registry files exist; `.vscode/mcp.json` is valid JSON; `nexus/` tree is in place.

---

## Phase 1 — TypeDB Schema & Corpus Import

**Purpose:** Establish TypeDB as the data foundation. All 103 existing .md corpus files are imported once as the seed. After this phase, TypeDB is the authoritative source for all agent reads.

**Prerequisites:** Phase 0 complete. TypeDB 3.x running via Docker.

### Phase 1 Steps

#### 1.1 — Write TypeDB schema

- Input: 6 ONE ontology dimensions, DLMS-2026-0004 (20 frontmatter fields), agent roster (artefact types per tier)
- Output: `nexus/src/db/schema.tql`
- Schema covers:
  - **Things** → `document` entity (all 20 frontmatter fields as attributes; `sections` attribute stores JSON map `{ "SUMMARY": "...", "RULES": "..." }` for render-back); `stage_artefact` entity (`artefact_type`, `doc_id`, `stage`, `content`, `created_by`, `created_at`)
  - **People** → `agent_class` entity (`tier`, `role_id`, `tool_list` JSON); `agent_instance` entity (`class_id`, `instance_id`, `activated_at`)
  - **Groups** → `group` entity (`group_id @key`, `group_type`); `group_id` defaults to `dlms-internal` for all current documents; multi-tenancy is in schema but not activated
  - **Connections** → `dependency` relation between `document` and `document` with `rel_type` attribute (`is-governed-by | implements | references | supersedes`); `supersession` relation with `superseded_at` timestamp
  - **Events** → `audit_event` entity (`event_id @key`, `event_type`, `actor_id`, `target_id`, `target_version`, `timestamp`, `payload` JSON); `stage_transition` as subtype with `from_stage`, `to_stage` attributes; enforced append-only server-side (no TypeQL delete permitted from tool handlers)
  - **Knowledge** → `knowledge_entry` entity (`subject_doc_type`, `subject_stage`, `insight`, `confidence`, `created_at`); `embedding` vector attribute (placeholder for TypeDB 3.x vector similarity; populated lazily)

#### 1.2 — Write corpus parser

- Input: Any `.md` file from `dlms/corpus/`
- Output: `nexus/src/seed/parse-frontmatter.ts`
- Logic: `gray-matter` extracts YAML frontmatter → maps all 20 fields to TypeDB attribute values; body parsed by splitting on `## SECTION_HEADING` pattern → produces `sections` JSON map `{ SECTION_KEY: body_content }`

#### 1.3 — Write corpus importer

- Input: `dlms/corpus/**/*.md` (103 files across policies/, templates/, dod-templates/, guides/), TypeDB connection
- Output: `nexus/src/seed/import-corpus.ts`
- Logic: Walks 4 corpus directories; calls parse-frontmatter per file; bulk-inserts `document` entities in TypeDB transactions (batch 10 per transaction); inserts all `dependency` relations from each document's `dependencies` block; inserts retroactive `audit_event` per document with `event_type: document_imported`, `actor_id: seed:import-corpus`

#### 1.4 — Run import

- Input: Running TypeDB on port 1729, `import-corpus.ts`
- Output: TypeDB populated with 103 document entities, all dependency relations, 103 `document_imported` audit events

**Verification gate:**

- TypeDB query: `match $d isa document; get $d;` → 103 results
- Dependency traversal for DLMS-2026-0098 returns correct upchain
- All frontmatter fields present on a sample document entity
- `audit_event` count = 103 with `event_type: document_imported`

---

## Phase 2 — Internal MCP Server: Core Infrastructure

**Purpose:** The MCP Gateway and audit infrastructure must be production-complete before any agent tool is added. Every subsequent tool passes through the gateway and uses the audit helper. Getting this wrong invalidates all downstream work.

**Prerequisites:** Phase 1 complete.

### Phase 2 Steps

#### 2.1 — MCP server entry point

- Input: `@modelcontextprotocol/sdk`, TypeDB client
- Output: `nexus/src/server.ts` — `new Server({ name: 'nexus-internal', version: '0.1.0' })`; tool registration pattern; connection lifecycle (TypeDB session opened on start, closed on shutdown)

#### 2.2 — TypeDB client

- Input: `TYPEDB_URL` env var (default: `localhost:1729`)
- Output: `nexus/src/db/client.ts` — session manager with `readTransaction()`, `writeTransaction()` helpers; query builder types; connection retry logic

#### 2.3 — Audit helper** *(must be built before any tool handler

- Input: `{ event_type, actor_id, target_id, target_version?, payload? }`
- Output: `nexus/src/tools/shared/audit.ts` → `appendAuditEvent()` — inserts `audit_event` entity in TypeDB write transaction
- **Critical constraint:** `appendAuditEvent()` and the business write share one transaction. If either fails, both roll back. An audit gap is not possible.

#### 2.4 — MCP Gateway middleware

- Input: Tool Access Registry (loaded from `dlms/registry/tool-access-registry.md` into memory at server start); incoming tool call `{ tool_name, calling_context }`
- Output: `nexus/src/tools/shared/gateway.ts` → `checkToolAccess(toolName, agentRole)`
- Logic: Validates call against Tool Access Registry; on denial → inserts `audit_event { event_type: tool_access_denied, actor_id, tool_name }` then throws structured `ToolAccessDeniedError`; on success → passes through to tool handler
- Note: Denial is audited immutably even though the operation never executed. The attempted call is a fact.

#### 2.5 — Stage gate helper

- Input: `{ stage, doc_id, required_artefact_type }`
- Output: `nexus/src/tools/shared/gate.ts` → `assertStageArtefactExists(stage, docId, artefactType)` — queries TypeDB for `stage_artefact` entity with matching `doc_id`, `stage`, `artefact_type`; throws `StageGateError { stage, docId, missingArtefact }` if not found

#### 2.6 — `audit_append_event` tool (Tier 12 exclusive)

- Input schema: `{ event_type: string, actor_id: string, target_id: string, target_version?: string, payload?: object }`
- Output: Inserts `audit_event` entity; returns `{ event_id, timestamp }`
- Access: Audit Trail Agent only (single Tool Access Registry row)
- Note: This is the only tool that writes audit events directly from an agent. All other audit writes use the shared `appendAuditEvent()` helper internally.

**Verification gate:**
- MCP server starts and connects to TypeDB
- `audit_append_event` called from test context → event appears in TypeDB
- `audit_append_event` called from non-audit-trail-agent role → gateway rejects with `ToolAccessDeniedError`; rejection appears in TypeDB audit log as `tool_access_denied` event
- Stage gate test setup: no artefacts in TypeDB for doc_id=TEST-001 → calling any `{stage}.submitVerification(TEST-001)` returns `StageGateError`

---

## Phase 3 — Cross-Cutting Tools: Tier 12

**Purpose:** Knowledge Base and Relationship tools are consumed by every subsequent tier. Build these before the stage pipeline.

**Prerequisites:** Phase 2 complete.

### Steps

**3.1 — Knowledge Base tools**
- `knowledge.readEntry(docType, stage)` — reads `knowledge_entry` entities by `subject_doc_type` + `subject_stage`; no audit on reads
- `knowledge.writeEntry({ docType, stage, insight, confidence })` — inserts `knowledge_entry`; calls `appendAuditEvent({ event_type: knowledge_entry_created, ... })`
- Access: `knowledge.readEntry` → context curators (all tiers), Context Compressor (Tier 11); `knowledge.writeEntry` → stage verifiers only

**3.2 — Relationship tools**
- `relationship.queryDependencies(docId)` — graph traversal: returns all `dependency` relations where source = docId with depth parameter (default: full chain)
- `relationship.upsertDependency({ sourceDocId, targetDocId, relType })` — inserts/updates `dependency` relation; calls `appendAuditEvent({ event_type: dependency_updated, ... })`
- Access: `relationship.queryDependencies` → Dependency Index Agent, Completeness Validator (Tier 11); `relationship.upsertDependency` → Dependency Index Updater (Tier 7) only

---

## Phase 4 — Governance Layer Tools: Tier 2

**Purpose:** Index management, templates, naming enforcement, and DoD registry are prerequisites for any stage to process a document. Governance layer is always-on — these tools must exist before any document enters the pipeline.

**Prerequisites:** Phase 3 complete.

### Steps

**4.1 — Document registry tools** *(read-only; wide access — all pipeline tiers)*
- `registry.getDocument(docId, version?)` — returns full `document` entity (frontmatter attrs + `sections` JSON map); appends `document_read` audit event
- `registry.queryDocuments({ docType?, status?, tags?, contextEligible? })` — filtered TypeDB query; appends `corpus_queried` event
- `registry.getDependencyGraph(docId)` — calls `relationship.queryDependencies(docId)`
- Access: All pipeline agents. Read-only. No writes.

**4.2 — Index tools**
- `index.readMaster()`, `index.readByType(docType)`, `index.readByStatus(status)`, `index.readByTag(tag)` — TypeDB queries; no audit on reads
- `index.updateMaster(docId, metadataFinal)`, `index.updateByTag(docId, tags)`, `index.updateByType(docId, docType)` — update `document` entity attributes; append `index_updated` event
- Access: read → wide (context curators, validators, CI agents); update → Index Update Orchestrator only

**4.3 — Template tools**
- `template.read(templateId, version?)` — returns template document with `sections` map
- `template.write(templateId, sections, frontmatterUpdates)` — updates template entity; appends `template_updated` event
- `template.getMigrationFlags(templateId, oldVersion)` — queries all `document` entities with `template_id` = templateId and `template_ver` < new version; returns list
- Access: read → any authoring agent; write → Template Manager only; getMigrationFlags → Template Version Controller only

**4.4 — Naming validation tool**
- `naming.validate(proposedName)` — reads naming convention document from TypeDB; validates proposed name against rules; returns `{ valid: bool, correctedName?: string, violations: string[] }`
- Access: Naming Convention Enforcer only
- Note: `creation.writeDraft` handler calls this internally before accepting a draft; a failed naming check prevents draft creation regardless of whether the agent called `naming.validate` independently

**4.5 — DoD registry tool**
- `dod.getTemplate(stageType, docType)` — returns correct DoD template entity from TypeDB; appends `dod_retrieved` event
- Access: DoD Registry Agent, all Stage DoD Agents

**4.6 — Metrics aggregator tool**
- `metrics.aggregate({ stageFilter?, timeWindow? })` — queries `audit_event` entities by event_type patterns (stage completions, verification pass/fail) → returns structured metrics
- Access: Metrics Aggregator only

---

## Phase 5 — Orchestrator Tools: Tiers 1 & 3

**Purpose:** Routing tools are the system's document state machine. Without them, no document can advance between stages.

**Prerequisites:** Phase 4 complete.

### Steps

**5.1 — Routing tools**
- `routing.getRegistryPaths(docId)` — returns current `status` attribute of document entity + computed `validNextStages` based on current status
- `routing.dispatchStage(docId, targetStage)` — updates document `status` to `in_{targetStage}` in TypeDB; appends `stage_dispatched` event (subtype: `stage_transition` with `from_stage`, `to_stage`); validates `targetStage` is in `validNextStages` for current status
- Access: System Orchestrator (Tier 1), Stage Orchestrators (Tier 3) only

---

## Phase 6 — Stage Pipeline Tools: Tiers 4–10

**Purpose:** Tool sets for each of the 6 active document lifecycle stages. All 6 modules can be built in parallel.

**Prerequisites:** Phase 5 complete. Each stage module depends on Phase 2 (gateway, gate, audit) and Phase 4 (registry, DoD tools).

### Shared tool pattern (applies to all 6 stages)

Every stage module exposes four base tools:
- `{stage}.readContext(docId)` — reads the context card artefact for this stage from TypeDB; appends `context_read` event
- `{stage}.writeArtefact(docId, artefactType, content, sections?)` — writes a `stage_artefact` entity to TypeDB; validates `artefactType` is valid for this stage; appends `artefact_created` event
- `{stage}.submitVerification(docId, verificationResult, dodEvidence)` — calls `gate.assertStageArtefactExists()` for all artefacts required by this stage's DoD; if gate passes: writes `{stage}_verification` artefact, appends `stage_gate_opened` event, updates `routing.dispatchStage(docId, '{stage}_complete')`; if gate fails: appends `stage_gate_failed` event then throws `StageGateError`
- `{stage}.writeMetrics(docId, metricsPayload)` — writes stage metrics to a `stage_artefact` entity; appends `stage_metrics_recorded` event

### Stage-specific tools

**6.1 — Creation Stage (Tier 4)**
- Additional tools: `creation.writeContext`, `creation.writeProblemAnalysis`, `creation.writeDraft(docId, content, templateId)` *(calls `naming.validate()` internally; rejects if name invalid)*
- Output artefact types: `creation-context`, `problem-analysis`, `creation-dod`, `draft-v0.1-agent`, `template-compliance`, `creation-verification`, `creation-learnings`, `creation-metrics`
- Gate for `submitVerification`: requires `draft-v0.1-agent` + `template-compliance` + `creation-dod`

**6.2 — Review & Approval Stage (Tier 5)**
- Additional tools: `review.writeContext`, `review.writePerspective(docId, lens, content)` *(lens: accuracy | completeness | agent-readability | structure)*, `review.writeSynthesis(docId, content)` *(gate: all 4 perspective artefacts must exist)*, `review.writeRevision`, `review.submitApprovalGate(docId, decision)` *(independence check: actor_id of this call ≠ actor_id of `draft-v0.1-agent` artefact — queried from audit events)*
- Output artefact types: `review-context`, `review-dod`, `review-accuracy`, `review-completeness`, `review-readability`, `review-structure`, `review-synthesis`, `draft-v0.2-agent`, `approval-status`, `review-verification`, `review-learnings`, `review-metrics`
- Gate for `submitVerification`: requires `approval-status` with `decision: approved` + `review-dod`

**6.3 — Indexing & Classification Stage (Tier 7)**
- Additional tools: `indexing.writeContext`, `indexing.writeMetadataRaw`, `indexing.writeMetadataFinal(docId, metadata, taxonomyValidation)` *(updates the `document` entity attributes in TypeDB)*, `indexing.dispatchIndexUpdates(docId, metadataFinalId)` *(Index Update Orchestrator: calls `index.updateMaster`, `index.updateByType`, `index.updateByTag`; calls `relationship.upsertDependency` for each dependency)*
- Output artefact types: `indexing-context`, `indexing-dod`, `metadata-raw`, `metadata-final`, `taxonomy-validation`, `indexing-verification`, `indexing-learnings`, `indexing-metrics`

**6.4 — Storage & Versioning Stage (Tier 8)**
- Additional tools: `storage.writeContext`, `storage.commitVersion(docId, content, versionNote)` *(bumps `version` attribute on document entity; appends `document_version_committed` event; version history is queryable from this event chain)*, `storage.writeAccessManifest`, `storage.updateVersionRegistry`
- Output artefact types: `storage-context`, `storage-dod`, `doc-{id}-v{n}-agent`, `version-log`, `access-manifest`, `storage-verification`, `storage-learnings`, `storage-metrics`

**6.5 — Distribution Stage (Tier 9)**
- Additional tools: `distribution.writeContext`, `distribution.writePlan(docId, recipientList, distributionType)`, `distribution.writeLog(docId, deliveryRecord)`, `distribution.notifyChange(docId, subscriberList, changeEvent)`
- Output artefact types: `distribution-context`, `distribution-dod`, `distribution-plan`, `distribution-log`, `distribution-verification`, `distribution-learnings`, `distribution-metrics`

**6.6 — Archival Stage (Tier 10)**
- Additional tools: `archival.writeContext`, `archival.evaluateRetention(docId)` *(reads retention schedule entity from TypeDB; returns recommendation)*, `archival.commitArchival(docId, reason)` *(gate: requires `archival-recommendation` artefact with `recommendation: archive` — cannot archive without Retention Evaluator approval; updates document `status` to `archived`; appends `document_archived` event)*, `archival.updateStatusRegistry(docId)`
- Output artefact types: `archival-context`, `archival-dod`, `archival-recommendation`, `archival-log`, `archival-verification`, `archival-learnings`, `archival-metrics`

**Verification gate for Phase 6:**
- Run a test document through creation → archival in full (skip Tier 6)
- Confirm 8 stage artefact types exist in TypeDB for the test document
- Audit trail contains events for every tool call in correct temporal order
- Gate violation test: call `review.writeSynthesis` without all 4 perspective artefacts → `StageGateError` with structured payload; `stage_gate_failed` event in TypeDB
- Independence check test: same actor_id calls `creation.writeDraft` then `review.submitApprovalGate` → rejection

---

## Phase 7 — CI Tools: Tier 13

**Purpose:** CI monitor read tools are TypeDB event queries against the audit trail the pipeline produces. CI write tools are standard artefact writes. Build after Phase 6 so real audit events exist to query.

**Prerequisites:** Phase 6 complete.

### Steps

**7.1 — Monitor read tools** *(read-only TypeDB event queries; no audit on reads)*
- `ci.readQualityMetrics(timeWindow)` — queries `audit_event` where `event_type in [verification_passed, verification_failed]`; joins with `stage_artefact` metrics; returns structured quality object
- `ci.readPerformanceMetrics(timeWindow)` — queries duration between `stage_dispatched` → `stage_gate_opened` event pairs per document
- `ci.readAnomalySignals(timeWindow)` — queries events where `event_type in [stage_gate_failed, tool_access_denied, StageGateError]`
- `ci.readBottleneckData(timeWindow)` — queries stage dwell times from event timestamps per `doc_id`
- `ci.readAgentBehaviourData(timeWindow)` — queries `actor_id × tool_name × target_id` distribution from audit events; surfaces patterns where actor_ids call tools outside their expected tier range
- Access: CI monitor agents (read-only through these tools; writes only via report tools)

**7.2 — CI write tools** *(follow stage artefact pattern)*
- `ci.writeReport(reportType, content, cycleId)` — writes CI artefact; appends `ci_report_generated` event; `reportType`: quality | performance | anomaly | bottleneck | behaviour
- `ci.writeSynthesis(content, reportIds, cycleId)` — gate: all 5 monitor reports for this `cycleId` must exist
- `ci.writeRecommendations(content, synthesisId, cycleId)` — gate: synthesis artefact for `cycleId` must exist
- `ci.writeSysAdminBriefing(content, recommendationsId, cycleId)` — gate: recommendations artefact for `cycleId` must exist
- `ci.submitCIVerification(cycleId, verificationResult)` — gate: briefing artefact for `cycleId` must exist; appends `ci_cycle_complete` event
- Access: each tool scoped to its specific CI sub-agent role in Tool Access Registry

---

## Phase 8 — SysAdmin Tools + Render-back: Tier 14

**Purpose:** SysAdmin agents act on CI recommendations to update governance documents. `sysadmin.writeGovernanceDoc` is the trigger for render-back — the mechanism that keeps .md files current with TypeDB.

**Prerequisites:** Phase 7 complete.

### Steps

**8.1 — SysAdmin read tools**
- `sysadmin.readGovernanceDoc(docId, version?)` — reads full `document` entity (frontmatter attrs + `sections` JSON map) from TypeDB; appends `governance_doc_read` event; Access: SysAdmin tier only (not available to any other tier)
- `sysadmin.readAuditEvents({ actorId?, eventType?, timeWindow?, targetId? })` — time-windowed audit query; returns typed event array; Access: DLM SysAdmin Agent, SysAdmin Activity Monitor only
- `sysadmin.readSysAdminBriefing(cycleId)` — reads briefing artefact from TypeDB

**8.2 — SysAdmin write tools**
- `sysadmin.writeGovernanceDoc(docId, sections, frontmatterUpdates)` — updates document entity in TypeDB (merges `sections` JSON map + any frontmatter field updates); **triggers render-back** (step 8.3); appends `governance_doc_updated` event; Access: Policy Manager, SLA Manager, Guide Curator only (not the DLM SysAdmin Agent itself, which reads only)
- `sysadmin.writeChangeDirective(content, sourceRecommendationsId)` — DLM SysAdmin Agent output; writes change directive artefact
- `sysadmin.updateConfig(configKey, configValue, changeDirectiveId)` — Configuration Controller; gate: `changeDirective` artefact for `changeDirectiveId` must exist; appends `config_updated` event
- Access: each tool scoped to its specific sub-agent role

**8.3 — Render-back engine**
- Input: Updated `document` entity from TypeDB after `sysadmin.writeGovernanceDoc` succeeds
- Output: `nexus/src/render/render-doc.ts` — reads `document` entity's attributes and `sections` JSON map from TypeDB; reconstructs valid DLMS .md file; writes to filesystem path given by `agent_path` attribute of the document entity
- Render logic: YAML frontmatter block reconstructed from entity attributes → blank line → `## SECTION_HEADING\n\n{content}\n\n` for each key in `sections` in canonical order (SUMMARY, SCOPE, DEFINITIONS, RULES, ENFORCEMENT, DEPENDENCIES, CHANGE_LOG)
- Called internally by `sysadmin.writeGovernanceDoc` — not an exposed MCP tool; not directly callable by agents

**Verification gate:**
- Call `sysadmin.writeGovernanceDoc` on DLMS-2026-0001 with a modified SUMMARY section
- Confirm TypeDB `sections` attribute is updated
- Confirm `dlms/corpus/policies/DLMS-2026-0001-v0.1.0.md` is regenerated with the new SUMMARY and valid YAML frontmatter within the same operation
- Confirm `governance_doc_updated` audit event appears in TypeDB
- Call `sysadmin.writeGovernanceDoc` from a non-SysAdmin role → gateway rejects

---

## Phase 9 — External MCP Server: Context Delivery Layer (Tier 11)

**Purpose:** The external-facing quality pipeline that serves non-DLMS agents. Runs as a separate server (or separate tool namespace) — consumer agents never receive `pipeline.*`, `sysadmin.*`, or `audit_append_event` tool tokens.

**Prerequisites:** Phase 6 complete (approved documents must exist in TypeDB for retrieval to be meaningful).

### Steps

**9.1 — External server registration**
- Update `.vscode/mcp.json` to activate the nexus-external server entry

**9.2 — Context Delivery tools**
- `context.requestPackage(agentRole, taskSpec)` — Context Request Handler; queries `index.readMaster()` + `relationship.queryDependencies()`; constructs `retrieval_spec` artefact in TypeDB; appends `context_requested` event
- `context.retrieveDocuments(retrievalSpecId)` — Document Retrieval Agent; reads `retrieval_spec` artefact; queries TypeDB for documents matching spec filtered by `status: approved`; returns document set
- `context.validateRecency(docSet)` — Recency Validator; queries `document_version_committed` event history in TypeDB; confirms retrieved version is latest; appends `recency_validated` event
- `context.validateAccuracy(docSet)` — Accuracy Validator; confirms all docs have a passing `{stage}_verification` artefact in TypeDB (verified, not merely drafted); appends `accuracy_validated` event
- `context.validateCompleteness(docSet)` — Completeness Validator; calls `relationship.queryDependencies()` for each doc; flags missing dependencies; appends `completeness_validated` event
- `context.validateFormat(docSet)` — Format Validator; checks `sections` JSON structure maps to agent-format spec; appends `format_validated` event
- `context.compressPackage(docSet, taskSpec)` — Context Compressor; calls `knowledge.readEntry()` for priors about this doc-type/agent-class combination; produces `context_package` artefact with minimum viable context; appends `context_package_compressed` event
- `context.writeDeliveryVerification(packageId, result)` — Delivery Verifier; final gate: all 4 validation events must exist for this `packageId`; appends `context_package_delivered` event; **partial delivery is structurally prohibited** — gate fails if any validation flag is non-passing
- `context.queryByTag(tags[])` — non-DLMS agents only; tag-based corpus query
- `context.getDependencyGraph(docId)` — non-DLMS agents only; dependency traversal

**Verification gate:**
- External agent calls `context.requestPackage` for a test task spec
- Returned package contains only `context_eligible: true` documents
- All 4 validation events appear in audit log in correct order before `context_package_delivered`
- Partial delivery test: mark a required dependency as `status: draft` in TypeDB → `validateAccuracy` returns failing flag → `writeDeliveryVerification` gate fails → delivery blocked

---

## Phase 10 — Agent Spec Stubs

**Purpose:** Create the `.agent.md` files that VS Code reads to present each tier in the `@` selector. Each file declares only that tier's tools — the OCAP boundary is in this tool list, enforced by VS Code at the client layer.

**Prerequisites:** Phases 2–9 complete (all tools must exist before stubs can accurately declare them).

### Steps

**10.1 — Create one `.agent.md` per active tier**
- Input: Tool Access Registry (definitive source of which tools each tier holds)
- Output: One `.github/agents/{tier-name}.agent.md` per tier
- Tiers: `system-orchestrator`, `governance-layer`, `stage-orchestrators`, `creation-stage`, `review-stage`, `indexing-stage`, `storage-stage`, `distribution-stage`, `archival-stage`, `context-delivery`, `cross-cutting-services`, `ci-tier`, `sysadmin-tier`
- Each file declares:
  - `READS:` → list of MCP tool names this tier may call that return data
  - `WRITES:` → list of MCP tool names this tier may call that create/update data
  - `NEVER:` → explicit list of tool names this tier must not hold (documents the boundary, not just omission)
- Tool list in `.agent.md` must exactly match the Tool Access Registry rows for this tier — no additions, no omissions

---

## Phase 11 — Self-Hosting Verification Gate

**Purpose:** The system is only technically complete when a governance document can be updated through the pipeline in response to a CI recommendation, with an unbroken audit trail.

**Prerequisites:** Phase 10 complete.

### Steps

**11.1 — Run governance update through full pipeline**
- Input: First real CI recommendation from a completed CI cycle (Phase 7 output)
- Flow: CI cycle produces recommendation artefact → `ci.writeSysAdminBriefing` → DLM SysAdmin Agent reads briefing via `sysadmin.readSysAdminBriefing` → writes `change_directive` via `sysadmin.writeChangeDirective` → Policy Manager authors updated policy draft via `creation.writeDraft` → document travels through full creation → review → approval → indexing → storage pipeline → `sysadmin.writeGovernanceDoc` updates TypeDB → render-back writes new .md to `agent_path`
- Output: Updated governance document in TypeDB as system of record; .md regenerated; complete audit trail from `ci_report_generated` → `document_version_committed`

**11.2 — Confirm recursive loop closes**
- SysAdmin Activity Monitor reads new audit events via `sysadmin.readAuditEvents` covering the update → writes monitoring report via `ci.writeReport(behaviour, ...)` → feeds into next CI cycle via `ci.readAgentBehaviourData`
- Output: The next CI cycle has the SysAdmin tier's own operations as observable data — the system is self-auditing

**Final gate:** Audit trail contains a complete, unbroken chain from CI cycle trigger to policy approval. No gaps. No events with unrecognised `event_type` slugs (all must match Event Type Registry). No events where `actor_id` called a tool not listed for their role in Tool Access Registry.

---

## Appendix: Full Tool Inventory by Tier

| Tool name | Tier | Read/Write | Access scope |
|---|---|---|---|
| `audit_append_event` | 12 | W | Audit Trail Agent only |
| `knowledge.readEntry` | 12 | R | Context curators, Context Compressor |
| `knowledge.writeEntry` | 12 | W | Stage verifiers only |
| `relationship.queryDependencies` | 12 | R | Dependency Index Agent, Completeness Validator |
| `relationship.upsertDependency` | 12 | W | Dependency Index Updater (Tier 7) |
| `registry.getDocument` | 2 | R | All pipeline agents |
| `registry.queryDocuments` | 2 | R | All pipeline agents |
| `registry.getDependencyGraph` | 2 | R | All pipeline agents |
| `index.read*` (4 variants) | 2 | R | Wide |
| `index.update*` (3 variants) | 2 | W | Index Update Orchestrator only |
| `template.read` | 2 | R | Any authoring agent |
| `template.write` | 2 | W | Template Manager only |
| `template.getMigrationFlags` | 2 | R | Template Version Controller only |
| `naming.validate` | 2 | R | Naming Convention Enforcer only |
| `dod.getTemplate` | 2 | R | DoD Registry Agent, Stage DoD Agents |
| `metrics.aggregate` | 2 | R | Metrics Aggregator only |
| `routing.getRegistryPaths` | 1, 3 | R | System Orchestrator, Stage Orchestrators |
| `routing.dispatchStage` | 1, 3 | W | System Orchestrator, Stage Orchestrators |
| `creation.*` (8 tools) | 4 | R/W | Creation Stage agents |
| `review.*` (9 tools) | 5 | R/W | Review Stage agents |
| `indexing.*` (6 tools) | 7 | R/W | Indexing Stage agents |
| `storage.*` (7 tools) | 8 | R/W | Storage Stage agents |
| `distribution.*` (7 tools) | 9 | R/W | Distribution Stage agents |
| `archival.*` (7 tools) | 10 | R/W | Archival Stage agents |
| `ci.read*` (5 tools) | 13 | R | CI monitor agents |
| `ci.write*` (5 tools) | 13 | W | CI sub-agents (role-specific) |
| `sysadmin.read*` (3 tools) | 14 | R | SysAdmin tier only |
| `sysadmin.write*` (3 tools) | 14 | W | SysAdmin sub-agents (role-specific) |
| `context.*` (10 tools) | 11 | R/W | Context Delivery agents + non-DLMS consumers |

---

## Dependency Graph Summary

```
Phase 0 (registries + dir structure)
  └─► Phase 1 (TypeDB schema + corpus import)
        └─► Phase 2 (MCP server + gateway + audit infrastructure)  ◄── CRITICAL PATH
              └─► Phase 3 (Tier 12: cross-cutting tools)
                    └─► Phase 4 (Tier 2: governance layer tools)
                          └─► Phase 5 (Tiers 1,3: orchestrator tools)
                                └─► Phase 6 (Tiers 4–10: stage pipeline tools)  [6 modules in parallel]
                                      └─► Phase 7 (Tier 13: CI tools)
                                            └─► Phase 8 (Tier 14: SysAdmin + render-back)
                                                  └─► Phase 9 (Tier 11: external MCP + context delivery)
                                                        └─► Phase 10 (agent spec stubs)
                                                              └─► Phase 11 (self-hosting verification)
```

Phase 2 is the critical path gate. Nothing else can be built until the gateway and audit infrastructure are correct.

---

*This document is the authoritative implementation roadmap for the Nexus internal MCP server. The `acms-roadmap.md` captures the broader architectural context. The `platform-constraints.md` captures the platform constraints that motivated every design decision above.*
