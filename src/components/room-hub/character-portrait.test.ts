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

test("written clothing and build guide stable portrait layers", () => {
  const description = "5'7, slim, wearing navy scrubs and a fleece jacket.";
  const traits = portraitTraits("person-17", { gender: "female", description });
  expect(traits).toEqual(portraitTraits("person-17", { gender: "female", description }));
  expect(traits.outfit).toBe(2);
  expect(traits.face).toBe(1);
  expect(portraitTraits("person-17", { gender: "male", description }).hairstyle).not.toBe(traits.hairstyle);
});
