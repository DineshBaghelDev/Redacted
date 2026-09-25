import { homeRooms, streetRoute, type City } from "./city";
import { crimeKind } from "./crimes";
import type { Evidence, EvidenceSet } from "./evidence/types";
import type { Cast, CrimeBase, Story } from "./schemas";

export type Fact = {
  id: string;
  /** "culprit", "motive", "accomplice", "alibi", or one of the crime kind's own (murder: "weapon", "method"). */
  kind: string;
  text: string;
  /** Hidden: evidence that supports this fact. */
  evidenceIds: string[];
};

export type Facts = { facts: Fact[]; decisiveIds: string[] };

const NEAR_MINUTES = 60;

/**
 * Works out what the evidence proves: the culprit at/near the scene, contact with the victim, motive,
 * accomplice link and each innocent suspect's alibi, plus the crime kind's own facts (murder: weapon
 * links, method). Also picks the decisive evidence: what ties the culprit to the crime with no innocent
 * explanation.
 */
export function buildFacts(city: City, crime: CrimeBase, cast: Cast, story: Story, set: EvidenceSet): Facts {
  const { evidence } = set;
  const kind = crimeKind(crime);
  const at = crime.crimeTime;
  const culprit = crime.culpritId;
  const scenePlace = crime.sceneRoomId.split(":")[0];
  const culpritItems = new Set(story.items.filter((i) => i.ownerId === culprit).map((i) => i.id));
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const travelToScene = (placeId: string) => (placeId === scenePlace ? 0 : (streetRoute(city, placeId, scenePlace)?.minutes ?? Infinity));
  const ids = (list: Evidence[]) => [...new Set(list.map((e) => e.id))];

  const forensic = evidence.filter((e): e is Extract<Evidence, { type: "forensic" }> => e.type === "forensic");
  const cctv = evidence.filter((e): e is Extract<Evidence, { type: "cctv" }> => e.type === "cctv" && e.data.kind !== "offline");

  const onSceneCamera = cctv.filter(
    (e) => e.aboutIds.includes(culprit) && e.access.tool === "cctv" && e.access.cameraId === `cam:${crime.sceneRoomId}` && e.time! <= at + 15 && e.end! >= at - 15,
  );
  // Something taken from the scene building that ends up in the culprit's home.
  const culpritChar = cast.characters.find((c) => c.id === culprit);
  const culpritHome = culpritChar ? homeRooms(city, culpritChar.homeUnitId) : new Set<string>();
  const takenFromScene = new Set(
    story.items
      .filter((i) => i.ownerId !== culprit && i.startRoomId.startsWith(`${scenePlace}:`) && culpritHome.has(i.finalRoomId))
      .map((i) => `item/${i.id}`),
  );
  const own = kind.facts({ city, crime, cast, story }, set);
  const decisive = [...own.decisive, ...onSceneCamera, ...evidence.filter((e) => takenFromScene.has(e.id))];

  const atScene = [
    ...decisive,
    ...forensic.filter((e) => e.data.subjectId === `room:${crime.sceneRoomId}` && (e.data.printsOf?.includes(culprit) || culpritItems.has(e.data.fibersFromItemId ?? ""))),
    ...forensic.filter((e) => e.data.test === "footprints" && e.data.printsOf?.includes(culprit)),
    // Seen at the scene place, or paid by card there, within an hour of the crime.
    ...evidence.filter(
      (e) =>
        e.time !== undefined &&
        Math.abs(e.time - at) <= NEAR_MINUTES &&
        ((e.type === "witness" && e.aboutIds.includes(culprit) && e.data.placeId === scenePlace) ||
          (e.type === "card" && e.data.who === culprit && e.data.placeId === scenePlace)),
    ),
  ];
  const nearScene = cctv.filter(
    (e) => e.aboutIds.includes(culprit) && Math.abs(e.time! - at) <= NEAR_MINUTES && travelToScene(e.data.placeId) <= Math.abs(e.time! - at) + 5,
  );
  const contact = evidence.filter(
    (e) => (e.type === "call" || e.type === "message") && e.aboutIds.includes(culprit) && e.aboutIds.includes(crime.victimId) && e.time! <= at,
  );
  const provesTag = (tag: string) =>
    evidence.filter(
      (e) => (e.type === "call" || e.type === "message" || e.type === "item" || e.type === "record" || e.type === "file") && e.data.proves.includes(tag),
    );

  const facts: Fact[] = [
    { id: "culprit-at-scene", kind: "culprit", text: `${nameOf(culprit)} was at the scene`, evidenceIds: ids(atScene) },
    { id: "culprit-near-scene", kind: "culprit", text: `${nameOf(culprit)} was out and near the scene around the ${kind.words.crimeTime}`, evidenceIds: ids(nearScene) },
    { id: "culprit-contact", kind: "culprit", text: `${nameOf(culprit)} contacted the victim before the ${kind.words.crime}`, evidenceIds: ids(contact) },
    { id: "motive", kind: "motive", text: crime.motive.details, evidenceIds: ids(provesTag("motive")) },
    ...own.facts,
  ];
  if (crime.accomplice) {
    const acc = crime.accomplice.id;
    facts.push({
      id: "accomplice-link",
      kind: "accomplice",
      text: `${nameOf(acc)} helped ${nameOf(culprit)}`,
      evidenceIds: ids([
        ...evidence.filter((e) => (e.type === "call" || e.type === "message") && e.aboutIds.includes(acc) && e.aboutIds.includes(culprit)),
        ...provesTag("accomplice"),
      ]),
    });
  }

  // Alibis: evidence that puts an innocent suspect too far away to reach the scene at the crime time.
  for (const s of cast.characters.filter((c) => c.role === "suspect" && c.id !== culprit && c.id !== crime.accomplice?.id)) {
    const farAway = (placeId: string, from: number, to: number) => {
      const gap = at < from ? from - at : at > to ? at - to : 0;
      return travelToScene(placeId) > gap;
    };
    const alibi = evidence.filter((e) => {
      if (!e.aboutIds.includes(s.id) || e.time === undefined) return false;
      if (e.type === "cctv") return farAway(e.data.placeId, e.time, e.end ?? e.time);
      if (e.type === "card") return e.data.who === s.id && farAway(e.data.placeId, e.time, e.time);
      if (e.type === "witness") return farAway(e.data.placeId, e.time, e.end ?? e.time);
      return false;
    });
    facts.push({ id: `alibi:${s.id}`, kind: "alibi", text: `${s.name} was elsewhere at the ${kind.words.crimeTime}`, evidenceIds: ids(alibi) });
  }

  return { facts, decisiveIds: ids(decisive) };
}

/** Early warnings before the full solvability check: facts with nothing behind them. */
export function factProblems(facts: Facts) {
  const problems: string[] = [];
  if (facts.decisiveIds.length === 0) problems.push("No decisive evidence: nothing ties the culprit to the crime beyond doubt.");
  for (const f of facts.facts) {
    // Near-scene, contact and alibis are optional: an innocent may have no provable alibi.
    if (f.evidenceIds.length === 0 && f.id !== "culprit-near-scene" && f.id !== "culprit-contact" && f.kind !== "alibi") {
      problems.push(`Nothing proves: ${f.text}.`);
    }
  }
  return problems;
}
