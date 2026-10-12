import { expect, test } from "vitest";
import { poisonName } from "./crimes/murder";

test("the toxicology report names the poison, not its packet or drink", () => {
  expect(poisonName("Small paper packet of potassium cyanide powder")).toBe("potassium cyanide");
  expect(poisonName("cyanide in orange juice")).toBe("cyanide");
  expect(poisonName("vial of strychnine")).toBe("strychnine");
  expect(poisonName("arsenic")).toBe("arsenic");
});
