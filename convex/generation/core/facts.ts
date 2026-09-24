import { streetRoute, type City } from "./city";
import type { Evidence, EvidenceSet } from "./evidence/types";
import type { Cast, CrimeCore, Story } from "./schemas";

export type Fact = {
  id: string;
  kind: "killer" | "motive" | "weapon" | "method" | "accomplice" | "alibi";
  text: string;
  /** Hidden: evidence that supports this fact. */
  evidenceIds: string[];
};

export type Facts = { facts: Fact[]; decisiveIds: string[] };

const NEAR_MINUTES = 60;

/**
 * Works out what the evidence proves: killer at/near the scene, contact with the victim, motive,
 * weapon links, method, accomplice link, and each innocent suspect's alibi. Also picks the decisive
 * evidence: items that tie the killer to the crime with no innocent explanation.
 */
export function buildFacts(city: City, crime: CrimeCore, cast: Cast, story: Story, set: EvidenceSet): Facts {
  const { evidence } = set;
  const tod = crime.timeOfDeath;
  const killer = crime.killerId;
  const scenePlace = crime.sceneRoomId.split(":")[0];
  const killerItems = new Set(story.items.filter((i) => i.ownerId === killer).map((i) => i.id));
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const travelToScene = (placeId: string) => (placeId === scenePlace ? 0 : (streetRoute(city, placeId, scenePlace)?.minutes ?? Infinity));
  const ids = (list: Evidence[]) => list.map((e) => e.id);

  const forensic = evidence.filter((e): e is Extract<Evidence, { type: "forensic" }> => e.type === "forensic");
  const cctv = evidence.filter((e): e is Extract<Evidence, { type: "cctv" }> => e.type === "cctv" && e.data.kind !== "offline");

  const bloodOnKillerItem = forensic.filter(
    (e) => e.data.bloodOf === crime.victimId && killerItems.has(e.data.subjectId.replace("item:", "")),
  );
  const killerPrintsOnWeapon = forensic.filter((e) => e.data.subjectId === "item:weapon" && e.data.printsOf?.includes(killer));
  const killerOnSceneCamera = cctv.filter(
    (e) => e.aboutIds.includes(killer) && e.access.tool === "cctv" && e.access.cameraId === `cam:${crime.sceneRoomId}` && e.time! <= tod + 15 && e.end! >= tod - 15,
  );
  const decisive = [...bloodOnKillerItem, ...killerPrintsOnWeapon, ...killerOnSceneCamera];

  const killerAtScene = [
    ...decisive,
    ...forensic.filter((e) => e.data.subjectId === `room:${crime.sceneRoomId}` && (e.data.printsOf?.includes(killer) || killerItems.has(e.data.fibersFromItemId ?? ""))),
    ...forensic.filter((e) => e.data.test === "footprints" && e.data.printsOf?.includes(killer)),
  ];
  const killerNearScene = cctv.filter(
    (e) => e.aboutIds.includes(killer) && Math.abs(e.time! - tod) <= NEAR_MINUTES && travelToScene(e.data.placeId) <= Math.abs(e.time! - tod) + 5,
  );
  const killerContact = evidence.filter(
    (e) => (e.type === "call" || e.type === "message") && e.aboutIds.includes(killer) && e.aboutIds.includes(crime.victimId) && e.time! <= tod,
  );
  const provesTag = (tag: string) =>
    evidence.filter(
      (e) => (e.type === "call" || e.type === "message" || e.type === "item" || e.type === "record" || e.type === "file") && e.data.proves.includes(tag),
    );

  const weaponAtScene = forensic.filter(
    (e) =>
      (e.data.subjectId === "item:weapon" && e.data.bloodOf === crime.victimId) ||
      ["toxicology", "ballistics", "ligature"].includes(e.data.test) ||
      (crime.weapon.category === "fall" && e.data.test === "autopsy"),
  );
  const weaponToKiller = [...killerPrintsOnWeapon, ...forensic.filter((e) => e.data.subjectId === "item:weapon" && killerItems.has(e.data.fibersFromItemId ?? ""))];

  const facts: Fact[] = [
    { id: "killer-at-scene", kind: "killer", text: `${nameOf(killer)} was at the scene`, evidenceIds: ids(killerAtScene) },
    { id: "killer-near-scene", kind: "killer", text: `${nameOf(killer)} was out and near the scene around the death`, evidenceIds: ids(killerNearScene) },
    { id: "killer-contact", kind: "killer", text: `${nameOf(killer)} contacted the victim before the death`, evidenceIds: ids(killerContact) },
    { id: "motive", kind: "motive", text: crime.motive.details, evidenceIds: ids(provesTag("motive")) },
    { id: "weapon-at-scene", kind: "weapon", text: `The ${crime.weapon.name.toLowerCase()} was used on the victim`, evidenceIds: ids(weaponAtScene) },
    { id: "weapon-to-killer", kind: "weapon", text: `The ${crime.weapon.name.toLowerCase()} links to ${nameOf(killer)}`, evidenceIds: ids(weaponToKiller) },
    { id: "method", kind: "method", text: crime.method, evidenceIds: ids(forensic.filter((e) => e.data.test === "autopsy")) },
  ];
  if (crime.accomplice) {
    const acc = crime.accomplice.id;
    facts.push({
      id: "accomplice-link",
      kind: "accomplice",
      text: `${nameOf(acc)} helped ${nameOf(killer)}`,
      evidenceIds: ids([
        ...evidence.filter((e) => (e.type === "call" || e.type === "message") && e.aboutIds.includes(acc) && e.aboutIds.includes(killer)),
        ...provesTag("accomplice"),
      ]),
    });
  }

  // Alibis: evidence that puts an innocent suspect too far away to reach the scene at the time of death.
  for (const s of cast.characters.filter((c) => c.role === "suspect" && c.id !== killer && c.id !== crime.accomplice?.id)) {
    const farAway = (placeId: string, from: number, to: number) => {
      const gap = tod < from ? from - tod : tod > to ? tod - to : 0;
      return travelToScene(placeId) > gap;
    };
    const alibi = evidence.filter((e) => {
      if (!e.aboutIds.includes(s.id) || e.time === undefined) return false;
      if (e.type === "cctv") return farAway(e.data.placeId, e.time, e.end ?? e.time);
      if (e.type === "card") return e.data.who === s.id && farAway(e.data.placeId, e.time, e.time);
      if (e.type === "witness") return farAway(e.data.placeId, e.time, e.end ?? e.time);
      return false;
    });
    facts.push({ id: `alibi:${s.id}`, kind: "alibi", text: `${s.name} was elsewhere at the time of death`, evidenceIds: ids(alibi) });
  }

  return { facts, decisiveIds: ids(decisive) };
}

/** Early warnings before the full solvability check: facts with nothing behind them. */
export function factProblems(facts: Facts) {
  const problems: string[] = [];
  if (facts.decisiveIds.length === 0) problems.push("No decisive evidence: nothing ties the killer to the crime beyond doubt.");
  for (const f of facts.facts) {
    if (f.evidenceIds.length === 0 && f.id !== "killer-near-scene" && f.id !== "killer-contact") {
      problems.push(`Nothing proves: ${f.text}.`);
    }
  }
  return problems;
}
