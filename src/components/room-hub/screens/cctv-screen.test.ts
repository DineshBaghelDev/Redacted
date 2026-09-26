import { describe, expect, it } from "vitest";
import { recordsNearTime, type CctvRecord } from "./cctv-screen";

const records: CctvRecord[] = [
  { id: "a", cameraId: "one", start: 100, end: 110, description: "", movement: "" },
  { id: "b", cameraId: "one", start: 151, end: 160, description: "", movement: "" },
  { id: "c", cameraId: "two", start: 100, end: 110, description: "", movement: "" },
];

describe("recordsNearTime", () => {
  it("keeps the selected camera records that overlap the scan window", () => {
    expect(recordsNearTime(records, "one", 130).map((record) => record.id)).toEqual(["a"]);
  });
});
