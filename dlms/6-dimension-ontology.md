# The 6-Dimension Ontology

The ONE Platform is built on a 6-dimension ontology that models reality itself. This is the core of everything—from data structures to feature design to AI reasoning.

Why an Ontology?

Instead of designing separate data models for each feature, ONE uses a universal ontology that:

Scales infinitely - From friend circles (2 people) to governments (billions)
Never needs schema changes - Add new entity types without modifying tables
Enables AI reasoning - Clear, consistent patterns AI can learn and apply
Ensures consistency - Every feature follows the same mental model
The 6 Dimensions
┌──────────────────────────────────────────────────────────────┐
│                      1. GROUPS                                │
│        Multi-tenant isolation with hierarchical nesting       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      2. PEOPLE                                │
│              Authorization & governance                       │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      3. THINGS                                │
│                    Entities & domain objects                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    4. CONNECTIONS                             │
│                  Relationships & metadata                     │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                      5. EVENTS                                │
│                    Actions & audit trail                      │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                    6. KNOWLEDGE                               │
│              Labels, embeddings, semantic search              │
└──────────────────────────────────────────────────────────────┘

1. Groups

Hierarchical containers for organizing entities

Groups provide multi-tenant isolation at every level:

Friend circles - 2+ people
Businesses - Teams, departments, organizations
Communities - Open membership, shared interests
DAOs - Decentralized autonomous organizations
Governments - Cities, states, countries
Organizations - Companies, nonprofits

Groups can nest infinitely (parent → child → grandchild), creating hierarchies like:

Company (organization)
├── Engineering (organization)
│   ├── Backend Team (business)
│   └── Frontend Team (business)
└── Sales (organization)
    ├── US Region (business)
    └── EU Region (business)


Database implementation:

groups {
  _id: ID,
  name: string,
  type: "friend_circle" | "business" | "community" | "dao" | "government" | "organization",
  parentGroupId: ID?,  -- For hierarchy
  properties: { /* type-specific data */ },
  groupId: ID  -- Which group does this belong to
}

2. People

Authorization and governance

People represent actors in the system—anyone who can take actions:

platform_owner - Owns the entire ONE installation
org_owner - Owns a group (company, DAO, etc.)
org_user - Member of a group
customer - External user (no group membership)

Implementation: People are represented as things with type "creator" and role metadata.

person: {
  _id: "user_123",
  type: "creator",
  name: "Alice",
  role: "org_owner",
  groupId: "company_abc"
}

3. Things

Entities and domain objects

Things are the “nouns” of your system—everything that exists:

Core: users, groups, organizations
Content: posts, articles, documents, files
Commerce: products, orders, invoices
Learning: courses, lessons, assignments
AI: agents, models, embeddings
Social: follows, subscriptions, memberships
Tokens: cryptocurrencies, NFTs, access tokens
50+ more types

Each thing has:

thing: {
  _id: ID,
  type: string,  -- "product", "course", "agent", etc.
  name: string,
  description: string,
  properties: { /* type-specific data */ },
  status: "draft" | "active" | "published" | "archived",
  groupId: ID,  -- Which group owns this
  createdAt: Date,
  updatedAt: Date
}

4. Connections

Relationships between entities

Connections model how things relate:

owns - A owns B (group owns product, user owns post)
authored - A authored B
follows - A follows B (person follows creator)
subscribed - A is subscribed to B
teaches - A teaches B (instructor teaches course)
enrolled - A is enrolled in B (student in course)
holds_tokens - A holds N of B (person owns NFTs)
purchases - A purchased B with metadata (price, date)
20+ more types
connection: {
  _id: ID,
  type: string,  -- "owns", "follows", "enrolled_in", etc.
  fromThingId: ID,  -- Source entity
  toThingId: ID,    -- Target entity
  metadata: {
    price?: number,
    startDate?: Date,
    endDate?: Date,
    quantity?: number
  },
  groupId: ID,  -- Which group is this relationship in
  createdAt: Date,
  validFrom: Date,  -- When relationship starts
  validTo: Date?    -- When relationship ends
}

5. Events

Complete audit trail of all actions

Every action in the system creates an event:

