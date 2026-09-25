import type { CrimeBase } from "../schemas";
import type { CrimeKind } from "./kind";
import { murder, murderSchema, type MurderCore } from "./murder";

export type { CaseParts, CrimeKind, CrimeWords } from "./kind";
export { capitalize, crimeEvent, inSceneAt, makeCheck } from "./kind";

// To add a crime kind (theft, robbery...): write core/crimes/<kind>.ts implementing CrimeKind, add it
// to KINDS and ENABLED, make CrimeCore/crimeCoreSchema a union on `type`, and give the crime stage the
// job's kind schema. Everything else reads the kind through crimeKind().

// Each kind is typed on its own crime core; shared code sees them all as CrimeKind<CrimeBase>.
const KINDS: Record<string, object> = { murder };

/** Kinds new cases can be. V1 is murder only (see docs/design decisions.md). */
export const ENABLED_TYPES = ["murder"] as const;

/** The crime core, whatever its kind. Only murder so far. */
export const crimeCoreSchema = murderSchema;
export type CrimeCore = MurderCore;

/**
 * The kind a crime core belongs to (cores saved before kinds existed are murders).
 *
 * @throws If the kind isn't registered.
 */
export function crimeKind(crime: Pick<CrimeBase, "type"> | string | undefined): CrimeKind {
  const type = typeof crime === "string" ? crime : (crime?.type ?? "murder");
  const kind = KINDS[type];
  if (!kind) throw new Error(`Unknown crime kind: ${type}`);
  return kind as CrimeKind;
}

/** The kind a new case with this seed will be. */
export function crimeTypeFor(seed: number) {
  return ENABLED_TYPES[Math.abs(seed) % ENABLED_TYPES.length];
}
