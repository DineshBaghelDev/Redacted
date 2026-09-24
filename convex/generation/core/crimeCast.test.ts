import { describe, expect, it } from "vitest";
import { cast, crimeCore } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { parseJson } from "../llm";
import { castPrompt } from "../prompts/cast";
import { crimePrompt } from "../prompts/crime";
import { castProblems, castRules, CRIME_RULES, crimeBrief, crimeProblems } from "./crimeCast";

describe("crime core checks", () => {
  it("hand-written crime passes", () => {
    expect(crimeProblems(city, crimeCore)).toEqual([]);
  });

  it("catches the same person in two roles and a death on the wrong day", () => {
    const broken = { ...crimeCore, discovery: { ...crimeCore.discovery, byId: "victor" }, timeOfDeath: 100 };
    const problems = crimeProblems(city, broken);
    expect(problems).toContain("Victim, killer, accomplice and whoever finds the body must be different people.");
    expect(problems).toContain("The death must happen on Day 2.");
  });

  it("catches a repeated cover-up and a switched-off camera with no details", () => {
    const problems = crimeProblems(city, { ...crimeCore, coverUp: ["wipe-prints", "wipe-prints", "disable-camera"] });
    expect(problems).toContain("The cover-up lists the same step twice.");
    expect(problems.join(" ")).toMatch(/disabledCamera must be filled/);
  });

  it("AI output must follow the seeded brief", () => {
    const brief = crimeBrief(city, 42);
    expect(crimeBrief(city, 42)).toEqual(brief);
    const other = { ...brief, motiveType: brief.motiveType === "money" ? ("revenge" as const) : ("money" as const) };
    expect(crimeProblems(city, crimeCore, other).join("\n")).toMatch(/Motive type must be/);
  });
});

describe("cast checks", () => {
  it("hand-written cast passes", () => {
    expect(castProblems(city, crimeCore, cast, "easy")).toEqual([]);
  });

  it("catches wrong suspect counts, unknown homes and taken jobs", () => {
    const broken = {
      characters: cast.characters.map((c) =>
        c.id === "lena" ? { ...c, homeUnitId: "nowhere:1" } : c.id === "tom" ? { ...c, job: { placeId: "meridian-tower", title: "executive" } } : c,
      ),
    };
    const problems = castProblems(city, crimeCore, broken, "hard");
    expect(problems.join("\n")).toMatch(/Need 10–12 suspects/);
    expect(problems.join("\n")).toMatch(/unknown home nowhere:1/);
    expect(problems.join("\n")).toMatch(/no free "executive" job/);
  });
});

describe("prompts", () => {
  it("carry the same rules the checks use, and real city ids", () => {
    const crime = crimePrompt(city, 7, "easy");
    for (const rule of CRIME_RULES) expect(crime).toContain(rule);
    expect(crime).toContain(crimeBrief(city, 7).scenePlaceId);
    expect(crime).toContain("keel-14:kitchen");
    const castText = castPrompt(city, crimeCore, "normal");
    for (const rule of castRules("normal")) expect(castText).toContain(rule);
    expect(castText).toContain("carver-towers:unit-5a");
  });
});

describe("parseJson", () => {
  it("reads fenced or wrapped JSON", () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJson('Here you go: {"a":{"b":2}} done')).toEqual({ a: { b: 2 } });
  });
});
