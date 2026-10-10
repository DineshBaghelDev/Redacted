import { expect, test } from "vitest";
import { portraitTraits } from "./character-portrait";

test("case portrait traits are stable for a person and stay within the layer ranges", () => {
  const portrait = portraitTraits("person-17");
  expect(portraitTraits("person-17")).toEqual(portrait);
  expect(portrait.skin).toBeGreaterThanOrEqual(0);
  expect(portrait.skin).toBeLessThan(5);
  expect(portrait.hair).toBeLessThan(5);
  expect(portrait.coat).toBeLessThan(4);
  expect(portrait.hairstyle).toBeLessThan(6);
  expect(portrait.outfit).toBeLessThan(4);
  expect(portrait.face).toBeLessThan(3);
  expect(typeof portrait.glasses).toBe("boolean");
  expect(portraitTraits("person-18")).not.toEqual(portrait);
});
