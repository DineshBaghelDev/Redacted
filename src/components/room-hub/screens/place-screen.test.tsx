import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { PlaceScreen } from "./place-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
const place = {
  placeName: "Carver Towers",
  currentRoomId: "lobby",
  rooms: [{ id: "lobby", name: "Lobby", floor: 0, adjacent: true, searched: false, searchable: true, hasCamera: true }],
  items: [],
  action: null,
  clock: { gameTime: 600, clockStartedAt: null, minuteMs: 1000 },
};

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => [place, []][query.calls++],
}));

test("starts with current-room actions visible and the phone room list closed", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<PlaceScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toContain('aria-controls="place-room-list" aria-expanded="false"');
  expect(html).toContain('id="place-room-list"');
  expect(html).toContain("hidden lg:grid");
  expect(html).toContain("Review this room&#x27;s camera logs");
});
