# An Ontology for Trustworthy Multi-Agent Systems - one approach

## Why One Ontology

Building a trustworthy multi-agent system means answering six questions simultaneously for every operation in the system: *who is permitted to do this*, *who did it and can we prove it*, *does it meet the standard*, *is it the right moment in the lifecycle*, *does the agent have what it needs to do it well*, and *what exactly was produced*. Most frameworks answer these questions in different places â€” permissions in one config file, quality rules in another, lifecycle state in a task manager, documentation somewhere else. The result is a system that is coherent in parts but not as a whole, where a change in one place has invisible consequences somewhere else. The 6-dimension ontology is the decision to answer all six questions in one unified structure, so that every component of the framework â€” the database schema, the tool design, the agent specs, the policy engine â€” is an expression of the same model. 

The six dimensions are **Capability**, **Accountability**, **Quality**, **Temporality**, **Context**, and **Artifact**. They are not a checklist or a scoring rubric. They are six orthogonal concerns â€” each one covers ground the others don't, and together they cover everything. If a framework element satisfies all six, it is structurally sound. If it fails one, there is a gap, and the gap has a name.

***

## The Six Dimensions

**Capability** answers the question: *what is this agent permitted to do, right now?* In Nexus, the answer is encoded in the tools an agent possesses. The tool list in an agent's spec is not a description of its capabilities â€” it is its capabilities, enforced at the client layer by VS Code before any server call is made. When a task changes state, the Policy Engine withdraws tools that are no longer appropriate and sends a `tools/list_changed` notification to VS Code. Capability is therefore not static â€” it is a function of both the agent's role and the current lifecycle state of the work it is doing. An agent mid-task has write tools. The same agent after submitting proof has only read tools. The Capability dimension ensures that at no point in the lifecycle can an agent do something it shouldn't â€” not because it was told not to, but because the means to do it no longer exist. 

**Accountability** answers: *who did this, under what conditions, and can that ever be disputed?* Every mutation in Nexus â€” every document write, every state transition, every tool call â€” produces an immutable audit log entry containing the tool name, the task scope, the content hash, the session identifier, and a timestamp. GitHub events arrive via webhook and are written to the same log with `actor: webhook:github`. Nothing is ever deleted from the audit log. The chain of custody for any artefact is a SQL query: every hand it passed through, every version it went through, in chronological order. The accountability dimension is what makes the framework trustworthy in a legal and organisational sense â€” not just functionally correct, but verifiably correct. 

**Quality** answers: *does this output actually meet the standard?* Quality in Nexus is not a review that happens at the end. It is encoded in the structure of the work before the work begins. The proof template â€” the first thing a Task Performer writes before any implementation â€” specifies exactly what commands will be run, what output format is expected, and what exit codes constitute success. The `submit_proof` tool validates the submitted proof against these criteria before accepting it. QA rules for each document type live in the database as structured rows, not in agent specs. When a sprint retrospective surfaces a new rule â€” "always use `npm test`, not `bun test`" â€” it is added as a database row and immediately applies to every future task of that type. The Quality dimension is the mechanism by which the framework gets smarter over time without agent specs getting longer. 

**Temporality** answers: *is this the right moment for this operation?* Every task and feature in Nexus has a lifecycle â€” a sequence of named states with explicit rules for what triggers each transition and who has authority to trigger it. These transitions are stored as rows in a `state_transitions` table, not as code. The Policy Engine evaluates this table whenever a lifecycle event fires and advances state automatically when the conditions are met. An agent cannot submit a proof while the task is still in `DEFINED` state â€” the `submit_proof` tool checks the current state before executing and rejects the call with a typed error if the precondition is not met. Temporality is what makes the pipeline self-advancing and self-governing: the framework knows where it is, what comes next, and who has authority at each moment â€” without a human managing the flow. 

**Context** answers: *does the agent have what it needs to do this work well?* The empirical finding that drove this dimension is that giving an agent more instructions does not improve performance â€” it degrades it. Every additional rule in a system prompt is competing for the same finite attention. Nexus responds to this with context cards: a short, generated briefing containing only the information relevant to this specific agent for this specific task, pulled from a growing knowledge base of sprint learnings and patterns at the moment of agent instantiation. The agent never searches for context; the context card arrives before it starts. The knowledge base accumulates from retrospectives â€” not as prose appended to agent specs, but as structured, queryable entries that the Context Agent can filter and compose. Context is the dimension that keeps agent performance high as the framework's knowledge grows, without the overhead growing with it. 

**Artifact** answers: *what exactly was produced, and how does it relate to everything else?* Every document in Nexus has a declared type, a version history, a lineage relationship to the documents it was derived from, and a scope that ties it to a specific task or feature. A proof document is not just a file â€” it is a typed, versioned, lineage-linked artefact that can be traced back through the QA review that verified it, the task spec it responded to, the acceptance criteria that defined the standard, the feature spec that set the scope, and the idea that originated the work. The Artifact dimension is what makes the chain of custody complete and traversable â€” not just a log of events, but a connected graph of what was made, from what, by whom, verified against what standard. 

***

## How the Six Dimensions Work Together

The ontology's power is not in any single dimension â€” it is in how they constrain each other. Capability determines who can act. Temporality determines when. Quality determines what constitutes a valid outcome. Accountability records what actually happened. Context ensures the agent had what it needed to act well. Artifact preserves the output and its full provenance. A tool that satisfies all six is structurally sound. A gap in any one produces a category of failure:

- Without **Capability** enforcement: agents exceed their scope
- Without **Accountability**: no chain of custody, no trustworthy audit
- Without **Quality** gates: passing tests don't mean correct outcomes
- Without **Temporality**: operations occur out of order, state becomes inconsistent
- Without **Context**: agents operate with incomplete information, silently
- Without **Artifact** lineage: outputs are isolated facts, not a connected, traceable record

The ontology is the single lens through which every design decision in the framework is evaluated. When a new tool is proposed, the question is not "does this seem useful?" â€” it is "which dimension does this serve, and does it satisfy all six?" When a new document type is added, the same question applies. The six dimensions are not a framework about agents. They are the structural condition under which agents become trustworthy. 

References: 
1. https://one.ie/ontology/
2. https://one.ie/docs/overview/ontology/