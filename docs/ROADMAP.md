# Roadmap

v1.0 shipped to a few friends on 2026-10-12. This is the to-do list for the next versions. Version numbers are a rough plan, not a promise. Tick items off here and log the shipped work in `progress.md`.

## v1.1 — Security and AI cost (do before sharing the game more widely)

Production calls Kimi K2.6 (Moonshot, `MOONSHOT_API_KEY`) for every interview question and once per report grading. Nothing limits how often.

- [ ] **Per-player limit on interview questions.** For example a few per minute and a daily cap per Clerk user. Each question costs 3 game minutes, but a player can start unlimited games. `docs/SECURITY.md` requires this.
- [ ] **Limit report filing and grading** per player and per room.
- [ ] **Limit room creation** per player per day.
- [ ] **Global daily AI budget:** stop interviews with a friendly message when the day's spend cap is hit.
- [ ] **Bot protection** (for example Cloudflare Turnstile) on sign-up and room creation.
- [ ] **Clerk production instance and own domain.** Production still uses test keys (`pk_test`): "development mode" badge and user limits.
- [ ] **A working backup model for grading.** In production only Kimi K2.6 has a key. The last fallback (Kimi K3 through NIM) fails without `NIM_API_KEY`, so if Kimi is down players see "Judging is unavailable right now".
- [ ] **Alerts on AI failures and spend** (Sentry or Moonshot dashboard).
- [ ] **Scheduled backups** for the production Convex deployment.
- [ ] **Remove unused secrets from Vercel production:** OpenRouter, Groq, Gemini and NIM keys are only used by Convex.
- [ ] **Clean up dev test games** copied into production by the v1.0 snapshot import.
- [x] **Remove the Sentry example page and API route** (done in v1.1.0).

## v1.2 — Making new cases

New cases can only be generated locally (`next dev` → `/dev/generation`, `DEV_TOOL_USER_IDS` allowlist) into the dev database.

- [ ] **Safe "copy new cases to production" script.** Copy only a case's tables and append them. Never run a full snapshot import with `--replace` again, because it would wipe players' games.
- [x] **Case creation dashboard / dev tester in production.** Done in v1.1.0: `/dev/generation` is live, gated by `DEV_TOOL_USER_IDS` (set it on the production deployment), with a one-click **Generate full case**. Production generation uses Kimi only; GPT-6 Sol stays a local-only speedup.
- [ ] **Bot-proof and budget the generation entry point** if it ever opens beyond the owner.

## v1.2 — Artwork

- [ ] **Update assets:** remaining items in `docs/audit/ARTWORK_NEEDED.md` (for example per-task lab visuals and missing map icons). Keep the pixel-noir rules: no CCTV visuals, no case facts painted into art.

## Later (v2.x)

- [ ] **Run checks on every pull request** (GitHub Actions: TypeScript, lint, tests). CodeRabbit skips PRs over 100 files, so keep PRs smaller too.
- [ ] **Keyboard way to tie clueboard strings.** The dropdown was removed in v1.0, so dragging is the only way.
- [ ] **Generated-text contradictions** still slip through (see the "Wording vs data" note in `progress.md`). Add more checks.
- [ ] **Performance on a mid-range phone,** and the shared clock with both tabs closed. Neither has been measured.
- [ ] **Watch the main-menu "never finishes loading" bug.** Seen twice and not reproduced since.