entity_created - Someone created a thing
entity_updated - Someone modified a thing
connection_created - Someone created a relationship
connection_deleted - Someone ended a relationship
entity_published - Content was published
order_completed - Customer completed a purchase
70+ more event types
event: {
  _id: ID,
  type: string,  -- "entity_created", "order_completed", etc.
  actorId: ID,   -- WHO did this (a person)
  targetId: ID,  -- WHAT they acted on (a thing)
  timestamp: Date,
  metadata: {
    entityType?: string,
    price?: number,
    reason?: string
  },
  groupId: ID,  -- Which group context
}

6. Knowledge

Intelligence layer for RAG and search

Knowledge enables semantic understanding:

knowledge: {
  _id: ID,
  thingId: ID,      -- Links to a thing
  labels: [string], -- "tutorial", "advanced", "beginner"
  chunks: [
    {
      text: string,
      embedding: float[],  -- Vector representation
      section: string
    }
  ],
  tags: [string],
  groupId: ID
}

Example: E-Commerce Platform

Let’s see how an e-commerce platform uses the 6 dimensions:

Groups
Acme Corp (organization)
├── Merch Store (business)
└── Support (community)

People
owner: role="org_owner", groupId="acme"
customer: role="customer"
support_agent: role="org_user", groupId="acme/support"

Things
laptop_pro: type="product", properties={price: 999, stock: 50}
order_123: type="order", properties={total: 999}

Connections
customer --owns--> order_123
order_123 --contains--> laptop_pro (via connection metadata: quantity=1)

Events
product_published: "laptop_pro published"
order_created: "order_123 created"
order_completed: "order_123 paid"

Knowledge
laptop_pro knowledge:
  labels: ["electronics", "computers", "bestseller"]
  chunks: [
    {text: "16GB RAM, Apple M3...", embedding: [...]}
  ]


---

# The ONE Ontology - ONE Platform

Complete Architecture for AI Systems

Every intelligent system needs a coherent model of reality. The ONE Ontology gives AI agents—and the humans who direct them—a complete, scalable architecture for understanding **who owns what, who can do what, what happened, and what it all means.**

## The Ontology-Driven Architecture for AI-Native Platforms

Escaping the complexity trap: How the 6-dimension ontology achieves 98% AI code generation accuracy and 100x developer productivity by modeling reality itself

Your browser does not support the audio element.

The Foundation

## How to work differently

Traditional systems create tables for features, pollute schemas with temporary concepts, and end up with hundreds of entities nobody understands. The ONE Ontology takes a different approach: **model reality in six core dimensions and map everything to them.**
Groups
Hierarchical containers that nest infinitely. From friend circles to global enterprises—perfect isolation at any scale.
People
Authorize and govern. Every action traces back to human intent. AI serves people, not the other way around.
Things
Capture what exists. Agents, products, audiences, tokens—anything you need to model with strong types.
Connections
Express relationships. Ownership, authorization, value flows—make the implicit explicit.
Events
Record what happened. Immutable audit trail that enables time-travel queries and learning loops.
Knowledge
Store what it means. Semantics, embeddings, and insights that give agents context to act intelligently.
**Together, these dimensions create a generative architecture** where human intent flows through organizational scope, creating entities that relate, generating history that produces intelligence.
Complete Model
## Inside the ONE Ontology  
Deep Dive
1\. Groups
Hierarchical containers that organize people and things
Groups are hierarchical containers that can nest within each other, from intimate friend circles to massive organizations. Each group owns its own graph of people, things, connections, events, and knowledge—creating perfect isolation at any scale.
6 Group Types
friend\_circle
Small, intimate groups
business
Commercial organizations
community
Interest-based collectives
dao
Token-governed groups
government
Public institutions
organization
Generic groups
Hierarchical Nesting

```
groups/acme-corp (business)
  ├─ groups/engineering (organization)
  │   ├─ groups/backend-team (organization)
  │   └─ groups/frontend-team (organization)
  ├─ groups/marketing (organization)
  └─ groups/sales (organization)

groups/emmas-friends (friend_circle)
  ├─ groups/birthday-party (friend_circle)
  └─ groups/game-night (friend_circle)

groups/cool-dao (dao)
  ├─ groups/treasury (dao)
  └─ groups/governance (dao)
```

Properties
-   • Name, slug, and type
-   • Parent group (for nesting)
-   • Ownership chain
-   • Subscription plan and billing
-   • Usage quotas and limits
-   • Status (active, suspended, trial)

