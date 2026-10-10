import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { CctvScreen } from "./cctv-screen";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => ({ caseTitle: "Empty district", start: 0, end: 60, cameras: [] }),
}));

test("shows a way back when no cameras are accessible here", () => {
  const html = renderToStaticMarkup(<CctvScreen roomCode="ABC123" onBack={() => {}} backLabel="Back to room" />);
  expect(html).toContain("There are no cameras to review here.");
  expect(html).toContain("Back to room");
  expect(html).toContain("game-panel");
  expect(html).toContain("game-icon--cctv");
});
