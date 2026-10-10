import { vi } from "vitest";

// Screens read queries through convex-helpers' cache; in tests route them to whatever the test mocked for convex/react.
vi.mock("convex-helpers/react/cache", async () => {
  const react = await import("convex/react");
  const useQuery = react.useQuery as (...args: unknown[]) => unknown;
  return { useQuery: (...args: unknown[]) => useQuery(...args) };
});
