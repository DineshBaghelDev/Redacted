import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, Output, streamText, type JSONValue } from "ai";
import { z } from "zod";
import { schemaProblems } from "./core/schemas";

// AI calls for case generation. Every provider is reached through its OpenAI-compatible API; a model
// is "provider:model id" (no prefix means NIM).

const PROVIDERS = {
  nim: { baseURL: "https://integrate.api.nvidia.com/v1", key: "NIM_API_KEY" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", key: "GEMINI_API_KEY" },
  groq: { baseURL: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", key: "OPENROUTER_API_KEY" },
  moonshot: { baseURL: "https://api.moonshot.ai/v1", key: "MOONSHOT_API_KEY" },
  /** The owner's local OpenAI-compatible server over Codex (CODEX_BASE_URL overrides, e.g. a tunnel); any non-empty key works. */
  codex: { baseURL: "http://127.0.0.1:18080/v1", key: "CODEX_API_KEY" },
} as const;

/**
 * Keeps thinking low everywhere: generation needs careful rule-following, not long reasoning, and low
 * thinking is faster and cheaper. reasoningEffort is the SDK's own option (a raw reasoning_effort gets overwritten); other keys go into the request body as-is.
 */
function thinkingOptions(provider: keyof typeof PROVIDERS, id: string): Record<string, JSONValue> {
  if (provider === "moonshot") return id === "kimi-k3" ? { reasoningEffort: "low" } : { thinking: { type: "disabled" } };
  // OpenAI's strict schema mode needs every field required, and ours has optional ones: the schema guides, code checks.
  if (provider === "codex") return { reasoningEffort: process.env.CODEX_REASONING ?? "low", strictJsonSchema: false };
  if (provider === "gemini" || provider === "groq") return { reasoningEffort: "low" };
  if (provider === "openrouter") return { reasoning: { effort: "low" } };
  return {};
}

export const MODELS = {
  /** Case generation (crime, cast, story, lies, writing). */
  main: "moonshotai/kimi-k3",
  /** NPC conversations during play. */
  npc: "moonshotai/kimi-k2.6",
} as const;

/** Paid (the owner's Kimi key): the most reliable for the big stages. $3 in / $15 out per 1M tokens. */
const KIMI_K3 = "moonshot:kimi-k3";
/** Paid, cheaper and without thinking: for small rewriting jobs. */
const KIMI_FAST = "moonshot:kimi-k2.6";
const GEMINI_FLASH = "gemini:gemini-3.5-flash";
const GROQ_FAST = "groq:openai/gpt-oss-120b";
const NEMOTRON_FREE = "openrouter:nvidia/nemotron-3-super-120b-a12b:free";

/**
 * Models per AI stage, tried in order: the next one takes over when a call fails. Kimi K3 (paid, low
 * thinking) leads the stages that need careful rule-following; Kimi K2.6 without thinking missed the
 * crime's time band three tries in a row, so it only rewrites text. Free Groq goes first for the small
 * prompts (its free cap is 8k tokens a minute); free Gemini Flash (20 calls a day) and NIM are backups.
 * Picked from side-by-side runs (2026-09-25).
 */
const STAGE_MODELS: Record<string, string[]> = {
  crime: [KIMI_K3, GEMINI_FLASH, MODELS.main],
  cast: [KIMI_K3, GEMINI_FLASH, NEMOTRON_FREE, MODELS.main],
  story: [KIMI_K3, GEMINI_FLASH, NEMOTRON_FREE, MODELS.main],
  lies: [KIMI_K3, GEMINI_FLASH, MODELS.main],
  text: [GROQ_FAST, KIMI_FAST, GEMINI_FLASH, MODELS.main],
  brief: [GROQ_FAST, KIMI_FAST, MODELS.main],
};

/** The models to try for a stage, in order. */
export function modelsFor(stage: string) {
  return STAGE_MODELS[stage] ?? [MODELS.main];
}

/** Stop waiting before Convex's 10-minute action limit kills the try with no log. */
const TIMEOUT_MS = 9 * 60 * 1000;

export type LlmCall = {
  output: unknown;
  /** Schema problems; empty when the output has the right shape. */
  problems: string[];
  model: string;
  /** "strict": the provider enforced the JSON schema. "json": plain JSON mode, schema only described in the prompt. */
  mode: "strict" | "json";
  rawText: string;
  inputTokens?: number;
  outputTokens?: number;
  ms: number;
  /** Set when the call itself failed (network, auth, provider error). */
  error?: string;
};

/** The chat model for "provider:model id" (no prefix means NIM), plus its low-thinking options. */
function chatModel(model: string, strict: boolean) {
  const [prefix, ...rest] = model.split(":");
  const name = (prefix in PROVIDERS && rest.length ? prefix : "nim") as keyof typeof PROVIDERS;
  const id = name === prefix ? rest.join(":") : model;
  const { key } = PROVIDERS[name];
  const baseURL = (name === "codex" && process.env.CODEX_BASE_URL) || PROVIDERS[name].baseURL;
  const apiKey = process.env[key];
  if (!apiKey) throw new Error(`${key} is not set in the Convex environment.`);
  return {
    // includeUsage: streamed replies only report token counts when asked.
    model: createOpenAICompatible({ name, baseURL, apiKey, supportsStructuredOutputs: strict, includeUsage: true }).chatModel(id),
    providerOptions: { [name]: thinkingOptions(name, id) },
  };
}

/** A failed call's message plus, for provider errors, the status and the start of the reply body. */
function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  // Retries wrap the provider error in lastError; other wrappers use cause.
  const inner = (error as { lastError?: unknown }).lastError ?? error.cause;
  const api = APICallError.isInstance(error) ? error : APICallError.isInstance(inner) ? inner : undefined;
  if (!api) return error.message;
  return `${error.message} [status ${api.statusCode ?? "?"}] ${(api.responseBody ?? "").slice(0, 1000)}`;
}

/** Pulls JSON out of a reply that may be wrapped in a ``` fence or have text around it. */
export function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(body);
}

