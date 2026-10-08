import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { BureauScreen } from "./bureau-screen";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => ({
    places: [{ id: "bureau", kind: "bureau", name: "Bureau" }],
    currentPlaceId: "bureau",
    activeTravel: null,
    nextCompletionGameTime: null,
    deadline: 1800,
    clock: { gameTime: 65, clockStartedAt: null, minuteMs: 1000 },
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/lobby/ABC123/bureau", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span aria-label={alt} role="img" /> }));

test("shows shared case time in the bureau shell", () => {
  const html = renderToStaticMarkup(<BureauScreen error="" onLeave={() => {}} />);
  expect(html).toContain("Case time · Day 1 · 01:05");
  expect(html).toContain("Due · Day 2 · 06:00");
});
