import { findRoom, type City } from "./city";
import type { Evidence, EvidenceSet } from "./evidence/types";
import type { Facts } from "./facts";
import { checkLies, liarCountProblems } from "./lies";
import type { Cast, CrimeCore, Lies, Story } from "./schemas";

export type CaseCheck = {
  id: string;
  label: string;
  ok: boolean;
  /** Why it failed, in plain words; empty when ok. */
  problems: string[];
  /** Hidden: evidence that satisfies the check. */
  evidenceIds: string[];
};

import type { Difficulty } from "./crimeCast";

// "<killer> killed <victim>" in one sentence would hand players the answer.
const KILL_WORDS = "killed|murdered|shot|stabbed|poisoned|strangled|pushed";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Final solvability check: can players reach every star, is the answer unique, and can every lie be
 * caught? No AI involved.
 */
export function validateCase(
  city: City,
  crime: CrimeCore,
  cast: Cast,
  story: Story,
  set: EvidenceSet,
  facts: Facts,
  lies: Lies,
  difficulty: Difficulty,
): CaseCheck[] {
  const byId = new Map(set.evidence.map((e) => [e.id, e]));
  const fact = (id: string) => facts.facts.find((f) => f.id === id)?.evidenceIds ?? [];
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const reachable = (id: string) => {
    const e = byId.get(id);
    return !!e && whyUnreachable(city, crime, cast, set, lies, e) === null;
  };
  const check = (id: string, label: string, evidenceIds: string[], problems: string[]): CaseCheck => ({
    id,
    label,
    ok: problems.length === 0,
    problems,
    evidenceIds,
  });
  const atLeast = (ids: string[], n: number, what: string) => {
    const ok = ids.filter(reachable);
    return ok.length >= n ? [] : [`Only ${ok.length} reachable piece(s) of evidence ${what}; need ${n}.`];
  };

  // Killer: at least two kinds of evidence put them at/near the scene or break their alibi lie.
  const alibiLieProof = lies.lies.filter((l) => l.npcId === crime.killerId && l.topic === "whereabouts").flatMap((l) => l.disprovingEvidenceIds);
  const killerIds = [...new Set([...fact("killer-at-scene"), ...fact("killer-near-scene"), ...alibiLieProof])].filter(reachable);
  const killerTypes = new Set(killerIds.map((id) => byId.get(id)!.type));

  const innocents = cast.characters.filter((c) => c.role === "suspect" && c.id !== crime.killerId && c.id !== crime.accomplice?.id);

  // Innocents may lack an alibi (a difficulty choice), but no decisive-type evidence may point at them:
  // the victim's blood on their things, their prints on a weapon they don't own, or them on the scene camera at the death.
  const weaponOwner = story.items.find((i) => i.id === "weapon")?.ownerId;
  const pointsAt = (id: string) =>
    set.evidence.filter((e) => {
      if (e.type === "forensic") {
        const itemId = e.data.subjectId.replace("item:", "");
        const owner = story.items.find((i) => i.id === itemId)?.ownerId;
        if (e.data.bloodOf === crime.victimId && owner === id && itemId !== "weapon") return true;
        if (e.data.subjectId === "item:weapon" && e.data.test === "fingerprints" && e.data.printsOf?.includes(id) && weaponOwner !== id) return true;
      }
      return (
        e.type === "cctv" &&
        e.aboutIds.includes(id) &&
        e.access.tool === "cctv" &&
        e.access.cameraId === `cam:${crime.sceneRoomId}` &&
        e.time! <= crime.timeOfDeath + 15 &&
        e.end! >= crime.timeOfDeath - 15
      );
    });

  const checks = [
    check("killer", "Killer can be placed at the scene", killerIds, killerTypes.size >= 2 ? [] : [`Only ${killerTypes.size} kind(s) of evidence place ${nameOf(crime.killerId)} at the scene; need 2.`]),
    check("motive", "Motive is backed by evidence", fact("motive"), atLeast(fact("motive"), 2, "for the motive")),
    check("weapon", "Weapon is linked to the victim and the killer", [...fact("weapon-at-scene"), ...fact("weapon-to-killer")], [
      ...atLeast(fact("weapon-at-scene"), 1, "linking the weapon to the victim"),
      ...atLeast(fact("weapon-to-killer"), 1, "linking the weapon to the killer"),
    ]),
    check("method", "Method is backed by the lab", fact("method"), atLeast(fact("method"), 1, "for the method")),
    check("evidence", "Decisive evidence exists", facts.decisiveIds, atLeast(facts.decisiveIds, difficulty === "easy" ? 2 : 1, "that is decisive")),
    check(
      "unique",
      "Nothing decisive points at an innocent",
      innocents.flatMap((c) => fact(`alibi:${c.id}`)),
      innocents.flatMap((c) => pointsAt(c.id).map((e) => `"${e.title}" points at ${c.name} as strongly as at the killer.`)),
    ),
    ...(crime.accomplice
      ? [check("accomplice", "Accomplice can be linked", fact("accomplice-link"), atLeast(fact("accomplice-link"), 1, "linking the accomplice"))]
      : []),
    check("lies", "Every lie can be caught", lies.lies.flatMap((l) => l.disprovingEvidenceIds), [
      ...checkLies(crime, cast, story, set, lies),
      ...liarCountProblems(crime, cast, lies, difficulty),
      ...lies.lies.flatMap((l) => [...l.disprovingEvidenceIds, ...(l.backupLie?.disprovingEvidenceIds ?? [])]).filter((id) => byId.has(id) && !reachable(id)).map((id) => `Lie proof "${byId.get(id)!.title}" can't be reached.`),
    ]),
    check(
      "reachable",
      "All evidence can be found",
      [],
      set.evidence.flatMap((e) => {
        const why = whyUnreachable(city, crime, cast, set, { lies: [] }, e);
        return why ? [`"${e.title}": ${why}.`] : [];
      }),
    ),
    check(
      "no-shortcut",
      "No single piece of evidence gives the answer away",
      [],
      set.evidence
        .filter((e) => {
          const [killer, victim] = [crime.killerId, crime.victimId].map((id) => escape(nameOf(id).split(" ")[0]));
          return new RegExp(`\\b${killer}\\b(\\s+[\\w']+){0,2}\\s+(${KILL_WORDS})(\\s+[\\w']+){0,3}?\\s+${victim}\\b`, "i").test(e.summary);
        })
        .map((e) => `"${e.title}" names the killer outright.`),
    ),
  ];
  return checks;
}

