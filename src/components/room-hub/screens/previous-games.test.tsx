import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { PreviousGamesScreen } from "./previous-games";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
vi.mock("convex/react", () => ({ useQuery: () => [] }));

test("shows replay creation errors beside the case choices", () => {
  const html = renderToStaticMarkup(
    <PreviousGamesScreen error="Could not open this case." isWorking={false} onBack={() => {}} onPlay={() => {}} />,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Could not open this case.");
  expect(html).toContain("Back to menu");
  expect(html).toContain("Optional deadline (hours)");
  expect(html).toContain("Use case default");
});
