import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { PinButton } from "./pin-button";

vi.mock("convex/react", () => ({ useMutation: () => async () => null }));

const node: NonNullable<ComponentProps<typeof PinButton>["nodes"]>[number] = {
  _id: "board-node" as NonNullable<ComponentProps<typeof PinButton>["nodes"]>[number]["_id"],
  type: "item", referenceId: "item-1", text: "Evidence", x: 0, y: 0,
};
const props = { roomCode: "ROOM", type: "item" as const, referenceId: "item-1" };

test("pin icon exposes both toggle states and stays usable when pinned", () => {
  const unpinned = renderToStaticMarkup(<PinButton {...props} nodes={[]} />);
  const pinned = renderToStaticMarkup(<PinButton {...props} nodes={[node]} />);
  const disabled = renderToStaticMarkup(<PinButton {...props} disabled nodes={[]} />);

  expect(unpinned).toContain('aria-label="Pin to clueboard"');
  expect(unpinned).toContain('aria-pressed="false"');
  expect(pinned).toContain('aria-label="Pinned to clueboard. Remove pin"');
  expect(pinned).toContain('aria-pressed="true"');
  expect(pinned).not.toContain('disabled=""');
  expect(disabled).toContain('disabled=""');
});
