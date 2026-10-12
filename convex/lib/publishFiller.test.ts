import { expect, test } from "vitest";
import { crowdFor, crowdRoster } from "./publishFiller";

test("camera passers-by never share a height or clothing word with anyone in the case", () => {
  const crowd = crowdFor([`5'7", slim, wearing a beige raincoat and a red scarf`, `6'1", heavyset, navy suit`]);
  expect(crowd.heights).not.toContain(`5'7"`);
  expect(crowd.heights).not.toContain(`6'1"`);
  expect(crowd.clothes.some((outfit) => /\b(raincoat|scarf|navy|suit)\b/.test(outfit))).toBe(false);
  expect(crowd.clothes.length).toBeGreaterThan(0);
});

test("each passer-by keeps one look, so an outfit always means the same stranger", () => {
  let n = 0;
  const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const roster = crowdRoster(random, crowdFor([`5'7", slim, navy suit`]));
  const outfits = roster.map((look) => look.split(", ").slice(2).join(", "));
  expect(new Set(outfits).size).toBe(roster.length);
  expect(roster.length).toBeGreaterThan(3);
});
