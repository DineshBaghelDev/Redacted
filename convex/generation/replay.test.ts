import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkOutput, stages, type StageJob } from "./stages";

// Record and replay: reruns every code stage and check on saved cases and snapshots the problems found.

type Recorded = { seed: number; difficulty: StageJob["difficulty"]; outputs: Record<string, { output: unknown; source: string }> };

const dir = join(__dirname, "../fixtures/recorded");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

const handWritten: Recorded = {
  seed: 1234,
  difficulty: "easy",
  outputs: Object.fromEntries(stages.filter((s) => s.handWritten !== undefined).map((s) => [s.name, { output: s.handWritten, source: "hand-written" }])),
};

/** Runs the pipeline over a recorded case: recorded outputs for AI stages, code for the rest. */
function replay(rec: Recorded) {
  const job = { seed: rec.seed, difficulty: rec.difficulty };
  const drafts: Record<string, unknown> = {};
  const problems: Record<string, string[]> = {};
  for (const stage of stages) {
    if (!stage.inputs.every((name) => name in drafts)) continue;
    // Only AI outputs are replayed; code stages always rerun (older recordings may hold an AI estimate).
    const saved = stage.kind === "llm" ? rec.outputs[stage.name] : undefined;
    if (saved) {
      // Seeded-brief rules are skipped: they change over time and older recordings predate them (unit tests cover them).
      problems[stage.name] = checkOutput(stage, saved.output, drafts, job, false);
      const parsed = stage.schema ? stage.schema.safeParse(saved.output) : { success: true, data: saved.output };
      // Later stages can't run on output with the wrong shape.
      if (parsed.success) drafts[stage.name] = parsed.data;
    } else if (stage.run) {
      try {
        const result = stage.run(drafts, job);
        problems[stage.name] = result.checkErrors;
        drafts[stage.name] = result.output;
      } catch (error) {
        problems[stage.name] = [`Stage crashed: ${error instanceof Error ? error.message : String(error)}`];
      }
    }
  }
  return problems;
}

describe("replay", () => {
  it("hand-written case passes every stage", () => {
    const problems = replay(handWritten);
    expect(Object.keys(problems)).toEqual(stages.map((s) => s.name));
    expect(Object.values(problems).flat()).toEqual([]);
  });

  it.each(files)("%s gives the same problems as before", (file) => {
    const rec = JSON.parse(readFileSync(join(dir, file), "utf-8")) as Recorded;
    expect(replay(rec)).toMatchSnapshot();
  });
});
