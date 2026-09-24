import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

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
