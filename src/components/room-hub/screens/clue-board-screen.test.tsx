import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { ClueBoardScreen } from "./clue-board-screen";

const queryCount = vi.hoisted(() => ({ value: 0 }));

vi.mock("convex/react", () => ({
  useMutation: () => async () => null,
  useQuery: () => queryCount.value++ === 0 ? [
    { _id: "card-one", type: "note", text: "First clue", x: 80, y: 90 },
    { _id: "card-two", type: "note", text: "Second clue", x: 300, y: 90 },
  ] : [],
}));
vi.mock("@xyflow/react", () => ({
  Background: () => null,
  ConnectionMode: { Loose: "loose" },
  Controls: () => null,
  Handle: () => null,
  Position: { Top: "top" },
  ReactFlow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useNodesState: () => [[], () => {}, () => {}],
}));

test("offers a non-drag way to tie two board cards", () => {
  queryCount.value = 0;
  const html = renderToStaticMarkup(<ClueBoardScreen roomCode="ABC123" onBack={() => {}} />);
  expect(html).toContain("Tie string without dragging");
  expect(html).toContain("From card");
  expect(html).toContain("To card");
  expect(html).toContain("#1 First clue");
  expect(html).toContain("#2 Second clue");
});
