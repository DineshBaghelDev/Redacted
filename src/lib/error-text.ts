/** The plain sentence from a failed server call, without Convex's request wrapper and stack location. */
export function errorText(caught: unknown, fallback: string) {
  if (!(caught instanceof Error)) return fallback;
  const match = caught.message.match(/Uncaught (?:Convex)?Error: ([\s\S]*?)(?:\s+at handler|\s+Called by|$)/);
  const text = (match ? match[1] : caught.message).trim();
  return text && !text.startsWith("[CONVEX") ? text : fallback;
}
