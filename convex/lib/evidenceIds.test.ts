import { expect, test } from "vitest";
import { sameEvidence } from "./evidenceIds";

test("either phone's copy of a call or message is the same evidence", () => {
  expect(sameEvidence("message/msg-late-meeting/marcus", "message/msg-late-meeting/priya")).toBe(true);
  expect(sameEvidence("call/debt-call/caleb", "call/debt-call/martin")).toBe(true);
  expect(sameEvidence("message/one/marcus", "message/two/marcus")).toBe(false);
  expect(sameEvidence("cctv/38", "cctv/38")).toBe(true);
  expect(sameEvidence("record/elena/2", "record/elena/3")).toBe(false);
});
