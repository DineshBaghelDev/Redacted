import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { schemaProblems } from "./core/schemas";

// AI calls for case generation. Every provider is reached through its OpenAI-compatible API; a model
// is "provider:model id" (no prefix means NIM).

const PROVIDERS = {
  nim: { baseURL: "https://integrate.api.nvidia.com/v1", key: "NIM_API_KEY" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", key: "GEMINI_API_KEY" },
  groq: { baseURL: "https://api.groq.com/openai/v1", key: "GROQ_API_KEY" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", key: "OPENROUTER_API_KEY" },
} as const;

export const MODELS = {
  /** Case generation (crime, cast, story, lies, writing). */
  main: "moonshotai/kimi-k3",
  /** NPC conversations during play. */
  npc: "moonshotai/kimi-k2.6",
} as const;

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

/** The chat model for "provider:model id" (no prefix means NIM). */
function chatModel(model: string, strict: boolean) {
  const [prefix, ...rest] = model.split(":");
  const name = (prefix in PROVIDERS && rest.length ? prefix : "nim") as keyof typeof PROVIDERS;
  const id = name === prefix ? rest.join(":") : model;
  const { baseURL, key } = PROVIDERS[name];
  const apiKey = process.env[key];
  if (!apiKey) throw new Error(`${key} is not set in the Convex environment.`);
  return createOpenAICompatible({ name, baseURL, apiKey, supportsStructuredOutputs: strict }).chatModel(id);
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
export async function generateJson(args: { schema: z.ZodType; system: string; prompt: string; model?: string }): Promise<LlmCall> {
  const model = args.model ?? MODELS.main;
  const started = Date.now();
  const base = { model, ms: 0, rawText: "", output: null, problems: [] as string[] };

  for (const mode of ["strict", "json"] as const) {
    const strict = mode === "strict";
    const prompt = strict ? args.prompt : `${args.prompt}\n\nReply with one JSON object matching this JSON schema:\n${JSON.stringify(z.toJSONSchema(args.schema, { io: "input" }))}`;
    try {
      const result = await generateText({
        model: chatModel(model, strict),
        system: args.system,
        prompt,
        output: Output.object({ schema: args.schema }),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS - (Date.now() - started)),
      });
      return {
        ...base,
        mode,
        output: result.output,
        rawText: result.text,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        ms: Date.now() - started,
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        // Output didn't parse or match the schema: salvage what we can and report the problems.
        const rawText = error.text ?? "";
        let output: unknown = null;
        let problems: string[];
        try {
          output = parseJson(rawText);
          problems = schemaProblems(args.schema, output);
          if (problems.length === 0) output = args.schema.parse(output);
        } catch {
          problems = ["The reply wasn't valid JSON."];
        }
        return {
          ...base,
          mode,
          output,
          problems,
          rawText,
          inputTokens: error.usage?.inputTokens,
          outputTokens: error.usage?.outputTokens,
          ms: Date.now() - started,
        };
      }
      // NIM refused the strict request (e.g. unsupported response_format): fall back to JSON mode.
      if (strict && APICallError.isInstance(error) && error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 401 && error.statusCode !== 429) {
        continue;
      }
      return { ...base, mode, problems: ["The AI call failed."], error: error instanceof Error ? error.message : String(error), ms: Date.now() - started };
    }
  }
  throw new Error("unreachable");
}
