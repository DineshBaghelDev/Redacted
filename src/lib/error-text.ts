import { ConvexError } from "convex/values";

/** The plain sentence from a failed server call, without Convex's request wrapper and stack location. */
export function errorText(caught: unknown, fallback: string) {
  // ConvexError text survives production, where Convex hides plain error messages.
  if (caught instanceof ConvexError && typeof caught.data === "string") return caught.data;
  if (!(caught instanceof Error)) return fallback;
  const match = caught.message.match(/Uncaught (?:Convex)?Error: ([\s\S]*?)(?:\s+at handler|\s+Called by|$)/);
  const text = (match ? match[1] : caught.message).trim();
  return text && !text.startsWith("[CONVEX") ? text : fallback;
}