/**
 * Asks the model for JSON matching `schema`. Tries strict schema mode first; if NIM rejects that
 * request, retries once in JSON mode with the schema written into the prompt. Never throws for bad
 * output: shape problems come back in `problems` so the stage can report or repair them.
 */
export async function generateJson(args: {
  schema: z.ZodType;
  system: string;
  prompt: string;
  model?: string;
  /** Quick retries of a failed call on the same model (AI SDK default 2). */
  maxRetries?: number;
  /** Give up after this long (default 9 minutes). */
  timeoutMs?: number;
}): Promise<LlmCall> {
  const model = args.model ?? MODELS.main;
  const started = Date.now();
  const base = { model, ms: 0, rawText: "", output: null, problems: [] as string[] };

  const deadline = started + (args.timeoutMs ?? TIMEOUT_MS);
  // Kimi's strict-schema mode is far slower than plain JSON (cast: 264 s against 70 s), so it skips it.
  const modes = model.startsWith("moonshot:") ? (["json"] as const) : (["strict", "json"] as const);
  for (const mode of modes) {
    const strict = mode === "strict";
    const prompt = strict ? args.prompt : `${args.prompt}\n\nReply with one JSON object matching this JSON schema:\n${JSON.stringify(z.toJSONSchema(args.schema, { io: "input" }))}`;
    try {
      // Streamed: a long reply sent in one piece can stall until the timeout (seen on Kimi and NIM).
      let streamError: unknown;
      const result = streamText({
        ...chatModel(model, strict),
        system: args.system,
        prompt,
        output: Output.object({ schema: args.schema }),
        abortSignal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        maxRetries: args.maxRetries,
        // Errors (a timeout included) end up here instead of escaping as uncaught promise rejections.
        onError: ({ error }) => {
          streamError ??= error;
        },
      });
      // Text, usage and errors are read from the stream parts only. The result's own promises (text,
      // usage, output) can reject with nobody listening when a reply dies midway, which crashes the step.
      let rawText = "";
      let tokens: { inputTokens?: number; outputTokens?: number } | undefined;
      try {
        for await (const part of result.stream) {
          if (part.type === "text-delta") rawText += part.text;
          else if (part.type === "finish") tokens = part.totalUsage;
          else if (part.type === "error") streamError ??= part.error;
        }
      } catch (error) {
        streamError ??= error;
      }
      if (streamError) throw streamError;
      if (Date.now() >= deadline) throw new Error(`No complete reply within ${Math.round((deadline - started) / 1000)} s.`);
      // Some models (e.g. Kimi on NIM) answer a strict-schema request with an empty reply: ask again in JSON mode.
      if (strict && !rawText.trim()) continue;
      let output: unknown = null;
      let problems: string[];
      try {
        output = parseJson(rawText);
        problems = schemaProblems(args.schema, output);
        if (problems.length === 0) output = args.schema.parse(output);
      } catch {
        problems = ["The reply wasn't valid JSON."];
      }
      return { ...base, mode, output, problems, rawText, inputTokens: tokens?.inputTokens, outputTokens: tokens?.outputTokens, ms: Date.now() - started };
    } catch (error) {
      // NIM refused the strict request (e.g. unsupported response_format): fall back to JSON mode.
      if (strict && APICallError.isInstance(error) && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401 && error.statusCode !== 429) {
        continue;
      }
      return { ...base, mode, problems: ["The AI call failed."], error: describeError(error), ms: Date.now() - started };
    }
  }
  // Both modes gave an empty reply.
  return { ...base, mode: "json", problems: ["The reply wasn't valid JSON."], ms: Date.now() - started };
}
