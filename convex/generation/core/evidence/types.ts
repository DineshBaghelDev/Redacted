// Evidence is raw stored truth that players can reveal. It says nothing about what it proves;
// the facts stage interprets it. Fields marked hidden must never reach players.

export type Camera = {
  id: string;
  name: string;
  placeId?: string;
  roomId?: string;
  streetId?: string;
  faulty: boolean;
};

type Access =
  | { tool: "cctv"; cameraId: string }
  | { tool: "search"; roomId: string; slot: string }
  | { tool: "lab"; subjectId: string }
  | { tool: "records" }
  | { tool: "phone"; deviceId: string }
  | { tool: "device"; itemId: string }
  | { tool: "interrogation"; witnessId: string };

type Base = {
  id: string;
  title: string;
  /** Player-facing wording (rewritten by the text stage later). */
  summary: string;
  access: Access;
  time?: number;
  end?: number;
  /** Hidden: people this evidence is truly about. */
  aboutIds: string[];
  /** Hidden: story event / comm / purchase / item / timeline entry ids it came from. */
  sourceIds: string[];
};

export type Evidence =
  | (Base & {
      type: "cctv";
      access: { tool: "cctv"; cameraId: string };
      data: { placeId: string; kind: "stay" | "pass" | "offline" };
    })
  | (Base & { type: "call" | "message"; data: { ownerId: string; from: string; to: string; proves: string[] } })
  | (Base & { type: "card"; data: { who: string; placeId: string } })
  | (Base & {
      type: "forensic";
      data: {
        test: "autopsy" | "blood" | "fingerprints" | "fibers" | "footprints" | "toxicology" | "ballistics" | "ligature";
        subjectId: string;
        bloodOf?: string;
        printsOf?: string[];
        fibersFromItemId?: string;
      };
    })
  | (Base & { type: "item"; data: { itemId: string; ownerId?: string; proves: string[]; clutter?: boolean } })
  | (Base & { type: "file"; data: { itemId: string; proves: string[] } })
  | (Base & { type: "device"; data: { deviceId: string; ownerId: string } })
  | (Base & { type: "record"; data: { personId: string; kind: string; proves: string[] } })
  | (Base & { type: "witness"; data: { witnessId: string; eventId: string; placeId: string } });

export type EvidenceType = Evidence["type"];

export type EvidenceSet = { cameras: Camera[]; evidence: Evidence[] };
