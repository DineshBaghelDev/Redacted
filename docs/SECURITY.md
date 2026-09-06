# Security and Trust Boundaries

## Core rule

Hidden truth must be inaccessible by construction, not merely hidden in the UI or protected by prompts.

## Server-only case data

Never expose through client-callable queries/actions:

- `caseSolutions`,
- raw private `caseEvents`,
- `npcScripts`,
- unreleased forensic outputs,
- generation repair/debug payloads containing solution truth.

Do not send these documents to the client and filter fields client-side.

## NPC isolation

The NPC LLM must never receive the full case solution.

`buildNpcContext` may include only:

- this NPC's script,
- facts this NPC knows/experienced,
- allowed public world facts,
- this NPC/session conversation history,
- this NPC/session memory.

Never include another NPC's private script.

## Clerk users

Use Clerk for player authentication in V1.

Use the Clerk user identity for:

- authorization,
- ownership/membership checks,
- rate limiting,
- abuse correlation.

Display identity is a user-chosen nickname.

## Room/reconnect credentials

- room code is shareable and allows joining while capacity permits,
- reconnect secret identifies a specific player slot,
- store only a cryptographic hash of reconnect secret,
- raw secret returned once,
- use high-entropy value independent of room code,
- never log raw reconnect secrets.

## Session authorization

Every session-scoped client call:

1. authenticate Clerk user identity,
2. verify membership/reconnect state,
3. verify requested entity belongs to the session's case,
4. verify visibility/discovery rules,
5. verify session is in an allowed state.

Never trust client-supplied case IDs/entity relationships without checking ownership.

## Generated-case immutability

Once `case.status = ready`, ordinary runtime functions cannot update generated-case truth tables.

Only explicit developer/admin recovery paths, if ever added later, may bypass this rule.

## LLM output trust

Treat all LLM output as untrusted structured data.

- validate schemas,
- validate entity references,
- validate lengths/enums,
- re-check server-side permissions,
- never execute arbitrary LLM-proposed state mutations,
- NPC text can only become persisted dialogue/memory, not game truth.

## Player-input trust

Bound:

- nickname length,
- NPC message length/frequency,
- clue-board note length,
- edge labels,
- public-record search query length,
- case-close explanation lengths.

Sanitize rendering; do not render user HTML.

## Rate limiting / abuse

Public sign-up can burn LLM budget.

At minimum rate-limit:

- case creation/generation,
- NPC messages,
- case-close judging,
- reconnect/join attempts.

Use per-Clerk-user and global limits.

Before public launch, add bot protection such as Cloudflare Turnstile to expensive public entry points, especially case creation.

## Secrets

Provider/API keys remain server-side in Convex environment configuration.

No model/provider secret may enter Next.js client bundles.

## Logging/privacy

`llmCalls` stores metadata by default, not complete prompts/transcripts.

Sentry should avoid collecting reconnect secrets or other sensitive tokens.

Full NPC conversations are game content and may be persisted as part of session state; retention should follow the 7-day abandoned-session policy unless product requirements later differ.
