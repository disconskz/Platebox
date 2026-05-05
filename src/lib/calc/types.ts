export type ProductType =
  | "leaflet"
  | "leaflet_diecut"
  | "booklet"
  | "sticker"
  | "sticker_diecut"
  | "bag";

export type Turnaround = "none" | "own" | "foreign";

export type FormatType = "A3" | "A4" | "A5" | "A6" | "A3+" | "A4+" | "custom";

export interface PrintFormat {
  width: number;
  height: number;
}

export interface LayoutResult {
  itemsPerSheet: number;
  rotated: boolean;
  cols: number;
  rows: number;
  printFormat: PrintFormat;
  wasteArea: number;
  effectiveItemW: number;
  effectiveItemH: number;
  margins: { left: number; right: number; top: number; bottom: number };
  edgeMargin: number;
  gap: number;
}

export interface CalcInput {
  productType: ProductType;
  circulation: number;
  formatType: FormatType;
  formatWidth: number; // mm
  formatHeight: number; // mm
  colorFront: number;
  colorBack: number;
  material: { id: string; name: string; format_width: number; format_height: number; cost_per_sheet: number };
  designQty: number; // default 2
  photoOutputUnitCost: number; // 0 if disabled
  // sticker manual overrides
  manualForms?: number;
  manualSetupSheets?: number;
  // postpress flags
  hasFold?: boolean;
  foldCount?: number;
  hasDieCut?: boolean;
  hasLamination?: boolean;
  laminationFilm?: "gloss" | "matte" | "velvet" | "gold" | "silver" | "color";
  laminationSides?: 1 | 2;
  laminationPriceMap?: Record<string, number>; // e.g. "gloss:up_to_a4_plus" -> 17
  hasNumbering?: boolean;
  numbersPerSheet?: number;
  hasStamping?: boolean;
  stampingClicheW?: number; // cm
  stampingClicheH?: number; // cm
  stampingNotebook?: boolean;
  hasLamPrepress?: boolean; // припрессовка для пакетов
  lamPrepressSides?: 1 | 2;
  // print pricing
  printCostPerImpression?: number; // tg per impression
  inkCostPerSet?: number;
  // packaging
  packagingPerUnit?: number;
}

export interface SpecItem {
  stage: "prepress" | "material" | "print" | "postpress" | "logistics";
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface CalcResult {
  layout: LayoutResult;
  turnaround: Turnaround;
  forms: number;
  setupSheets: number;
  printSheets: number; // включая приладку
  netPrintSheets: number;
  purchaseSheets: number;
  purchaseNesting: number;
  paperCost: number;
  paperCutCost: number;
  formsCost: number;
  formsPrepCost: number;
  printCost: number;
  inkCost: number;
  postpress: SpecItem[];
  prepress: SpecItem[];
  materials: SpecItem[];
  printItems: SpecItem[];
  logistics: SpecItem[];
  spec: SpecItem[];
  totalCost: number;
  warnings: string[];
}

export const DEFAULTS = {
  marginLR: 2,
  marginTop: 5,
  marginBottom: 10,
  bleed: 3,
  maxPrintW: 520,
  maxPrintH: 360,
  altPrintW: 460,
  altPrintH: 320,
  stickerGap: 4,
  stickerEdge: 8,
  setupOwn: 150,
  setupForeign: 300,
  setupPercent: 0.01,
  bagMinSetup: 200,
  formCost: 1000,
  formPrepCost: 500,
  cutCostPerSheet: 1,
  finishCutCost: 1,
  numberingCost: 2,
  stampingSetup: 5000,
  stampingClicheMin: 5000,
  stampingClichePerCm2: 200,
  stampingImpr: 20,
  stampingImprNotebook: 50,
  designCost: 500,
};