Why it matters
-   • Works at any scale
-   • Natural hierarchy modeling
-   • Multi-tenant isolation
-   • Inherited permissions
-   • URL-based creation
-   • Type-specific defaults

```
groups/acme-corp
  type: "business"
  parentGroupId: null
  properties: {
    plan: "enterprise",
    limits: { users: 50, agents: 20, inference: "1M/month" },
    usage: { users: 12, agents: 8, inference: "234K" },
    status: "active"
  }
  owned_by → people/anthony-o-connell

groups/engineering
  type: "organization"
  parentGroupId: "acme-corp"
  inherited_permissions: true
```

How Groups Work

#### URL-Based Creation

Create groups instantly by visiting `one.ie/group/slug`

```
one.ie/group/cooldao → creates "cooldao" group
one.ie/group/cooldao/treasury → creates nested "treasury" group
one.ie/group/emmas-birthday → creates "emmas-birthday" group
```

#### Type-Specific Defaults 

Each group type has smart defaults based on its use case: friend\_circle Private, invitation-only, no billing business Billing enabled, quotas enforced dao Token-gated, on-chain governance community Public, open membership 

#### Multi-Tenant Isolation 

Every group gets its own isolated data space. Resources from one group never leak into another—perfect for SaaS, white-label deployment, and enterprise scale. 3 Example Scenarios

#### Scenario 1: Friend Circle

```
Emma creates: one.ie/group/emmas-friends

groups/emmas-friends (friend_circle)
  owned_by → people/emma
  members → [emma, sarah, jake, alex]

  └─ groups/birthday-party (friend_circle)
      event_date: "2025-10-20"
      location: "Emma's House"
      members → [emma, sarah, jake]  # Subset of parent
```

Perfect for: Party planning, trip coordination, small gatherings

#### Scenario 2: Business Organization

```
Anthony creates: one.ie/group/acme-corp

groups/acme-corp (business)
  owned_by → people/anthony
  plan: "enterprise"
  billing: { seats: 50, price: "$5000/mo" }

  ├─ groups/engineering (organization)
  │   ├─ groups/backend (organization)
  │   │   members → [dev1, dev2, dev3]
  │   └─ groups/frontend (organization)
  │       members → [dev4, dev5]
  │
  └─ groups/marketing (organization)
      members → [marketing1, marketing2]
```

Perfect for: Company org charts, department isolation, permission inheritance

#### Scenario 3: Decentralized Organization

```
Community creates: one.ie/group/cooldao

groups/cooldao (dao)
  token_address: "0x..."
  voting_threshold: 100_000
  members → [wallet1, wallet2, wallet3...]

  ├─ groups/treasury (dao)
  │   governance: "multisig"
  │   signers → [wallet1, wallet2, wallet3]
  │   funds → $500K USDC
  │
  └─ groups/governance (dao)
      proposals → [prop1, prop2, prop3]
      voting_power → weighted by token holdings
```

Perfect for: Token-gated communities, on-chain governance, decentralized collaboration

2\. People

WHO authorizes, owns, and governs

People are the prime movers. Every decision, transaction, and relationship traces back to human intent. People link to organizations through membership connections, creating clear authorization chains.

Properties
-   • Identity (name, email, wallet)
-   • Authentication credentials
-   • Role within organization
-   • Permissions and authorization
-   • Preferences and settings

Why it matters
-   • Human authorization required
-   • Clear governance
-   • Audit trails
-   • Intent and accountability
-   • AI serves people

3\. Things

WHAT exists in your system

Things are discrete entities with properties, types, and states. They can be agents, products, audiences, tokens, mandates, contracts—anything you need to model. Every thing belongs to exactly one organization.

66 Thing Types
Core
Business Agents
Content
Products
Community
Knowledge
Platform
Tokenization
External

4\. Connections

HOW things relate to each other

Connections are first-class relationships with their own properties. They express ownership, membership, governance, authorization, dependencies, transactions, and more. Connections make the implicit explicit.

25 Connection Types

owns
can\_execute
governed\_by
member\_of
following
transacted
licensed\_to
taught\_by

5\. Events

WHAT happened, when, and why

Events are immutable records of every action in your system. They create an audit trail, enable time-travel queries, feed analytics, and power learning loops. Events are the memory of your system.

