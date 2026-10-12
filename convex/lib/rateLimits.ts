import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";

const DAY = 24 * HOUR;

/** Caps on paid AI calls (interview replies, report grading) and on new rooms, per player and for the whole game. */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  // An interview reply takes a few seconds, so a real player never hits the per-minute cap.
  interviewQuestion: { kind: "token bucket", rate: 8, period: MINUTE, capacity: 8 },
  interviewQuestionDaily: { kind: "fixed window", rate: 400, period: DAY },
  reportGrading: { kind: "token bucket", rate: 6, period: HOUR, capacity: 3 },
  roomCreation: { kind: "fixed window", rate: 30, period: DAY },
  // Whole-game AI budget: every interview reply and report grading counts once.
  aiCallsDaily: { kind: "fixed window", rate: 5000, period: DAY },
});

type PlayerLimit = "interviewQuestion" | "reportGrading" | "roomCreation";

const tooFast: Record<PlayerLimit, string> = {
  interviewQuestion: "You're asking questions very quickly.",
  reportGrading: "Too many reports filed for now.",
  roomCreation: "You've opened a lot of cases today.",
};

function wait(ms: number) {
  const minutes = Math.ceil(ms / MINUTE);
  if (ms < MINUTE) return `${Math.max(1, Math.ceil(ms / 1000))} seconds`;
  return minutes < 90 ? `${minutes} minutes` : `${Math.ceil(ms / HOUR)} hours`;
}

/** Throws a player-readable error when this player, or the whole game's daily AI budget, is over its limit. */
export async function checkLimit(ctx: MutationCtx, limit: PlayerLimit, userId: string) {
  const player = await rateLimiter.limit(ctx, limit, { key: userId });
  if (!player.ok) throw new ConvexError(`${tooFast[limit]} Try again in ${wait(player.retryAfter)}.`);
  if (limit === "interviewQuestion") {
    const daily = await rateLimiter.limit(ctx, "interviewQuestionDaily", { key: userId });
    if (!daily.ok) throw new ConvexError(`You've asked a lot of questions today. Try again in ${wait(daily.retryAfter)}.`);
  }
  if (limit !== "roomCreation") {
    const budget = await rateLimiter.limit(ctx, "aiCallsDaily");
    if (!budget.ok) throw new ConvexError("Interviews and report grading are resting for today. Please come back tomorrow.");
  }
}
