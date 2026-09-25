import { describe, expect, it } from "vitest";
import { jobSummaries, predictMinutesLeft, stageStats, type StatsLog } from "./stats";

const log = (jobId: string, stage: string, attempt: number, ms: number, problems: string[] = [], error?: string): StatsLog => ({
  jobId,
  stage,
  attempt,
  ms,
  inputTokens: 1000,
  outputTokens: 100,
  problems,
  error,
});

// Job a: story fixed on the first repair. Job b: story right first time, but one call failed before it.
const logs = [
  log("a", "story", 0, 120_000, ["Event 12 overlaps event 3.", "Tom can't reach room 4 in time."]),
  log("a", "story", 1, 60_000),
  log("b", "story", 0, 30_000, ["The AI call failed."], "timeout"),
  log("b", "story", 0, 90_000),
  log("a", "crime", 0, 60_000),
];
const drafts = [
  { jobId: "a", stage: "story", checkErrors: [] },
  { jobId: "b", stage: "story", checkErrors: [] },
  { jobId: "a", stage: "crime", checkErrors: [] },
];

describe("generation stats", () => {
  it("counts first-try passes, repairs, time and problems per stage", () => {
    const story = stageStats(["crime", "story", "lies"], drafts, logs).find((s) => s.stage === "story")!;
    expect(story).toMatchObject({ jobs: 2, firstTryOk: 1, endedOk: 2, avgRepairs: 0.5, avgMs: 150_000, failedCalls: 1 });
    // Numbers are blanked so the same kind of problem counts together; failed calls aren't counted.
    expect(story.topProblems).toEqual([
      { problem: "Event # overlaps event #.", count: 1 },
      { problem: "Tom can't reach room # in time.", count: 1 },
    ]);
  });

  it("leaves out stages no job reached", () => {
    expect(stageStats(["crime", "story", "lies"], drafts, logs).map((s) => s.stage)).toEqual(["crime", "story"]);
  });

  it("sums each job's calls and tokens and times finished jobs", () => {
    const [a] = jobSummaries([{ id: "a", difficulty: "easy", startedAt: 0, finishedAt: 5 * 60_000 }], logs);
    expect(a).toMatchObject({ minutes: 5, aiCalls: 3, inputTokens: 3000, outputTokens: 300 });
  });

  it("predicts minutes left only when every remaining stage has history", () => {
    const history = stageStats(["crime", "story"], drafts, logs);
    expect(predictMinutesLeft(["crime", "story"], history)).toBe(4);
    expect(predictMinutesLeft(["story", "lies"], history)).toBeUndefined();
  });
});
