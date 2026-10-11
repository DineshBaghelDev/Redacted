import { describe, expect, it } from "vitest";
import { objectArtwork } from "./object-icon";

describe("object artwork", () => {
  it("uses distinct icons for common found objects without using hidden case facts", () => {
    expect(objectArtwork("Victim's phone")).toMatchObject({ sheet: "primary", index: 0 });
    expect(objectArtwork("Birthday card")).toMatchObject({ sheet: "secondary", index: 7 });
    expect(objectArtwork("Brass keyring")).toMatchObject({ sheet: "primary", index: 6 });
    expect(objectArtwork("Kitchen knife")).toMatchObject({ sheet: "primary", index: 12 });
    expect(objectArtwork("Unfamiliar object")).toMatchObject({ sheet: "secondary", index: 8 });
  });
});
