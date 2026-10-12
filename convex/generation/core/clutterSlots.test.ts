import { expect, test } from "vitest";
import { bestSlot, fitSlot } from "./evidence/clutter";

const unit = ["wardrobe", "kitchen drawer", "bin", "desk"];

test("everyday objects sit where they belong", () => {
  const first = (from: string[]) => from[0];
  expect(fitSlot("Archive boxes", ["shelves", "boxes", "bin"], first)).toBe("shelves");
  expect(fitSlot("Pizza box", unit, first)).toBe("bin");
  expect(fitSlot("Houseplant", unit, first)).toBe("desk");
  expect(fitSlot("Unknown thing", unit, first)).toBe("wardrobe");
});

test("a story object the room has no spot for goes somewhere sensible", () => {
  expect(bestSlot("desk", "", unit)).toBe("desk");
  expect(bestSlot("table", "Papers that were still on her desk when the body was found.", unit)).toBe("desk");
  expect(bestSlot("table", "A tray with a juice jug and one wiped-clean glass.", unit)).toBe("desk");
  expect(bestSlot("shelf", "A combined receipt.", ["shelves", "bin"])).toBe("shelves");
});
