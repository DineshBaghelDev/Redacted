import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { PinButton } from "./pin-button";

test("pin control has distinct readable labels and visual states", () => {
  const unpinned = renderToStaticMarkup(<PinButton onClick={() => {}} pinned={false} />);
  const pinned = renderToStaticMarkup(<PinButton onClick={() => {}} pinned />);
  const busy = renderToStaticMarkup(<PinButton busy onClick={() => {}} pinned={false} />);

  expect(unpinned).toContain('aria-label="Pin to clueboard"');
  expect(unpinned).toContain('aria-pressed="false"');
  expect(unpinned).not.toContain("game-pin-check");
  expect(pinned).toContain('aria-label="Pinned to clueboard"');
  expect(pinned).toContain('aria-pressed="true"');
  expect(pinned).toContain("game-pin-check");
  expect(pinned).toContain('disabled=""');
  expect(busy).toContain('aria-label="Pinning to clueboard"');
  expect(busy).toContain('disabled=""');
});
