import { findRoom, type City } from "./city";
import { capitalize, crimeKind, makeCheck } from "./crimes";
import type { Evidence, EvidenceSet } from "./evidence/types";
import type { Facts } from "./facts";
import { checkLies, liarCountProblems } from "./lies";
import { escapeRegExp as escape, formatTime, type Cast, type CrimeBase, type Lies, type Story } from "./schemas";

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


/**
 * Final solvability check: can players reach every star, is the answer unique, and can every lie be
 * caught? No AI involved.
 */
export function validateCase(
  city: City,
  crime: CrimeBase,
  cast: Cast,
  story: Story,
  set: EvidenceSet,
  facts: Facts,
  lies: Lies,
  difficulty: Difficulty,
): CaseCheck[] {
  const kind = crimeKind(crime);
  const w = kind.words;
  const parts = { city, crime, cast, story };
  const byId = new Map(set.evidence.map((e) => [e.id, e]));
  const fact = (id: string) => facts.facts.find((f) => f.id === id)?.evidenceIds ?? [];
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const reachable = (id: string) => {
    const e = byId.get(id);
    return !!e && whyUnreachable(city, crime, cast, set, lies, e) === null;
  };
  const check = makeCheck;
  const atLeast = (ids: string[], n: number, what: string) => {
    const ok = ids.filter(reachable);
    return ok.length >= n ? [] : [`Only ${ok.length} reachable piece(s) of evidence ${what}; need ${n}.`];
  };

  // Culprit: at least two kinds of evidence put them at/near the scene or break their alibi lie.
  const alibiLieProof = lies.lies.filter((l) => l.npcId === crime.culpritId && l.topic === "whereabouts").flatMap((l) => l.disprovingEvidenceIds);
  const culpritIds = [...new Set([...fact("culprit-at-scene"), ...fact("culprit-near-scene"), ...alibiLieProof])].filter(reachable);
  const culpritTypes = new Set(culpritIds.map((id) => byId.get(id)!.type));

  const innocents = cast.characters.filter((c) => c.role === "suspect" && c.id !== crime.culpritId && c.id !== crime.accomplice?.id);

  // Innocents may lack an alibi (a difficulty choice), but no decisive-type evidence may point at them:
  // them on the scene camera at the crime time, or the kind's own sort (murder: the victim's blood on
  // their things, their prints on a weapon they don't own).
  const pointsAt = (id: string) => [
    ...kind.pointsAt(parts, set, id),
    ...set.evidence.filter(
      (e) =>
        e.type === "cctv" &&
        e.aboutIds.includes(id) &&
        e.access.tool === "cctv" &&
        e.access.cameraId === `cam:${crime.sceneRoomId}` &&
        e.time! <= crime.crimeTime + 15 &&
        e.end! >= crime.crimeTime - 15,
    ),
  ];
  const decisiveKinds = [...kind.decisiveKinds, `the ${w.culprit} on the scene room's camera at the ${w.crimeTime}`, `something taken from the scene found in the ${w.culprit}'s home`];

  const checks = [
    check("culprit", `${capitalize(w.culprit)} can be placed at the scene`, culpritIds, culpritTypes.size >= 2 ? [] : [
      `Only ${culpritTypes.size} kind(s) of evidence place ${nameOf(crime.culpritId)} at the scene${culpritTypes.size ? ` (${[...culpritTypes].join(", ")})` : ""}; need 2 different kinds, e.g. a camera, a witness at a public event, a card purchase, shoe prints at a side door, fibers or prints at the scene.`,
    ]),
    check("motive", "Motive is backed by evidence", fact("motive"), atLeast(fact("motive"), 2, "for the motive")),
    ...kind.checks(parts, facts, atLeast),
    check("evidence", "Decisive evidence exists", facts.decisiveIds, atLeast(facts.decisiveIds, difficulty === "easy" ? 2 : 1, "that is decisive").map(
      (p) => `${p} Decisive means: ${decisiveKinds.join(", ")}.`,
    )),
    check(
      "unique",
      "Nothing decisive points at an innocent",
      innocents.flatMap((c) => fact(`alibi:${c.id}`)),
      innocents.flatMap((c) =>
        pointsAt(c.id).map((e) => {
          const said = `"${e.title}" points at ${c.name} as strongly as at the ${w.culprit}`;
          // The scene camera: say exactly which minutes the innocent must stay out of the scene room.
          if (e.type === "cctv") {
            const [from, to] = [crime.crimeTime - 15, crime.crimeTime + 15];
            return `${said}: they are in view of the scene room's camera near the ${w.crimeTime}. Keep ${c.name} (${c.id}) out of ${crime.sceneRoomId} from ${formatTime(from)} to ${formatTime(to)}, e.g. end their event there before ${formatTime(from)} or start it after ${formatTime(to)}. If they are only there for their everyday routine (work or home), give them a story event somewhere else at that time.`;
          }
          return `${said}: change the story so this evidence doesn't involve ${c.name} (${c.id}).`;
        }),
      ),
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
          const [culprit, victim] = [crime.culpritId, crime.victimId].map((id) => escape(nameOf(id).split(" ")[0]));
          return new RegExp(`\\b${culprit}\\b(\\s+[\\w']+){0,2}\\s+(${kind.shortcutVerbs})(\\s+[\\w']+){0,3}?\\s+${victim}\\b`, "i").test(e.summary);
        })
        .map((e) => `"${e.title}" names the ${w.culprit} outright.`),
    ),
  ];
  return checks;
}

/** Why a player couldn't get to this evidence, or null when they can. */
function whyUnreachable(city: City, crime: CrimeBase, cast: Cast, set: EvidenceSet, lies: Lies, e: Evidence): string | null {
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
