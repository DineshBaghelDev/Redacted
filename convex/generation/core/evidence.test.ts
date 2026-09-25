import { describe, expect, it } from "vitest";
import { cast, crimeCore, story } from "../../fixtures/caseEasy";
import { city } from "../../fixtures/city";
import { buildEvidence, evidenceProblems } from "./evidence";
import { buildFacts, factProblems } from "./facts";
import { at } from "./schemas";
import { buildTimeline } from "./timeline";

const SEED = 1234;
const timeline = buildTimeline(city, crimeCore, cast, story, SEED);
const set = buildEvidence(city, crimeCore, cast, story, timeline, "easy", SEED);
const facts = buildFacts(city, crimeCore, cast, story, set);
const fact = (id: string) => facts.facts.find((f) => f.id === id)!.evidenceIds;
const byId = (id: string) => set.evidence.find((e) => e.id === id)!;

describe("evidence for the easy case", () => {
  it("is the same for the same seed", () => {
    expect(buildEvidence(city, crimeCore, cast, story, timeline, "easy", SEED)).toEqual(set);
  });

  it("catches Victor on the Linden–Carver street camera on the way to the murder", () => {
    const rows = set.evidence.filter(
      (e) => e.type === "cctv" && e.aboutIds.includes("victor") && e.access.tool === "cctv" && e.access.cameraId === "cam:linden-court~carver-towers",
    );
    expect(rows.some((r) => r.time! > at(2, "22:07") && r.time! < at(2, "22:20"))).toBe(true);
    expect(rows[0].summary).toMatch(/^Tall man, lean, grey overcoat/);
    expect(rows[0].summary).not.toContain("Victor");
  });

  it("the doorbell camera never sees Victor (he used the back door)", () => {
    const doorbell = set.evidence.filter((e) => e.access.tool === "cctv" && e.access.cameraId === "cam:keel-14:front-door");
    expect(doorbell.some((e) => e.aboutIds.includes("tom"))).toBe(true);
    expect(doorbell.some((e) => e.aboutIds.includes("victor"))).toBe(false);
  });

  it("wiped weapon has no prints but has victim's blood and overcoat fibers", () => {
    expect(byId("forensic/weapon/prints").summary).toContain("wiped");
    expect(byId("forensic/weapon/blood").summary).toContain("Daniel Reyes");
    expect(byId("forensic/weapon/fibers/overcoat").summary).toContain("grey overcoat");
  });

  it("marks exactly one easy camera faulty and never a story camera", () => {
    const faulty = set.cameras.filter((c) => c.faulty);
    expect(faulty).toHaveLength(1);
    expect(faulty[0].id).not.toBe("cam:linden-court~carver-towers");
  });
});

describe("new evidence kinds", () => {
  it("reads motive from a file on Daniel's laptop", () => {
    expect(byId("file/laptop/0").access).toEqual({ tool: "device", itemId: "laptop" });
    expect(fact("motive")).toContain("file/laptop/0");
  });

  it("scatters 2 clutter items per relevant place on easy, never tied to anyone", () => {
    const clutter = set.evidence.filter((e) => e.type === "item" && e.data.clutter);
    const places = new Set(clutter.map((e) => (e.access.tool === "search" ? e.access.roomId.split(":")[0] : "")));
    expect(clutter.length).toBeGreaterThanOrEqual(places.size);
    expect(clutter.length).toBeLessThanOrEqual(places.size * 2);
    expect(clutter.every((e) => e.aboutIds.length === 0)).toBe(true);
    const hard = buildEvidence(city, crimeCore, cast, story, timeline, "hard", SEED).evidence.filter((e) => e.type === "item" && e.data.clutter);
    expect(hard.length).toBeGreaterThan(clutter.length);
  });

  it("finds Victor's shoe prints by the back door", () => {
    expect(byId("forensic/footprints/keel-14:back-door").summary).toContain("size 11 leather dress shoes");
    expect(fact("culprit-at-scene")).toContain("forensic/footprints/keel-14:back-door");
  });

  it("poison gets a toxicology report that links the weapon", () => {
    const poisoned = { ...crimeCore, weapon: { ...crimeCore.weapon, category: "poison" as const } };
    const s = buildEvidence(city, poisoned, cast, story, timeline, "easy", SEED);
    const f = buildFacts(city, poisoned, cast, story, s);
    expect(s.evidence.some((e) => e.id === "forensic/toxicology")).toBe(true);
    expect(f.facts.find((x) => x.id === "weapon-at-scene")!.evidenceIds).toContain("forensic/toxicology");
  });

  it("a switched-off camera loses its records and logs the outage", () => {
    const off = {
      ...crimeCore,
      coverUp: [...crimeCore.coverUp, "disable-camera" as const],
      disabledCamera: { cameraId: "cam:carver-towers:lobby", from: at(2, "22:00"), to: at(2, "23:30") },
    };
    const s = buildEvidence(city, off, cast, story, timeline, "easy", SEED);
    const lobby = s.evidence.filter((e) => e.access.tool === "cctv" && e.access.cameraId === "cam:carver-towers:lobby");
    expect(lobby.some((e) => e.aboutIds.includes("victor") && e.time! >= at(2, "22:00") && e.time! <= at(2, "23:30"))).toBe(false);
    expect(lobby.some((e) => e.summary.startsWith("Camera was switched off"))).toBe(true);
    expect(evidenceProblems(off, timeline, s)).toEqual([]);
  });

  it("complains when the switched-off camera has nobody from the crime nearby", () => {
    const off = {
      ...crimeCore,
      coverUp: [...crimeCore.coverUp, "disable-camera" as const],
      disabledCamera: { cameraId: "cam:civic-bank:vault", from: at(2, "22:00"), to: at(2, "23:00") },
    };
    const s = buildEvidence(city, off, cast, story, timeline, "easy", SEED);
    expect(evidenceProblems(off, timeline, s).join(" | ")).toMatch(/Nobody from the crime is at First Civic Bank · Vault to switch it off at Day \d \d\d:\d\d: give the culprit an event at civic-bank/);
  });

  it("complains when the cover-up mentions a camera but none is given", () => {
    const off = { ...crimeCore, coverUp: [...crimeCore.coverUp, "disable-camera" as const] };
    expect(evidenceProblems(off, timeline, set)).toContain("Cover-up says a camera was switched off, but not which one or when.");
  });
});

describe("facts for the easy case", () => {
  it("has no early problems", () => {
    expect(factProblems(facts)).toEqual([]);
  });

  it("decisive evidence is the blood on Victor's overcoat and Daniel's ledger in his flat", () => {
    expect(facts.decisiveIds).toEqual(["forensic/overcoat/blood", "item/ledger"]);
  });

  it("clears every innocent suspect", () => {
    expect(fact("alibi:lena").length).toBeGreaterThan(0);
    expect(fact("alibi:tom")).toContain("card/tom-beer");
    expect(fact("alibi:nora").some((id) => id.startsWith("witness/samuel/"))).toBe(true);
  });

  it("links motive and contact to Victor", () => {
    expect(fact("motive")).toEqual(expect.arrayContaining(["item/ledger", "record/victor/0", "message/warning-message/nora"]));
    expect(fact("culprit-contact")).toContain("call/victor-call/daniel");
  });

  it("a weapon with prints left on it becomes decisive", () => {
    const sloppy = { ...crimeCore, coverUp: crimeCore.coverUp.filter((c) => c !== "wipe-prints") };
    const s = buildEvidence(city, sloppy, cast, story, timeline, "easy", SEED);
    expect(buildFacts(city, sloppy, cast, story, s).decisiveIds).toContain("forensic/weapon/prints");
  });
});
