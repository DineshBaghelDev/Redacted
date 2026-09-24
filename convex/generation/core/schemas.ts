import { z } from "zod";

// Shapes of the story stages. Later these are also the LLM's structured-output schemas.
// Times are whole minutes from Day 1 00:00 (Day 2 starts at 1440).

const id = z.string().min(1);

/** What a piece of story material helps prove. Code derives the rest (presence, alibis, weapon links). */
const proves = z.array(z.enum(["motive", "accomplice"])).default([]);

export const crimeCoreSchema = z.object({
  victimId: id,
  killerId: id,
  accomplice: z
    .object({ id, role: z.enum(["fake-alibi", "weapon-disposal", "distraction"]) })
    .optional(),
  motive: z.object({
    type: z.enum(["money", "jealousy", "revenge", "cover-up", "power"]),
    details: z.string(),
  }),
  weapon: z.object({
    name: z.string(),
    category: z.enum(["blunt", "sharp", "poison", "firearm", "strangulation", "fall"]),
    originRoomId: id,
  }),
  method: z.string(),
  sceneRoomId: id,
  timeOfDeath: z.number().int(),
  windowStart: z.number().int(),
  discovery: z.object({ time: z.number().int(), byId: id }),
  /** Required when coverUp includes "disable-camera": which camera went dark and when. */
  disabledCamera: z.object({ cameraId: id, from: z.number().int(), to: z.number().int() }).optional(),
  coverUp: z.array(z.enum(["wipe-prints", "hide-weapon", "move-body", "disable-camera", "remove-item"])).max(5),
});

export const routineTypes = ["office", "night-shift", "shop", "unemployed", "student"] as const;

export const characterSchema = z.object({
  id,
  name: z.string(),
  age: z.number().int(),
  gender: z.enum(["male", "female", "nonbinary"]),
  role: z.enum(["victim", "suspect", "witness"]),
  homeUnitId: id,
  /** roomId pins where they work; otherwise code picks a fitting room. */
  job: z.object({ placeId: id, title: z.string(), roomId: id.optional() }).nullable(),
  routine: z.enum(routineTypes),
  /** Where unemployed people / students spend the afternoon. */
  hangoutPlaceId: id.optional(),
  appearance: z.object({
    height: z.string(),
    build: z.string(),
    clothing: z.string(),
    /** Used for footprint evidence, e.g. "size 11 leather dress shoes". */
    shoes: z.string().optional(),
  }),
  traits: z.array(z.string()),
  relationshipToVictim: z.string(),
  secret: z.string(),
  protects: z.string(),
  fakeMotive: z.string().optional(),
  /** Public records about this person (insurance, debts, complaints, companies...). */
  records: z
    .array(
      z.object({
        kind: z.enum(["insurance", "debt", "complaint", "criminal", "property", "company", "other"]),
        summary: z.string(),
        proves,
      }),
    )
    .default([]),
});

export const castSchema = z.object({ characters: z.array(characterSchema) });

export const storyEventSchema = z.object({
  id,
  actors: z.array(id).min(1),
  roomId: id,
  /** Entrance used to reach the room; defaults to the building's first entrance. */
  enteredVia: id.optional(),
  leftVia: id.optional(),
  start: z.number().int(),
  end: z.number().int(),
  action: z.string(),
  visibility: z.enum(["public", "private"]),
  itemsUsed: z.array(id).default([]),
});

export const storySchema = z.object({
  events: z.array(storyEventSchema),
  comms: z.array(
    z.object({
      id,
      from: id,
      to: id,
      time: z.number().int(),
      type: z.enum(["call", "message"]),
      gist: z.string(),
      durationMinutes: z.number().int().optional(),
      proves,
    }),
  ),
  purchases: z.array(
    z.object({
      id,
      who: id,
      placeId: id,
      time: z.number().int(),
      item: z.string(),
      payment: z.enum(["card", "cash"]),
    }),
  ),
  /** Story items (weapon included, id "weapon"): where they start and where they end up. */
  items: z.array(
    z.object({
      id,
      name: z.string(),
      kind: z.enum(["weapon", "clothing", "document", "device", "other"]),
      description: z.string(),
      ownerId: id.optional(),
      startRoomId: id,
      finalRoomId: id,
      finalSlot: z.string(),
      proves,
      /** Files/notes found by opening a device (laptop, tablet...). */
      contents: z.array(z.object({ title: z.string(), text: z.string(), proves })).default([]),
    }),
  ),
});

/** A claim an NPC makes that some evidence disproves. Ids in `disprovingEvidenceIds` are evidence ids. */
const claimSchema = z.object({
  claim: z.string(),
  disprovingEvidenceIds: z.array(id).min(1),
});

export const lieSchema = claimSchema.extend({
  id,
  npcId: id,
  topic: z.enum(["whereabouts", "relationship", "motive", "item", "secret"]),
  /** Story events, messages/calls or purchases the lie hides. */
  truthIds: z.array(id).default([]),
  /** Why this person lies, from their personality and what they protect. */
  reason: z.string(),
  /** What they do once shown proof: tell the whole truth, admit only what the proof shows, or switch to a backup lie. */
  whenCaught: z.enum(["full-truth", "admit-shown", "backup-lie"]),
  backupLie: claimSchema.optional(),
});

export const liesSchema = z.object({ lies: z.array(lieSchema) });

export type CrimeCore = z.infer<typeof crimeCoreSchema>;
export type Lie = z.infer<typeof lieSchema>;
export type Lies = z.infer<typeof liesSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Cast = z.infer<typeof castSchema>;
export type StoryEvent = z.infer<typeof storyEventSchema>;
export type Story = z.infer<typeof storySchema>;

/**
 * Validates data against a schema.
 *
 * @returns Problems as "path: message" strings; empty when valid.
 */
export function schemaProblems(schema: z.ZodType, data: unknown) {
  const result = schema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

/** Case minutes to "Day 2 22:30". */
export function formatTime(minutes: number) {
  const day = Math.floor(minutes / 1440) + 1;
  const m = ((minutes % 1440) + 1440) % 1440;
  return `Day ${day} ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** "Day 2 22:30" style input to case minutes. */
export function at(day: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (day - 1) * 1440 + h * 60 + m;
}
