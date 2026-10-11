import type { Doc } from "../_generated/dataModel";

/** Real milliseconds per game minute. Tuning only; never changes an action's game-minute cost. */
export const GAME_MINUTE_MS = 100;

export function currentGameTime(session: Pick<Doc<"sessions">, "gameTime" | "clockStartedAt">, now = Date.now()) {
  const baseline = session.gameTime ?? 0;
  return session.clockStartedAt === undefined
    ? baseline
    : baseline + Math.max(0, Math.floor((now - session.clockStartedAt) / GAME_MINUTE_MS));
}
