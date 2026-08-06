import { describe, expect, it } from "vitest";
import { normalizeLeafletParams } from "./leaflet-params";

describe("normalizeLeafletParams", () => {
  it("provides stable hidden defaults", () => {
    expect(normalizeLeafletParams()).toMatchObject({
      leaflet_type: "twoSided", print_method: "offset", layouts_count: 1, bleed_mm: 2,
    });
  });

  it("keeps valid actual geometry and layout count", () => {
    expect(normalizeLeafletParams({ layouts_count: 3, bleed_mm: 4 })).toMatchObject({ layouts_count: 3, bleed_mm: 4 });
  });

  it("drops legacy active flags and repairs invalid values", () => {
    const result = normalizeLeafletParams({ layouts_count: 1.5, bleed_mm: -2, hasDesign: true, leadDays: 1, kind: "premium", printMode: "uv" });
    expect(result).toMatchObject({ layouts_count: 1, bleed_mm: 2, leaflet_type: "twoSided", print_method: "offset" });
    expect(result).not.toHaveProperty("hasDesign");
    expect(result).not.toHaveProperty("leadDays");
    expect(result).not.toHaveProperty("kind");
    expect(result).not.toHaveProperty("printMode");
  });
});
