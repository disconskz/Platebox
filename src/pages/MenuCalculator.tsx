import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

import LegacyCostByStageBlock from "@/components/calc/multipage/LegacyCostByStageBlock";
/**
 * Доработка 44 — выделенный шаблон «Меню».
 * Поддерживает бумажные, ламинированные, на пружине/кольцах/болтах,
 * комбинированные премиум-меню с фурнитурой и сборкой.
 */

type MenuFormat = { value: string; label: string; w: number; h: number };
const MENU_FORMATS: MenuFormat[] = [
  { value: "A5", label: "A5 (148×210)", w: 148, h: 210 },
  { value: "A4", label: "A4 (210×297)", w: 210, h: 297 },
  { value: "A3", label: "A3 (297×420)", w: 297, h: 420 },
  { value: "square", label: "Квадрат 210×210", w: 210, h: 210 },
  { value: "DL", label: "DL (99×210)", w: 99, h: 210 },
  { value: "custom", label: "Свой размер", w: 210, h: 297 },
];

type MenuKind =
  | "paper"
  | "laminated"
  | "waterproof"
  | "spiral"
  | "rings"
  | "bolts"
  | "plywood"
  | "leather"
  | "combo";

const MENU_KINDS: { value: MenuKind; label: string; complexity: number; wood?: boolean }[] = [
  { value: "paper", label: "Бумажное", complexity: 1.0 },
  { value: "laminated", label: "Ламинированное", complexity: 1.1 },
  { value: "waterproof", label: "Waterproof", complexity: 1.2 },
  { value: "spiral", label: "На пружине", complexity: 1.25 },
  { value: "rings", label: "На кольцах", complexity: 1.2 },
  { value: "bolts", label: "На болтах", complexity: 1.25 },
  { value: "plywood", label: "На фанере", complexity: 1.4, wood: true },
  { value: "leather", label: "С кожей / кожзамом", complexity: 1.5 },
  { value: "combo", label: "Комбинированное", complexity: 1.45 },
];

type PaperKind = "coated" | "designer" | "synthetic" | "plastic" | "waterproof";
const PAPERS: { value: PaperKind; label: string; pricePerSheet: number; sheetW: number; sheetH: number; density: number }[] = [
  { value: "coated", label: "Мелованная 250 г/м²", pricePerSheet: 80, sheetW: 720, sheetH: 1020, density: 250 },
  { value: "designer", label: "Дизайнерская 300 г/м²", pricePerSheet: 220, sheetW: 720, sheetH: 1020, density: 300 },
  { value: "synthetic", label: "Синтетическая", pricePerSheet: 340, sheetW: 720, sheetH: 1020, density: 200 },
  { value: "plastic", label: "Пластик ПВХ 0.3мм", pricePerSheet: 520, sheetW: 720, sheetH: 1020, density: 350 },
  { value: "waterproof", label: "Waterproof", pricePerSheet: 380, sheetW: 720, sheetH: 1020, density: 220 },
];

type BaseKind = "none" | "plywood" | "wood" | "binder" | "pvc" | "acrylic" | "composite";
const BASES: { value: BaseKind; label: string; pricePerM2: number; allowsLaser?: boolean }[] = [
  { value: "none", label: "Без основы", pricePerM2: 0 },
  { value: "plywood", label: "Фанера", pricePerM2: 4500, allowsLaser: true },
  { value: "wood", label: "Дерево", pricePerM2: 8500, allowsLaser: true },
  { value: "binder", label: "Переплётный картон", pricePerM2: 1200 },
  { value: "pvc", label: "ПВХ", pricePerM2: 1800 },
  { value: "acrylic", label: "Акрил", pricePerM2: 6500, allowsLaser: true },
  { value: "composite", label: "Композит", pricePerM2: 3500 },
];

