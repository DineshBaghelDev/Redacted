import { expect, test } from "vitest";
import { crowdFor } from "./publishFiller";

test("camera passers-by never share a height or clothing word with anyone in the case", () => {
  const crowd = crowdFor([`5'7", slim, wearing a beige raincoat and a red scarf`, `6'1", heavyset, navy suit`]);
  expect(crowd.heights).not.toContain(`5'7"`);
  expect(crowd.heights).not.toContain(`6'1"`);
  expect(crowd.clothes.some((outfit) => /\b(raincoat|scarf|navy|suit)\b/.test(outfit))).toBe(false);
  expect(crowd.clothes.length).toBeGreaterThan(0);
});
