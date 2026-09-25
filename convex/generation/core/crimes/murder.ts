import { z } from "zod";
import { findRoom, homeRooms } from "../city";
import type { Evidence } from "../evidence/types";
import { crimeBaseSchema, formatTime, id } from "../schemas";
import { crimeEvent, inSceneAt, makeCheck, type CaseParts, type CrimeKind } from "./kind";

// Murder: the victim dies at the scene; a weapon, the body and the lab carry the case.

const WEAPONS = ["blunt", "sharp", "poison", "firearm", "strangulation", "fall"] as const;
const MOTIVES = ["money", "jealousy", "revenge", "cover-up", "power"] as const;

export const murderSchema = crimeBaseSchema.extend({
  type: z.literal("murder").default("murder"),
  accomplice: z.object({ id, role: z.enum(["fake-alibi", "weapon-disposal", "distraction"]) }).nullable(),
  motive: z.object({ type: z.enum(MOTIVES), details: z.string() }),
  weapon: z.object({ name: z.string(), category: z.enum(WEAPONS), originRoomId: id }),
  coverUp: z.array(z.enum(["wipe-prints", "hide-weapon", "disable-camera", "remove-item"])).max(4),
});

export type MurderCore = z.infer<typeof murderSchema>;
type Parts = CaseParts<MurderCore>;

const CAUSE = {
  blunt: "Blunt force trauma to the head",
  sharp: "Stab wounds",
  poison: "Poisoning",
  firearm: "Gunshot wound",
  strangulation: "Asphyxia from strangulation",
  fall: "Injuries from a fall",
} as const;

const TIME_OF_DEATH_SPREAD = { easy: 45, normal: 90, hard: 120 } as const;

/** A fall has no weapon to carry: the push itself is the weapon, and the autopsy proves it. */
const hasWeaponItem = (crime: MurderCore) => crime.weapon.category !== "fall";

const bloody = (crime: MurderCore) => crime.weapon.category === "blunt" || crime.weapon.category === "sharp";

/** The killer's clothing worn in the murder event (it gets the victim's blood and sheds fibers). */
function killerClothing({ crime, story }: Parts) {
  const murder = crimeEvent(crime, story);
  return story.items.filter((i) => i.kind === "clothing" && i.ownerId === crime.culpritId && murder?.itemsUsed.includes(i.id));
}

const forensics = (set: { evidence: Evidence[] }) => set.evidence.filter((e): e is Extract<Evidence, { type: "forensic" }> => e.type === "forensic");

