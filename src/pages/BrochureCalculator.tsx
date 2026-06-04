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
import { fmtMoney, fmtNum } from "@/lib/format";
import TemplateActions from "@/components/calc/TemplateActions";
import { toTemplatePriceResult } from "@/lib/calc/template-result";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InternalBlocksEditor from "@/components/calc/multipage/InternalBlocksEditor";
import { AdvancedOnly, SimpleOnly, TechOnly } from "@/components/calc/multipage/ModeVisibility";
import CostByStageBlock from "@/components/calc/multipage/CostByStageBlock";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";
import {
  makeDefaultBlock,
  type InternalBlock,
} from "@/lib/calc/multipage/blocks";
import PrepressSection, {
  DEFAULT_PREPRESS,
  type PrepressState,
} from "@/components/calc/multipage/sections/PrepressSection";
import QualityControlSection, {
  DEFAULT_QC,
  type QcState,
} from "@/components/calc/multipage/sections/QualityControlSection";
import PackagingSection, {
  DEFAULT_PACKAGING,
  type PackagingState,
} from "@/components/calc/multipage/sections/PackagingSection";
import CoverSection, {
  DEFAULT_COVER,
  type CoverState,
} from "@/components/calc/multipage/sections/CoverSection";
import { buildCoverLines } from "@/lib/calc/cover/cost";
import UnderlaySection, {
  DEFAULT_UNDERLAY,
  type UnderlayState,
} from "@/components/calc/multipage/sections/UnderlaySection";
import AssemblySection, {
  DEFAULT_ASSEMBLY,
  type AssemblyState,
} from "@/components/calc/multipage/sections/AssemblySection";
import SpecialOpsSection, {
  DEFAULT_SPECIAL_OPS,
  type SpecialOpsState,
} from "@/components/calc/multipage/sections/SpecialOpsSection";
import RouteTimeline from "@/components/calc/multipage/RouteTimeline";
import TechWarnings from "@/components/calc/multipage/TechWarnings";
import { buildRoute, type RouteInput } from "@/lib/calc/multipage/route";
import { validateTech } from "@/lib/calc/multipage/validate";
import { estimateBlockThickness, pickSpring } from "@/lib/calc/multipage/spring";
import CompositionTable from "@/components/calc/multipage/CompositionTable";
import TechReport from "@/components/calc/multipage/TechReport";
import { buildComposition } from "@/lib/calc/multipage/composition";
import ExpandedTotals, { type ExpandedTotalsData } from "@/components/calc/multipage/ExpandedTotals";

/**
 * Доработка 48 — выделенный шаблон «Брошюра».
 * Многостраничное изделие: отдельный внутренний блок + обложка,
 * автоматический расчёт тетрадей, виды скрепления, постпечатные операции.
 */

type BroFormat = { value: string; label: string; w: number; h: number };
const FORMATS: BroFormat[] = [
  { value: "A6", label: "A6 (105×148)", w: 105, h: 148 },
  { value: "A5", label: "A5 (148×210)", w: 148, h: 210 },
  { value: "A4", label: "A4 (210×297)", w: 210, h: 297 },
  { value: "210x210", label: "Квадрат 210×210", w: 210, h: 210 },
  { value: "custom", label: "Свой размер", w: 210, h: 297 },
];

type Paper = { value: string; label: string; pricePerSheet: number; sheetW: number; sheetH: number; density: number };
const BLOCK_PAPERS: Paper[] = [
  { value: "offset80", label: "Офсет 80 г/м²", pricePerSheet: 18, sheetW: 620, sheetH: 940, density: 80 },
  { value: "offset90", label: "Офсет 90 г/м²", pricePerSheet: 22, sheetW: 620, sheetH: 940, density: 90 },
  { value: "coated115", label: "Мелованная 115 г/м²", pricePerSheet: 28, sheetW: 620, sheetH: 940, density: 115 },
  { value: "coated130", label: "Мелованная 130 г/м²", pricePerSheet: 34, sheetW: 620, sheetH: 940, density: 130 },
  { value: "coated170", label: "Мелованная 170 г/м²", pricePerSheet: 48, sheetW: 620, sheetH: 940, density: 170 },
];
const COVER_PAPERS: Paper[] = [
  { value: "coated170", label: "Мелованная 170 г/м²", pricePerSheet: 48, sheetW: 620, sheetH: 940, density: 170 },
  { value: "coated250", label: "Мелованная 250 г/м²", pricePerSheet: 70, sheetW: 620, sheetH: 940, density: 250 },
  { value: "coated300", label: "Мелованная 300 г/м²", pricePerSheet: 90, sheetW: 620, sheetH: 940, density: 300 },
  { value: "designer300", label: "Дизайнерская 300 г/м²", pricePerSheet: 220, sheetW: 720, sheetH: 1020, density: 300 },
];

type BindingKind = "staple" | "eurostaple" | "kbs" | "thermo" | "spiral" | "pva" | "sewn" | "sewn_kbs";
const BINDINGS_BASE: { value: BindingKind; label: string }[] = [
  { value: "staple", label: "Скоба (saddle stitch)" },
  { value: "eurostaple", label: "Евроскоба" },
  { value: "kbs", label: "КБС" },
  { value: "thermo", label: "Термобиндер" },
  { value: "spiral", label: "Пружина" },
  { value: "pva", label: "Проклейка ПВА" },
];
const BINDINGS_CATALOG_EXTRA: { value: BindingKind; label: string }[] = [
  { value: "sewn", label: "Шитьё ниткой" },
  { value: "sewn_kbs", label: "Шитьё + КБС" },
];

export interface BrochureLikeProps {
  mode?: "brochure" | "catalog" | "magazine" | "softcover" | "hardcover" | "planner" | "notepad" | "memocube" | "quartercal";
  /** Если true — рендерим только содержимое (без PageShell/PageHeader), для встраивания в Calculator.tsx */
  embedded?: boolean;
  /** Колбэк синхронизации с боковой панелью Calculator.tsx (как формируется цена). */
  onResult?: (payload: import("@/pages/BoxProCalculator").BoxProResultPayload) => void;
}

