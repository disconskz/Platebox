import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { PageShell, PageHeader, PageHeaderRow, PageMain, PageContainer } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { fmtMoney, fmtNum } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";
import { toTemplatePriceResult } from "@/lib/calc/template-result";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvancedOnly, TechOnly } from "@/components/calc/multipage/ModeVisibility";
import CostByStageBlock from "@/components/calc/multipage/CostByStageBlock";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";
import PrepressSection, { DEFAULT_PREPRESS, type PrepressState } from "@/components/calc/multipage/sections/PrepressSection";
import PrintSection, { DEFAULT_PRINT, type PrintState } from "@/components/calc/multipage/sections/PrintSection";
import PostpressSection, { DEFAULT_POSTPRESS, type PostpressState } from "@/components/calc/multipage/sections/PostpressSection";
import QualityControlSection, { DEFAULT_QC, type QcState } from "@/components/calc/multipage/sections/QualityControlSection";
import PackagingSection, { DEFAULT_PACKAGING, type PackagingState } from "@/components/calc/multipage/sections/PackagingSection";
import CoverSection, { DEFAULT_COVER, type CoverState } from "@/components/calc/multipage/sections/CoverSection";
import UnderlaySection, { DEFAULT_UNDERLAY, type UnderlayState } from "@/components/calc/multipage/sections/UnderlaySection";
import AssemblySection, { DEFAULT_ASSEMBLY, type AssemblyState } from "@/components/calc/multipage/sections/AssemblySection";
import SpecialOpsSection, { DEFAULT_SPECIAL_OPS, type SpecialOpsState } from "@/components/calc/multipage/sections/SpecialOpsSection";
import RouteTimeline from "@/components/calc/multipage/RouteTimeline";
import TechWarnings from "@/components/calc/multipage/TechWarnings";
import CompositionTable from "@/components/calc/multipage/CompositionTable";
import TechReport from "@/components/calc/multipage/TechReport";
import InternalBlocksEditor from "@/components/calc/multipage/InternalBlocksEditor";
import { makeDefaultBlock, type InternalBlock } from "@/lib/calc/multipage/blocks";
import { buildCoverLines } from "@/lib/calc/cover/cost";
import { CatalogOperationsPicker } from "@/components/calc/CatalogOperationsPicker";
import { useHandbook } from "@/lib/operations/HandbookProvider";
import { buildTryHandbook } from "@/lib/operations/applyHandbook";
import type { SpecItem } from "@/lib/calc/types";

/**
 * Шаблон «Блокнот» — детальная форма с раскрывающимися блоками
 * (Внутренний блок, Обложка, Подложка, Скрепление, Пружина, Постпечать).
 * Каждый блок включается/выключается отдельно; расчёт учитывает только
 * включённые компоненты.
 */

type FormatOpt = { value: string; label: string; w: number; h: number };
const FORMATS: FormatOpt[] = [
  { value: "A7", label: "A7 (74×105)", w: 74, h: 105 },
  { value: "A6", label: "A6 (105×148)", w: 105, h: 148 },
  { value: "A5", label: "A5 (148×210)", w: 148, h: 210 },
  { value: "A4", label: "A4 (210×297)", w: 210, h: 297 },
  { value: "150x210", label: "150×210", w: 150, h: 210 },
  { value: "custom", label: "Свой размер", w: 148, h: 210 },
];

type Paper = { value: string; label: string; pricePerSheet: number; sheetW: number; sheetH: number; density: number; thicknessMm: number };
const BLOCK_PAPERS_FALLBACK: Paper[] = [
  { value: "offset70", label: "Офсет 70 г/м²", pricePerSheet: 14, sheetW: 620, sheetH: 940, density: 70, thicknessMm: 0.09 },
  { value: "offset80", label: "Офсет 80 г/м²", pricePerSheet: 18, sheetW: 620, sheetH: 940, density: 80, thicknessMm: 0.10 },
  { value: "offset90", label: "Офсет 90 г/м²", pricePerSheet: 22, sheetW: 620, sheetH: 940, density: 90, thicknessMm: 0.11 },
  { value: "coated115", label: "Мелованная 115 г/м²", pricePerSheet: 28, sheetW: 620, sheetH: 940, density: 115, thicknessMm: 0.10 },
  { value: "coated130", label: "Мелованная 130 г/м²", pricePerSheet: 34, sheetW: 620, sheetH: 940, density: 130, thicknessMm: 0.11 },
];
const COVER_PAPERS_FALLBACK: Paper[] = [
  { value: "coated170", label: "Мелованная 170 г/м²", pricePerSheet: 48, sheetW: 620, sheetH: 940, density: 170, thicknessMm: 0.18 },
  { value: "coated250", label: "Мелованная 250 г/м²", pricePerSheet: 70, sheetW: 620, sheetH: 940, density: 250, thicknessMm: 0.27 },
  { value: "coated300", label: "Мелованная 300 г/м²", pricePerSheet: 90, sheetW: 620, sheetH: 940, density: 300, thicknessMm: 0.32 },
  { value: "designer300", label: "Дизайнерская 300 г/м²", pricePerSheet: 220, sheetW: 720, sheetH: 1020, density: 300, thicknessMm: 0.34 },
];

type BackingMaterial = "cardboard" | "binding_board" | "plastic" | "kraft";
const BACKINGS: { value: BackingMaterial; label: string; pricePerM2: number }[] = [
  { value: "cardboard", label: "Картон хром-эрзац", pricePerM2: 180 },
  { value: "binding_board", label: "Переплётный картон", pricePerM2: 260 },
  { value: "plastic", label: "Пластик ПВХ", pricePerM2: 420 },
  { value: "kraft", label: "Крафт-картон", pricePerM2: 160 },
];

type BindingKind = "spiral" | "staple" | "pva" | "kbs" | "thermo";
const BINDINGS: { value: BindingKind; label: string }[] = [
  { value: "spiral", label: "Пружина" },
  { value: "staple", label: "Скоба" },
  { value: "pva", label: "Проклейка ПВА" },
  { value: "kbs", label: "КБС" },
  { value: "thermo", label: "Термоклей" },
];

type SpringMaterial = "metal" | "plastic";
const SPRING_MATERIALS: { value: SpringMaterial; label: string; pricePerItem: number }[] = [
  { value: "metal", label: "Металл", pricePerItem: 45 },
  { value: "plastic", label: "Пластик", pricePerItem: 38 },
];