type CoverKind = "none" | "leather" | "leatherette" | "fabric" | "softtouch" | "lam";
const COVERS: { value: CoverKind; label: string; pricePerM2: number; complexityBoost: number }[] = [
  { value: "none", label: "Без покрытия", pricePerM2: 0, complexityBoost: 0 },
  { value: "leather", label: "Кожа", pricePerM2: 12000, complexityBoost: 0.2 },
  { value: "leatherette", label: "Кожзам", pricePerM2: 3500, complexityBoost: 0.15 },
  { value: "fabric", label: "Ткань", pricePerM2: 2500, complexityBoost: 0.1 },
  { value: "softtouch", label: "Soft-touch плёнка", pricePerM2: 800, complexityBoost: 0.1 },
  { value: "lam", label: "Ламинация", pricePerM2: 250, complexityBoost: 0 },
];

type BindingKind = "none" | "spiral" | "rings" | "bolts" | "magnets" | "corners" | "eyelets";
const BINDINGS: { value: BindingKind; label: string; perElement: number; defaultCount: number; needsPerforation?: boolean; needsSpiral?: boolean }[] = [
  { value: "none", label: "Без фурнитуры", perElement: 0, defaultCount: 0 },
  { value: "spiral", label: "Пружина", perElement: 120, defaultCount: 1, needsPerforation: true, needsSpiral: true },
  { value: "rings", label: "Кольца", perElement: 60, defaultCount: 2 },
  { value: "bolts", label: "Болты", perElement: 150, defaultCount: 3 },
  { value: "magnets", label: "Магниты", perElement: 80, defaultCount: 2 },
  { value: "corners", label: "Уголки", perElement: 30, defaultCount: 4 },
  { value: "eyelets", label: "Люверсы", perElement: 25, defaultCount: 4 },
];

