import { expect, test } from "vitest";
import { asksForPhone } from "./npcConversations";

test("typed requests for a phone count as asking for the handover", () => {
  for (const text of ["Hand me your phone.", "Can I see your phone?", "I need your mobile", "Give me your cell, please"]) expect(asksForPhone(text)).toBe(true);
  for (const text of ["Who did you phone that night?", "Where were you at nine?"]) expect(asksForPhone(text)).toBe(false);
});
