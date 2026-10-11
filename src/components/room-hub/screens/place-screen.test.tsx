import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { PlaceScreen } from "./place-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
const place = {
  placeName: "Carver Towers",
  placeDescription: "A tired apartment block.",
  currentRoomId: "lobby",
  rooms: [
    { id: "lobby", name: "Lobby", floor: 0, walkMinutes: 0, searched: false, visited: true, searchable: true, hasCamera: true, isEntrance: true, spots: [{ key: "desk", name: "Front desk", searched: false }] },
    { id: "office", name: "Office", floor: 0, walkMinutes: 1, searched: false, visited: false, searchable: true, hasCamera: false, isEntrance: false, spots: [] },
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

test("arrives with the place description, then shows the room to search, its doors, and the building map", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<PlaceScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toContain("A tired apartment block.");
  expect(html).toContain("Step inside");
  expect(html).toContain("Front desk");
  expect(html).toContain("Hold to search · 4 min");
  expect(html).toContain("Check this room&#x27;s camera");
  expect(html).toContain('aria-label="Building map"');
  // The office has not been entered yet, so its door doesn't say what's behind it.
  expect(html).toContain("Unexplored");
  expect(html).not.toContain(">Office<");
  expect(html).toContain("1 min · ◆ partner");
});
