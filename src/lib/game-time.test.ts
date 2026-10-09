import { expect, test } from "vitest";
import { currentGameMinute, formatGameMinute } from "./game-time";

test("shared case time advances only while an action is active", () => {
  expect(currentGameMinute({ gameTime: 10, clockStartedAt: null, minuteMs: 1000 }, 50_000)).toBe(10);
  expect(currentGameMinute({ gameTime: 10, clockStartedAt: 20_000, minuteMs: 1000 }, 22_500)).toBe(12);
  expect(formatGameMinute(1445)).toBe("Day 2 · 00:05");
});
