export type ProductType =
  | "leaflet"
  | "leaflet_diecut"
  | "booklet"
  | "sticker"
  | "sticker_diecut"
  | "bag"
  | "businesscard"
  | "envelope"
  | "box"
  | "blank"
  | "selfcopy"
  | "folder"
  | "poster"
  | "notepad"
  | "book"
  | "magazine"
  | "brochure"
  | "label"
  | "calendar_wall"
  | "calendar_desk"
  | "calendar_quarter"
  | "calendar_pocket"
  | "catalog"
  | "book_hardcover"
  | "planner"
  | "wobbler"
  | "shelftalker"
  | "kubus";

export type Turnaround = "none" | "own" | "foreign";

export type FormatType = "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "A3+" | "A4+" | "custom";

export interface PrintFormat {
  width: number;
  height: number;
}

export interface FormatPair {
  print: PrintFormat;
  purchase: PrintFormat;
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
  // Допустимые печатные форматы из справочника (если не задан — fallback на DEFAULTS)
  printFormats?: PrintFormat[];
  /** Жёсткие связки закупочный↔печатный из справочника. Если задано — используется вместо printFormats. */
  formatPairs?: FormatPair[];
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
  /** Несколько клише тиснения. Если задано — используется вместо одиночных W/H. */
  stampingCliches?: Array<{ w: number; h: number; points?: number }>;
  /** Конгрев: включён? */
  hasEmbossing?: boolean;
  /** Несколько клише конгрева. Каждое со своим количеством точек. */
  embossingCliches?: Array<{ w: number; h: number; points?: number }>;
  /** Конгрев по тетрадям (увеличенная цена за оттиск). */
  embossingNotebook?: boolean;
  hasLamPrepress?: boolean; // припрессовка для пакетов
  lamPrepressSides?: 1 | 2;
  /** Цена плёнки за м² (из справочника film_prices, выбранной плёнки). */
  lamPrepressPerM2?: number;
  /** Стоимость приладки припресса плёнкой (из справочника). */
  lamPrepressSetup?: number;
  /** Минимальная стоимость припресса плёнкой (из справочника). */
  lamPrepressMinCost?: number;
  /** Название/тип выбранной плёнки — для подписи в спецификации. */
  lamPrepressFilmLabel?: string;
  // print pricing
  printCostPerImpression?: number; // tg per impression
  inkCostPerSet?: number;
  // packaging
  packagingPerUnit?: number;
  // taxes
  vatPercent?: number; // НДС, % (из system_settings.vat_percent)
  /** Требовать чётное количество изделий на печатном листе (для печати «свой оборот»). */
  requireEvenItems?: boolean;
  /** Приоритетные печатные форматы (при равенстве отходов выигрывают эти). */
  priorityPrintFormats?: PrintFormat[];
  /**
   * Число резов на одно готовое изделие (финишная резка).
   * Если не задано — берётся `rule.finishCutsPerItem` (DEFAULTS = 4 для обратной
   * совместимости). Для маршрутов, где режут стопу, имеет смысл понижать.
   */
  finishCutsPerItem?: number;
  /**
   * Ручное переопределение количества резов на ОДИН печатный лист.
   * Если задано — используется как есть, ни справочник, ни авто-формула не применяются.
   */
  cutsPerSheetOverride?: number;
  /**
   * Ручное переопределение количества резов на ОДИН закупочный лист
   * (резка закупочного формата на печатный). Если не задано — авто-расчёт
   * по раскладке (cols + rows − 2).
   */
  paperCutsPerSheetOverride?: number;
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
  vatPercent: number;
  vatAmount: number; // НДС от себестоимости (информативно)
  totalWithVat: number; // себестоимость + НДС
  warnings: string[];
  cutInfo?: {
    source: "manual" | "table" | "auto";
    printName: string | null;
    itemName: string | null;
    cols: number;
    rows: number;
    itemsPerSheet: number;
    cutsPerSheet: number;
    pricePerCut: number;
    printSheets: number;
    total: number;
    bleed: number;
    productW: number;
    productH: number;
    productWithBleedW: number;
    productWithBleedH: number;
    printW: number;
    printH: number;
  };
  alternatives?: Array<{
    printW: number;
    printH: number;
    purchaseW: number;
    purchaseH: number;
    itemsPerSheet: number;
    itemsPerPurchase: number;
    layout: LayoutResult;
    paperCost: number;
    printCost: number;
    wasteCost: number;
    totalCost: number;
  }>;
}

export const DEFAULTS = {
  marginTop: 3,
  marginBottom: 3,
  marginLeft: 12,
  marginRight: 4,
  bleed: 2,
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
  /** Базовое число финишных резов на одно готовое изделие. */
  finishCutsPerItem: 4,
  numberingCost: 2,
  stampingSetup: 5000,
  stampingClicheMin: 5000,
  stampingClichePerCm2: 200,
  stampingImpr: 20,
  stampingImprNotebook: 50,
  designCost: 500,
  /** Универсальная приладка для постпечатных операций (если своя не задана). */
  operationSetupCost: 1500,
};