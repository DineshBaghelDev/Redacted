import { getFunctionName } from "convex/server";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { BureauScreen } from "./bureau-screen";

const { city } = vi.hoisted(() => ({
  city: {
    places: [{ id: "bureau", kind: "bureau", name: "Bureau" }],
    currentPlaceId: "bureau",
    activeTravel: null,
    nextCompletionGameTime: null,
    deadline: 1800,
    clock: { gameTime: 65, clockStartedAt: null, minuteMs: 100 },
  },
}));

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: (reference: Parameters<typeof getFunctionName>[0]) => {
    const name = getFunctionName(reference);
    if (name === "world:getMap") return city;
    if (name === "coop:get") return { partners: [{ name: "Sam", place: "Keel Street", activity: "Searching", placeId: null }], pings: [] };
    if (name === "notebook:get") return [];
    return null;
  },
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/lobby/ABC123/bureau", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" /> }));

test("shows the case clock, time left, and the partner in the heads-up bar", () => {
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain("Day 1 · 01:05");
  expect(html).toContain("28h 55m");
  expect(html).toContain("Sam · Keel Street · Searching");
  expect(html).toContain("Notebook");
});

test("shows overdue without stopping play once the deadline passes", () => {
  city.clock.gameTime = 1801;
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain("Overdue");
  expect(html).not.toContain("File the report");
  city.clock.gameTime = 65;
});

test("shows the bureau as a scene with places to walk to, not a tab bar", () => {
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain('aria-label="Interview room"');
  expect(html).toContain("game-icon--interview");
  expect(html).toContain('aria-label="Records"');
  expect(html).not.toContain("Bureau stations");
  expect(html).not.toContain("Leave game");
});

test("hides bureau stations while away from the bureau", () => {
  city.currentPlaceId = "elsewhere";
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain("You are not at the bureau");
  expect(html).not.toContain('aria-label="Interview room"');
  city.currentPlaceId = "bureau";
});
