import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { PreviousGamesScreen } from "./previous-games";

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: true }) }));
const state = vi.hoisted(() => ({ deadline: "" }));
vi.mock("react", async (importOriginal) => ({ ...await importOriginal<typeof import("react")>(), useState: () => [state.deadline, () => {}] }));
vi.mock("convex/react", () => ({ useQuery: () => [{ generationJobId: "job", caseId: "case", title: "Case", difficulty: "easy", description: "A case" }] }));
afterEach(() => { state.deadline = ""; });

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


test.each(["0", "0.99", "-1", "NaN", "Infinity", "1e308"])("disables replay for invalid deadline %s", (deadline) => {
  state.deadline = deadline;
  const html = renderToStaticMarkup(<PreviousGamesScreen error="" isWorking={false} onBack={() => {}} onPlay={() => {}} />);
  expect(html).toMatch(/disabled=""[^>]*>Play case/);
});

test.each([["", undefined], ["1", 60], ["1.234", 74]])("passes whole minutes for deadline %s", (deadline, minutes) => {
  state.deadline = deadline;
  const onPlay = vi.fn();
  const screen = PreviousGamesScreen({ error: "", isWorking: false, onBack: () => {}, onPlay });
  const section = screen.props.children[3];
  const article = section.props.children[2][0];
  const button = article.props.children[3];
  expect(button.props.disabled).toBe(false);
  button.props.onClick();
  expect(onPlay).toHaveBeenCalledWith(expect.objectContaining({ caseId: "case" }), minutes);
});