export default function BrochureCalculator({ mode = "brochure", embedded = false, onResult }: BrochureLikeProps = {}) {
  const isSoftcover = mode === "softcover";
  const isPlanner = mode === "planner";
  const isHardcover = mode === "hardcover" || isPlanner;
  const isNotepad = mode === "notepad";
  const isMemocube = mode === "memocube";
  const isQuarterCal = mode === "quartercal";
  const isCatalog = mode === "catalog" || isSoftcover || isHardcover;
  const isMagazine = mode === "magazine";
  const isCatalogLike = isCatalog || isMagazine;
  const BINDINGS = isCatalogLike ? [...BINDINGS_BASE, ...BINDINGS_CATALOG_EXTRA] : BINDINGS_BASE;
  // Основные параметры
  const [presetKey, setPresetKey] = useState(isCatalogLike ? "A4" : "A5");
  const [customW, setCustomW] = useState(148);
  const [customH, setCustomH] = useState(210);
  const [circulation, setCirculation] = useState(isMagazine ? 3000 : isCatalog ? 1000 : 500);
  const [pages, setPages] = useState(isMagazine ? 48 : isCatalog ? 64 : 16);
  const [colorBlockFront, setColorBlockFront] = useState(4);
  const [colorBlockBack, setColorBlockBack] = useState(4);
  const [colorCoverFront, setColorCoverFront] = useState(4);
  const [colorCoverBack, setColorCoverBack] = useState(0);
  const [blockPaperKey, setBlockPaperKey] = useState(isCatalogLike ? "coated130" : "coated115");
  const [coverPaperKey, setCoverPaperKey] = useState(isCatalogLike ? "coated300" : "coated250");
  const [bindingKind, setBindingKind] = useState<BindingKind>(isHardcover ? "sewn" : isCatalog ? "kbs" : "staple");
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [margin, setMargin] = useState(isMagazine ? 35 : isCatalog ? 40 : 30);
  const [vatPercent] = useState(16);
  const [ownTurn, setOwnTurn] = useState(true);

  // Постпечатные опции
  const [optCoverLam, setOptCoverLam] = useState(true);
  const [coverLamSides, setCoverLamSides] = useState<1 | 2>(1);
  const [optSoftTouch, setOptSoftTouch] = useState(false);
  const [optVarnish, setOptVarnish] = useState(false);
  const [optSpotVarnish, setOptSpotVarnish] = useState(false);
  const [optStamp, setOptStamp] = useState(false);
  const [stampArea, setStampArea] = useState(15);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optPerf, setOptPerf] = useState(false);
  const [perfLineMm, setPerfLineMm] = useState(150);
  const [perfLines, setPerfLines] = useState(1);
  const [optNum, setOptNum] = useState(false);
  const [numCount, setNumCount] = useState(1);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optCoverBig, setOptCoverBig] = useState(true);
  const [optRound, setOptRound] = useState(false);
  const [roundCorners, setRoundCorners] = useState(4);

  // Твёрдый переплёт: книжные операции
  const [hcBoardThicknessMm, setHcBoardThicknessMm] = useState(2.5);
  const [hcCoverMaterial, setHcCoverMaterial] = useState<"coated" | "designer" | "bumvinyl" | "fabric" | "leather" | "balacron">("bumvinyl");
  const [hcOptLasse, setHcOptLasse] = useState(true);
  const [hcOptEdgeColor, setHcOptEdgeColor] = useState(false);
  const [hcOptEdgeFoil, setHcOptEdgeFoil] = useState(false);
  const [hcOptSuperjacket, setHcOptSuperjacket] = useState(false);
  const [hcOptSlipcase, setHcOptSlipcase] = useState(false);
  const [hcOptShubr, setHcOptShubr] = useState(false);

  // Ежедневник: персонализация и фурнитура
  const [plDated, setPlDated] = useState(true);
  const [plOptElastic, setPlOptElastic] = useState(true);
  const [plOptMagnet, setPlOptMagnet] = useState(false);
  const [plOptPocket, setPlOptPocket] = useState(true);
  const [plOptPenLoop, setPlOptPenLoop] = useState(true);
  const [plOptCorners, setPlOptCorners] = useState(false);
  const [plCornersCount, setPlCornersCount] = useState(4);
  const [plOptNameplate, setPlOptNameplate] = useState(false);
  const [plOptPersonalize, setPlOptPersonalize] = useState(false);
  const [plOptGiftBox, setPlOptGiftBox] = useState(false);

  // Журнал: серия / выпуск / периодичность / вложения / адресация / термоусадка
  const [issueNumber, setIssueNumber] = useState("01");
  const [periodicity, setPeriodicity] = useState<"weekly" | "monthly" | "quarterly" | "oneoff">("monthly");
  const [optInserts, setOptInserts] = useState(false);
  const [insertCount, setInsertCount] = useState(1);
  const [insertAuto, setInsertAuto] = useState(true);
  const [optAddress, setOptAddress] = useState(false);
  const [addressMode, setAddressMode] = useState<"sticker" | "print" | "personal">("print");
  const [optShrink, setOptShrink] = useState(false);

  // Доработка 72 — Каталог / Журнал: тип изделия, клапаны, вкладки (tabs), premium-упаковка
  type CatalogKind =
    | "thin_magazine"
    | "staple_magazine"
    | "kbs_catalog"
    | "sewn_magazine"
    | "thick_catalog"
    | "flap_magazine"
    | "tabs_magazine"
    | "inserts_magazine"
    | "premium_catalog";
  const CATALOG_KINDS: { value: CatalogKind; label: string }[] = [
    { value: "thin_magazine", label: "Тонкий журнал" },
    { value: "staple_magazine", label: "Журнал на скобе" },
    { value: "kbs_catalog", label: "Каталог КБС" },
    { value: "sewn_magazine", label: "Журнал с ниткошвейкой" },
    { value: "thick_catalog", label: "Толстый каталог" },
    { value: "flap_magazine", label: "Журнал с клапанами" },
    { value: "tabs_magazine", label: "Журнал с вкладками" },
    { value: "inserts_magazine", label: "Журнал со вставками" },
    { value: "premium_catalog", label: "Premium каталог" },
  ];
  const [catalogKind, setCatalogKind] = useState<CatalogKind>(
    isMagazine ? "staple_magazine" : isCatalog ? "kbs_catalog" : "thin_magazine"
  );
  const [optFlaps, setOptFlaps] = useState(false);
  const [flapWidthMm, setFlapWidthMm] = useState(90);
  const [optTabs, setOptTabs] = useState(false);
  const [tabsCount, setTabsCount] = useState(4);
  const [packagingKind, setPackagingKind] = useState<"bundle" | "box" | "shrink" | "individual" | "premium">("bundle");

  // Доработка 73 — Книга: тип книги, автоматика premium/суперобложка/коллекционная
  type BookKind =
    | "kbs_book"
    | "hardcover_book"
    | "sewn_book"
    | "superjacket_book"
    | "premium_book"
    | "collectors_edition"
    | "gift_book";
  const BOOK_KINDS: { value: BookKind; label: string }[] = [
    { value: "kbs_book", label: "Книга КБС" },
    { value: "hardcover_book", label: "Книга в твёрдом переплёте" },
    { value: "sewn_book", label: "Книга с ниткошвейкой" },
    { value: "superjacket_book", label: "Книга с суперобложкой" },
    { value: "premium_book", label: "Premium книга" },
    { value: "collectors_edition", label: "Коллекционное издание" },
    { value: "gift_book", label: "Подарочная книга" },
  ];
  const [bookKind, setBookKind] = useState<BookKind>(isHardcover ? "hardcover_book" : "kbs_book");

  // Этап 2: набор внутренних блоков (мульти-блочная архитектура).
  // Инициализируем одним «основным» блоком, отражающим текущие поля.
  const [internalBlocks, setInternalBlocks] = useState<InternalBlock[]>(() => [
    makeDefaultBlock({
      kind: "main",
      paper: blockPaperKey,
      density: BLOCK_PAPERS.find((p) => p.value === blockPaperKey)?.density ?? 80,
      pages,
      colorFront: colorBlockFront,
      colorBack: colorBlockBack,
    }),
  ]);

  // Двусторонняя синхронизация legacy-полей основного блока (pages / бумага / цветность)
  // с первым элементом internalBlocks. Это позволяет редактору «Внутренние блоки»
  // быть единым источником правды для ERP, не ломая текущий UI обложки/тиражей.
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

  // Этап 3: новые ERP-секции (допечатка / контроль качества / упаковка).
  const [prepress, setPrepress] = useState<PrepressState>(DEFAULT_PREPRESS);
  const [qc, setQc] = useState<QcState>(DEFAULT_QC);
  const [packaging, setPackaging] = useState<PackagingState>(DEFAULT_PACKAGING);
  const [cover, setCover] = useState<CoverState>(DEFAULT_COVER);
  const [underlay, setUnderlay] = useState<UnderlayState>(DEFAULT_UNDERLAY);
  const [assembly, setAssembly] = useState<AssemblyState>(DEFAULT_ASSEMBLY);
  const [specialOps, setSpecialOps] = useState<SpecialOpsState>(DEFAULT_SPECIAL_OPS);

  // При встраивании в Calculator (Новый расчёт) подхватываем шаблон ?from=…
  // и переносим общие поля, чтобы спецификация/раскладка сразу пересчитались.
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
      if (data.color_front != null) {
        setColorBlockFront(Number(data.color_front));
        setColorCoverFront(Number(data.color_front));
      }
      if (data.color_back != null) {
        setColorBlockBack(Number(data.color_back));
      }
      if (data.margin_percent) setMargin(Number(data.margin_percent));
      toast.info("Шаблон применён");
    })();
    return () => { cancelled = true; };
  }, [embedded, searchParams]);

  useEffect(() => {
    if (!isHardcover && !isSoftcover) return;
    if (bookKind === "kbs_book") setBindingKind("kbs");
    else if (bookKind === "sewn_book" || bookKind === "collectors_edition") setBindingKind("sewn");
    else if (bookKind === "hardcover_book" || bookKind === "premium_book" || bookKind === "gift_book") {
      setBindingKind((b) => (b === "staple" || b === "eurostaple" ? "sewn" : b));
    }
    if (bookKind === "superjacket_book" || bookKind === "premium_book" || bookKind === "collectors_edition" || bookKind === "gift_book") {
      setHcOptSuperjacket(true);
    }
    if (bookKind === "premium_book" || bookKind === "collectors_edition") {
      setHcOptLasse(true);
      setHcOptSlipcase(true);
      setOptSoftTouch(true);
      setOptStamp(true);
      setOptEmboss(true);
      setPackagingKind("premium");
    }
    if (bookKind === "gift_book") {
      setHcOptLasse(true);
      setOptStamp(true);
      setPackagingKind("individual");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKind, isHardcover, isSoftcover]);

  const bookAssemblyCoef = useMemo(() => {
    if (!isHardcover && !isSoftcover) return 1;
    if (bookKind === "premium_book" || bookKind === "collectors_edition") return 2.0;
    if (bookKind === "superjacket_book" || bookKind === "gift_book") return 1.6;
    if (bookKind === "hardcover_book" || bookKind === "sewn_book") return 1.4;
    return 1.0;
  }, [bookKind, isHardcover, isSoftcover]);

  // Авто-логика по виду каталога/журнала
  useEffect(() => {
    if (!isCatalogLike) return;
    if (catalogKind === "staple_magazine") setBindingKind("staple");
    else if (catalogKind === "kbs_catalog" || catalogKind === "thick_catalog") setBindingKind("kbs");
    else if (catalogKind === "sewn_magazine") setBindingKind("sewn");
    else if (catalogKind === "premium_catalog") {
      setBindingKind((b) => (b === "staple" || b === "eurostaple" ? "kbs" : b));
      setOptSoftTouch(true);
      setOptSpotVarnish(true);
      setOptStamp(true);
      setPackagingKind("premium");
    }
    if (catalogKind === "flap_magazine") setOptFlaps(true);
    if (catalogKind === "tabs_magazine") setOptTabs(true);
    if (catalogKind === "inserts_magazine") setOptInserts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogKind, isCatalogLike]);

  const format = useMemo(() => FORMATS.find((f) => f.value === presetKey) ?? FORMATS[1], [presetKey]);
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;
  const blockPaper = useMemo(() => BLOCK_PAPERS.find((p) => p.value === blockPaperKey)!, [blockPaperKey]);
  const coverPaper = useMemo(() => COVER_PAPERS.find((p) => p.value === coverPaperKey)!, [coverPaperKey]);

  // ── Этап 1 (доработка 85): публикация главных параметров изделия
  // в глобальный контекст ERP, чтобы все внутренние блоки/секции
  // автоматически наследовали формат, тираж, печать, переплёт, наценку и срок.
  const calcCtx = useMultipageCalcOptional();
  useEffect(() => {
    if (!calcCtx) return;
    calcCtx.setGlobal({
      format: `${itemW}×${itemH} мм`,
      formatWidth: itemW,
      formatHeight: itemH,
      orientation: itemW > itemH ? "landscape" : "portrait",
      circulation,
      printType: printMode === "auto" ? undefined : printMode,
      bindingType: bindingKind,
      marginPercent: margin,
    });
  }, [calcCtx, itemW, itemH, circulation, printMode, bindingKind, margin]);

  // Авто-логика
  useEffect(() => {
    if (optDieCut && !optDeflash) setOptDeflash(true);
  }, [optDieCut, optDeflash]);
  useEffect(() => {
    // Биговка обложки при ламинации или плотной обложке
    if ((optCoverLam || coverPaper.density >= 200) && !optCoverBig) setOptCoverBig(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optCoverLam, coverPaper.density]);

  // Каталог: для больших объёмов автоматически предлагаем КБС/шитьё
  useEffect(() => {
    if (!isCatalogLike) return;
    const kbsThreshold = isMagazine ? 80 : 96;
    if (pages >= kbsThreshold && (bindingKind === "staple" || bindingKind === "eurostaple")) {
      setBindingKind("kbs");
    }
    // Журнал: до 64 → скоба
    if (isMagazine && pages <= 64 && bindingKind === "kbs") {
      // оставляем выбор за пользователем — только подсказка
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCatalogLike, isMagazine, pages]);

  // Премиальный коэффициент сложности
  const premiumCoef = useMemo(() => {
    let k = 1.0;
    if (isCatalogLike) k += 0.1;
    if (optSoftTouch) k += 0.1;
    if (optStamp || optEmboss) k += 0.1;
    if (optSpotVarnish) k += 0.05;
    if (coverPaper.density >= 300) k += 0.05;
    return +k.toFixed(2);
  }, [isCatalogLike, optSoftTouch, optStamp, optEmboss, optSpotVarnish, coverPaper.density]);

  // Кратность страниц
  const pagesValid = useMemo(() => {
    if (bindingKind === "staple" || bindingKind === "eurostaple") return pages % 4 === 0;
    return pages % 2 === 0;
  }, [pages, bindingKind]);

  // ====== РАСЧЁТЫ ======
  // Тетрадь = 8 или 16 страниц. Выбираем по плотности/количеству.
  const signaturePages = useMemo(() => {
    if (bindingKind === "staple" || bindingKind === "eurostaple") return Math.min(pages, 16);
    return blockPaper.density >= 150 ? 8 : 16;
  }, [bindingKind, pages, blockPaper.density]);

  const signatures = useMemo(() => Math.max(1, Math.ceil(pages / signaturePages)), [pages, signaturePages]);

  // Раскладка блока
  const blockLayout = useMemo(() => {
    const sheetW = blockPaper.sheetW;
    const sheetH = blockPaper.sheetH;
    // печатный лист = закупочный (упрощённо), полос на лист = 2 × signaturePages/2 (двусторонняя печать)
    const upPerSide = signaturePages / 2;
    const cols = Math.max(1, Math.floor(sheetW / itemW));
    const rows = Math.max(1, Math.floor(sheetH / itemH));
    const fit = cols * rows;
    const effectiveUp = Math.min(fit, upPerSide);
    // листов на тетрадь = 1 (двусторонний печатный лист = signaturePages страниц)
    const sheetsPerSignature = Math.ceil(upPerSide / Math.max(1, effectiveUp));
    const netSheets = circulation * signatures * sheetsPerSignature;
    const setup = printMode === "offset" || (printMode === "auto" && circulation >= 300) ? 200 : 30;
    const printSheets = netSheets + setup * signatures;
    return { upPerSide, effectiveUp, sheetsPerSignature, netSheets, printSheets, setup, sheetW, sheetH };
  }, [blockPaper, itemW, itemH, signaturePages, circulation, signatures, printMode]);

  // Раскладка обложки (4 страницы на разворот)
  const coverLayout = useMemo(() => {
    const sheetW = coverPaper.sheetW;
    const sheetH = coverPaper.sheetH;
    // обложка разворот: 2×itemW × itemH (с корешком)
    const spineMm = Math.max(0, (pages * blockPaper.density) / 1000); // приблизительный корешок
    const spreadW = itemW * 2 + spineMm;
    const cols = Math.max(1, Math.floor(sheetW / spreadW));
    const rows = Math.max(1, Math.floor(sheetH / itemH));
    const upPerSheet = Math.max(1, cols * rows);
    const netSheets = Math.ceil(circulation / upPerSheet);
    const setup = printMode === "offset" || (printMode === "auto" && circulation >= 300) ? 150 : 20;
    const printSheets = netSheets + setup;
    return { spineMm, spreadW, upPerSheet, netSheets, printSheets, setup };
  }, [coverPaper, itemW, itemH, pages, blockPaper.density, circulation, printMode]);

  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 300);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн", 1, "усл.", isMagazine ? 20000 : isCatalog ? 25000 : 12000);
    push("Препресс", "Проверка макета и спуск полос", signatures + 1, "форма", 600);

    // Бумага
    push("Материалы", `Бумага блока: ${blockPaper.label}`, blockLayout.printSheets, "лист", blockPaper.pricePerSheet);
    push("Материалы", `Бумага обложки: ${coverPaper.label}`, coverLayout.printSheets, "лист", coverPaper.pricePerSheet);

    // Печать — блок
    if (offset) {
      const formsBlock = ((colorBlockFront > 0 ? colorBlockFront : 0) + (colorBlockBack > 0 ? colorBlockBack : 0)) * signatures;
      push("Печать", "Формы блока", formsBlock, "форма", 1500);
      const setupBase = ownTurn ? 150 : 300;
      push("Печать", "Приладка блок", signatures, "усл.", setupBase + 0.01 * (blockLayout.printSheets / signatures) * 100);

      const formsCover = (colorCoverFront > 0 ? colorCoverFront : 0) + (colorCoverBack > 0 ? colorCoverBack : 0);
      push("Печать", "Формы обложки", formsCover, "форма", 1500);
      push("Печать", "Приладка обложки", 1, "усл.", setupBase + 0.01 * coverLayout.printSheets * 100);
    }
    const printPriceBlock = offset ? 5 : 30;
    const printPriceCover = offset ? 7 : 35;
    push("Печать", offset ? "Печать блок (офсет)" : "Печать блок (цифра)", blockLayout.printSheets, "лист", printPriceBlock);
    push("Печать", offset ? "Печать обложка (офсет)" : "Печать обложка (цифра)", coverLayout.printSheets, "лист", printPriceCover);

    // Дополнительные внутренние блоки (ERP — мульти-блочная архитектура).
    // Первый блок уже учтён в legacy-расчёте выше; считаем остальные приближённо.
    internalBlocks.slice(1).forEach((b, i) => {
      const idx = i + 2;
      const sigPages = signaturePages;
      const sigsN = Math.max(1, Math.ceil(b.pages / sigPages));
      const upPerSide = sigPages / 2;
      const netSheetsN = Math.max(1, Math.ceil((circulation * b.pages) / sigPages));
      const setupN = offset ? 200 : 30;
      const printSheetsN = netSheetsN + setupN * sigsN;
      const paperPrice = Math.max(6, b.density * 0.07); // приближённая цена за лист по плотности
      push("Материалы", `Бумага блока #${idx} (${b.paper} ${b.density} г/м²)`, printSheetsN, "лист", paperPrice);
      const isOffsetN = b.override && b.printType !== "auto" ? b.printType === "offset" : offset;
      if (isOffsetN) {
        const formsN = ((b.colorFront || 0) + (b.colorBack || 0)) * sigsN;
        if (formsN > 0) push("Печать", `Формы блока #${idx}`, formsN, "форма", 1500);
        push("Печать", `Приладка блока #${idx}`, sigsN, "усл.", (ownTurn ? 150 : 300));
      }
      const printPriceN = isOffsetN ? 5 : 30;
      push("Печать", `Печать блока #${idx} (${isOffsetN ? "офсет" : "цифра"})`, printSheetsN, "лист", printPriceN);
    });

    // Ламинация обложки
    if (optCoverLam) {
      const areaM2 = (coverLayout.spreadW * itemH) / 1_000_000;
      push("Постпечать", `Ламинация обложки (${coverLamSides} ст.)`,
        +(areaM2 * coverLayout.printSheets * coverLamSides).toFixed(3), "м²", 220);
    }
    if (optSoftTouch) {
      const areaM2 = (coverLayout.spreadW * itemH) / 1_000_000;
      push("Постпечать", "Soft-touch плёнка", +(areaM2 * coverLayout.printSheets).toFixed(3), "м²", 380);
    }
    if (optCoverBig) push("Постпечать", "Биговка обложки", circulation * 2, "биг", 1.5);
    if (optVarnish) push("Постпечать", "УФ/ВД-лак обложки", coverLayout.printSheets, "лист", 5);
    if (optSpotVarnish) {
      push("Постпечать", "Подготовка выб. лака", 1, "усл.", 3000);
      push("Постпечать", "Приладка выб. лака", 1, "усл.", 1500);
      push("Постпечать", "Выборочный лак", coverLayout.printSheets, "лист", 8);
    }
    if (optStamp) push("Постпечать", "Тиснение фольгой", circulation, "оттиск", Math.max(8, stampArea * 0.6) * premiumCoef);
    if (optEmboss) push("Постпечать", "Конгрев", circulation, "оттиск", 12 * premiumCoef);
    if (optPerf) {
      const meters = (perfLineMm * perfLines * circulation) / 1000;
      push("Постпечать", "Перфорация", +meters.toFixed(2), "м", 12);
    }
    if (optNum) push("Постпечать", "Нумерация", circulation * numCount, "номер", 1.2);
    if (optDieCut) push("Постпечать", "Высечка обложки", coverLayout.printSheets, "лист", 4);
    if (optDieCut && optDeflash) push("Постпечать", "Удаление облоя", coverLayout.printSheets, "лист", 1.5);
    if (optRound) push("Постпечать", "Скругление углов", circulation * roundCorners, "угол", 0.6);

    // Фальцовка тетрадей (офсет/многостраничные)
    const needsFold = offset || pages > 4;
    if (needsFold) {
      push("Сборка блока", "Фальцовка тетрадей", circulation * signatures, "тетр.", 0.8);
    }
    // Подборка
    if (signatures > 1 || bindingKind !== "staple") {
      push("Сборка блока", "Подборка блока", circulation * signatures, "тетр.", 0.6);
    }
    // Скрепление
    if (bindingKind === "staple") {
      const staples = 2;
      push("Скрепление", "Скоба", circulation * staples, "скоба", 0.6);
      push("Скрепление", "Приладка скобы", 1, "усл.", 800);
    } else if (bindingKind === "eurostaple") {
      const staples = 2;
      push("Скрепление", "Евроскоба", circulation * staples, "скоба", 1.2);
      push("Скрепление", "Приладка евроскобы", 1, "усл.", 1200);
    } else if (bindingKind === "kbs") {
      push("Скрепление", "Фрезеровка корешка", circulation, "шт.", 1.5);
      push("Скрепление", "Проклейка КБС", circulation, "шт.", 6);
      push("Скрепление", "Клей (термоплавкий)", circulation, "шт.", 1.2);
      push("Скрепление", "Приладка КБС", 1, "усл.", 2500);
    } else if (bindingKind === "thermo") {
      push("Скрепление", "Термосклейка", circulation, "шт.", 7);
      push("Скрепление", "Приладка термобиндера", 1, "усл.", 2000);
    } else if (bindingKind === "spiral") {
      const holes = Math.max(20, Math.round(itemH / 6));
      push("Скрепление", "Перфорация под пружину", holes * circulation, "отв.", 0.5);
      push("Скрепление", "Навивка пружины", circulation, "шт.", 35);
      push("Скрепление", "Пружина (материал)", circulation, "шт.", 45);
      push("Скрепление", "Приладка пружины", 1, "усл.", 1500);
    } else if (bindingKind === "pva") {
      push("Скрепление", "Клей ПВА", circulation, "шт.", 1.0);
      push("Скрепление", "Проклейка ПВА", circulation, "шт.", 4);
      push("Скрепление", "Приладка ПВА", 1, "усл.", 1500);
    } else if (bindingKind === "sewn") {
      push("Скрепление", "Шитьё тетрадей ниткой", circulation * signatures, "тетр.", 2.5);
      push("Скрепление", "Приладка шитья", 1, "усл.", 3000);
    } else if (bindingKind === "sewn_kbs") {
      push("Скрепление", "Шитьё тетрадей ниткой", circulation * signatures, "тетр.", 2.5);
      push("Скрепление", "Приладка шитья", 1, "усл.", 3000);
      push("Скрепление", "Проклейка блока", circulation, "шт.", 3);
      push("Скрепление", "КБС", circulation, "шт.", 6);
      push("Скрепление", "Клей (термоплавкий)", circulation, "шт.", 1.2);
      push("Скрепление", "Приладка КБС", 1, "усл.", 2500);
    }

    // Обрезка готового изделия (3 стороны)
    push("Финиш", "Обрезка готового изделия", circulation, "шт.", 1.5);

    // ===== Твёрдый переплёт (книжные операции) =====
    if (isHardcover) {
      // Форзацы
      push("Книжный блок", "Бумага форзацев (комплект)", circulation, "компл.", 8);
      push("Книжный блок", "Приклейка форзацев", circulation, "шт.", 3.5);
      // Марля
      const marlyaMeters = +((coverLayout.spineMm + 40) * circulation / 1000).toFixed(2);
      push("Книжный блок", "Марля (корешок)", marlyaMeters, "м", 35);
      push("Книжный блок", "Приклейка марли", circulation, "шт.", 1.8);
      // Каптал
      const kaptalMeters = +((itemH * 2 + 20) * circulation / 1000).toFixed(2);
      push("Книжный блок", "Каптал", kaptalMeters, "м", 40);
      push("Книжный блок", "Установка каптала", circulation, "шт.", 1.2);
      // Прессовка
      push("Книжный блок", "Прессовка блока", circulation, "шт.", 2);

      // Переплётная крышка: картон + покровный материал
      const boardAreaM2 = +((itemW * itemH * 2 + coverLayout.spineMm * itemH) / 1_000_000 * circulation).toFixed(3);
      push("Переплётная крышка", "Переплётный картон", boardAreaM2, "м²", 260);
      push("Переплётная крышка", "Резка картона", circulation * 3, "дет.", 1.2);
      const matPrice: Record<typeof hcCoverMaterial, number> = {
        coated: 90, designer: 220, bumvinyl: 280, fabric: 520, leather: 1800, balacron: 360,
      } as any;
      push("Переплётная крышка", `Покровный материал: ${hcCoverMaterial}`, boardAreaM2, "м²", matPrice[hcCoverMaterial] ?? 280);
      push("Переплётная крышка", "Кашировка крышки", boardAreaM2, "м²", 140 * premiumCoef);
      push("Переплётная крышка", "Сборка переплётной крышки", circulation, "шт.", 12 * premiumCoef);
      push("Переплётная крышка", "Вставка блока в крышку", circulation, "шт.", 8);
      push("Переплётная крышка", "Финальная прессовка", circulation, "шт.", 2);
      // Доработка 73 — финальная ручная сборка книги с коэффициентом сложности
      push("Сборка", "Финальная сборка книги", circulation, "шт.", 15 * bookAssemblyCoef);

      if (hcOptLasse) push("Премиум", "Ляссе (закладка)", circulation, "шт.", 2.5);
      if (hcOptEdgeColor) push("Премиум", "Окрашивание среза", circulation, "шт.", 6);
      if (hcOptEdgeFoil) push("Премиум", "Фольгирование среза", circulation, "шт.", 14);
      if (hcOptSuperjacket) {
        push("Суперобложка", "Печать суперобложки", circulation, "шт.", 12);
        push("Суперобложка", "Ламинация суперобложки", circulation, "шт.", 6);
        push("Суперобложка", "Резка суперобложки", circulation, "шт.", 1.5);
      }
      if (hcOptSlipcase) {
        push("Футляр", "Картон футляра", circulation, "шт.", 35);
        push("Футляр", "Кашировка футляра", circulation, "шт.", 18);
        push("Футляр", "Сборка футляра", circulation, "шт.", 22);
      }
      if (hcOptShubr) {
        push("Шубер", "Картон шубера", circulation, "шт.", 28);
        push("Шубер", "Кашировка шубера", circulation, "шт.", 14);
        push("Шубер", "Сборка шубера", circulation, "шт.", 18);
      }
    }

    // ===== Ежедневник: фурнитура и персонализация =====
    if (isPlanner) {
      if (plOptElastic) {
        push("Фурнитура", "Пробивка под резинку", circulation * 2, "отв.", 0.8);
        push("Фурнитура", "Установка резинки", circulation, "шт.", 4);
      }
      if (plOptMagnet) {
        push("Фурнитура", "Магнит (материал)", circulation, "шт.", 8);
        push("Фурнитура", "Установка магнита", circulation, "шт.", 5);
      }
      if (plOptPocket) push("Фурнитура", "Карман (установка)", circulation, "шт.", 6);
      if (plOptPenLoop) push("Фурнитура", "Петля под ручку", circulation, "шт.", 3.5);
      if (plOptCorners) {
        push("Фурнитура", "Металлические уголки", circulation * plCornersCount, "уг.", 4);
        push("Фурнитура", "Ручная установка уголков", circulation, "шт.", 6);
      }
      if (plOptNameplate) {
        push("Фурнитура", "Шильдик (металл)", circulation, "шт.", 18);
        push("Фурнитура", "Установка шильдика", circulation, "шт.", 5);
      }
      if (plOptPersonalize) {
        push("Персонализация", "Подготовка персонализации", 1, "усл.", 3500);
        push("Персонализация", "Тиснение имени/логотипа", circulation, "шт.", 14 * premiumCoef);
      }
      if (plOptGiftBox) {
        push("Упаковка", "Индивидуальная подарочная упаковка", circulation, "шт.", 65);
      }
      if (plDated) push("Препресс", "Календарная сетка (датировка)", 1, "усл.", 2500);
    }

    // Журнал: вложения / адресация / термоусадка
    if (isMagazine && optInserts && insertCount > 0) {
      const pricePerInsert = insertAuto ? 1.2 : 2.5;
      push("Тиражные", `Вкладка (${insertAuto ? "авто" : "ручная"})`, circulation * insertCount, "шт.", pricePerInsert);
    }
    if (isMagazine && optAddress) {
      const priceAddr = addressMode === "sticker" ? 2.5 : addressMode === "print" ? 1.2 : 3.5;
      push("Тиражные", `Адресация: ${addressMode === "sticker" ? "наклейка" : addressMode === "print" ? "печать" : "персонализация"}`,
        circulation, "адрес", priceAddr);
      if (addressMode === "personal") push("Тиражные", "Подготовка персонализации", 1, "усл.", 3000);
    }
    if (isMagazine && optShrink) push("Тиражные", "Термоусадка", circulation, "шт.", 2.5);

    // Доработка 72 — клапаны обложки, вкладки (tabs), контроль комплектности, premium-упаковка
    if (isCatalogLike && optFlaps && flapWidthMm > 0) {
      const flapAreaM2 = (flapWidthMm * itemH * 2) / 1_000_000;
      push("Постпечать", "Клапаны обложки (доп. бумага)", +(flapAreaM2 * circulation).toFixed(3), "м²", coverPaper.pricePerSheet / ((coverPaper.sheetW * coverPaper.sheetH) / 1_000_000));
      push("Постпечать", "Биговка клапанов", circulation * 2, "биг", 1.5);
      push("Постпечать", "Фальцовка клапанов", circulation * 2, "клапан", 0.9);
    }
    if (isCatalogLike && optTabs && tabsCount > 0) {
      push("Тиражные", "Вкладки (tabs) — материал", circulation * tabsCount, "шт.", 3.5);
      push("Тиражные", "Высечка вкладок", circulation * tabsCount, "шт.", 1.2);
      push("Тиражные", "Вклейка вкладок", circulation * tabsCount, "шт.", 2.0);
    }
    const completenessCoef = isCatalogLike && (optTabs || optInserts) ? 1.4 : 1.0;
    push("Логистика", "Контроль качества", circulation, "шт.", 0.5 * completenessCoef);
    const packPrice = packagingKind === "premium" ? 65 : packagingKind === "individual" ? 25 : packagingKind === "shrink" ? 3.5 : packagingKind === "box" ? 8 : 4;
    const packLabel = packagingKind === "premium" ? "Premium-упаковка" : packagingKind === "individual" ? "Индивидуальная упаковка" : packagingKind === "shrink" ? "Термоусадка" : packagingKind === "box" ? "Коробка" : "Пачка";
    push("Логистика", packLabel, circulation, "шт.", packPrice);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);

    return out;
  }, [isCatalog, isMagazine, isCatalogLike, isHardcover, isPlanner, plDated, plOptElastic, plOptMagnet, plOptPocket, plOptPenLoop, plOptCorners, plCornersCount, plOptNameplate, plOptPersonalize, plOptGiftBox, hcBoardThicknessMm, hcCoverMaterial, hcOptLasse, hcOptEdgeColor, hcOptEdgeFoil, hcOptSuperjacket, hcOptSlipcase, hcOptShubr, itemW, hasDesign, blockPaper, coverPaper, blockLayout, coverLayout, signatures, signaturePages, offset, colorBlockFront, colorBlockBack, colorCoverFront, colorCoverBack, ownTurn, optCoverLam, coverLamSides, itemH, optCoverBig, optSoftTouch, circulation, optVarnish, optSpotVarnish, optStamp, stampArea, optEmboss, optPerf, perfLineMm, perfLines, optNum, numCount, optDieCut, optDeflash, optRound, roundCorners, premiumCoef, pages, bindingKind, optInserts, insertCount, insertAuto, optAddress, addressMode, optShrink, optFlaps, flapWidthMm, optTabs, tabsCount, packagingKind, hasDelivery, deliveryCost, internalBlocks]);

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
    s.push("Проверка макета", "Спуск полос", "Бумага блока", "Бумага обложки");
    if (offset) s.push("Вывод печатных форм", "Приладка");
    s.push(offset ? "Печать блока (офсет)" : "Печать блока (цифра)");
    s.push(offset ? "Печать обложки (офсет)" : "Печать обложки (цифра)");
    if (optCoverLam) s.push("Ламинация обложки");
    if (optSoftTouch) s.push("Soft-touch");
    if (optCoverBig) s.push("Биговка обложки");
    if (optVarnish) s.push("Лак обложки");
    if (optSpotVarnish) s.push("Выборочный лак");
    if (optStamp) s.push("Тиснение");
    if (optEmboss) s.push("Конгрев");
    if (optPerf) s.push("Перфорация");
    if (optNum) s.push("Нумерация");
    if (optDieCut) s.push("Высечка обложки");
    if (optDieCut && optDeflash) s.push("Удаление облоя");
    if (optRound) s.push("Скругление углов");
    if (offset || pages > 4) s.push("Фальцовка тетрадей");
    if (signatures > 1 || bindingKind !== "staple") s.push("Подборка блока");
    s.push(`Скрепление: ${BINDINGS.find((b) => b.value === bindingKind)?.label}`);
    s.push("Обрезка готового изделия");
    if (isHardcover) {
      s.push("Форзацы", "Марля", "Каптал", "Прессовка блока");
      s.push("Переплётный картон", "Резка картона", "Покровный материал", "Кашировка крышки", "Сборка переплётной крышки", "Вставка блока в крышку", "Финальная прессовка");
      if (hcOptLasse) s.push("Ляссе");
      if (hcOptEdgeColor) s.push("Окрашивание среза");
      if (hcOptEdgeFoil) s.push("Фольгирование среза");
      if (hcOptSuperjacket) s.push("Суперобложка (отд. маршрут)");
      if (hcOptSlipcase) s.push("Футляр (отд. маршрут)");
      if (hcOptShubr) s.push("Шубер (отд. маршрут)");
    }
    if (isPlanner) {
      if (plOptElastic) s.push("Установка резинки");
      if (plOptMagnet) s.push("Установка магнита");
      if (plOptPocket) s.push("Карман");
      if (plOptPenLoop) s.push("Петля под ручку");
      if (plOptCorners) s.push("Металлические уголки");
      if (plOptNameplate) s.push("Шильдик");
      if (plOptPersonalize) s.push("Персонализация / тиснение имени");
      if (plOptGiftBox) s.push("Подарочная упаковка");
    }
    if (isMagazine && optInserts) s.push("Вкладка");
    if (isMagazine && optAddress) s.push("Адресация");
    if (isMagazine && optShrink) s.push("Термоусадка");
    if (isCatalogLike && optFlaps) s.push("Клапаны обложки");
    if (isCatalogLike && optTabs) s.push("Вкладки (tabs)");
    s.push("Контроль качества");
    s.push(packagingKind === "premium" ? "Premium-упаковка" : packagingKind === "individual" ? "Индивидуальная упаковка" : packagingKind === "shrink" ? "Термоусадка" : packagingKind === "box" ? "Упаковка в коробку" : "Упаковка в пачки");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, offset, optCoverLam, optSoftTouch, optCoverBig, optVarnish, optSpotVarnish, optStamp, optEmboss, optPerf, optNum, optDieCut, optDeflash, optRound, pages, signatures, bindingKind, isMagazine, isCatalogLike, isHardcover, isPlanner, plOptElastic, plOptMagnet, plOptPocket, plOptPenLoop, plOptCorners, plOptNameplate, plOptPersonalize, plOptGiftBox, hcOptLasse, hcOptEdgeColor, hcOptEdgeFoil, hcOptSuperjacket, hcOptSlipcase, hcOptShubr, optInserts, optAddress, optShrink, optFlaps, optTabs, packagingKind, hasDelivery, BINDINGS]);

  // Этап 4: динамический ERP-маршрут, технологические предупреждения,
  // автоподбор пружины. Используются в правой колонке (Расширенный+).
  const blockThicknessMm = useMemo(
    () => estimateBlockThickness(pages, blockPaper.density),
    [pages, blockPaper.density],
  );
  const recommendedSpring = useMemo(
    () => (bindingKind === "spiral" ? pickSpring(blockThicknessMm) : null),
    [bindingKind, blockThicknessMm],
  );
  const dynamicRoute = useMemo(() => {
    const printType: RouteInput["printType"] =
      printMode === "auto" ? (offset ? "offset" : "digital") : (printMode as RouteInput["printType"]);
    return buildRoute({
      printType,
      hasCover: true,
      hasUnderlay: false,
      hasLamination: optCoverLam,
      hasCreasing: optCoverBig,
      hasFolding: pages > 4 || offset,
      hasDieCut: optDieCut,
      hasStamping: optStamp,
      hasEmbossing: optEmboss,
      hasDrilling: bindingKind === "spiral",
      hasPerforation: optPerf,
      hasNumbering: optNum,
      hasVariableData: isMagazine && optAddress && addressMode === "personal",
      binding: bindingKind as RouteInput["binding"],
      blocks: internalBlocks.map((b) => ({ kind: b.kind, pages: b.pages })),
      packaging: {
        bundles: packaging.bundles,
        boxes: packaging.boxes,
        shrink: packaging.shrink || optShrink,
        pallets: packaging.pallets,
      },
    });
  }, [printMode, offset, optCoverLam, optCoverBig, pages, optDieCut, optStamp, optEmboss, bindingKind, optPerf, optNum, isMagazine, optAddress, addressMode, internalBlocks, packaging, optShrink]);

  const techWarnings = useMemo(
    () =>
      validateTech({
        hasLamination: optCoverLam,
        hasCreasing: optCoverBig,
        hasFolding: pages > 4 || offset,
        binding: bindingKind,
        blockThicknessMm,
        springDiameterMm: recommendedSpring?.diameterMm,
        pages,
      }),
    [optCoverLam, optCoverBig, pages, offset, bindingKind, blockThicknessMm, recommendedSpring],
  );

  // Состав изделия (раздел 27 ТЗ)
  const composition = useMemo(() => {
    const coverOps: string[] = [];
    if (optCoverLam) coverOps.push(`Ламинация (${coverLamSides} стор.)`);
    if (optSoftTouch) coverOps.push("Soft-touch");
    if (optCoverBig) coverOps.push("Биговка");
    if (optStamp) coverOps.push("Тиснение");
    if (optEmboss) coverOps.push("Конгрев");
    if (optDieCut) coverOps.push("Высечка");
    const bindingLabel = BINDINGS.find((b) => b.value === bindingKind)?.label ?? bindingKind;
    const bindingQty =
      bindingKind === "spiral" ? 1 :
      bindingKind === "staple" || bindingKind === "eurostaple" ? Math.max(2, Math.ceil(pages / 64)) :
      1;
    return buildComposition({
      blocks: internalBlocks,
      cover: { material: `${coverPaper.label}, ${coverPaper.density} г/м²`, operations: coverOps },
      binding: {
        label: bindingLabel,
        qty: bindingQty,
        operations: bindingKind === "spiral" && recommendedSpring ? [`Ø${recommendedSpring.diameterMm} мм`] : [],
      },
      circulation,
    });
  }, [internalBlocks, coverPaper, optCoverLam, coverLamSides, optSoftTouch, optCoverBig, optStamp, optEmboss, optDieCut, bindingKind, BINDINGS, pages, recommendedSpring, circulation]);

  // Технологический отчёт (разделы 28–30 ТЗ)
  const techReport = useMemo(() => {
    const postpress: string[] = [];
    if (optCoverLam) postpress.push(`Ламинация обложки (${coverLamSides} стор.)`);
    if (optCoverBig) postpress.push("Биговка обложки");
    if (optStamp) postpress.push(`Тиснение, ${stampArea} см²`);
    if (optEmboss) postpress.push("Конгрев");
    if (optDieCut) postpress.push("Высечка");
    if (optPerf) postpress.push(`Перфорация ×${perfLines}`);
    if (optNum) postpress.push(`Нумерация ×${numCount}`);
    return {
      material: {
        name: `Блок: ${blockPaper.label}; обложка: ${coverPaper.label}`,
        purchaseFormat: `${blockPaper.sheetW}×${blockPaper.sheetH} мм`,
        purchaseSheets: blockLayout.printSheets,
      },
      imposition: {
        printFormat: `${format.w}×${format.h} мм`,
        signatures,
        printSheets: blockLayout.printSheets,
      },
      print: {
        type: offset ? "Офсет" : "Цифровая",
        colors: `${colorBlockFront}+${colorBlockBack}`,
      },
      postpress,
      route: dynamicRoute,
    };
  }, [optCoverLam, coverLamSides, optCoverBig, optStamp, stampArea, optEmboss, optDieCut, optPerf, perfLines, optNum, numCount, blockPaper, coverPaper, blockLayout, format, signatures, offset, colorBlockFront, colorBlockBack, dynamicRoute]);

  // Этап 6: расширенный итог (цена/шт, срок, листы, форматы, отходы, формы)
  const expandedTotals = useMemo<ExpandedTotalsData>(() => {
    const formsCount = offset
      ? (colorBlockFront + colorBlockBack) * signatures + (colorCoverFront + colorCoverBack)
      : 0;
    const netTotal = blockLayout.netSheets + coverLayout.netSheets;
    const printTotal = blockLayout.printSheets + coverLayout.printSheets;
    const wastePercent = netTotal > 0 ? ((printTotal - netTotal) / netTotal) * 100 : 0;

    // Срок ETA: база 2 дня + 1 день на 1000 шт + по 0.5 дня за тяжёлые операции
    let eta = 2 + Math.ceil(circulation / 1000);
    if (optCoverLam) eta += 1;
    if (optStamp || optEmboss) eta += 1;
    if (optDieCut) eta += 1;
    if (isHardcover) eta += 3;
    if (bindingKind === "sewn" || bindingKind === "sewn_kbs") eta += 2;

    return {
      totals,
      vatPercent,
      margin,
      circulation,
      pages,
      signatures,
      signaturePages,
      formatLabel: format.label,
      itemW,
      itemH,
      blockPrintSheets: blockLayout.printSheets,
      blockNetSheets: blockLayout.netSheets,
      blockSetup: blockLayout.setup,
      blockUpPerSide: blockLayout.upPerSide,
      coverPrintSheets: coverLayout.printSheets,
      coverNetSheets: coverLayout.netSheets,
      coverSetup: coverLayout.setup,
      coverUpPerSheet: coverLayout.upPerSheet,
      spineMm: coverLayout.spineMm,
      offset,
      formsCount,
      etaDays: eta,
      wastePercent,
    };
  }, [totals, vatPercent, margin, circulation, pages, signatures, signaturePages, format, itemW, itemH, blockLayout, coverLayout, offset, colorBlockFront, colorBlockBack, colorCoverFront, colorCoverBack, optCoverLam, optStamp, optEmboss, optDieCut, isHardcover, bindingKind]);

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
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: {isQuarterCal ? "Календарь квартальный" : isMemocube ? "Кубарик / блок для записей" : isNotepad ? "Блокнот" : isPlanner ? "Ежедневник" : isHardcover ? "Книга (твёрдый переплёт)" : isSoftcover ? "Книга (мягкий переплёт)" : isMagazine ? "Журнал" : isCatalog ? "Каталог" : "Брошюра"}{isMagazine ? ` №${issueNumber}` : ""}</h1>
              <p className="text-[11px] text-muted-foreground truncate">
                {isQuarterCal
                  ? "Quarter calendar — топ, подложки, 1-3 блока, пружина, ригель, курсор, сборка"
                  : isMemocube
                  ? "Memo cube — толстый бумажный блок, проклейка, подложка, брендирование торца"
                  : isNotepad
                  ? "Notepad — пружина/скоба/проклейка, отрывные листы, подложка, брендирование"
                  : isPlanner
                  ? "Daily planner — персонализация, фурнитура, премиум-материалы"
                  : isHardcover
                  ? "Hardcover 7БЦ/7Б — книжный блок, форзацы, марля, каптал, сборка крышки и вставка"
                  : isSoftcover
                  ? "Paperback / softcover — книжный блок, расчёт корешка, КБС/шитьё"
                  : isMagazine
                  ? "Периодическое издание — выпуски, вложения, адресация, термоусадка"
                  : isCatalog
                  ? "Премиальный многостраничный каталог — КБС/шитьё, премиальная обложка, премиум-постпечать"
                  : "Многостраничное изделие — блок + обложка, авто-расчёт тетрадей и скрепления"}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка {isQuarterCal ? 56 : isMemocube ? 55 : isNotepad ? 54 : isPlanner ? 53 : isHardcover ? 52 : isSoftcover ? 51 : isMagazine ? 50 : isCatalog ? 49 : 48}</Badge>
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
                  {presetKey === "custom" && (<>
                    <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} /></div>
                    <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} /></div>
                  </>)}
                  <div>
                    <Label>Количество страниц {pagesValid ? "" : <span className="text-destructive text-xs">(кратность нарушена)</span>}</Label>
                    <Input type="number" min={2} value={pages} onChange={(e) => setPages(+e.target.value || 2)} />
                  </div>
                  <div>
                    <Label>Скрепление</Label>
                    <Select value={bindingKind} onValueChange={(v) => setBindingKind(v as BindingKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BINDINGS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="flex items-end gap-2">
                    <Checkbox id="ownturn" checked={ownTurn} onCheckedChange={(v) => setOwnTurn(!!v)} />
                    <Label htmlFor="ownturn" className="cursor-pointer">Свой оборот</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">2. Обложка</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Бумага обложки</Label>
                    <Select value={coverPaperKey} onValueChange={setCoverPaperKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COVER_PAPERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({fmtMoney(p.pricePerSheet)}/лист)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Цветность обл. (лицо)</Label><Input type="number" min={0} max={6} value={colorCoverFront} onChange={(e) => setColorCoverFront(+e.target.value || 0)} /></div>
                  <div><Label>Цветность обл. (оборот)</Label><Input type="number" min={0} max={6} value={colorCoverBack} onChange={(e) => setColorCoverBack(+e.target.value || 0)} /></div>
                  <AdvancedOnly>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Корешок: ~{coverLayout.spineMm.toFixed(1)} мм. Разворот обложки: {Math.round(coverLayout.spreadW)}×{itemH} мм.{" "}
                      Печатных листов: <span className="font-medium">{coverLayout.printSheets}</span>.
                    </div>
                  </AdvancedOnly>
                </CardContent>
              </Card>

              {/* 3. Подложка (опционально) */}
              <AdvancedOnly>
                <UnderlaySection value={underlay} onChange={setUnderlay} title="3. Подложка" />
              </AdvancedOnly>

              <Card>
                <CardHeader><CardTitle className="text-sm">4. Внутренние блоки</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Бумага блока</Label>
                    <Select value={blockPaperKey} onValueChange={setBlockPaperKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BLOCK_PAPERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({fmtMoney(p.pricePerSheet)}/лист)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Цветность блока (лицо)</Label><Input type="number" min={0} max={6} value={colorBlockFront} onChange={(e) => setColorBlockFront(+e.target.value || 0)} /></div>
                  <div><Label>Цветность блока (оборот)</Label><Input type="number" min={0} max={6} value={colorBlockBack} onChange={(e) => setColorBlockBack(+e.target.value || 0)} /></div>
                  <AdvancedOnly>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Тетрадей: <span className="font-medium">{signatures}</span> × {signaturePages} стр.{" "}
                      Печатных листов блока: <span className="font-medium">{blockLayout.printSheets}</span>{" "}
                      (приладка {blockLayout.setup}/тетр.).
                    </div>
                  </AdvancedOnly>
                </CardContent>
              </Card>

              {/* 4. Внутренние блоки (ERP — мульти-блочная архитектура) */}
              <AdvancedOnly>
                <InternalBlocksEditor blocks={internalBlocks} onChange={setInternalBlocks} />
              </AdvancedOnly>

              {/* 4. Допечатка */}
              <AdvancedOnly>
                <PrepressSection value={prepress} onChange={setPrepress} title="5. Допечатка" />
              </AdvancedOnly>

              {/* 5. Печать (сводка) */}
              <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">6. Печать</CardTitle></CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <div>Тип печати: <span className="font-medium text-foreground">{printMode === "auto" ? "Авто (выбор движком)" : printMode === "offset" ? "Офсет" : "Цифра"}</span></div>
                    <div>Печатных листов блока: <span className="font-medium text-foreground">{blockLayout.printSheets}</span> · обложки: <span className="font-medium text-foreground">{coverLayout.printSheets}</span></div>
                    <div>Цветность блока: {colorBlockFront}+{colorBlockBack}. Цветность обложки: {colorCoverFront}+{colorCoverBack}.</div>
                  </CardContent>
                </Card>
              </AdvancedOnly>

              {/* 6. Постпечатка (обложка) */}
              <AdvancedOnly>
              <Card>
                <CardHeader><CardTitle className="text-sm">7. Постпечатка (обложка)</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Ламинация обложки" checked={optCoverLam} onChange={setOptCoverLam}>
                    <Select value={String(coverLamSides)} onValueChange={(v) => setCoverLamSides(+v as 1 | 2)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 сторона</SelectItem>
                        <SelectItem value="2">2 стороны</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row label="Soft-touch плёнка (премиум)" checked={optSoftTouch} onChange={setOptSoftTouch} />
                  <Row label="Биговка обложки (авто при ламинации/плотной)" checked={optCoverBig} onChange={setOptCoverBig} />
                  <Row label="Лак (УФ/ВД)" checked={optVarnish} onChange={setOptVarnish} />
                  <Row label="Выборочный лак (+ подготовка/приладка)" checked={optSpotVarnish} onChange={setOptSpotVarnish} />
                  <Row label="Тиснение фольгой" checked={optStamp} onChange={setOptStamp}>
                    <Input className="h-8 w-24" type="number" min={0} value={stampArea} onChange={(e) => setStampArea(+e.target.value || 0)} />
                    <span className="text-xs text-muted-foreground">см² клише</span>
                  </Row>
                  <Row label="Конгрев" checked={optEmboss} onChange={setOptEmboss} />
                  <Row label="Перфорация" checked={optPerf} onChange={setOptPerf}>
                    <Input className="h-8 w-20" type="number" min={1} value={perfLines} onChange={(e) => setPerfLines(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">лин. ×</span>
                    <Input className="h-8 w-20" type="number" min={1} value={perfLineMm} onChange={(e) => setPerfLineMm(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">мм</span>
                  </Row>
                  <Row label="Нумерация" checked={optNum} onChange={setOptNum}>
                    <Input className="h-8 w-20" type="number" min={1} value={numCount} onChange={(e) => setNumCount(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">ном./изд.</span>
                  </Row>
                  <Row label="Высечка обложки" checked={optDieCut} onChange={setOptDieCut} />
                  <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                  <Row label="Скругление углов" checked={optRound} onChange={setOptRound}>
                    <Input className="h-8 w-20" type="number" min={1} max={4} value={roundCorners} onChange={(e) => setRoundCorners(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">угла</span>
                  </Row>
                  {isCatalogLike && (
                    <div className="text-xs text-muted-foreground pt-1">
                      Коэф. сложности обложки: <span className="font-medium">×{premiumCoef.toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              </AdvancedOnly>

              {/* 7. Сборка / конструкция (зависит от типа изделия) */}
              {isMagazine && (
                <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Выпуск, вложения и адресация</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Номер выпуска</Label><Input value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} /></div>
                    <div>
                      <Label>Периодичность</Label>
                      <Select value={periodicity} onValueChange={(v) => setPeriodicity(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Еженедельно</SelectItem>
                          <SelectItem value="monthly">Ежемесячно</SelectItem>
                          <SelectItem value="quarterly">Ежеквартально</SelectItem>
                          <SelectItem value="oneoff">Разовый</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-2 text-sm">
                      <Row label="Вложения / вкладка образцов" checked={optInserts} onChange={setOptInserts}>
                        <Input className="h-8 w-20" type="number" min={1} value={insertCount} onChange={(e) => setInsertCount(+e.target.value || 1)} />
                        <span className="text-xs text-muted-foreground">вложений/изд.</span>
                        <Checkbox id="insertauto" checked={insertAuto} onCheckedChange={(v) => setInsertAuto(!!v)} />
                        <Label htmlFor="insertauto" className="cursor-pointer text-xs">авто-вкладка</Label>
                      </Row>
                      <Row label="Адресация (почтовая)" checked={optAddress} onChange={setOptAddress}>
                        <Select value={addressMode} onValueChange={(v) => setAddressMode(v as any)}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sticker">Наклейка адресов</SelectItem>
                            <SelectItem value="print">Печать адресов</SelectItem>
                            <SelectItem value="personal">Персонализация</SelectItem>
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row label="Термоусадка" checked={optShrink} onChange={setOptShrink} />
                    </div>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Шаблон выпуска №{issueNumber} ({periodicity}) — параметры сохраняются для повторных тиражей.
                    </div>
                  </CardContent>
                </Card>
                </AdvancedOnly>
              )}

              {(isHardcover || isSoftcover) && (
                <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Тип книги</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Тип изделия</Label>
                      <Select value={bookKind} onValueChange={(v) => setBookKind(v as BookKind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BOOK_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                      Коэф. финальной сборки: ×{bookAssemblyCoef.toFixed(2)}.
                      Premium/коллекционные — авто soft-touch, тиснение, конгрев, ляссе, футляр, premium-упаковка.
                    </div>
                  </CardContent>
                </Card>
                </AdvancedOnly>
              )}

              {isHardcover && (
                <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Переплётная крышка и премиум</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Покровный материал</Label>
                      <Select value={hcCoverMaterial} onValueChange={(v) => setHcCoverMaterial(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="coated">Мелованная бумага</SelectItem>
                          <SelectItem value="designer">Дизайнерская бумага</SelectItem>
                          <SelectItem value="bumvinyl">Бумвинил</SelectItem>
                          <SelectItem value="fabric">Ткань</SelectItem>
                          <SelectItem value="leather">Кожа</SelectItem>
                          <SelectItem value="balacron">Балакрон</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Толщина картона, мм</Label>
                      <Input type="number" step={0.1} value={hcBoardThicknessMm} onChange={(e) => setHcBoardThicknessMm(+e.target.value || 0)} />
                    </div>
                    <div className="sm:col-span-2 space-y-2 text-sm">
                      <Row label="Ляссе" checked={hcOptLasse} onChange={setHcOptLasse} />
                      <Row label="Окрашивание среза" checked={hcOptEdgeColor} onChange={setHcOptEdgeColor} />
                      <Row label="Фольгирование среза" checked={hcOptEdgeFoil} onChange={setHcOptEdgeFoil} />
                      <Row label="Суперобложка (отд. маршрут)" checked={hcOptSuperjacket} onChange={setHcOptSuperjacket} />
                      <Row label="Футляр (отд. маршрут)" checked={hcOptSlipcase} onChange={setHcOptSlipcase} />
                      <Row label="Шубер (отд. маршрут)" checked={hcOptShubr} onChange={setHcOptShubr} />
                    </div>
                  </CardContent>
                </Card>
                </AdvancedOnly>
              )}

              {isPlanner && (
                <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Фурнитура и персонализация</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Row label="Датированный (календарная сетка)" checked={plDated} onChange={setPlDated} />
                    <Row label="Резинка (+ пробивка, авто)" checked={plOptElastic} onChange={setPlOptElastic} />
                    <Row label="Магнит" checked={plOptMagnet} onChange={setPlOptMagnet} />
                    <Row label="Карман" checked={plOptPocket} onChange={setPlOptPocket} />
                    <Row label="Петля под ручку" checked={plOptPenLoop} onChange={setPlOptPenLoop} />
                    <Row label="Металлические уголки (ручная установка)" checked={plOptCorners} onChange={setPlOptCorners}>
                      <Input className="h-8 w-20" type="number" min={1} max={4} value={plCornersCount} onChange={(e) => setPlCornersCount(+e.target.value || 1)} />
                      <span className="text-xs text-muted-foreground">уг./изд.</span>
                    </Row>
                    <Row label="Шильдик" checked={plOptNameplate} onChange={setPlOptNameplate} />
                    <Row label="Персонализация (имя/логотип)" checked={plOptPersonalize} onChange={setPlOptPersonalize} />
                    <Row label="Индивидуальная подарочная упаковка" checked={plOptGiftBox} onChange={setPlOptGiftBox} />
                  </CardContent>
                </Card>
                </AdvancedOnly>
              )}

              {isCatalogLike && (
                <AdvancedOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Конструкция каталога/журнала</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Тип изделия</Label>
                      <Select value={catalogKind} onValueChange={(v) => setCatalogKind(v as CatalogKind)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATALOG_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-2 text-sm">
                      <Row label="Клапаны обложки" checked={optFlaps} onChange={setOptFlaps}>
                        <Input className="h-8 w-20" type="number" min={20} value={flapWidthMm} onChange={(e) => setFlapWidthMm(+e.target.value || 0)} />
                        <span className="text-xs text-muted-foreground">мм ширина</span>
                      </Row>
                      <Row label="Вкладки (tabs) с высечкой" checked={optTabs} onChange={setOptTabs}>
                        <Input className="h-8 w-20" type="number" min={1} value={tabsCount} onChange={(e) => setTabsCount(+e.target.value || 1)} />
                        <span className="text-xs text-muted-foreground">шт./изд.</span>
                      </Row>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Тип упаковки</Label>
                      <Select value={packagingKind} onValueChange={(v) => setPackagingKind(v as any)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bundle">Пачка</SelectItem>
                          <SelectItem value="box">Коробка</SelectItem>
                          <SelectItem value="shrink">Термоусадка</SelectItem>
                          <SelectItem value="individual">Индивидуальная</SelectItem>
                          <SelectItem value="premium">Premium-упаковка</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(optTabs || optInserts) && (
                      <div className="sm:col-span-2 text-xs text-muted-foreground">
                        Контроль комплектности: ×1.4 (вкладки/вставки).
                      </div>
                    )}
                  </CardContent>
                </Card>
                </AdvancedOnly>
              )}

              {/* 8. Контроль качества */}
              {/* 7. Сборка (после постпечатки) */}
              <AdvancedOnly>
                <AssemblySection value={assembly} onChange={setAssembly} title="8. Сборка" />
              </AdvancedOnly>

              {/* 9. Спецоперации (после сборки) */}
              <AdvancedOnly>
                <SpecialOpsSection value={specialOps} onChange={setSpecialOps} title="9. Спецоперации" />
              </AdvancedOnly>

              <AdvancedOnly>
                <QualityControlSection value={qc} onChange={setQc} title="10. Контроль качества" />
              </AdvancedOnly>

              {/* 11. Упаковка */}
              <AdvancedOnly>
                <PackagingSection value={packaging} onChange={setPackaging} title="11. Упаковка" />
              </AdvancedOnly>

              <Card>
                <CardHeader><CardTitle className="text-sm">Доставка и оплата</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-end gap-2">
                    <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                    <Label htmlFor="delivery" className="cursor-pointer">Включить доставку</Label>
                  </div>
                  {hasDelivery && (<div><Label>Стоимость доставки</Label><Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} /></div>)}
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <AdvancedOnly>
                <TechWarnings warnings={techWarnings} />
              </AdvancedOnly>

              <AdvancedOnly>
                <RouteTimeline operations={dynamicRoute} />
              </AdvancedOnly>

              <AdvancedOnly>
                <CompositionTable rows={composition} />
              </AdvancedOnly>

              <TechOnly>
                <TechReport data={techReport} />
              </TechOnly>

              {/* Простой режим: компактный список операций как раньше. */}
              <SimpleOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Маршрут</CardTitle></CardHeader>
                  <CardContent>
                    <ol className="text-xs space-y-1 list-decimal pl-4">
                      {route.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </CardContent>
                </Card>
              </SimpleOnly>

              <SimpleOnly>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Итого</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Себестоимость</span><span>{fmtMoney(totals.cost)}</span></div>
                    <div className="flex justify-between"><span>Цена продажи</span><span>{fmtMoney(totals.sale)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-medium"><span>С НДС {vatPercent}%</span><span>{fmtMoney(totals.withVat)}</span></div>
                    <div className="flex justify-between text-accent font-semibold"><span>За штуку</span><span>{fmtMoney(totals.perItem)}</span></div>
                  </CardContent>
                </Card>
              </SimpleOnly>
              <AdvancedOnly>
                <ExpandedTotals data={expandedTotals} />
              </AdvancedOnly>

              <TemplateActions
                productType={
                  isQuarterCal ? "calendar_quarter"
                  : isMemocube ? "kubus"
                  : isNotepad || isPlanner ? "notepad"
                  : isHardcover || isSoftcover ? "book"
                  : isMagazine ? "magazine"
                  : isCatalog ? "brochure"
                  : "brochure"
                }
                defaultName={`${isQuarterCal ? "Календарь квартальный" : isMemocube ? "Кубарик" : isNotepad ? "Блокнот" : isPlanner ? "Ежедневник" : isHardcover ? "Книга (7БЦ)" : isSoftcover ? "Книга (КБС)" : isMagazine ? "Журнал" : isCatalog ? "Каталог" : "Брошюра"} ${circulation} шт`}
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
              storageKey="brochure"
              spec={lines.map((l) => ({ stage: l.stage, name: l.name, qty: l.qty, unit: l.unit, price: l.price, total: l.total }))}
              metrics={{
                printSheets: blockLayout.printSheets + coverLayout.printSheets,
                purchaseSheets: (blockLayout as any).netSheets ?? undefined,
                wasteSheets: Math.max(0, (blockLayout.printSheets + coverLayout.printSheets) - (((blockLayout as any).netSheets ?? 0) + ((coverLayout as any).netSheets ?? 0))) || undefined,
                impositions: signatures,
                forms: offset
                  ? ((colorBlockFront + colorBlockBack) * signatures) + (colorCoverFront + colorCoverBack)
                  : 0,
                makereadyCount: offset ? signatures + 1 : 0,
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