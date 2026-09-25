# Redacted

Browser-based detective simulation where players investigate procedurally generated cases across a simulated city using interrogation, CCTV, forensics, records, and evidence.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_CONVEX_URL` for Convex-backed local development.

## Case generation

Cases are generated once by an AI pipeline on Convex (`convex/generation/`): code builds the city, timeline, evidence and checks; AI writes the crime, cast, story, lies, text and brief. Each AI stage tries an ordered list of models (`STAGE_MODELS` in `convex/generation/llm.ts`) and skips providers with no key. Full design: [docs/GENERATION.md](./docs/GENERATION.md).

**Models.** Set the keys you use in the Convex environment (`npx convex env set NAME value`): `CODEX_API_KEY` + `CODEX_BASE_URL` (GPT-6 Sol, first choice), `MOONSHOT_API_KEY` (Kimi, paid fallback), `GROQ_API_KEY` (text and brief), and optionally `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NIM_API_KEY` as free backups.

**GPT-6 Sol through the local Codex server.** Convex runs in the cloud, so it reaches the server on your PC through a Cloudflare quick tunnel, protected by a password:

```powershell
# 1. The server, with the password from .env.local (CODEX_API_KEY); it stays on 127.0.0.1.
$k = (Select-String -Path .env.local -Pattern '^CODEX_API_KEY=(.*)').Matches[0].Groups[1].Value
uvx openai-api-server-via-codex --api-key $k

# 2. The tunnel (in a second window); it prints an https://….trycloudflare.com address.
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:18080

# 3. Point Convex at it (again after every tunnel restart: the address changes).
npx convex env set CODEX_API_KEY $k
npx convex env set CODEX_BASE_URL https://<address>.trycloudflare.com/v1
```

Both stop when the PC restarts. While they are down, every stage falls back to Kimi. To stop using Sol, remove `CODEX_API_KEY` from the Convex env.

**Trying it.** The dev-only tester at `/dev/generation` (for users listed in `DEV_TOOL_USER_IDS`) runs one stage or a whole case, a 3-case test run, and per-stage stats. Tests: `npx vitest run`.

