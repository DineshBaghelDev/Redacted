import { expect, test } from "vitest";
import { asksForPhone, asksForStatement } from "./npcConversations";

test("typed requests for a phone count as asking for the handover", () => {
  for (const text of ["Hand me your phone.", "Can I see your phone?", "I need your mobile", "Give me your cell, please"]) expect(asksForPhone(text)).toBe(true);
  for (const text of ["Who did you phone that night?", "Where were you at nine?", "Did you see his phone when you were in the office?"]) expect(asksForPhone(text)).toBe(false);
});

test("typed questions about what they saw count as asking for a statement", () => {
  for (const text of ["What did you see?", "Where were you that night?", "Tell me what happened.", "Did you hear anything?", "What were you doing on the evening of Day 2?", "Can you account for your movements?"]) expect(asksForStatement(text)).toBe(true);
  for (const text of ["Why did you lie to me?", "Hand me your phone."]) expect(asksForStatement(text)).toBe(false);
});
