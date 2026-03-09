## Context Engineering: Our Approach

Most people building AI agent systems make the same mistake: they assume that giving an agent more information produces better results. More context feels safer. It feels thorough. It feels like you're setting the agent up for success.

The research says the opposite is true.

Language models have a finite attention budget. Every token you add to a context window competes with every other token for that attention. When you load an agent with a detailed role description, architectural background, workflow guidance, and task instructions all at once, the model doesn't read it the way a human reads a briefing document — absorbing everything and prioritising accordingly. It distributes attention across the entire window, with a predictable curve: strong at the start, degrading through the middle, recovering slightly at the end. The instructions buried in the middle of a long agent file are the ones most likely to be missed.

This is called the lost-in-the-middle problem, and it means that a poorly structured 200-token agent file will produce worse outputs than a well-structured 50-token one — not because the longer file contains wrong information, but because it contains too much of it.

---

### Context as a Finite Resource

The way we think about it: context is not free storage. It's more like working memory. A surgeon before an operation doesn't want every patient record in the hospital — they want this patient's chart, this procedure's notes, and the drug allergy list. More records don't make them a better surgeon. They increase the chance of grabbing the wrong detail at a critical moment.

Our agents operate on the same principle. Each agent gets the minimum information needed to do its specific job — and nothing else. Not because we're being restrictive, but because additional information actively degrades the quality of the work.

---

### How We Scope Context

Every operation in our system has an explicit context window defined before we write a single instruction. We ask three questions for each one:

- **What does this agent need to read?** Named files only, not categories.  
- **What does this agent write?** One artefact, one location.  
- **What is this agent explicitly forbidden from reading?** Because if it can reach it, it might load it.

This produces a tree — not a timeline — of scoped information packages. The Feature Orchestrator sits at the root and holds almost nothing: just file paths and gate conditions. Below it, each executor operation gets its own narrow window. The agent that defines a feature reads the accepted idea. The agent that writes acceptance criteria reads the feature spec. The agent that writes tests reads the acceptance criteria — and nothing upstream of it. Each node in the tree is isolated from the others.

The one exception is the Context Curation agent. Its job is compression: it receives everything a task could possibly need, and produces the minimum sufficient subset. Its input is intentionally larger than its output. That compressed package — and only that package — is what the Task Performer ever sees.

---

### How We Structure Agent Instructions

If the content of agent instructions is one dimension of the problem, structure is the other. We write agent instructions the way you'd write a linter config, not the way you'd write a job description.

This is wrong:

You are a Test Writer Agent. Your role is to translate acceptance criteria into executable tests. You should carefully read the task acceptance criteria provided to you and produce a comprehensive test suite that covers all the conditions described. Make sure your tests are specific and verifiable.

This is right:

```
READS: task-ac.md only
WRITES: .framework/features/[slug]/tasks/[task-slug]/tests.md
FORMAT: Given/When/Then, one test per AC condition
NEVER: read feature-spec.md or parent AC
```

Same information. One quarter of the tokens. No prose for the model to pattern-match against when it should be focused on the task.

Critical rules go at the top of the file. Boundaries go at the bottom. Nothing important sits in the middle.

---

### Progressive Disclosure and Caching

Not all context loads at startup. Agent files stay thin — just identity, tools, and pointers. When an agent encounters a task that requires deeper guidance, it loads the relevant skill file on demand. The skill file contains the substantive content: rubrics, templates, checklists, format specifications.

This matters for two reasons. First, it keeps the always-on context window small, so attention is concentrated on what actually matters for the current operation. Second, it enables prompt caching: content that stays identical across multiple invocations — skill files, instruction files, output conventions — can be cached by the model provider at roughly 10% of the normal token cost. An agent that processes eight tasks in sequence warms its cache on the first task and pays a fraction of full price for each subsequent one.

This is why our high-value curation agents — Context Agent, Test Writer, QA Reviewer — process all tasks in a feature as a sequential batch rather than being reinvoked fresh for each vertical slice. Same instructions, eight tasks, one cache warm.

---

### What This Produces

An agent team designed this way has a counterintuitive quality: the orchestrators are the least intelligent-looking parts of the system. They hold almost no information. They route, gate, and pass paths. All the intelligence lives in the executor agents and their skills — narrow, purpose-built, precisely scoped.

The result is a system where each agent has nowhere to go except the task in front of it. No irrelevant context to pattern-match against. No architectural prose to weight against the actual instructions. No role description competing with the output format for attention.

Less context, better work. That's the principle. Everything else follows from it.  