/** Why a player couldn't get to this evidence, or null when they can. */
function whyUnreachable(city: City, crime: CrimeCore, cast: Cast, set: EvidenceSet, lies: Lies, e: Evidence): string | null {
  // A witness who lies about an event won't tell players what they saw of it.
  if (e.type === "witness" && lies.lies.some((l) => l.npcId === e.data.witnessId && l.truthIds.includes(e.data.eventId))) {
    return `${e.data.witnessId} lies about this`;
  }
  const a = e.access;
  switch (a.tool) {
    case "search": {
      const room = findRoom(city, a.roomId)?.room;
      if (!room) return `room ${a.roomId} doesn't exist`;
      if (a.slot === "on the body" && a.roomId === crime.sceneRoomId) return null;
      return room.itemSlots.includes(a.slot) ? null : `${room.name} has no "${a.slot}" to search`;
    }
    case "cctv":
      return set.cameras.some((c) => c.id === a.cameraId) ? null : `camera ${a.cameraId} doesn't exist`;
    case "lab": {
      const [kind, ...rest] = a.subjectId.split(":");
      const ref = rest.join(":");
      if (kind === "item") return set.evidence.some((x) => x.id === `item/${ref}`) ? null : `the item "${ref}" to test is never found`;
      if (kind === "room") return findRoom(city, ref) ? null : `room ${ref} doesn't exist`;
      return null;
    }
    case "phone":
      return set.evidence.some((x) => x.type === "device" && x.id === `device/${a.deviceId}`) ? null : `phone ${a.deviceId} is never found`;
    case "device":
      return set.evidence.some((x) => x.id === `item/${a.itemId}`) ? null : `device "${a.itemId}" is never found`;
    case "interrogation": {
      const person = cast.characters.find((c) => c.id === a.witnessId);
      return person && person.role !== "victim" ? null : `${a.witnessId} can't be questioned`;
    }
    case "records":
      return null;
  }
}

/** Failed checks as plain problems, for the stage's check errors. */
export function validationProblems(checks: CaseCheck[]) {
  return checks.flatMap((c) => c.problems.map((p) => `${c.label}: ${p}`));
}
