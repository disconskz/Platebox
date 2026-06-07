// Mapping of stable opKeys used by calculator templates to operation_catalog codes.
// Each entry may override the stage label shown in the spec table.

export interface TemplateOpDef {
  /** operation_catalog.code */
  code: number;
  /** Stage label displayed in the calculator spec (Russian). */
  stage: string;
}

export const TEMPLATE_OP_MAP: Record<string, TemplateOpDef> = {
  // Lamination (cover)
  coverLam1:    { code: 45,  stage: "Постпечать" }, // односторонняя 27мкн
  coverLam2:    { code: 105, stage: "Постпечать" }, // двухсторонняя 27мкн
  coverLamMulti:{ code: 2,   stage: "Постпечать" }, // многостраничная 27мкн

  // Crease / fold
  creaseManual: { code: 10,  stage: "Постпечать" },
  creaseMachine:{ code: 107, stage: "Постпечать" },
  fold:         { code: 33,  stage: "Сборка блока" },

  // Foil stamping / embossing
  stamp:        { code: 16,  stage: "Постпечать" }, // тиснение фольгой
  emboss:       { code: 57,  stage: "Постпечать" }, // конгрев

  // Perforation / numbering
  perfMachine:  { code: 18,  stage: "Постпечать" },
  perfManual:   { code: 109, stage: "Постпечать" },
  numbering:    { code: 17,  stage: "Постпечать" },

  // Die-cut
  dieCut:       { code: 48,  stage: "Постпечать" },
  dieCutBush:   { code: 56,  stage: "Постпечать" },

  // Gathering / collation
  gather:       { code: 108, stage: "Сборка блока" }, // машинная
  gatherManual: { code: 49,  stage: "Сборка блока" },

  // Binding
  staple:       { code: 99,  stage: "Скрепление" }, // буклетмейкер
  stapleRapid:  { code: 100, stage: "Скрепление" },
  stapleHand:   { code: 98,  stage: "Скрепление" },
  thermo:       { code: 101, stage: "Скрепление" }, // термобиндер
  spiral:       { code: 6,   stage: "Скрепление" }, // навивка пружины
  pvaGlue:      { code: 95,  stage: "Скрепление" }, // склейка на клей
  sewn:         { code: 119, stage: "Скрепление" }, // сшивка блока на нитки

  // Finishing
  trimBlock:    { code: 110, stage: "Финиш" }, // блокноты/книги/журналы
  trimSheets:   { code: 102, stage: "Финиш" }, // листовки/этикетки

  // Packaging
  pack:         { code: 19,  stage: "Упаковка" },
  packStickers: { code: 59,  stage: "Упаковка" },
  packBag:      { code: 42,  stage: "Упаковка" },
};

export type TemplateOpKey = keyof typeof TEMPLATE_OP_MAP;