export default function MenuCalculator() {
  const [menuKind, setMenuKind] = useState<MenuKind>("laminated");
  const [presetKey, setPresetKey] = useState("A4");
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);
  const [circulation, setCirculation] = useState(50);
  const [pages, setPages] = useState(4);
  const [colorFront, setColorFront] = useState(4);
  const [colorBack, setColorBack] = useState(4);
  const [paperKind, setPaperKind] = useState<PaperKind>("coated");
  const [baseKind, setBaseKind] = useState<BaseKind>("none");
  const [coverKind, setCoverKind] = useState<CoverKind>("none");
  const [bindingKind, setBindingKind] = useState<BindingKind>("none");
  const [hardwareCount, setHardwareCount] = useState(0);
  const [printMode, setPrintMode] = useState<"auto" | "offset" | "digital">("auto");
  const [hasDesign, setHasDesign] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [margin, setMargin] = useState(40);
  const [vatPercent] = useState(16);

  // Постпечать
  const [optLam, setOptLam] = useState(true);
  const [optLamSides, setOptLamSides] = useState<1 | 2>(2);
  const [optVarnish, setOptVarnish] = useState(false);
  const [optFold, setOptFold] = useState(false);
  const [foldCount, setFoldCount] = useState(1);
  const [optBig, setOptBig] = useState(false);
  const [bigCount, setBigCount] = useState(1);
  const [optPerfSpiral, setOptPerfSpiral] = useState(false);
  const [optSpiral, setOptSpiral] = useState(false);
  const [optStamp, setOptStamp] = useState(false);
  const [stampArea, setStampArea] = useState(15);
  const [optEmboss, setOptEmboss] = useState(false);
  const [optDieCut, setOptDieCut] = useState(false);
  const [optDeflash, setOptDeflash] = useState(false);
  const [optRound, setOptRound] = useState(false);
  const [optLaserCut, setOptLaserCut] = useState(false);
  const [laserMeters, setLaserMeters] = useState(0.5);
  const [optEngrave, setOptEngrave] = useState(false);
  const [engraveCm2, setEngraveCm2] = useState(20);
  const [assemblyMinutes, setAssemblyMinutes] = useState(3);

  const format = useMemo(
    () => MENU_FORMATS.find((f) => f.value === presetKey) ?? MENU_FORMATS[1],
    [presetKey]
  );
  const itemW = format.value === "custom" ? customW : format.w;
  const itemH = format.value === "custom" ? customH : format.h;
  const paper = useMemo(() => PAPERS.find((p) => p.value === paperKind)!, [paperKind]);
  const base = useMemo(() => BASES.find((b) => b.value === baseKind)!, [baseKind]);
  const cover = useMemo(() => COVERS.find((c) => c.value === coverKind)!, [coverKind]);
  const kind = useMemo(() => MENU_KINDS.find((k) => k.value === menuKind)!, [menuKind]);
  const binding = useMemo(() => BINDINGS.find((b) => b.value === bindingKind)!, [bindingKind]);
  const woodBase = !!base.allowsLaser;

  // Авто-логика
  useEffect(() => {
    // Пружина → перфорация + навивка
    if (binding.needsPerforation) setOptPerfSpiral(true);
    if (binding.needsSpiral) setOptSpiral(true);
    if (!hardwareCount && binding.defaultCount) setHardwareCount(binding.defaultCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bindingKind]);

  useEffect(() => {
    // Биговка: если фальцовка + плотная бумага или ламинация
    if (optFold && (paper.density > 170 || optLam) && !optBig) setOptBig(true);
  }, [optFold, paper.density, optLam, optBig]);

  useEffect(() => {
    // Удаление облоя после высечки
    if (optDieCut && !optDeflash) setOptDeflash(true);
  }, [optDieCut, optDeflash]);

  // ====== РАСЧЁТЫ ======
  const layout = useMemo(() => {
    // Простая раскладка на закупочный лист
    const sheetW = paper.sheetW;
    const sheetH = paper.sheetH;
    const printW = Math.min(sheetW, 720);
    const printH = Math.min(sheetH, 520);
    const cols = Math.max(1, Math.floor(printW / itemW));
    const rows = Math.max(1, Math.floor(printH / itemH));
    const colsR = Math.max(1, Math.floor(printW / itemH));
    const rowsR = Math.max(1, Math.floor(printH / itemW));
    const ips = cols * rows;
    const ipsR = colsR * rowsR;
    const rotated = ipsR > ips;
    const itemsPerSheet = Math.max(ips, ipsR);
    const sheetsFromPurchase = Math.floor(sheetW / printW) * Math.floor(sheetH / printH);
    const totalLeaves = pages * circulation;
    const netSheets = Math.ceil(totalLeaves / Math.max(1, itemsPerSheet));
    const setup = printMode === "offset" || (printMode === "auto" && circulation >= 200) ? 150 : 30;
    const printSheets = netSheets + setup;
    const purchaseSheets = Math.ceil(printSheets / Math.max(1, sheetsFromPurchase));
    return { cols, rows, rotated, itemsPerSheet, netSheets, printSheets, purchaseSheets, setup, printW, printH };
  }, [paper, itemW, itemH, pages, circulation, printMode]);

  const offset = printMode === "offset" || (printMode === "auto" && circulation >= 200);

  const lines = useMemo(() => {
    const out: { stage: string; name: string; qty: number; unit: string; price: number; total: number }[] = [];
    const push = (stage: string, name: string, qty: number, unit: string, price: number) =>
      out.push({ stage, name, qty, unit, price, total: qty * price });

    if (hasDesign) push("Препресс", "Дизайн", 1, "усл.", 8000);
    push("Препресс", "Проверка макета", 1, "усл.", 500);

    // Бумага
    push("Материалы", `Бумага: ${paper.label}`, layout.purchaseSheets, "лист", paper.pricePerSheet);
    push("Материалы", "Резка закупочного → печатный", layout.purchaseSheets, "рез", 4);

    // Основа
    if (base.value !== "none") {
      const areaM2 = (itemW * itemH) / 1_000_000;
      push("Материалы", `Основа: ${base.label}`, +(areaM2 * circulation).toFixed(3), "м²", base.pricePerM2);
    }
    // Покрытие
    if (cover.value !== "none") {
      const areaM2 = (itemW * itemH * 2) / 1_000_000; // 2 стороны обложки
      push("Материалы", `Покрытие: ${cover.label}`, +(areaM2 * circulation).toFixed(3), "м²", cover.pricePerM2);
    }

    // Печать
    if (offset) {
      const forms = (colorFront > 0 ? colorFront : 0) + (colorBack > 0 ? colorBack : 0);
      push("Печать", "Печатные формы", forms, "форма", 1500);
      push("Печать", "Приладка офсет", 1, "усл.", 150 + 0.01 * layout.printSheets * 100);
    }
    const printPrice = offset ? 6 : 35;
    push("Печать", offset ? "Печать офсет" : "Печать цифра", layout.printSheets, "лист", printPrice);

    // Постпечать
    if (optLam) {
      const areaM2 = (layout.printW * layout.printH) / 1_000_000;
      push("Постпечать", `Ламинация (${optLamSides} ст.)`, +(areaM2 * layout.printSheets * optLamSides).toFixed(3), "м²", 220);
    }
    if (optVarnish) push("Постпечать", "УФ/ВД-лак", layout.printSheets, "лист", 4);
    if (optBig) push("Постпечать", "Биговка", circulation * pages * bigCount, "биг", 1.5);
    if (optFold) push("Постпечать", "Фальцовка", circulation * foldCount, "фальц", 1.2);
    if (optPerfSpiral) {
      const holes = Math.max(20, Math.round(itemH / 6));
      push("Постпечать", "Перфорация под пружину", holes * circulation, "отв.", 0.8);
    }
    if (optSpiral) push("Постпечать", "Навивка пружины", circulation, "шт.", 60);
    if (optStamp) push("Постпечать", "Тиснение фольгой", circulation, "оттиск", Math.max(8, stampArea * 0.6) * kind.complexity);
    if (optEmboss) push("Постпечать", "Конгрев", circulation, "оттиск", 12 * kind.complexity);
    if (optDieCut) push("Постпечать", "Высечка", layout.printSheets, "лист", 3);
    if (optDieCut && optDeflash) push("Постпечать", "Удаление облоя", layout.printSheets, "лист", 1.5);
    if (optRound) push("Постпечать", "Скругление углов", circulation * 4, "угол", 0.5);
    if (woodBase && optLaserCut) push("Постпечать", "Лазерная резка", +(laserMeters * circulation).toFixed(2), "м", 350);
    if (woodBase && optEngrave) push("Постпечать", "Гравировка", +(engraveCm2 * circulation).toFixed(1), "см²", 4);

    // Фурнитура
    if (binding.value !== "none" && hardwareCount > 0) {
      push("Сборка", `Фурнитура: ${binding.label}`, circulation * hardwareCount, "шт.", binding.perElement);
    }

    // Сборка
    if (menuKind !== "paper" || base.value !== "none" || cover.value !== "none" || binding.value !== "none") {
      const minuteCost = 200; // ₸/мин
      const complexity = kind.complexity + cover.complexityBoost;
      push("Сборка", "Сборка меню", circulation, "шт.", assemblyMinutes * minuteCost * complexity / 60);
    }

    push("Логистика", "Контроль качества", 1, "усл.", 1000);
    push("Логистика", "Упаковка", circulation, "шт.", 5);
    if (hasDelivery) push("Логистика", "Доставка", 1, "усл.", deliveryCost);
    return out;
  }, [hasDesign, paper, base, cover, layout, itemW, itemH, circulation, offset, colorFront, colorBack, optLam, optLamSides, optVarnish, optBig, bigCount, optFold, foldCount, pages, optPerfSpiral, optSpiral, optStamp, stampArea, kind, optEmboss, optDieCut, optDeflash, optRound, woodBase, optLaserCut, laserMeters, optEngrave, engraveCm2, binding, hardwareCount, assemblyMinutes, menuKind, hasDelivery, deliveryCost]);

  const totals = useMemo(() => {
    const cost = lines.reduce((s, l) => s + l.total, 0);
    const sale = cost * (1 + margin / 100);
    const withVat = sale * (1 + vatPercent / 100);
    const perItem = circulation > 0 ? withVat / circulation : 0;
    return { cost, sale, withVat, perItem };
  }, [lines, margin, vatPercent, circulation]);

  const route = useMemo(() => {
    const s: string[] = [];
    if (hasDesign) s.push("Дизайн");
    s.push("Проверка макета", "Подбор формата и раскладка", "Бумага/материалы", "Резка закупочного → печатный");
    if (offset) s.push("Вывод печатных форм", "Приладка");
    s.push(offset ? "Печать офсет" : "Печать цифра");
    if (optLam) s.push("Ламинация");
    if (optVarnish) s.push("Лакировка");
    if (optBig) s.push("Биговка");
    if (optFold) s.push("Фальцовка");
    if (optPerfSpiral) s.push("Перфорация под пружину");
    if (optSpiral) s.push("Навивка пружины");
    if (optStamp) s.push("Тиснение");
    if (optEmboss) s.push("Конгрев");
    if (optDieCut) s.push("Высечка");
    if (optDieCut && optDeflash) s.push("Удаление облоя");
    if (optRound) s.push("Скругление углов");
    if (woodBase && optLaserCut) s.push("Лазерная резка");
    if (woodBase && optEngrave) s.push("Гравировка");
    s.push("Резка готовой продукции");
    if (binding.value !== "none" || cover.value !== "none" || base.value !== "none") s.push("Сборка");
    s.push("Контроль качества", "Упаковка");
    if (hasDelivery) s.push("Доставка");
    return s;
  }, [hasDesign, offset, optLam, optVarnish, optBig, optFold, optPerfSpiral, optSpiral, optStamp, optEmboss, optDieCut, optDeflash, optRound, woodBase, optLaserCut, optEngrave, binding, cover, base, hasDelivery]);

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderRow>
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon">
              <Link to="/app" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <FileText className="h-5 w-5 text-accent" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">Шаблон: Меню</h1>
              <p className="text-[11px] text-muted-foreground truncate">Комбинированные материалы, фурнитура, сборка — премиум-маршрут</p>
            </div>
          </div>
          <Badge variant="secondary" className="ml-auto">Доработка 44</Badge>
        </PageHeaderRow>
      </PageHeader>

      <PageMain>
        <PageContainer>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">1. Основные параметры</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Тип меню</Label>
                    <Select value={menuKind} onValueChange={(v) => setMenuKind(v as MenuKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MENU_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Формат</Label>
                    <Select value={presetKey} onValueChange={setPresetKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MENU_FORMATS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {presetKey === "custom" && (
                    <>
                      <div><Label>Ширина, мм</Label><Input type="number" value={customW} onChange={(e) => setCustomW(+e.target.value || 0)} /></div>
                      <div><Label>Высота, мм</Label><Input type="number" value={customH} onChange={(e) => setCustomH(+e.target.value || 0)} /></div>
                    </>
                  )}
                  <div><Label>Тираж</Label><Input type="number" min={1} value={circulation} onChange={(e) => setCirculation(+e.target.value || 0)} /></div>
                  <div><Label>Количество страниц</Label><Input type="number" min={1} value={pages} onChange={(e) => setPages(+e.target.value || 1)} /></div>
                  <div><Label>Цветность лицо</Label><Input type="number" min={0} max={6} value={colorFront} onChange={(e) => setColorFront(+e.target.value || 0)} /></div>
                  <div><Label>Цветность оборот</Label><Input type="number" min={0} max={6} value={colorBack} onChange={(e) => setColorBack(+e.target.value || 0)} /></div>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">2. Бумага и материалы</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Печатная бумага</Label>
                    <Select value={paperKind} onValueChange={(v) => setPaperKind(v as PaperKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAPERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} ({fmtMoney(p.pricePerSheet)}/лист)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Основа меню</Label>
                    <Select value={baseKind} onValueChange={(v) => setBaseKind(v as BaseKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BASES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Покрытие</Label>
                    <Select value={coverKind} onValueChange={(v) => setCoverKind(v as CoverKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COVERS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    Раскладка: {layout.cols}×{layout.rows} = {layout.itemsPerSheet} изд./лист{layout.rotated ? " (повёрнуто)" : ""}.{" "}
                    Печатных листов: {layout.printSheets} (приладка {layout.setup}). Закупочных: {layout.purchaseSheets}.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">3. Сборка и фурнитура</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Фурнитура / сборка</Label>
                    <Select value={bindingKind} onValueChange={(v) => setBindingKind(v as BindingKind)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BINDINGS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Кол-во элементов на меню</Label>
                    <Input type="number" min={0} value={hardwareCount} onChange={(e) => setHardwareCount(+e.target.value || 0)} />
                  </div>
                  <div>
                    <Label>Сборка, мин/шт.</Label>
                    <Input type="number" min={0} value={assemblyMinutes} onChange={(e) => setAssemblyMinutes(+e.target.value || 0)} />
                  </div>
                  <div className="text-xs text-muted-foreground self-end">
                    Коэф. сложности: <span className="font-medium">×{(kind.complexity + cover.complexityBoost).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">4. Постпечатные операции</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Ламинация" checked={optLam} onChange={setOptLam}>
                    <Select value={String(optLamSides)} onValueChange={(v) => setOptLamSides(+v as 1 | 2)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 сторона</SelectItem>
                        <SelectItem value="2">2 стороны</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row label="Лак (УФ/ВД)" checked={optVarnish} onChange={setOptVarnish} />
                  <Row label="Биговка (авто при фальцовке плотной/ламинированной)" checked={optBig} onChange={setOptBig}>
                    <Input className="h-8 w-20" type="number" min={1} value={bigCount} onChange={(e) => setBigCount(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">биг.</span>
                  </Row>
                  <Row label="Фальцовка" checked={optFold} onChange={setOptFold}>
                    <Input className="h-8 w-20" type="number" min={1} value={foldCount} onChange={(e) => setFoldCount(+e.target.value || 1)} />
                    <span className="text-xs text-muted-foreground">фальц.</span>
                  </Row>
                  <Row label="Перфорация под пружину" checked={optPerfSpiral} onChange={setOptPerfSpiral} />
                  <Row label="Навивка пружины" checked={optSpiral} onChange={setOptSpiral} />
                  <Row label="Тиснение фольгой" checked={optStamp} onChange={setOptStamp}>
                    <Input className="h-8 w-24" type="number" min={0} value={stampArea} onChange={(e) => setStampArea(+e.target.value || 0)} />
                    <span className="text-xs text-muted-foreground">см² клише</span>
                  </Row>
                  <Row label="Конгрев" checked={optEmboss} onChange={setOptEmboss} />
                  <Row label="Высечка" checked={optDieCut} onChange={setOptDieCut} />
                  <Row label="Удаление облоя (авто после высечки)" checked={optDeflash} onChange={setOptDeflash} />
                  <Row label="Скругление углов" checked={optRound} onChange={setOptRound} />
                  {woodBase && (
                    <>
                      <Row label="Лазерная резка" checked={optLaserCut} onChange={setOptLaserCut}>
                        <Input className="h-8 w-24" type="number" min={0} step={0.1} value={laserMeters} onChange={(e) => setLaserMeters(+e.target.value || 0)} />
                        <span className="text-xs text-muted-foreground">м/шт.</span>
                      </Row>
                      <Row label="Гравировка" checked={optEngrave} onChange={setOptEngrave}>
                        <Input className="h-8 w-24" type="number" min={0} value={engraveCm2} onChange={(e) => setEngraveCm2(+e.target.value || 0)} />
                        <span className="text-xs text-muted-foreground">см²/шт.</span>
                      </Row>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">5. Упаковка и доставка</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-end gap-2">
                    <Checkbox id="delivery" checked={hasDelivery} onCheckedChange={(v) => setHasDelivery(!!v)} />
                    <Label htmlFor="delivery" className="cursor-pointer">Включить доставку</Label>
                  </div>
                  {hasDelivery && (
                    <div><Label>Стоимость доставки</Label><Input type="number" value={deliveryCost} onChange={(e) => setDeliveryCost(+e.target.value || 0)} /></div>
                  )}
                  <div><Label>Наценка, %</Label><Input type="number" value={margin} onChange={(e) => setMargin(+e.target.value || 0)} /></div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Маршрут</CardTitle></CardHeader>
                <CardContent>
                  <ol className="text-xs space-y-1 list-decimal pl-4">
                    {route.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>

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

              <TemplateActions
                productType="leaflet"
                defaultName={`Меню ${circulation} шт`}
                circulation={circulation}
                totals={totals}
                margin={margin}
                vatPercent={vatPercent}
                spec={lines.map((l) => ({ stage: l.stage, name: l.name, quantity: l.qty, unit: l.unit, unitPrice: l.price, total: l.total }))}
              />
            </div>
          </div>

          <LegacyCostByStageBlock lines={lines as any} storageKey="legacy-menu" />
          
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
      </PageMain>
    </PageShell>
  );
}

function Row({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="flex-1 min-w-0">{label}</span>
      {children}
    </div>
  );
}
