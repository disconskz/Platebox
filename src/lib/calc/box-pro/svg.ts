/**
 * Доработка 84, Этап 5 — генерация развёрток (SVG/DXF) и маршрута производства.
 *
 * SVG идёт в превью на UI и скачивается «как есть».
 * DXF — минимальный ASCII R12 для передачи на лазер/штамп.
 */

import type { DiecutPartKind } from "./diecut";

export type UnfoldInput = {
  kind: DiecutPartKind;
  developW: number; // мм
  developH: number; // мм
  /** Высота борта (для отрисовки биговок «коробочного» типа), мм */
  flapH?: number;
  /** Окно/прорезь по центру (для kind="window"), мм */
  windowW?: number;
  windowH?: number;
};

type Line = { x1: number; y1: number; x2: number; y2: number; kind: "cut" | "big" };

function buildLines(input: UnfoldInput): Line[] {
  const { developW: W, developH: H, kind } = input;
  const lines: Line[] = [];

  // Внешний контур — нож
  lines.push({ x1: 0, y1: 0, x2: W, y2: 0, kind: "cut" });
  lines.push({ x1: W, y1: 0, x2: W, y2: H, kind: "cut" });
  lines.push({ x1: W, y1: H, x2: 0, y2: H, kind: "cut" });
  lines.push({ x1: 0, y1: H, x2: 0, y2: 0, kind: "cut" });

  // Биговки коробочного типа: рисуем рамку отступом flapH
  const f = input.flapH && input.flapH > 0 ? input.flapH : Math.min(W, H) * 0.18;
  if (kind === "body" || kind === "lid" || kind === "bottom") {
    lines.push({ x1: f, y1: 0, x2: f, y2: H, kind: "big" });
    lines.push({ x1: W - f, y1: 0, x2: W - f, y2: H, kind: "big" });
    lines.push({ x1: 0, y1: f, x2: W, y2: f, kind: "big" });
    lines.push({ x1: 0, y1: H - f, x2: W, y2: H - f, kind: "big" });
  } else if (kind === "sleeve") {
    // 4 биговки поперёк по длине H
    const step = W / 4;
    for (let i = 1; i < 4; i++) {
      lines.push({ x1: step * i, y1: 0, x2: step * i, y2: H, kind: "big" });
    }
  } else if (kind === "divider") {
    lines.push({ x1: W / 2, y1: 0, x2: W / 2, y2: H, kind: "big" });
  }

  // Окно (внутренний нож)
  if (kind === "window" && input.windowW && input.windowH && input.windowW > 0 && input.windowH > 0) {
    const wx = (W - input.windowW) / 2;
    const wy = (H - input.windowH) / 2;
    const ww = input.windowW;
    const wh = input.windowH;
    lines.push({ x1: wx, y1: wy, x2: wx + ww, y2: wy, kind: "cut" });
    lines.push({ x1: wx + ww, y1: wy, x2: wx + ww, y2: wy + wh, kind: "cut" });
    lines.push({ x1: wx + ww, y1: wy + wh, x2: wx, y2: wy + wh, kind: "cut" });
    lines.push({ x1: wx, y1: wy + wh, x2: wx, y2: wy, kind: "cut" });
  }

  return lines;
}

export function buildUnfoldSvg(input: UnfoldInput): string {
  const { developW: W, developH: H } = input;
  const pad = 10;
  const lines = buildLines(input);
  const els = lines
    .map((l) => {
      const stroke = l.kind === "cut" ? "#dc2626" : "#2563eb";
      const dash = l.kind === "big" ? ' stroke-dasharray="6 4"' : "";
      return `<line x1="${l.x1 + pad}" y1="${l.y1 + pad}" x2="${l.x2 + pad}" y2="${l.y2 + pad}" stroke="${stroke}" stroke-width="0.8"${dash}/>`;
    })
    .join("");
  const w = W + pad * 2;
  const h = H + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${els}<text x="${pad}" y="${h - 2}" font-size="6" fill="#666">${W}×${H} мм</text></svg>`;
}

/** Минимальный DXF R12 — слои CUT (нож) и BIG (биг). */
export function buildUnfoldDxf(input: UnfoldInput): string {
  const lines = buildLines(input);
  const header = ["0", "SECTION", "2", "ENTITIES"];
  const body: string[] = [];
  for (const l of lines) {
    body.push(
      "0", "LINE",
      "8", l.kind === "cut" ? "CUT" : "BIG",
      "10", String(l.x1),
      "20", String(-l.y1),
      "11", String(l.x2),
      "21", String(-l.y2),
    );
  }
  const footer = ["0", "ENDSEC", "0", "EOF"];
  return [...header, ...body, ...footer].join("\n");
}

// ─── Маршрут производства ─────────────────────────────────────────────
export type RouteStep = { code: string; label: string; note?: string };

export function buildProductionRoute(opts: {
  subType: string;
  hasPrint: boolean;
  hasLam: boolean;
  hasFoil: boolean;
  hasEmboss: boolean;
  hasWindow: boolean;
  hasMagnet: boolean;
  hasRibbon: boolean;
  hasHandle: boolean;
  isKashir: boolean;
}): RouteStep[] {
  const r: RouteStep[] = [];
  r.push({ code: "PREP", label: "Подготовка макетов и спусков" });
  if (opts.hasPrint) r.push({ code: "PRINT", label: "Офсетная печать" });
  if (opts.hasLam) r.push({ code: "LAM", label: "Ламинация" });
  if (opts.hasFoil) r.push({ code: "FOIL", label: "Тиснение фольгой" });
  if (opts.hasEmboss) r.push({ code: "EMB", label: "Конгрев / блинт" });
  r.push({ code: "DIE", label: "Высечка штампом", note: "ножи + биговки авто-расчёт" });
  if (opts.hasWindow) r.push({ code: "WIN", label: "Вклейка ПЭТ-окна" });
  if (opts.isKashir) r.push({ code: "KASH", label: "Каширование на переплётный картон" });
  if (opts.hasMagnet) r.push({ code: "MAG", label: "Установка магнитов" });
  if (opts.hasRibbon) r.push({ code: "RIB", label: "Вклейка ленты" });
  if (opts.hasHandle) r.push({ code: "HND", label: "Установка ручек" });
  r.push({ code: "ASM", label: "Сборка и склейка" });
  r.push({ code: "QC", label: "ОТК и упаковка" });
  return r;
}