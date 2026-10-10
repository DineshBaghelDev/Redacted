import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { EvidenceScreen } from "./evidence-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => [{ status: "available", savedTerms: [""], records: [] }, []][query.calls++],
}));

test("offers Browse files for an empty search even when general browse was saved", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<EvidenceScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toContain(">Browse files</button>");
  expect(html).not.toContain("Open saved search");
});
