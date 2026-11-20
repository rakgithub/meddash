import { describe, expect, it } from "vitest";
import { BODY_REGIONS, regionFromMessage, regionMessage } from "./bodyRegions";

describe("bodyRegions", () => {
  it("has eight regions, each with symptoms to pick from", () => {
    expect(BODY_REGIONS).toHaveLength(8);
    for (const region of BODY_REGIONS) expect(region.symptoms.length).toBeGreaterThan(1);
  });

  it("turns a region into the message it sends and back", () => {
    for (const region of BODY_REGIONS) {
      expect(regionFromMessage(regionMessage(region))).toBe(region);
    }
    expect(regionMessage(BODY_REGIONS[2])).toBe("My nose and throat");
  });

  it("ignores case and surrounding spaces", () => {
    expect(regionFromMessage("  MY chest ")?.id).toBe("chest");
  });

  it("does not read typed text as a region", () => {
    expect(regionFromMessage("My chest hurts")).toBeUndefined();
    expect(regionFromMessage("Sore throat")).toBeUndefined();
  });
});
