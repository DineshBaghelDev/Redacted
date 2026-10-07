import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;
type DbCtx = QueryCtx | MutationCtx;

/**
 * Retrieves the authenticated user's identity.
 *
 * @returns The authenticated user's subject identifier.
 * @throws If no authenticated user is present.
 */
export async function requireUserId(ctx: AnyCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Sign in first.");
  }
  return identity.subject;
}

/** Returns a room and the signed-in member, or null when the room is unavailable to them. */
export async function getRoomMember(ctx: DbCtx, roomCode: string) {
  const authUserId = await requireUserId(ctx);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_roomCode", (q) => q.eq("roomCode", roomCode.trim().toUpperCase()))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const player = await ctx.db
    .query("sessionPlayers")
    .withIndex("by_sessionId_authUserId", (q) => q.eq("sessionId", session._id).eq("authUserId", authUserId))
    .unique();
  return player ? { session, player } : null;
}

/** Returns a signed-in room member only after the investigation has started. */
export async function getPlayingRoomMember(ctx: DbCtx, roomCode: string) {
  const member = await getRoomMember(ctx, roomCode);
  return member?.session.status === "playing" ? member : null;
}

/** Bureau terminals are available only to a detective physically at the bureau. */
export async function getBureauRoomMember(ctx: DbCtx, roomCode: string) {
  const member = await getPlayingRoomMember(ctx, roomCode);
  if (!member) return null;
  if (await ctx.db.query("travelActions").withIndex("by_playerId", (q) => q.eq("playerId", member.player._id)).unique()) return null;
  if (!member.player.currentPlaceId) return member; // Pre-clock rooms began at the bureau.
  const place = await ctx.db.get(member.player.currentPlaceId);
  return place?.kind === "bureau" ? member : null;
}

/**
 * Checks whether a user is on the dev-tools allowlist (`DEV_TOOL_USER_IDS`, comma separated).
 *
 * @param userId - The Clerk subject to check
 * @returns True when the user may use dev tools.
 */
export function isDevUser(userId: string) {
  const allowed = (process.env.DEV_TOOL_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(userId);
}

/**
 * Requires a signed-in user who is on the dev-tools allowlist.
 *
 * @returns The user's subject identifier.
 * @throws If the user is not signed in or not allowlisted.
 */
export async function requireDevUser(ctx: AnyCtx) {
  const userId = await requireUserId(ctx);
  if (!isDevUser(userId)) {
    throw new Error("Not allowed.");
  }
  return userId;
}
