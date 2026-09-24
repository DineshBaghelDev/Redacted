import { findRoom, type City } from "./city";
import type { EvidenceSet } from "./evidence/types";
import { formatTime, type Cast, type CrimeCore, type Lie, type Lies, type Story } from "./schemas";

export type Knowledge = {
  /** Story event, message/call or purchase id. */
  id: string;
  how: "took part" | "saw" | "sent" | "received" | "bought" | "heard";
  time: number;
  end?: number;
  where?: string;
  text: string;
};

/** Everything an NPC's live roleplay may use. Never holds solution fields. */
export type NpcScript = {
  npcId: string;
  name: string;
  age: number;
  gender: string;
  job: string;
  home: string;
  personality: string[];
  relationshipToVictim: string;
  secret?: string;
  protects?: string;
  knowledge: Knowledge[];
  lies: Lie[];
  rules: string[];
};

const RULES = [
  "Only talk about what is in your knowledge. You may make up small harmless details from before these two days, never new evidence.",
  "Keep each lie until the game tells you it has been exposed. Pushing, threats or asking again don't change that.",
  "When a lie is exposed, react as its 'whenCaught' says.",
];
const KILLER_RULE = "Never confess to the killing, even after your lies are exposed.";
const ACCOMPLICE_RULE = "You helped the killer. Never reveal the killer; admit your own part only as far as exposed lies force you.";
const INNOCENT_RULE = "You don't know who killed the victim.";

/**
 * Builds each NPC's private script: who they are, what they know (events they took part in or saw,
 * their messages and purchases), their lies, and fixed behaviour rules.
 */
export function buildScripts(city: City, crime: CrimeCore, cast: Cast, story: Story, set: EvidenceSet, { lies }: Lies): NpcScript[] {
  const where = (roomId: string) => {
    const found = findRoom(city, roomId);
    return found ? `${found.place.name}, ${found.room.name}` : roomId;
  };
  const placeName = (placeId: string) => city.places.find((p) => p.id === placeId)?.name ?? placeId;
  const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
  const victim = nameOf(crime.victimId);
  const discovery = story.events.find((e) => e.actors.includes(crime.discovery.byId) && e.roomId === crime.sceneRoomId);

  return cast.characters
    .filter((c) => c.role !== "victim")
    .map((c) => {
      const knowledge: Knowledge[] = [];
      for (const e of story.events) {
        const saw = set.evidence.some((x) => x.type === "witness" && x.data.witnessId === c.id && x.data.eventId === e.id);
        if (e.actors.includes(c.id) || saw) {
          knowledge.push({ id: e.id, how: e.actors.includes(c.id) ? "took part" : "saw", time: e.start, end: e.end, where: where(e.roomId), text: e.action });
        }
      }
      for (const m of story.comms.filter((m) => m.from === c.id || m.to === c.id)) {
        const sent = m.from === c.id;
        knowledge.push({
          id: m.id,
          how: sent ? "sent" : "received",
          time: m.time,
          text: `${m.type === "call" ? "Call" : "Message"} ${sent ? "to" : "from"} ${nameOf(sent ? m.to : m.from)}: ${m.gist}`,
        });
      }
      for (const p of story.purchases.filter((p) => p.who === c.id)) {
        knowledge.push({ id: p.id, how: "bought", time: p.time, where: placeName(p.placeId), text: `Bought ${p.item}, paid by ${p.payment}.` });
      }
      if (discovery && !discovery.actors.includes(c.id)) {
        knowledge.push({
          id: discovery.id,
          how: "heard",
          time: discovery.end,
          text: `News: ${victim} was found dead at ${placeName(crime.sceneRoomId.split(":")[0])} on ${formatTime(discovery.start)}.`,
        });
      }
      knowledge.sort((a, b) => a.time - b.time);

      return {
        npcId: c.id,
        name: c.name,
        age: c.age,
        gender: c.gender,
        job: c.job ? `${c.job.title} at ${placeName(c.job.placeId)}` : "no job",
        home: where(c.homeUnitId),
        personality: c.traits,
        relationshipToVictim: c.relationshipToVictim,
        secret: c.secret,
        protects: c.protects,
        knowledge,
        lies: lies.filter((l) => l.npcId === c.id),
        rules: [...RULES, c.id === crime.killerId ? KILLER_RULE : c.id === crime.accomplice?.id ? ACCOMPLICE_RULE : INNOCENT_RULE],
      };
    });
}

/**
 * Leak check: scripts must only hold private events the NPC took part in, and never the crime's hidden
 * summary (method, motive details).
 *
 * @returns Plain problem descriptions; empty when fine.
 */
export function scriptProblems(crime: CrimeCore, story: Story, scripts: NpcScript[]) {
  const problems: string[] = [];
  for (const s of scripts) {
    for (const k of s.knowledge) {
      const e = story.events.find((x) => x.id === k.id);
      if (e?.visibility === "private" && !e.actors.includes(s.npcId)) problems.push(`${s.name} knows about private event "${e.id}" without being in it.`);
    }
    const text = JSON.stringify(s);
    if (text.includes(crime.method)) problems.push(`${s.name}'s script contains the hidden method.`);
    if (text.includes(crime.motive.details)) problems.push(`${s.name}'s script contains the hidden motive.`);
  }
  return problems;
}