67 Event Types
 
 Thing lifecycle 
 User actions 
 AI/Agent 
 Token/NFT 
 Content 
 Knowledge 
 Analytics 
 Blockchain 
 6\. Knowledge

WHAT it all means

Knowledge captures semantics—labels, chunks, embeddings, and structured insights—that give agents the context they need to act intelligently. Knowledge transforms raw events and properties into queryable, composable intelligence.

Labels
Chunks
Embeddings
Relationships
Licensing
Provenance
Tokenization
Visual Model

## How The Ontology Works

A complete example showing how all six dimensions of the ONE Ontology work together in a real feature.

### Example: Build a Landing Page with Pricing

#### Groups

Scope

Website is built within "SaaS Startup" group boundary. All pages and components belong to this group (can be nested).

groupId: saas-startup → scope: all pages, components, content collections

#### People

Authorization

Product owner authorizes the intent: "Build landing page with pricing table."

actorId: owner\_123 → intent: build\_landing\_page

#### Things

Entities Involved

The system resolves the intent to concrete Things: the website (astro\_site), landing page (astro\_page), and pricing table component (react\_component).
landing\_page
type: astro\_page
pricing\_table
type: react\_component
#### Connections
Relationship Created
ONE asserts a \`contains\` relationship between page and components with layout metadata.
landing\_page → pricing\_table
relationshipType: contains
metadata: { position: "center", tiers: 3 }
#### Events
Action Recorded
An immutable \`page\_created\` event records who built what, when, and how.
type: page\_created
actorId: owner\_123
targetId: landing\_page
metadata: { route: "/", components: 5, deployed: true }
#### Knowledge
Context Added
Knowledge labels give downstream agents context for optimization, SEO, and improvements.
framework:astro
style:modern
lighthouse:100
**Result:** One intent now touches every dimension—group scope, authorization, page/component entities, layout relationships, creation events, and framework context—ready for deployment to the edge.
### Data Flow Through The Ontology
0
#### Groups
**Isolation Layer:** Everything happens within a group boundary (can be hierarchically nested). Perfect multi-tenant separation, resource quotas, billing boundaries.
Scope
Hierarchical
Isolation
Establishes scope for all operations (with optional nesting)
1
#### People
**Policy Layer:** Humans set outcomes, attach limits, and approve execution. Every workflow starts with explicit intent.
Intent
Policy
Approval
Triggers system action
2
#### Things
**Entity Layer:** ONE resolves intent into typed Things—people, agents, offers, content—and versions every change.
66 types
Typed
Validated
Creates relationships
3
#### Connections
**Relationship Layer:** Defines how value moves—ownership, membership, authority—and stores actionable metadata on every edge.
25 types
Graph
Metadata
Determines permitted actions
4
#### Events
**Audit Layer:** Records what happened, when, by whom. Builds the immutable timeline for analytics, compliance, and automation.
67 types
Timestamped
Immutable
Feeds the knowledge graph
5
#### Knowledge
**Intelligence Layer:** Adds labels, embeddings, and summaries so agents can recall, reason, and personalize.
Labels
Vectors
RAG
#### Shared Mental Model
Plain-English features compile straight into the ontology. You can inspect each dimension, test assumptions, and ship new automations with confidence.
Plain English DSL
## Write Features in English  
The System Builds Everything
Describe what you want in plain English. The compiler checks every line against the ontology, generates TypeScript and tests, and deploys to the edge.
CREATE
Add typed Things—agents, content, tokens, offers—directly into the graph
CONNECT
Define relationships like owns, follows, powers with metadata and direction
RECORD
Append immutable Events for purchases, interactions, completions, insights
CALL
Invoke services—OpenAI, Stripe, ElevenLabs—and persist structured outputs
CHECK
Enforce People-defined guardrails before any action runs
### Example: Create a Blog with Search
Plain English
```
WEBSITE: Add blog to site
CREATE content collection "blog"
  WITH schema: title, date, author, tags
  WITH markdown support
CREATE page /blog
  LIST all posts in grid view
  ADD search and filter by tags
CREATE page /blog/[slug]
  SHOW full post with TOC
  ADD share buttons
