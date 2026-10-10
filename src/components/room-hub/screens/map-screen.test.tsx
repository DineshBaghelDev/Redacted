import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { MapScreen } from "./map-screen";

const query = vi.hoisted(() => ({ calls: 0 }));
const city = {
  places: [
    { id: "near-a", name: "Near A", kind: "home", area: "midtown", x: 40, y: 50, hasInterior: true, travelMinutes: 0 },
    { id: "near-b", name: "Near B", kind: "work", area: "midtown", x: 46, y: 58, hasInterior: true, travelMinutes: 5 },
    { id: "far-c", name: "Far C", kind: "public", area: "eastside", x: 80, y: 80, hasInterior: true, travelMinutes: 12 },
  ],
  streets: [{ id: "a-b", a: "near-a", b: "near-b", minutes: 5, hasCamera: false }],
  currentPlaceId: "near-a",
  activeTravel: null,
  busy: false,
  nextCompletionGameTime: null,
  deadline: 1800,
  clock: { gameTime: 600, clockStartedAt: null, minuteMs: 1000 },
};

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => [city, []][query.calls++],
}));

test("marks only nearby map labels as crowded", () => {
  query.calls = 0;
  const html = renderToStaticMarkup(<MapScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toMatch(/map-marker-label--crowded[^\"]*\">Near A<\/span>/);
  expect(html).toMatch(/map-marker-label--crowded[^\"]*\">Near B<\/span>/);
  expect(html).not.toMatch(/map-marker-label--crowded[^\"]*\">Far C<\/span>/);
});
