# Tooling and External Components

Use the smallest stack that satisfies the locked requirements.

## Chosen

### Next.js

Role:

- frontend application,
- routing/UI,
- Vercel deployment.

Do not add a separate general-purpose web backend in V1.

### Convex

Role:

- database,
- reactive realtime queries,
- transactional mutations,
- server actions,
- background/scheduled execution,
- session state.

This replaces the earlier PostgreSQL + Drizzle + Socket.IO + custom job-queue design.

### Convex workflow component / durable workflow pattern

Use for the fixed multi-stage case-generation pipeline:

- stage persistence,
- retries,
- resumability,
- explicit sequence.

Do not build an autonomous orchestration agent.

### Convex agent/thread component — conditional recommended use

Use if its current API cleanly provides:

- persistent conversation threads,
- persisted streaming deltas,
- multi-client subscription.

Do not force it if it conflicts with the required per-NPC strict queue semantics; implement the small queue in Convex tables/functions instead.

### Vercel AI SDK

Role:

- provider abstraction,
- structured generation,
- streaming integration.

One configured generation model, one NPC model, one repair model, one judge model; some may be the same provider/model initially.

No dynamic model router in V1.

### Zod

Role:

- LLM structured-output schemas,
- shared TypeScript validation where appropriate.

Convex validators remain the database/function boundary validation source.

### React Flow

Role:

- clue-board graph UI,
- node dragging,
- edge/string creation,
- pan/zoom,
- custom node rendering.

Persistence/realtime stays in Convex.

### Sentry

Role:

- runtime/frontend error monitoring,
- failure visibility.

Convex dashboard/logs are sufficient for developer data/function inspection. No custom admin panel in V1.

### Vitest

Role:

- deterministic unit tests,
- generation validators,
- graph/interior generation,
- scoring helpers,
- time engine.

### Playwright

Role:

- two-player browser tests,
- realtime convergence,
- reconnect,
- clue board,
- NPC streaming.

### Promptfoo

Role:

- NPC consistency suites,
- prompt-injection/secret-leakage attacks,
- case-close judge regression datasets.

### Rate limiter

Use Convex-compatible rate limiting for expensive anonymous operations.

### Cloudflare Turnstile

Add before public launch to expensive anonymous case creation if abuse becomes externally reachable.

## Explicitly not chosen for V1

### PostgreSQL / Drizzle

Rejected after choosing Convex. Duplicates persistence/realtime infrastructure.

### Fastify / Express / NestJS

No separate backend needed with Convex.

### Socket.IO / `ws`

No separate realtime transport needed with Convex subscriptions.

### Redis / BullMQ

No separate queue infrastructure needed for V1 generation/background tasks.

### Liveblocks

Rejected for clue board because it duplicates Convex realtime/persistence. React Flow + Convex is enough for two-player graph collaboration.

### Yjs/CRDT layer

Not needed initially. Two-player board operations can use normal server-authoritative Convex mutations. Revisit only if text-level collaborative editing/conflict behavior proves inadequate.

### tldraw

Not needed unless clue board expands into true freehand whiteboarding/drawing.

### LangChain

No benefit for this fixed pipeline and simple roleplay context assembly.

### Vector database / RAG

NPC/case context is bounded structured case data. Do not add embeddings/vector search in V1.

### Custom admin dashboard

Not needed for developer-only debugging. Use Sentry + Convex dashboard.

## Operational note

Library APIs change. Before implementation of a library-specific integration, verify the installed/current version's API. Do not change the architecture merely because helper-library syntax has moved.
