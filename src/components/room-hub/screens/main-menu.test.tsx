import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MainMenuScreen } from "./main-menu";

test("distinguishes submitted reports from ongoing rooms", () => {
  const html = renderToStaticMarkup(
    <MainMenuScreen
      activeRooms={[
        { roomCode: "CLOSED", status: "playing", caseTitle: "First case", playerCount: 1, reportSubmitted: true },
        { roomCode: "OPEN", status: "playing", caseTitle: "Second case", playerCount: 1, reportSubmitted: false },
      ]}
      error=""
      isLoaded
      isSignedIn
      onContinue={() => {}}
      onJoin={() => {}}
      onPrevious={() => {}}
      onSettings={() => {}}
    />,
  );
  expect(html).toContain("Open case report");
  expect(html).toContain("Continue investigation");
});