type NotepadKind =
  | "simple"
  | "spiral"
  | "staple"
  | "kbs"
  | "pva"
  | "planner"
  | "premium"
  | "elastic"
  | "lyasse"
  | "pocket";
const NOTEPAD_KINDS: { value: NotepadKind; label: string; coef: number }[] = [
  { value: "simple", label: "Простой блокнот", coef: 1 },
  { value: "spiral", label: "Блокнот на пружине", coef: 1.2 },
  { value: "staple", label: "Блокнот на скобе", coef: 1.1 },
  { value: "kbs", label: "Блокнот КБС", coef: 1.4 },
  { value: "pva", label: "Блокнот с проклейкой ПВА", coef: 1.3 },
  { value: "planner", label: "Ежедневник", coef: 1.6 },
  { value: "premium", label: "Premium блокнот", coef: 2.0 },
  { value: "elastic", label: "Блокнот с резинкой", coef: 1.3 },
  { value: "lyasse", label: "Блокнот с ляссе", coef: 1.3 },
  { value: "pocket", label: "Блокнот с карманом", coef: 1.35 },
];

export interface NotepadCalculatorProps {
  embedded?: boolean;
  onResult?: (payload: import("@/pages/BoxProCalculator").BoxProResultPayload) => void;
}
export default function NotepadCalculator({ embedded = false, onResult }: NotepadCalculatorProps = {}) {
  const { priceOp } = useHandbook();
  // Основные параметры
  const [presetKey, setPresetKey] = useState("A5");
  const [customW, setCustomW] = useState(148);
  const [customH, setCustomH] = useState(210);
  const [circulation, setCirculation] = useState(500);
  const [margin, setMargin] = useState(30);
  const [vatPercent] = useState(16);
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Бумаги из справочника материалов (доработка: связь шаблонов со справочником)
  const [blockPapersDb, setBlockPapersDb] = useState<Paper[]>(BLOCK_PAPERS_FALLBACK);
  const [coverPapersDb, setCoverPapersDb] = useState<Paper[]>(COVER_PAPERS_FALLBACK);
  useEffect(() => {
    let stop = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("materials")
        .select("id,name,type,density,format_width,format_height,cost_per_sheet")
        .order("name");
      if (stop || error || !Array.isArray(data) || data.length === 0) return;
      const mapped: Paper[] = (data as any[])
        .filter((m) => m.type !== "self_adhesive" && m.type !== "cardboard" && m.type !== "other")
        .map((m) => ({
          value: `db:${m.id}`,
          label: `${m.name}${m.density ? ` ${m.density} г/м²` : ""}`,
          pricePerSheet: Number(m.cost_per_sheet) || 0,
          sheetW: Number(m.format_width) || 700,
          sheetH: Number(m.format_height) || 1000,
          density: Number(m.density) || 0,
          thicknessMm: Math.max(0.05, (Number(m.density) || 80) / 900),
        }));
      if (mapped.length === 0) return;
      const blocks = mapped.filter((p) => p.density === 0 || p.density < 200);
      const covers = mapped.filter((p) => p.density === 0 || p.density >= 150);
      setBlockPapersDb(blocks.length ? blocks : BLOCK_PAPERS_FALLBACK);
      setCoverPapersDb(covers.length ? covers : COVER_PAPERS_FALLBACK);
    })();
    return () => { stop = true; };
  }, []);
  const BLOCK_PAPERS = blockPapersDb;
  const COVER_PAPERS = coverPapersDb;

  // Операции из справочника (формулы)
  const [catalogOps, setCatalogOps] = useState<SpecItem[]>([]);

  // Внутренний блок
  const [pages, setPages] = useState(100);
  const [blockPaperKey, setBlockPaperKey] = useState("offset80");
  const [colorBlockFront, setColorBlockFront] = useState(1);
  const [colorBlockBack, setColorBlockBack] = useState(1);

  // Обложка
  const [hasCover, setHasCover] = useState(true);
  const [coverPaperKey, setCoverPaperKey] = useState("coated250");
  const [colorCoverFront, setColorCoverFront] = useState(4);
  const [colorCoverBack, setColorCoverBack] = useState(0);
  const [optCoverLam, setOptCoverLam] = useState(true);
  const [coverLamSides, setCoverLamSides] = useState<1 | 2>(1);
  const [optCoverBig, setOptCoverBig] = useState(true);
  const [optStamp, setOptStamp] = useState(false);
  const [stampArea, setStampArea] = useState(15);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);

  // Подложка
  const [hasBacking, setHasBacking] = useState(true);
  const [backingMaterial, setBackingMaterial] = useState<BackingMaterial>("cardboard");
  const [backingThicknessMm, setBackingThicknessMm] = useState(1.5);
  const [backingPrint, setBackingPrint] = useState(false);
  const [backingColorFront, setBackingColorFront] = useState(4);

  // Скрепление
  const [bindingKind, setBindingKind] = useState<BindingKind>("spiral");

  // Пружина
  const [springMaterial, setSpringMaterial] = useState<SpringMaterial>("metal");
  const [springColor, setSpringColor] = useState("Чёрный");
  const [springDiameterMm, setSpringDiameterMm] = useState(10);

  // Постпечать / опции
  const [optPerf, setOptPerf] = useState(false);
  const [perfLines, setPerfLines] = useState(1);
  const [perfLineMm, setPerfLineMm] = useState(150);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);
  const [optTearOff, setOptTearOff] = useState(false);

  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");

  // Тип блокнота (управляет коэф. сложности и автоподключением узлов)
  const [notepadKind, setNotepadKind] = useState<NotepadKind>("spiral");

  // Обложка: дополнительные финиш-операции
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optFoil, setOptFoil] = useState(false);
  const [foilArea, setFoilArea] = useState(20); // см² клише фольгирования

  // Фурнитура / переплётные элементы
  const [hasForzac, setHasForzac] = useState(false);
  const [hasKapital, setHasKapital] = useState(false);
  const [hasMarlya, setHasMarlya] = useState(false);
  const [hasLyasse, setHasLyasse] = useState(false);
  const [lyasseCount, setLyasseCount] = useState(1);
  const [hasElastic, setHasElastic] = useState(false);
  const [hasPocket, setHasPocket] = useState(false);

  // Персонализация
  const [optNumbering, setOptNumbering] = useState(false);
  const [optQR, setOptQR] = useState(false);
  const [optPersonalize, setOptPersonalize] = useState(false);

  // Упаковка
  const [optShrink, setOptShrink] = useState(false);
  const [itemsPerPack, setItemsPerPack] = useState(10);

  // ERP-обвязка (Доработка 85): новые секции, видимы в Расширенном/Тех. режиме
  const [prepress, setPrepress] = useState<PrepressState>(DEFAULT_PREPRESS);
  const [printBlock, setPrintBlock] = useState<PrintState>(DEFAULT_PRINT);
  const [postpress, setPostpress] = useState<PostpressState>(DEFAULT_POSTPRESS);
  const [qc, setQc] = useState<QcState>(DEFAULT_QC);
  const [packaging, setPackaging] = useState<PackagingState>(DEFAULT_PACKAGING);
  const [cover, setCover] = useState<CoverState>(DEFAULT_COVER);
  const [underlay, setUnderlay] = useState<UnderlayState>(DEFAULT_UNDERLAY);
  const [assembly, setAssembly] = useState<AssemblyState>(DEFAULT_ASSEMBLY);
  const [specialOps, setSpecialOps] = useState<SpecialOpsState>(DEFAULT_SPECIAL_OPS);
  const [internalBlocks, setInternalBlocks] = useState<InternalBlock[]>(() => [
    makeDefaultBlock({ kind: "main", pages: 50 }),
  ]);

  // Двусторонняя синхронизация: первый элемент internalBlocks <-> legacy-поля
  // (страницы / бумага / цветность). Редактор «Внутренние блоки» — источник
  // правды; legacy-поля удалены из UI, но используются в расчёте listов и форм.
  useEffect(() => {
    setInternalBlocks((prev) => {
      const b = prev[0];
      if (!b) return prev;
      const density = BLOCK_PAPERS.find((p) => p.value === blockPaperKey)?.density ?? b.density;
      if (
        b.pages === pages &&
        b.paper === blockPaperKey &&
        b.density === density &&
        b.colorFront === colorBlockFront &&
        b.colorBack === colorBlockBack
      ) return prev;
      const next = [...prev];
      next[0] = { ...b, pages, paper: blockPaperKey, density, colorFront: colorBlockFront, colorBack: colorBlockBack };
      return next;
    });
  }, [pages, blockPaperKey, colorBlockFront, colorBlockBack]);

  useEffect(() => {
    const b = internalBlocks[0];
    if (!b) return;
    if (b.pages !== pages) setPages(b.pages);
    if (b.paper !== blockPaperKey && BLOCK_PAPERS.some((p) => p.value === b.paper)) setBlockPaperKey(b.paper);
    if (b.colorFront !== colorBlockFront) setColorBlockFront(b.colorFront);
    if (b.colorBack !== colorBlockBack) setColorBlockBack(b.colorBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalBlocks]);

  const kind = useMemo(() => NOTEPAD_KINDS.find((k) => k.value === notepadKind) ?? NOTEPAD_KINDS[0], [notepadKind]);
  const premiumCoef = kind.coef;

  // При встраивании в Calculator (Новый расчёт) подхватываем шаблон ?from=…
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (!embedded) return;
    const tpl = searchParams.get("from");
    if (!tpl) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("calculations")
        .select("circulation,format_type,format_width,format_height,color_front,color_back,margin_percent")
        .eq("id", tpl)
        .single();
      if (cancelled || error || !data) return;
      if (data.circulation) setCirculation(Number(data.circulation));
      if (data.format_type) {
        const known = FORMATS.find((f) => f.value === data.format_type);
        setPresetKey(known ? known.value : "custom");
      }
      if (data.format_width) setCustomW(Number(data.format_width));
      if (data.format_height) setCustomH(Number(data.format_height));
      if (data.color_front != null) setColorBlockFront(Number(data.color_front));
      if (data.color_back != null) setColorBlockBack(Number(data.color_back));
      if (data.margin_percent) setMargin(Number(data.margin_percent));
      toast.info("Шаблон применён");
    })();
    return () => { cancelled = true; };
  }, [embedded, searchParams]);

  // Авто-подстройка типа переплёта под выбранный тип блокнота
  useEffect(() => {
    if (notepadKind === "spiral") setBindingKind("spiral");
    else if (notepadKind === "staple") setBindingKind("staple");
    else if (notepadKind === "kbs") setBindingKind("kbs");
    else if (notepadKind === "pva") setBindingKind("pva");
    if (notepadKind === "premium") {
      setOptSoftTouch(true); setHasLyasse(true); setHasElastic(true);
    }
    if (notepadKind === "lyasse") setHasLyasse(true);
    if (notepadKind === "elastic") setHasElastic(true);
    if (notepadKind === "pocket") setHasPocket(true);
    if (notepadKind === "kbs" || notepadKind === "planner" || notepadKind === "premium") {
      setHasForzac(true); setHasKapital(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notepadKind]);

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[2], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;

  // Доработка 85 — синхронизация глобальных параметров с ERP-контекстом
  const calcCtx = useMultipageCalcOptional();
  useEffect(() => {
    if (!calcCtx) return;
    calcCtx.setGlobal({
      format: format.label,
      formatWidth: itemW,
      formatHeight: itemH,
      circulation,
      printType: printMode,
      bindingType: bindingKind,
      marginPercent: margin,
    });
  }, [calcCtx, format.label, itemW, itemH, circulation, printMode, bindingKind, margin]);
  const blockPaper = useMemo(
    () => BLOCK_PAPERS.find((p) => p.value === blockPaperKey) ?? BLOCK_PAPERS[0],
    [blockPaperKey, BLOCK_PAPERS]
  );
  const coverPaper = useMemo(
    () => COVER_PAPERS.find((p) => p.value === coverPaperKey) ?? COVER_PAPERS[0],
    [coverPaperKey, COVER_PAPERS]
  );
  useEffect(() => {
    if (!BLOCK_PAPERS.find((p) => p.value === blockPaperKey) && BLOCK_PAPERS[0]) {
      setBlockPaperKey(BLOCK_PAPERS[0].value);
    }
  }, [BLOCK_PAPERS, blockPaperKey]);
  useEffect(() => {
    if (!COVER_PAPERS.find((p) => p.value === coverPaperKey) && COVER_PAPERS[0]) {
      setCoverPaperKey(COVER_PAPERS[0].value);
    }
  }, [COVER_PAPERS, coverPaperKey]);
  const backing = useMemo(() => BACKINGS.find((b) => b.value === backingMaterial)!, [backingMaterial]);
  const spring = useMemo(() => SPRING_MATERIALS.find((s) => s.value === springMaterial)!, [springMaterial]);

  const sheetsInBlock = Math.max(1, Math.ceil(pages / 2));
  const blockThicknessMm = +(sheetsInBlock * blockPaper.thicknessMm).toFixed(2);

  // Авто-логика
  useEffect(() => {
    if ((optCoverLam || coverPaper.density >= 200) && !optCoverBig) setOptCoverBig(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optCoverLam, coverPaper.density]);
  useEffect(() => {
    if (bindingKind !== "spiral") return;
    // Подгоняем диаметр пружины под толщину блока
    const need = Math.max(6, Math.ceil(blockThicknessMm + 2));
    if (need > springDiameterMm) setSpringDiameterMm(need);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingKind, blockThicknessMm]);

  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 500);

  // ===== РАСЧЁТЫ =====
  const blockLayout = useMemo(() => {
    const cols = Math.max(1, Math.floor(blockPaper.sheetW / itemW));
    const rows = Math.max(1, Math.floor(blockPaper.sheetH / itemH));
    const up = Math.max(1, cols * rows);
    // 2 страницы на стороне листа; листы блока = pages/2/up на изделие
    const netSheets = Math.ceil((circulation * pages) / (2 * up));
    const setup = offset ? 200 : 30;
    return { up, netSheets, printSheets: netSheets + setup };
  }, [blockPaper, itemW, itemH, circulation, pages, offset]);

  const coverLayout = useMemo(() => {
    if (!hasCover) return { up: 0, printSheets: 0, spreadW: 0, spineMm: 0 };
    const spineMm = bindingKind === "spiral" ? 0 : blockThicknessMm;
    const spreadW = itemW * 2 + spineMm;
    const cols = Math.max(1, Math.floor(coverPaper.sheetW / spreadW));
    const rows = Math.max(1, Math.floor(coverPaper.sheetH / itemH));
    const up = Math.max(1, cols * rows);
    const net = Math.ceil(circulation / up);
    const setup = offset ? 150 : 20;
    return { up, printSheets: net + setup, spreadW, spineMm };
  }, [hasCover, coverPaper, itemW, itemH, circulation, offset, blockThicknessMm, bindingKind]);

  const backingLayout = useMemo(() => {
    if (!hasBacking) return { printSheets: 0, areaM2: 0 };
    const areaM2 = +((itemW * itemH) / 1_000_000 * circulation).toFixed(3);
    // листы подложки исходим из материала, упрощённо: 1 шт = 1 заготовка
    return { printSheets: circulation, areaM2 };
  }, [hasBacking, itemW, itemH, circulation]);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });
    const tryHB = buildTryHandbook(priceOp, push, { "ТИРАЖ": circulation });

    if (hasDesign) push("Препресс", "Дизайн", 1, "усл.", 12000);
    push("Препресс", "Проверка макета и спуск полос", 1, "усл.", 1200);

    // Внутренний блок
    push("Материалы", `Бумага блока: ${blockPaper.label}`, blockLayout.printSheets, "лист", blockPaper.pricePerSheet);
    if (offset) {
      const formsBlock = Math.max(colorBlockFront, 0) + Math.max(colorBlockBack, 0);
      push("Печать", "Формы блока", formsBlock, "форма", 1500);
      push("Печать", "Приладка блока", 1, "усл.", 800);
    }
    push("Печать", offset ? "Печать блока (офсет)" : "Печать блока (цифра)",
      blockLayout.printSheets, "лист", offset ? 5 : 25);

    // Дополнительные внутренние блоки (мульти-блочная ERP-архитектура).
    // Первый блок учтён выше через legacy-поля; считаем остальные блоки приближённо.
    internalBlocks.slice(1).forEach((b, i) => {
      const idx = i + 2;
      const cols = Math.max(1, Math.floor(blockPaper.sheetW / itemW));
      const rows = Math.max(1, Math.floor(blockPaper.sheetH / itemH));
      const up = Math.max(1, cols * rows);
      const netSheetsN = Math.max(1, Math.ceil((circulation * b.pages) / (2 * up)));
      const setupN = offset ? 200 : 30;
      const printSheetsN = netSheetsN + setupN;
      const paperPrice = Math.max(6, b.density * 0.07);
      push("Материалы", `Бумага блока #${idx} (${b.paper} ${b.density} г/м²)`, printSheetsN, "лист", paperPrice);
      const isOffsetN = b.override && b.printType !== "auto" ? b.printType === "offset" : offset;
      if (isOffsetN) {
        const formsN = (b.colorFront || 0) + (b.colorBack || 0);
        if (formsN > 0) push("Печать", `Формы блока #${idx}`, formsN, "форма", 1500);
        push("Печать", `Приладка блока #${idx}`, 1, "усл.", 800);
      }
      const printPriceN = isOffsetN ? 5 : 25;
      push("Печать", `Печать блока #${idx} (${isOffsetN ? "офсет" : "цифра"})`, printSheetsN, "лист", printPriceN);
    });

    // Обложка
    if (hasCover) {
      push("Материалы", `Бумага обложки: ${coverPaper.label}`, coverLayout.printSheets, "лист", coverPaper.pricePerSheet);
      if (offset) {
        const formsCover = Math.max(colorCoverFront, 0) + Math.max(colorCoverBack, 0);
        push("Печать", "Формы обложки", formsCover, "форма", 1500);
        push("Печать", "Приладка обложки", 1, "усл.", 800);
      }
      push("Печать", offset ? "Печать обложки (офсет)" : "Печать обложки (цифра)",
        coverLayout.printSheets, "лист", offset ? 7 : 35);
      if (optCoverLam) {
        const areaM2 = (coverLayout.spreadW * itemH) / 1_000_000;
        const sheets = coverLayout.printSheets;
        const pricePerSheet = +(areaM2 * 220).toFixed(2);
        tryHB(coverLamSides === 2 ? "coverLam2" : "coverLam1", {
          "Количество бумаги на тираж": sheets,
          "Количество прогонов": coverLamSides,
          "Цена за лист": pricePerSheet,
        }, () => push("Постпечать", `Ламинация обложки (${coverLamSides} ст.)`,
          +(areaM2 * sheets * coverLamSides).toFixed(3), "м²", 220));
      }
      if (optCoverBig) tryHB("creaseMachine", { "количество бигов общее за тираж": circulation * 2 },
        () => push("Постпечать", "Биговка обложки", circulation * 2, "биг", 1.5));
      if (optSpotVarnish) {
        push("Постпечать", "Подготовка выб. лака", 1, "усл.", 3000);
        push("Постпечать", "Выборочный лак", coverLayout.printSheets, "лист", 8);
      }
      if (optStamp) tryHB("stamp", {
        "Площадь тиснения, см2": stampArea,
        "Количество ударов общее за тираж": circulation,
        "Количество приладок": 1,
      }, () => push("Постпечать", "Тиснение фольгой", circulation, "оттиск", Math.max(8, stampArea * 0.6)));
      if (optEmboss) tryHB("emboss", {
        "Площадь конгрева, см2": 4,
        "Количество ударов общее за тираж": circulation,
        "Количество приладок": 1,
      }, () => push("Постпечать", "Конгрев", circulation, "оттиск", 12));
    }

    // Подложка
    if (hasBacking) {
      push("Подложка", `Материал: ${backing.label} (${backingThicknessMm} мм)`,
        backingLayout.areaM2, "м²", backing.pricePerM2);
      push("Подложка", "Резка подложки", circulation, "шт.", 0.8);
      if (backingPrint) {
        push("Подложка", "Печать на подложке", circulation, "шт.", offset ? 6 : 18);
        if (offset) push("Подложка", "Формы подложки", Math.max(backingColorFront, 1), "форма", 1500);
      }
    }

    // Подборка / фальцовка блока
    tryHB("gather", { "общее количество листов": circulation },
      () => push("Сборка", "Подборка блока", circulation, "шт.", +(1.2 * premiumCoef).toFixed(2)));

    // Скрепление
    if (bindingKind === "spiral") {
      const holes = Math.max(20, Math.round(itemH / 6));
      tryHB("spiral", {
        "Количество витков": holes,
        "Стоимость витка пружины": (spring.pricePerItem + Math.max(0, springDiameterMm - 8) * 1.5) / Math.max(1, holes),
      }, () => {
        push("Скрепление", "Перфорация под пружину", holes * circulation, "отв.", 0.5);
        push("Скрепление", `Пружина ${spring.label} Ø${springDiameterMm} мм (${springColor})`,
          circulation, "шт.", spring.pricePerItem + Math.max(0, springDiameterMm - 8) * 1.5);
        push("Скрепление", "Навивка пружины", circulation, "шт.", 35);
        push("Скрепление", "Приладка пружины", 1, "усл.", 1500);
      });
    } else if (bindingKind === "staple") {
      tryHB("staple", {
        "количество скоб на изделии": 2,
        "общее количество скоб на изделии": circulation * 2,
      }, () => {
        push("Скрепление", "Скоба", circulation * 2, "скоба", 0.6);
        push("Скрепление", "Приладка скобы", 1, "усл.", 800);
      });
    } else if (bindingKind === "pva") {
      push("Скрепление", "Клей ПВА", circulation, "шт.", 1.0);
      push("Скрепление", "Проклейка ПВА", circulation, "шт.", 4);
      push("Скрепление", "Приладка ПВА", 1, "усл.", 1500);
    } else if (bindingKind === "kbs") {
      push("Скрепление", "Фрезеровка корешка", circulation, "шт.", 1.5);
      push("Скрепление", "Проклейка КБС", circulation, "шт.", 6);
      push("Скрепление", "Клей термоплавкий", circulation, "шт.", 1.2);
      push("Скрепление", "Приладка КБС", 1, "усл.", 2500);
    } else if (bindingKind === "thermo") {
      tryHB("thermo", { "Стоимость работы за изделие": 7 }, () => {
        push("Скрепление", "Термосклейка", circulation, "шт.", 7);
        push("Скрепление", "Приладка термобиндера", 1, "усл.", 2000);
      });
    }

    // Постпечатные операции блока
    if (optPerf) {
      const meters = (perfLineMm * perfLines * circulation) / 1000;
      tryHB("perfMachine", { "общее количество линий перфорации за тираж": perfLines * circulation },
        () => push("Постпечать", "Перфорация листов (отрывные)", +meters.toFixed(2), "м", 12));
    }
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.6);
    if (optTearOff) push("Постпечать", "Подготовка отрывных листов", 1, "усл.", 1500);

    // Доп. обложечный финиш
    if (hasCover) {
      if (optSoftTouch) {
        const areaM2 = (coverLayout.spreadW * itemH) / 1_000_000;
        push("Постпечать", "Soft-touch ламинация обложки", +(areaM2 * coverLayout.printSheets).toFixed(3), "м²", 380);
      }
      if (optFoil) {
        push("Постпечать", "Подготовка клише фольгирования", 1, "усл.", 4500);
        push("Постпечать", "Фольгирование обложки", circulation, "оттиск", Math.max(10, foilArea * 0.7));
      }
    }

    // Фурнитура / переплётные элементы
    if (hasForzac) push("Фурнитура", "Форзацы (комплект)", circulation, "компл.", 12);
    if (hasKapital) push("Фурнитура", "Каптал", circulation, "шт.", 6);
    if (hasMarlya) push("Фурнитура", "Марля корешка", circulation, "шт.", 4);
    if (hasLyasse) {
      const lyasseLenM = +((itemH + 30) / 1000).toFixed(3); // высота + запас
      push("Фурнитура", "Ляссе (лента-закладка)", +(lyasseLenM * lyasseCount * circulation).toFixed(2), "м", 18);
      push("Фурнитура", "Установка ляссе", circulation, "шт.", 1.5 * lyasseCount);
    }
    if (hasElastic) {
      push("Фурнитура", "Резинка", circulation, "шт.", 8);
      push("Фурнитура", "Установка резинки", circulation, "шт.", 4);
    }
    if (hasPocket) {
      push("Фурнитура", "Карман", circulation, "шт.", 22);
      push("Фурнитура", "Установка кармана", circulation, "шт.", 5);
    }

    // Персонализация / нумерация / QR
    if (optNumbering) {
      push("Персонализация", "Подготовка базы нумерации", 1, "усл.", 2000);
      push("Персонализация", "Нумерация", circulation, "шт.", 1.5);
      push("Персонализация", "Контроль последовательности", circulation, "шт.", 0.5);
    }
    if (optQR) {
      push("Персонализация", "QR-нанесение", circulation, "шт.", 2.5);
    }
    if (optPersonalize) {
      push("Персонализация", "Персонализация (имя/лого)", circulation, "шт.", 25);
      push("Персонализация", "Проверка персонализации", circulation, "шт.", 1);
    }

    // Финальная сборка
    push("Сборка", "Финальная сборка блокнота", circulation, "шт.", +(6 * premiumCoef).toFixed(2));

    // Обрезка
    tryHB("trimBlock", {}, () => push("Финиш", "Обрезка готового изделия", circulation, "шт.", 1.2));

    // Логистика
    push("Логистика", "Контроль качества", circulation, "шт.", +(1.5 * premiumCoef).toFixed(2));
    if (optShrink) {
      const packs = Math.max(1, Math.ceil(circulation / Math.max(1, itemsPerPack)));
      push("Логистика", `Термоусадка (по ${itemsPerPack} шт)`, packs, "уп.", 35);
    }
    tryHB("pack", { "Количество видов": 1 },
      () => push("Логистика", "Упаковка", circulation, "шт.", 3));
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    // Задача 5 — отдельный ERP-блок себестоимости обложки (буква "Постпечать обложки").
    // Управляется секцией CoverSection и не дублирует legacy-чекбоксы выше.
    try {
      const coverLines = buildCoverLines(cover, {
        itemW, itemH, circulation,
        printType: printMode,
        spineMm: bindingKind === "spiral" ? 0 : blockThicknessMm,
      });
      for (const l of coverLines) out.push(l);
    } catch {}

    // Операции из справочника (формулы)
    const stageMap: Record<string, string> = {
      prepress: "Препресс",
      material: "Материалы",
      print: "Печать",
      postpress: "Постпечать",
      logistics: "Логистика",
    };
    for (const op of catalogOps) {
      out.push({
        stage: stageMap[op.stage] || "Постпечать",
        name: op.name,
        qty: Number(op.quantity) || 0,
        unit: op.unit || "шт",
        price: Number(op.unitPrice) || 0,
        total: Number(op.total) || 0,
      });
    }

    return out;
  }, [hasDesign, blockPaper, blockLayout, offset, colorBlockFront, colorBlockBack, hasCover, coverPaper, coverLayout, colorCoverFront, colorCoverBack, optCoverLam, coverLamSides, optCoverBig, optSpotVarnish, optStamp, stampArea, optEmboss, hasBacking, backing, backingThicknessMm, backingLayout, backingPrint, backingColorFront, bindingKind, itemH, spring, springColor, springDiameterMm, optPerf, perfLineMm, perfLines, optRound, roundCorners, optTearOff, circulation, hasDelivery, deliveryCost, itemW, premiumCoef, optSoftTouch, optFoil, foilArea, hasForzac, hasKapital, hasMarlya, hasLyasse, lyasseCount, hasElastic, hasPocket, optNumbering, optQR, optPersonalize, optShrink, itemsPerPack, internalBlocks, cover, printMode, blockThicknessMm, catalogOps]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + margin / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [lines, margin, vatPercent, circulation]);

  useEffect(() => {
    if (!onResult) return;
    const result = toTemplatePriceResult(lines, { margin, vatPercent, circulation });
    onResult({ result, margin, vatPercent });
  }, [lines, margin, vatPercent, circulation, onResult]);

  const route = useMemo(() => {
    const s: string[] = [];
    if (hasDesign) s.push("Дизайн");
    s.push("Проверка макета", "Спуск полос", "Бумага блока");
    if (offset) s.push("Вывод печатных форм");
    s.push(offset ? "Печать блока (офсет)" : "Печать блока (цифра)");
    if (hasCover) {
      s.push("Бумага обложки", offset ? "Печать обложки (офсет)" : "Печать обложки (цифра)");
      if (optCoverLam) s.push("Ламинация обложки");
      if (optCoverBig) s.push("Биговка обложки");
      if (optSpotVarnish) s.push("Выборочный лак");
      if (optStamp) s.push("Тиснение фольгой");
      if (optEmboss) s.push("Конгрев");
    }
    if (hasBacking) {
      s.push(`Подложка: ${backing.label}`);
      if (backingPrint) s.push("Печать на подложке");
      s.push("Резка подложки");
    }
    s.push("Подборка блока");
    s.push(`Скрепление: ${BINDINGS.find((b) => b.value === bindingKind)?.label}`);
    if (hasForzac) s.push("Форзацы");
    if (hasKapital) s.push("Каптал");
    if (hasMarlya) s.push("Марля корешка");
    if (hasLyasse) s.push("Установка ляссе");
    if (hasElastic) s.push("Установка резинки");
    if (hasPocket) s.push("Установка кармана");
    if (optNumbering) s.push("Нумерация");
    if (optQR) s.push("QR-нанесение");
    if (optPersonalize) s.push("Персонализация");
    if (optSoftTouch) s.push("Soft-touch");
    if (optFoil) s.push("Фольгирование");
    s.push("Финальная сборка");
    if (optPerf) s.push("Перфорация");
    if (optRound) s.push("Скругление углов");
    s.push("Обрезка", "Контроль качества", "Упаковка");
    if (optShrink) s.push("Термоусадка");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, offset, hasCover, optCoverLam, optCoverBig, optSpotVarnish, optStamp, optEmboss, hasBacking, backing, backingPrint, bindingKind, optPerf, optRound, hasDelivery, hasForzac, hasKapital, hasMarlya, hasLyasse, hasElastic, hasPocket, optNumbering, optQR, optPersonalize, optSoftTouch, optFoil, optShrink]);

  const Shell: any = embedded ? Fragment : PageShell;
  const Main: any = embedded ? Fragment : PageMain;
  return (
    <Shell>
      {!embedded && (
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <FileText className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Блокнот</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                Детальная форма: внутренний блок, обложка, подложка, скрепление, пружина.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 59</Badge>
        </PageHeaderRow>
      </PageHeader>
      )}

      <Main>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Готовый формат</Label>
                    <Select value={presetKey} onValueChange={setPresetKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  <div className="sm:col-span-2">
                    <Label>Тип блокнота</Label>
                    <Select value={notepadKind} onValueChange={(v) => setNotepadKind(v as NotepadKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NOTEPAD_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label} (×{k.coef})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {presetKey === "custom" && (<>
                    <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} /></div>
                    <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} /></div>
                  </>)}
                  <div>
                    <Label>Тип печати</Label>
                    <Select value={printMode} onValueChange={(v) => setPrintMode(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Авто</SelectItem>
                        <SelectItem value="offset">Офсет</SelectItem>
                        <SelectItem value="digital">Цифра</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Checkbox id="design" checked={hasDesign} onCheckedChange={(v) => setHasDesign(!!v)} />
                    <Label htmlFor="design" className="cursor-pointer">Нужен дизайн</Label>
                  </div>
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <CoverSection value={cover} onChange={setCover} title="2. Обложка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <UnderlaySection value={underlay} onChange={setUnderlay} title="3. Подложка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <InternalBlocksEditor blocks={internalBlocks} onChange={setInternalBlocks} />
              </AdvancedOnly>

              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" defaultValue={["block", "cover", "binding"]} className="w-full">
                    {/* Обложка */}
                    <AccordionItem value="cover">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">
                          Обложка
                          <Badge variant={hasCover ? "default" : "outline"} className="text-[10px]">{hasCover ? "есть" : "нет"}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="hasCover" checked={hasCover} onCheckedChange={(v) => setHasCover(!!v)} />
                            <Label htmlFor="hasCover" className="cursor-pointer">Изделие с обложкой</Label>
                          </div>
                          {hasCover && (<>
                            <div className="sm:col-span-2">
                              <Label>Бумага обложки</Label>
                              <Select value={coverPaperKey} onValueChange={setCoverPaperKey}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {COVER_PAPERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({fmtMoney(p.pricePerSheet)}/лист)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Плотность, г/м²</Label><Input value={coverPaper.density} readOnly /></div>
                            <div><Label>Цветность (лицо)</Label><Input type="number" min={0} max={6} value={colorCoverFront} onChange={(e) => setColorCoverFront(+e.target.value || 0)} /></div>
                            <div><Label>Цветность (оборот)</Label><Input type="number" min={0} max={6} value={colorCoverBack} onChange={(e) => setColorCoverBack(+e.target.value || 0)} /></div>
                            <div className="sm:col-span-2 space-y-2 text-sm">
                              <Row label="Ламинация" checked={optCoverLam} onChange={setOptCoverLam}>
                                <Select value={String(coverLamSides)} onValueChange={(v) => setCoverLamSides(+v as 1 | 2)}>
                                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 сторона</SelectItem>
                                    <SelectItem value="2">2 стороны</SelectItem>
                                  </SelectContent>
                                </Select>
                              </Row>
                              <Row label="Биговка (авто при ламинации/плотной)" checked={optCoverBig} onChange={setOptCoverBig} />
                              <Row label="Выборочный лак" checked={optSpotVarnish} onChange={setOptSpotVarnish} />
                              <Row label="Тиснение фольгой" checked={optStamp} onChange={setOptStamp}>
                                <Input className="h-8 w-20" type="number" min={0} value={stampArea} onChange={(e) => setStampArea(+e.target.value || 0)} />
                                <span className="text-xs text-muted-foreground">см² клише</span>
                              </Row>
                              <Row label="Конгрев" checked={optEmboss} onChange={setOptEmboss} />
                            </div>
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Подложка */}
                    <AccordionItem value="backing">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">
                          Подложка
                          <Badge variant={hasBacking ? "default" : "outline"} className="text-[10px]">{hasBacking ? "есть" : "нет"}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Checkbox id="hasBacking" checked={hasBacking} onCheckedChange={(v) => setHasBacking(!!v)} />
                            <Label htmlFor="hasBacking" className="cursor-pointer">Изделие с подложкой</Label>
                          </div>
                          {hasBacking && (<>
                            <div className="sm:col-span-2">
                              <Label>Материал подложки</Label>
                              <Select value={backingMaterial} onValueChange={(v) => setBackingMaterial(v as BackingMaterial)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {BACKINGS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label} ({fmtMoney(b.pricePerM2)}/м²)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Толщина подложки, мм</Label>
                              <Input type="number" step={0.1} min={0.5} value={backingThicknessMm} onChange={(e) => setBackingThicknessMm(+e.target.value || 0)} />
                            </div>
                            <div className="flex items-end gap-2">
                              <Checkbox id="bprint" checked={backingPrint} onCheckedChange={(v) => setBackingPrint(!!v)} />
                              <Label htmlFor="bprint" className="cursor-pointer">Печать на подложке</Label>
                            </div>
                            {backingPrint && (
                              <div><Label>Цветность подложки</Label>
                                <Input type="number" min={1} max={6} value={backingColorFront} onChange={(e) => setBackingColorFront(+e.target.value || 1)} />
                              </div>
                            )}
                          </>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Скрепление */}
                    <AccordionItem value="binding">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">
                          Скрепление
                          <Badge variant="default" className="text-[10px]">{BINDINGS.find((b) => b.value === bindingKind)?.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="sm:col-span-2">
                            <Label>Тип скрепления</Label>
                            <Select value={bindingKind} onValueChange={(v) => setBindingKind(v as BindingKind)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {BINDINGS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 text-xs text-muted-foreground">
                            Для пружины откройте секцию «Пружина» ниже, чтобы настроить материал, цвет и диаметр.
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Пружина */}
                    {bindingKind === "spiral" && (
                      <AccordionItem value="spring">
                        <AccordionTrigger>
                          <span className="flex items-center gap-2">
                            Пружина
                            <Badge variant="secondary" className="text-[10px]">{spring.label} · Ø{springDiameterMm} мм</Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-3 sm:grid-cols-2 pt-2">
                            <div>
                              <Label>Материал пружины</Label>
                              <Select value={springMaterial} onValueChange={(v) => setSpringMaterial(v as SpringMaterial)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {SPRING_MATERIALS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label} ({fmtMoney(s.pricePerItem)}/шт)</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Цвет</Label>
                              <Select value={springColor} onValueChange={setSpringColor}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["Чёрный", "Белый", "Серебро", "Золото", "Красный", "Синий"].map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div><Label>Диаметр, мм</Label>
                              <Input type="number" min={6} max={32} value={springDiameterMm} onChange={(e) => setSpringDiameterMm(+e.target.value || 6)} />
                              <p className="text-[11px] text-muted-foreground mt-1">Рекомендованный минимум: {Math.max(6, Math.ceil(blockThicknessMm + 2))} мм (по толщине блока).</p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Дополнительные операции */}
                    <AccordionItem value="extra">
                      <AccordionTrigger>Дополнительные операции</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="Перфорация листов" checked={optPerf} onChange={setOptPerf}>
                            <Input className="h-8 w-20" type="number" min={1} value={perfLines} onChange={(e) => setPerfLines(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">лин. ×</span>
                            <Input className="h-8 w-20" type="number" min={1} value={perfLineMm} onChange={(e) => setPerfLineMm(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">мм</span>
                          </Row>
                          <Row label="Отрывные листы" checked={optTearOff} onChange={setOptTearOff} />
                          <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                            <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">угла</span>
                          </Row>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Упаковка и доставка */}
                    <AccordionItem value="ship">
                      {/* Заглушка-якорь, расширенные секции добавлены ниже */}
                      <AccordionTrigger>Упаковка и доставка</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 pt-2">
                          <div className="flex items-end gap-2">
                            <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                            <Label htmlFor="delivery" className="cursor-pointer">Включить доставку</Label>
                          </div>
                          {hasDelivery && (<div><Label>Стоимость доставки</Label><Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} /></div>)}
                          <div className="flex items-end gap-2">
                            <Checkbox id="shrink" checked={optShrink} onCheckedChange={(v) => setOptShrink(!!v)} />
                            <Label htmlFor="shrink" className="cursor-pointer">Термоусадка комплектами</Label>
                          </div>
                          {optShrink && (
                            <div><Label>Штук в упаковке</Label>
                              <Input type="number" min={1} value={itemsPerPack} onChange={(e) => setItemsPerPack(+e.target.value || 1)} />
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Фурнитура */}
                    <AccordionItem value="hardware">
                      <AccordionTrigger>Фурнитура и переплётные элементы</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="Форзацы" checked={hasForzac} onChange={setHasForzac} />
                          <Row label="Каптал" checked={hasKapital} onChange={setHasKapital} />
                          <Row label="Марля корешка" checked={hasMarlya} onChange={setHasMarlya} />
                          <Row label="Ляссе (закладка)" checked={hasLyasse} onChange={setHasLyasse}>
                            <Input className="h-8 w-20" type="number" min={1} max={4} value={lyasseCount} onChange={(e) => setLyasseCount(+e.target.value || 1)} />
                            <span className="text-xs text-muted-foreground">шт.</span>
                          </Row>
                          <Row label="Резинка" checked={hasElastic} onChange={setHasElastic} />
                          <Row label="Карман" checked={hasPocket} onChange={setHasPocket} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Доп. финиш обложки */}
                    <AccordionItem value="cover-finish">
                      <AccordionTrigger>Финиш обложки (premium)</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="Soft-touch ламинация" checked={optSoftTouch} onChange={setOptSoftTouch} />
                          <Row label="Фольгирование" checked={optFoil} onChange={setOptFoil}>
                            <Input className="h-8 w-20" type="number" min={0} value={foilArea} onChange={(e) => setFoilArea(+e.target.value || 0)} />
                            <span className="text-xs text-muted-foreground">см² клише</span>
                          </Row>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Персонализация */}
                    <AccordionItem value="personalize">
                      <AccordionTrigger>Нумерация и персонализация</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pt-2">
                          <Row label="Нумерация (с контролем последовательности)" checked={optNumbering} onChange={setOptNumbering} />
                          <Row label="QR-код" checked={optQR} onChange={setOptQR} />
                          <Row label="Персонализация (имя/лого)" checked={optPersonalize} onChange={setOptPersonalize} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <PrepressSection value={prepress} onChange={setPrepress} title="5. Допечатка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <PrintSection
                  value={{
                    ...printBlock,
                    printType: printMode,
                    colorFront: colorBlockFront,
                    colorBack: colorBlockBack,
                    printFormat: "—",
                    printSheets: blockLayout?.printSheets ?? 0,
                  }}
                  onChange={setPrintBlock}
                  title="6. Печать"
                />
              </AdvancedOnly>
              <AdvancedOnly>
                <PostpressSection value={postpress} onChange={setPostpress} title="7. Постпечатка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Операции из справочника</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CatalogOperationsPicker circulation={circulation} onChange={setCatalogOps} />
                  </CardContent>
                </Card>
              </AdvancedOnly>
              <AdvancedOnly>
                <AssemblySection value={assembly} onChange={setAssembly} title="8. Сборка" />
              </AdvancedOnly>
              <AdvancedOnly>
                <SpecialOpsSection value={specialOps} onChange={setSpecialOps} title="9. Спецоперации" />
              </AdvancedOnly>
              <AdvancedOnly>
                <QualityControlSection value={qc} onChange={setQc} title="10. Контроль качества" />
              </AdvancedOnly>
              <AdvancedOnly>
                <PackagingSection value={packaging} onChange={setPackaging} title="11. Упаковка" />
              </AdvancedOnly>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">12. Маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-4">
                    {route.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>

              <AdvancedOnly>
                <TechWarnings warnings={[]} />
              </AdvancedOnly>
              <AdvancedOnly>
                <RouteTimeline operations={route.map((label, idx) => ({ id: String(idx), label, stage: "assembly" as const }))} />
              </AdvancedOnly>
              <AdvancedOnly>
                <CompositionTable rows={[]} />
              </AdvancedOnly>
              <TechOnly>
                <TechReport data={{ material: { name: format.label }, imposition: {}, print: { type: printMode }, postpress: [], route: route.map((label, idx) => ({ id: String(idx), label, stage: "assembly" as const })) }} />
              </TechOnly>

              <Card>
                <CardHeader><CardTitle className="text-sm">13. Итоговая стоимость</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                  <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                  <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                </CardContent>
              </Card>

              <TemplateActions
                productType="notepad"
                defaultName={`Блокнот ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <CostByStageBlock
              storageKey="notepad"
              spec={lines.map((l) => ({ stage: l.stage, name: l.name, qty: l.qty, unit: l.unit, price: l.price, total: l.total }))}
              metrics={{
                printSheets: blockLayout.printSheets,
                purchaseSheets: blockLayout.netSheets,
                wasteSheets: Math.max(0, blockLayout.printSheets - blockLayout.netSheets) || undefined,
              }}
            />
          </div>
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-sm">Спецификация</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Этап</TableHead>
                    <TableHead>Операция</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead>Ед.</TableHead>
                    <TableHead className="text-right">Цена</TableHead>
                    <TableHead className="text-right">Итого</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{l.stage}</TableCell>
                      <TableCell>{l.name}</TableCell>
                      <TableCell className="text-right">{fmtNum(l.qty)}</TableCell>
                      <TableCell>{l.unit}</TableCell>
                      <TableCell className="text-right">{fmtMoney(l.price)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(l.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageContainer>
      </Main>
    </Shell>
  );
}

function Row({ label, checked, onChange, children }: { label: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="flex-1 min-w-0">{label}</span>
      {children}
    </div>
  );
}