```
Nine lines of English. The compiler generates Astro pages, content collections, and React components.
What Maps to Ontology
Things Created
blog\_collection, blog\_index\_page, blog\_post\_page, search\_component — all typed
Connections Created
site contains blog pages, pages use components, content has schema
Events Logged
collection\_created, pages\_generated, components\_added, site\_deployed
Knowledge Indexed
Blog posts indexed for search, tags categorized, SEO metadata generated
**Every feature follows this flow.** Write it once in English, the compiler checks it against the ontology, and the edge deploys it everywhere.  
If a step breaks the model, you know before it ships.
The Foundation
## Why This Works
The ontology holds the contracts. The DSL speaks those contracts. Together they give **humans, AI agents, and code the same, inspectable source of truth.**
66 Thing Types
Every entity—users, agents, content, products, tokens—has a canonical, versioned schema
25 Connection Types
Directional edges model ownership, access, payouts, and more with structured metadata
67 Event Types
Every action—purchases, completions, interactions—is immutable and ready for analytics
**Clarity scales.**  
Your DSL features, agent playbooks, and analytics dashboards stay in sync because they pull from the same ontology.
The Generative Chain
## How Context Flows
Everything begins with identity and organizational scope. This isn't just metadata—it's the foundation that makes every AI operation context-aware, authorized, and intelligent.
### The Ownership Hierarchy
```
groups/acme-corp (business, the container)
  ├─ owned_by → people/anthony-o-connell (the owner)
  ├─ member_of → people/sarah-thompson (member, role: analyst)
  │
  ├─ groups/engineering (nested subgroup)
  │   └─ owns → things/backend-agent
  │
  └─ owns → things/strategy-agent
      ├─ governed_by → things/business-strategy-mandate
      ├─ can_read → knowledge/market-research-bundle
      ├─ can_read → knowledge/competitor-landscape
      └─ can_execute → people/anthony-o-connell (owner)
      └─ can_execute → people/sarah-thompson (delegated)
```
#### Context Propagation in Action
When you ask your Strategy Agent a question, the system automatically enriches the prompt with your identity graph: group context (with hierarchy), authorization, accessible resources, recent events, relevant knowledge (semantic match), and mandates/constraints.
The agent knows WHO is asking, WHAT group scope to operate in, WHAT parent/child groups exist, WHAT it can access, WHAT happened recently, WHAT constraints apply, and WHAT it already knows.
What This Unlocks
## The ONE Ontology Advantage
Zero-Trust Authorization
Every action traces back through explicit connections to a person in an organization. Perfect auditability. No implicit permissions. Authorization is data, not code.
Identity-Aware Intelligence
Agents don't just retrieve facts—they understand organizational context, provenance, licensing, governance, and strategic constraints.
Event-Driven Compounding
Every action generates events that create knowledge that enriches future actions. The system gets smarter with every interaction.
Protocol-Agnostic Integration
Same ontology, different protocols—all via metadata. Query across Stripe, SUI, and any future protocol with unified patterns.
Cross-Organization Collaboration
Resources can be shared without transferring ownership. Perfect for knowledge marketplaces with trustless licensing.
Tokenization with SUI
SUI's object-centric model maps naturally to ONE's thing-centric ontology. Knowledge as tradeable, licensable assets.
## Built for Scale
The ONE Ontology isn't just theory—it's production-ready architecture that scales from solo creator to global enterprise.
Current Scale
• 1M+ things per organization  
• 10M+ connections (optimized indexes)  
• 100M+ events (time-partitioned)  
• 1M+ knowledge chunks (vector search)
Performance
• Graph caching (ownership chains)  
• Materialized views (common queries)  
• Event archival (cold storage)  
• Token budgeting (context aware)
Future Scale
• Shard by organization (>10M things)  
• Streaming events (Kafka)  
• Distributed vectors (Weaviate)  
• Regional databases (CDC replication)
## ONE Ontology. Infinite Systems.
The ONE Ontology proves that you don't need hundreds of tables or complex schemas to build intelligent systems. You need six dimensions that model reality.
**Groups** partition for scale (with infinite hierarchy)
**People** authorize for governance
**Things** exist for substance
**Connections** relate for structure
**Events** record for memory
**Knowledge** learns for intelligence
Map your domain to these dimensions. Everything else is just data.
Protocol agnostic Type safe AI understandable Built for scale
---
Source: [The ONE Ontology - ONE Platform](https://one.ie/ontology/)