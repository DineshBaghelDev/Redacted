import { beforeEach, describe, expect, it, vi } from "vitest";
import { cast, crimeCore, lies, story } from "../fixtures/caseEasy";
import { city } from "../fixtures/city";
import { runAiAttempt } from "./aiStage";
import { buildEvidence } from "./core/evidence";
import { buildTimeline } from "./core/timeline";
import { generateJson, modelsFor } from "./llm";
import { getStage } from "./stages";

vi.mock("./llm", () => ({ generateJson: vi.fn(), modelsFor: vi.fn(() => ["fake"]) }));
const fakeAi = vi.mocked(generateJson);
const fakeModels = vi.mocked(modelsFor);
const reply = (output: unknown) => ({ output, problems: [], model: "fake", mode: "strict" as const, rawText: JSON.stringify(output), ms: 1 });

const job = { seed: 1234, difficulty: "easy" as const };
const evidence = buildEvidence(city, crimeCore, cast, story, buildTimeline(city, crimeCore, cast, story, 1234), "easy", 1234);
const inputs = { crime: crimeCore, cast, story, evidence };
const badLie = { ...lies.lies[2], id: "bad", disprovingEvidenceIds: ["nope"] };

describe("AI tries and repairs", () => {
  beforeEach(() => fakeAi.mockReset());

  it("asks for a repair while tries are left, sending back the answer and its problems", async () => {
    fakeAi.mockResolvedValueOnce(reply({ lies: [...lies.lies, badLie] }));
    const first = await runAiAttempt(getStage("lies"), inputs, job, 0);
    expect(first.retry).toBe(true);
    expect(first.problems.join("\n")).toMatch(/"nope" doesn't exist/);

    fakeAi.mockResolvedValueOnce(reply(lies));
    const second = await runAiAttempt(getStage("lies"), inputs, job, 1, { output: first.output, problems: first.problems });
    expect(fakeAi.mock.calls[1][0].prompt).toContain("The checker found these problems:");
    expect(fakeAi.mock.calls[1][0].prompt).toContain("\"nope\" doesn't exist");
    expect(second).toMatchObject({ retry: false, problems: [] });
  });

  it("after the last repair, drops lies that still can't be caught", async () => {
    fakeAi.mockResolvedValueOnce(reply({ lies: [...lies.lies, badLie] }));
    const last = await runAiAttempt(getStage("lies"), inputs, job, 2, { output: {}, problems: ["x"] });
    expect(last.retry).toBe(false);
    expect(last.problems).toEqual([]);
    expect((last.output as typeof lies).lies.map((l) => l.id)).not.toContain("bad");
  });

  it("an AI failure doesn't retry", async () => {
    fakeAi.mockResolvedValueOnce({ ...reply(null), problems: ["The AI call failed."], error: "boom" });
    expect(await runAiAttempt(getStage("lies"), inputs, job, 0)).toMatchObject({ retry: false });
  });

  it("a failed call moves on to the stage's next model", async () => {
    fakeModels.mockReturnValueOnce(["busy", "backup"]);
    fakeAi.mockResolvedValueOnce({ ...reply(null), problems: ["The AI call failed."], error: "rate limit" });
    fakeAi.mockResolvedValueOnce(reply(lies));
    const result = await runAiAttempt(getStage("lies"), inputs, job, 0);
    expect(fakeAi.mock.calls.map((c) => c[0].model)).toEqual(["busy", "backup"]);
    expect(result.failedCalls.map((c) => c.error)).toEqual(["rate limit"]);
    expect(result).toMatchObject({ retry: false, problems: [] });
  });
});

describe("crime clean-up", () => {
  it("drops a camera switch-off the AI never named", () => {
    const out = getStage("crime").finalize!({ ...crimeCore, coverUp: ["wipe-prints", "disable-camera"], disabledCamera: null }, {}, job) as typeof crimeCore;
    expect(out.coverUp).toEqual(["wipe-prints"]);
  });
});

describe("an unusable repair", () => {
  it("keeps the earlier usable answer for the next repair and at the end", async () => {
    fakeAi.mockReset();
    fakeAi.mockResolvedValueOnce({ ...reply(null), problems: ["The reply wasn't valid JSON."] });
    const earlier = { output: lies, problems: ["one small problem"] };
    const mid = await runAiAttempt(getStage("lies"), inputs, job, 1, earlier);
    expect(mid).toMatchObject({ output: lies, problems: ["one small problem"], retry: true });
  });
});

describe("the last try", () => {
  it("never goes back to an unusable earlier answer, even one with fewer problems", async () => {
    fakeAi.mockReset();
    fakeAi.mockResolvedValueOnce(reply({ lies: [...lies.lies, badLie] }));
    const unusable = { output: null, problems: ["The reply wasn't valid JSON."] };
    const last = await runAiAttempt(getStage("lies"), inputs, job, 2, unusable);
    expect(last.output).not.toBeNull();
  });
});
