import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { EvidenceScreen } from "./evidence-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => [{ status: "available", savedTerms: [""], records: [] }, []][query.calls++],
}));

test("an empty search cannot browse every file, even when an old general browse was saved", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<EvidenceScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).not.toContain("Browse files");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*type="submit"><span[^>]*><\/span>Search records<\/button>/);
  expect(html).not.toContain("Open saved search");
});
