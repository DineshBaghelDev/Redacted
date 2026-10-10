import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { PlaceScreen } from "./place-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
const place = {
  placeName: "Carver Towers",
  placeDescription: "A tired apartment block.",
  currentRoomId: "lobby",
  rooms: [
    { id: "lobby", name: "Lobby", floor: 0, walkMinutes: 0, searched: false, searchable: true, hasCamera: true, isEntrance: true, spots: [{ key: "desk", name: "Front desk", searched: false }] },
    { id: "office", name: "Office", floor: 0, walkMinutes: 1, searched: false, searchable: true, hasCamera: false, isEntrance: false, spots: [] },
  ],
  connections: [{ a: "lobby", b: "office" }],
  partners: [{ name: "Sam", roomId: "office" }],
  items: [],
  action: null,
  clock: { gameTime: 600, clockStartedAt: null, minuteMs: 100 },
};

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => [place, []][query.calls++ % 2],
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/lobby/ABC123/place", useSearchParams: () => new URLSearchParams() }));

test("arrives with the place description, then shows spots to search and a clickable floor plan", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<PlaceScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toContain("A tired apartment block.");
  expect(html).toContain("Step inside");
  expect(html).toContain("Where to look");
  expect(html).toContain("Front desk");
  expect(html).toContain("Search here");
  expect(html).toContain("Check this room&#x27;s camera");
  expect(html).toContain('aria-label="Floor plan"');
  expect(html).toContain("◆ Sam");
  expect(html).toContain("1 min");
});
