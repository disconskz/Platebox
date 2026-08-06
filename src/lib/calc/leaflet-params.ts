export const LEAFLET_TYPE_TWO_SIDED = "twoSided" as const;
export const LEAFLET_PRINT_METHOD_OFFSET = "offset" as const;
export const DEFAULT_LEAFLET_BLEED_MM = 2;

export type LeafletParamsInput = Record<string, unknown> & {
  layouts_count?: unknown;
  bleed_mm?: unknown;
};

/** Normalizes hidden system parameters before calculation persistence/copying. */
export function normalizeLeafletParams(input: LeafletParamsInput = {}) {
  const { hasDesign: _legacyDesign, leadDays: _legacyLeadDays, kind: _legacyKind, printMode: _legacyPrintMode, ...current } = input;
  const rawLayouts = Number(input.layouts_count ?? 1);
  const rawBleed = Number(input.bleed_mm ?? DEFAULT_LEAFLET_BLEED_MM);

  return {
    ...current,
    leaflet_type: LEAFLET_TYPE_TWO_SIDED,
    print_method: LEAFLET_PRINT_METHOD_OFFSET,
    layouts_count: Number.isInteger(rawLayouts) && rawLayouts >= 1 ? rawLayouts : 1,
    bleed_mm: Number.isFinite(rawBleed) && rawBleed >= 0 ? rawBleed : DEFAULT_LEAFLET_BLEED_MM,
  };
}
