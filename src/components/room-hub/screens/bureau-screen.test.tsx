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
    clock: { gameTime: 65, clockStartedAt: null, minuteMs: 1000 },
  },
}));

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => city,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/lobby/ABC123/bureau", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" /> }));

test("shows shared case time in the bureau shell", () => {
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain("Case time · Day 1 · 01:05");
  expect(html).toContain("Due · Day 2 · 06:00");
});

test("shows overdue after the shared game clock passes the deadline", () => {
  city.clock.gameTime = 1801;
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain(">Overdue</span>");
  expect(html).not.toContain("Due · Day 2 · 06:00");
  city.clock.gameTime = 65;
});