export const murder: CrimeKind<MurderCore> = {
  type: "murder",
  words: { crime: "murder", culprit: "killer", crimeTime: "time of death", discovery: "the body is found", finder: "whoever finds the body" },
  schema: murderSchema,

  picks(rng) {
    const motive = rng.pick(MOTIVES);
    const weapon = rng.pick(WEAPONS);
    return {
      lines: [`motive type: ${motive}`, `weapon category: ${weapon}`],
      problems: (crime) => [
        ...(crime.motive.type !== motive ? [`Motive type must be "${motive}".`] : []),
        ...(crime.weapon.category !== weapon ? [`Weapon category must be "${weapon}".`] : []),
      ],
    };
  },
  crimeRules: ["weapon.originRoomId must be a room id from the city list."],
  crimeNotes: [
    "method: one sentence on how the victim died.",
    "weapon.name: the actual object: for poison, the poison and what it was in; for strangulation, the cord or scarf. For a fall there is no object: weapon.name says how they fell (e.g. \"pushed down the back stairs\") and weapon.originRoomId is the scene room.",
    "weapon.originRoomId: where the weapon was before the crime, copied exactly from the room list (e.g. a kitchen or garage at the scene, a shop's stock room, or a room at a home or workplace). Never invent ids; homes aren't assigned to people yet.",
    "accomplice: null unless the brief says there is one; then pick the role that fits the story: fake-alibi, weapon-disposal or distraction.",
  ],
  crimeProblems: (city, crime) => (findRoom(city, crime.weapon.originRoomId) ? [] : [`Weapon starts in unknown room ${crime.weapon.originRoomId}.`]),
  summary: (crime) => `murder, ${crime.motive.type}, ${crime.weapon.name}: ${crime.motive.details}`,

  victimEndsAt: (crime) => crime.crimeTime,
  storyRules: (crime) => [
    ...(hasWeaponItem(crime)
      ? [
          'The murder is one event in the crime scene room with the killer and the victim, covering the time of death, with "weapon" in itemsUsed.',
          'Exactly one item has id "weapon" and kind "weapon", starting in the crime\'s weapon origin room.',
        ]
      : ['The murder is one event in the crime scene room with the killer and the victim, covering the time of death, in which the killer makes the victim fall. A fall has no weapon: no item has id "weapon" or kind "weapon".']),
    "The victim does nothing after the murder (no events, messages or purchases).",
    "The victim's last hours make sense: the story shows why they were at the scene at that time (a meeting, a late shift, going home).",
  ],
  storyItems: "items: the weapon (none for a fall), clothing the killer wore, documents and devices that matter. Devices (laptops, tablets) can hold files in contents.",
  evidenceNotes: [
    "Clothing owned by the killer and listed in the murder event's itemsUsed also gets the victim's blood (blunt or sharp weapons) and leaves fibers on the weapon.",
    'The weapon links to the killer through their prints on it (not with wipe-prints), fibers from their clothing, the killer buying it by card (a purchase with itemId "weapon"), or the killer caught on camera in the weapon\'s origin room during a story event there that uses the weapon.',
    "The lab ties the weapon to the victim: blood on it (blunt or sharp), ballistics (firearm), and for poison, strangulation and falls the autopsy and body tests.",
  ],
  decisiveKinds: ["the victim's blood on the killer's clothing", "the killer's prints on the weapon", "the weapon hidden in the killer's home"],

  plan(parts) {
    const { crime } = parts;
    const wiped = crime.coverUp.includes("wipe-prints");
    const clothing = 'a clothing item with ownerId set to the killer, listed in the murder event\'s itemsUsed together with "weapon"';
    const originHasCamera =
      !!findRoom(parts.city, crime.weapon.originRoomId)?.place.building.cameraRoomIds.includes(crime.weapon.originRoomId) &&
      crime.disabledCamera?.cameraId !== `cam:${crime.weapon.originRoomId}`;
    if (!hasWeaponItem(crime)) return { decisive: [], routes: [] };
    return {
      decisive: [
        ...(wiped ? [] : ["the killer's prints on the weapon: the killer handles the weapon in the murder event"]),
        ...(bloody(crime) ? [`the victim's blood on the killer's clothing: ${clothing}`] : []),
        "the weapon hidden in the killer's home: the weapon's finalRoomId is a room of the killer's home, with a later event there that uses it (the lab still ties it to the victim)",
      ],
      routes: [
        {
          checkId: "weapon",
          label: "Link the weapon to the killer (at least 1)",
          ways: [
            ...(wiped ? [] : ["the killer's prints on the weapon: the killer is an actor in an event that uses the weapon"]),
            `fibers from the killer's clothing on the weapon: ${clothing}`,
            'the killer buys the weapon by card: a purchase by the killer with itemId "weapon" and payment "card", at the place of the weapon\'s origin room, before the murder',
            ...(originHasCamera
              ? [`the killer on camera where the weapon came from: an event in ${crime.weapon.originRoomId} with the killer as an actor and "weapon" in itemsUsed`]
              : []),
          ],
        },
      ],
    };
  },

  timelineProblems({ crime, story }, timeline) {
    const problems: string[] = [];
    const tod = crime.crimeTime;
    if (!inSceneAt(crime, timeline, crime.victimId, tod)) problems.push(`The victim isn't in the crime scene at ${formatTime(tod)}.`);
    if (timeline.entries.some((e) => e.actorId === crime.victimId && e.start > tod)) problems.push("The victim does something after dying.");
    if (story.comms.some((c) => c.from === crime.victimId && c.time > tod)) problems.push("The victim calls or messages someone after dying.");
    if (story.purchases.some((p) => p.who === crime.victimId && p.time > tod)) problems.push("The victim buys something after dying.");
    const weapon = story.items.find((i) => i.id === "weapon");
    if (!hasWeaponItem(crime)) {
      if (weapon) problems.push('A fall has no weapon: remove the item with id "weapon".');
    } else if (!weapon) problems.push('The story has no item with id "weapon".');
    else {
      if (weapon.startRoomId !== crime.weapon.originRoomId) problems.push("The weapon starts somewhere other than the crime says.");
      const used = story.events.some((e) => e.roomId === crime.sceneRoomId && e.itemsUsed.includes("weapon") && e.start <= tod && tod <= e.end);
      if (!used) problems.push("No event uses the weapon at the crime scene at the time of death.");
    }
    return problems;
  },

  keyItemIds: ["weapon"],
  victimPhone: (crime) => ({ tool: "search", roomId: crime.sceneRoomId, slot: "on the body" }),

  evidence(parts, difficulty, nameOf) {
    const { crime, story } = parts;
    const out: Evidence[] = [];
    const tod = crime.crimeTime;
    const spread = TIME_OF_DEATH_SPREAD[difficulty];
    const murder = crimeEvent(crime, story);
    const murderIds = murder ? [murder.id] : [];
    const lab = (subjectId: string) => ({ tool: "lab" as const, subjectId });
    const bodyId = `body:${crime.victimId}`;

    const lo = Math.floor((tod - spread) / 15) * 15;
    const hi = Math.ceil((tod + spread) / 15) * 15;
    out.push({
      id: "forensic/autopsy",
      type: "forensic",
      title: "Autopsy report",
      summary: `${CAUSE[crime.weapon.category]}. Died between ${formatTime(lo)} and ${formatTime(hi)}.`,
      access: lab(bodyId),
      aboutIds: [crime.victimId],
      sourceIds: murderIds,
      data: { test: "autopsy", subjectId: bodyId },
    });

    const weapon = story.items.find((i) => i.id === "weapon");
    const clothing = killerClothing(parts);
    // Any clothing worn in the murder gets blood, whoever owns it (a borrowed coat can frame an innocent).
    const worn = story.items.filter((i) => i.kind === "clothing" && murder?.itemsUsed.includes(i.id));
    if (bloody(crime)) {
      for (const item of [...(weapon ? [weapon] : []), ...worn]) {
        const subjectId = `item:${item.id}`;
        out.push({
          id: `forensic/${item.id}/blood`,
          type: "forensic",
          title: `Blood test · ${item.name}`,
          summary: `Blood found on the ${item.name.toLowerCase()}. It matches ${nameOf(crime.victimId)}.`,
          access: lab(subjectId),
          aboutIds: [crime.victimId, ...(item.ownerId ? [item.ownerId] : [])],
          sourceIds: [item.id, ...murderIds],
          data: { test: "blood", subjectId, bloodOf: crime.victimId },
        });
      }
    }
    if (weapon) {
      for (const cloth of clothing) {
        out.push({
          id: `forensic/weapon/fibers/${cloth.id}`,
          type: "forensic",
          title: `Fibers · ${weapon.name}`,
          summary: `Fibers found on the ${weapon.name.toLowerCase()} match the ${cloth.name.toLowerCase()}.`,
          access: lab("item:weapon"),
          aboutIds: [cloth.ownerId!],
          sourceIds: [weapon.id, cloth.id],
          data: { test: "fibers", subjectId: "item:weapon", fibersFromItemId: cloth.id },
        });
      }
    }

    // Weapon-type specific tests.
    const weaponName = (weapon?.name ?? crime.weapon.name).toLowerCase();
    const special = {
      poison: { test: "toxicology" as const, subjectId: bodyId, title: "Toxicology report", text: `Traces of ${weaponName} found in the blood.` },
      firearm: { test: "ballistics" as const, subjectId: "item:weapon", title: `Ballistics · ${weapon?.name ?? "weapon"}`, text: `The bullet from the body was fired by the ${weaponName}.` },
      strangulation: { test: "ligature" as const, subjectId: bodyId, title: "Ligature marks", text: `Marks on the neck match the ${weaponName}.` },
    } as const;
    const weaponTest = special[crime.weapon.category as keyof typeof special];
    if (weaponTest) {
      out.push({
        id: `forensic/${weaponTest.test}`,
        type: "forensic",
        title: weaponTest.title,
        summary: weaponTest.text,
        access: lab(weaponTest.subjectId),
        aboutIds: [crime.victimId],
        sourceIds: ["weapon", ...murderIds],
        data: { test: weaponTest.test, subjectId: weaponTest.subjectId },
      });
    }
    return out;
  },

  facts(parts, set) {
    const { city, crime, cast, story } = parts;
    const killer = crime.culpritId;
    const nameOf = (id: string) => cast.characters.find((c) => c.id === id)?.name ?? id;
    const forensic = forensics(set);
    const cctv = set.evidence.filter((e): e is Extract<Evidence, { type: "cctv" }> => e.type === "cctv" && e.data.kind !== "offline");
    const killerItems = new Set(story.items.filter((i) => i.ownerId === killer).map((i) => i.id));
    const weaponName = crime.weapon.name.toLowerCase();

    const bloodOnKillerItem = forensic.filter((e) => e.data.bloodOf === crime.victimId && killerItems.has(e.data.subjectId.replace("item:", "")));
    const killerPrintsOnWeapon = forensic.filter((e) => e.data.subjectId === "item:weapon" && e.data.printsOf?.includes(killer));
    const weaponAtScene = forensic.filter(
      (e) =>
        (e.data.subjectId === "item:weapon" && e.data.bloodOf === crime.victimId) ||
        ["toxicology", "ballistics", "ligature"].includes(e.data.test) ||
        (crime.weapon.category === "fall" && e.data.test === "autopsy"),
    );
    // The weapon hidden at the killer's home is decisive once the lab ties it to the victim.
    const killerChar = cast.characters.find((c) => c.id === killer);
    const home = killerChar ? homeRooms(city, killerChar.homeUnitId) : new Set<string>();
    const weaponAtHome = set.evidence.filter((e) => e.id === "item/weapon" && e.access.tool === "search" && home.has(e.access.roomId) && weaponAtScene.length > 0);
    // The killer on camera where the weapon came from, in a story event that uses it (e.g. taking poison from a pharmacy).
    const weaponEvents = new Set(
      story.events.filter((e) => e.roomId === crime.weapon.originRoomId && e.actors.includes(killer) && e.itemsUsed.includes("weapon")).map((e) => e.id),
    );
    const killerAtWeaponOrigin = cctv.filter((e) => e.aboutIds.includes(killer) && weaponEvents.has(e.sourceIds[0]));
    const boughtWeapon = new Set(story.purchases.filter((p) => p.who === killer && p.itemId === "weapon").map((p) => p.id));
    const weaponPurchase = set.evidence.filter((e) => e.type === "card" && boughtWeapon.has(e.sourceIds[0]));
    const weaponToKiller = [
      ...killerPrintsOnWeapon,
      ...forensic.filter((e) => e.data.subjectId === "item:weapon" && killerItems.has(e.data.fibersFromItemId ?? "")),
      ...killerAtWeaponOrigin,
      ...weaponPurchase,
      ...weaponAtHome,
    ];
    const ids = (list: Evidence[]) => list.map((e) => e.id);
    return {
      facts: [
        { id: "weapon-at-scene", kind: "weapon", text: `The ${weaponName} was used on the victim`, evidenceIds: ids(weaponAtScene) },
        { id: "weapon-to-killer", kind: "weapon", text: `The ${weaponName} links to ${nameOf(killer)}`, evidenceIds: ids(weaponToKiller) },
        { id: "method", kind: "method", text: crime.method, evidenceIds: ids(forensic.filter((e) => e.data.test === "autopsy")) },
      ],
      decisive: [...bloodOnKillerItem, ...killerPrintsOnWeapon, ...weaponAtHome],
    };
  },

  checks({ crime }, facts, atLeast) {
    const fact = (id: string) => facts.facts.find((f) => f.id === id)?.evidenceIds ?? [];
    return [
      makeCheck("weapon", "Weapon is linked to the victim and the killer", [...fact("weapon-at-scene"), ...fact("weapon-to-killer")], [
        ...atLeast(fact("weapon-at-scene"), 1, "linking the weapon to the victim"),
        // A fall has no weapon to link: the autopsy showing the fall is enough.
        ...(hasWeaponItem(crime) ? atLeast(fact("weapon-to-killer"), 1, "linking the weapon to the killer") : []),
      ]),
      makeCheck("method", "Method is backed by the lab", fact("method"), atLeast(fact("method"), 1, "for the method")),
    ];
  },

  // The victim's blood on their things, or their prints on a weapon they don't own.
  pointsAt({ crime, story }, set, personId) {
    const weaponOwner = story.items.find((i) => i.id === "weapon")?.ownerId;
    return forensics(set).filter((e) => {
      const itemId = e.data.subjectId.replace("item:", "");
      const owner = story.items.find((i) => i.id === itemId)?.ownerId;
      if (e.data.bloodOf === crime.victimId && owner === personId && itemId !== "weapon") return true;
      return e.data.subjectId === "item:weapon" && e.data.test === "fingerprints" && !!e.data.printsOf?.includes(personId) && weaponOwner !== personId;
    });
  },
  shortcutVerbs: "killed|murdered|shot|stabbed|poisoned|strangled|pushed",

  scriptRules: {
    culprit: "Never confess to the killing, even after your lies are exposed.",
    accomplice: "You helped the killer. Never reveal the killer; admit your own part only as far as exposed lies force you.",
    innocent: "You don't know who killed the victim.",
  },
  news({ city, crime, cast }, when) {
    const victim = cast.characters.find((c) => c.id === crime.victimId)?.name ?? crime.victimId;
    const place = findRoom(city, crime.sceneRoomId)?.place.name ?? crime.sceneRoomId;
    return `News: ${victim} was found dead at ${place} on ${formatTime(when)}.`;
  },

  briefRules: [
    "Only what the police know when they are called: who died, where the body was found, when, and who reported it.",
    "Never name or hint at the killer or accomplice, the motive, the exact method, or the weapon (unless the weapon was left in plain sight at the scene).",
  ],
  briefFacts({ city, crime, cast, story }) {
    const person = (id: string) => cast.characters.find((c) => c.id === id);
    const scene = findRoom(city, crime.sceneRoomId);
    const victim = person(crime.victimId);
    const finder = person(crime.discovery.byId);
    const weapon = weaponInPlainSight(crime, story);
    return [
      `victim: ${victim ? `${victim.name}, ${victim.age}, ${victim.job ? victim.job.title : "no job"}` : crime.victimId}`,
      `body found at: ${scene ? `${scene.place.name}, ${scene.room.name}` : crime.sceneRoomId}`,
      `found at: ${formatTime(crime.discovery.time)}`,
      `reported by: ${finder?.name ?? crime.discovery.byId} (${finder?.relationshipToVictim ?? ""})`,
      weapon ? `left at the scene: ${weapon}` : "no weapon was found at the scene",
    ];
  },
  briefProblems({ crime, cast, story }, brief) {
    const problems: string[] = [];
    const text = [brief.title, brief.summary, ...brief.initialFacts].join(" ");
    const weapon = story.items.find((i) => i.id === "weapon");
    if (weapon && !weaponInPlainSight(crime, story) && text.toLowerCase().includes(weapon.name.toLowerCase())) {
      problems.push("The brief names the weapon, which isn't in plain sight at the scene.");
    }
    const victim = cast.characters.find((c) => c.id === crime.victimId);
    if (victim && !text.includes(victim.name.split(" ")[0])) problems.push("The brief doesn't say who died.");
    return problems;
  },
};

/** The weapon's name if it was left in plain sight at the scene (hidden as a cover-up doesn't count). */
function weaponInPlainSight(crime: MurderCore, story: CaseParts["story"]) {
  const weapon = story.items.find((i) => i.id === "weapon");
  return weapon && weapon.finalRoomId === crime.sceneRoomId && !crime.coverUp.includes("hide-weapon") ? weapon.name : null;
}
