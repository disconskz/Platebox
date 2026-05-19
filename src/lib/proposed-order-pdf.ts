import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fmtMoney } from "./format";
import type { ProposedOrder } from "@/components/ai-calc/ChatWindow";

const PRODUCT_LABEL: Record<string, string> = {
  leaflet: "Листовка", flyer: "Флаер", booklet: "Буклет",
  business_card: "Визитки", poster: "Постер", brochure: "Брошюра", other: "Прочее",
};
const MATERIAL_LABEL: Record<string, string> = {
  coated: "мелованная", uncoated: "офсетная", designer: "дизайнерская", cardboard: "картон",
};
const LAMINATION_LABEL: Record<string, string> = { gloss: "глянцевая", matte: "матовая", velvet: "софт-тач" };

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
const num = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

function buildHtml(order: ProposedOrder, materialName: string | null) {
  const today = new Date().toLocaleDateString("ru-RU");
  const colors = Math.max(order.color_front ?? 0, order.color_back ?? 0);
  const est = order.estimated_cost ?? {};

  // Specs (recognised order)
  const specs: [string, string][] = [];
  if (order.product_type) specs.push(["Продукт", PRODUCT_LABEL[order.product_type] ?? order.product_type]);
  if (order.circulation) specs.push(["Тираж", `${order.circulation.toLocaleString("ru-RU")} шт`]);
  if (order.format) {
    const f = order.format === "custom"
      ? `${order.custom_width_mm ?? "?"}×${order.custom_height_mm ?? "?"} мм`
      : order.format;
    specs.push(["Формат", f]);
  }
  if (typeof order.color_front === "number") {
    specs.push(["Красочность", `${order.color_front}+${order.color_back ?? 0}`]);
  }
  if (order.material_category) {
    const m = MATERIAL_LABEL[order.material_category] ?? order.material_category;
    specs.push(["Материал", order.material_density ? `${m}, ${order.material_density} г/м²` : m]);
  }
  if (materialName) specs.push(["Из справочника", materialName]);
  if (order.has_lamination) {
    specs.push([
      "Ламинация",
      `${LAMINATION_LABEL[order.lamination_film ?? ""] ?? "ламинация"}${order.lamination_sides ? `, ${order.lamination_sides} стор.` : ""}`,
    ]);
  }
  if (order.has_fold) specs.push(["Фальцовка", order.fold_count ? `${order.fold_count} фальц.` : "да"]);
  if (order.has_die_cut) specs.push(["Высечка", "да"]);
  if (order.has_numbering) specs.push(["Нумерация", "да"]);
  if (order.has_stamping) specs.push(["Тиснение", "да"]);

  const specCards = specs
    .map(([l, v]) => `<div class="meta-card"><div class="meta-l">${esc(l)}</div><div class="meta-v">${esc(v)}</div></div>`)
    .join("");

  // Production
  const prod: [string, string][] = [];
  if (order.press_machine_name) prod.push(["Машина", order.press_machine_name]);
  if (order.print_format_label) prod.push(["Печатный лист", order.print_format_label]);
  if (order.purchase_format_label) {
    prod.push(["Закупочный лист", order.purchase_format_label + (materialName ? `, ${materialName}` : "")]);
  }
  if (order.items_per_sheet) prod.push(["Раскладка", `${order.items_per_sheet} шт / лист`]);
  if (order.sheets_total) {
    const parts: string[] = [];
    if (order.sheets_useful) parts.push(`${num(order.sheets_useful)} полезных`);
    if (order.sheets_setup) parts.push(`${num(order.sheets_setup)} приладка`);
    prod.push(["Листы", parts.length ? `${parts.join(" + ")} = ${num(order.sheets_total)}` : num(order.sheets_total)]);
  }
  if (order.impressions) {
    prod.push([
      "Оттиски",
      order.sheets_total && colors
        ? `${num(order.sheets_total)} × ${colors} = ${num(order.impressions)}`
        : num(order.impressions),
    ]);
  }

  const prodRows = prod
    .map(([l, v]) => `<tr><td class="kv-l">${esc(l)}</td><td class="kv-v">${esc(v)}</td></tr>`)
    .join("");

  // Postpress
  const pp = (order.postpress_breakdown ?? []).filter((op) => op && typeof op.cost === "number");
  const ppTotal = pp.reduce((s, op) => s + (op.cost || 0), 0);
  const ppRows = pp
    .map((op) => {
      const detail = op.qty
        ? `${num(op.qty)}${op.unit ? " " + op.unit : ""}${op.unit_cost ? " × " + fmtMoney(op.unit_cost) : ""}`
        : "";
      return `<tr>
        <td class="name">${esc(op.name)}</td>
        <td class="unit">${esc(detail)}</td>
        <td class="num bold">${fmtMoney(op.cost)}</td>
      </tr>`;
    })
    .join("");

  // Cost rows
  const costRows: Array<{ name: string; detail?: string; cost: number }> = [];
  if (typeof est.paper === "number") {
    costRows.push({
      name: "Бумага",
      detail: order.sheets_total && order.material_price_per_sheet
        ? `${num(order.sheets_total)} л × ${fmtMoney(order.material_price_per_sheet)}`
        : undefined,
      cost: est.paper,
    });
  }
  if (typeof est.print === "number") {
    costRows.push({
      name: "Печать",
      detail: order.impressions && order.cost_per_impression
        ? `${num(order.impressions)} оттисков × ${fmtMoney(order.cost_per_impression)}`
        : undefined,
      cost: est.print,
    });
  }
  if (typeof order.setup_cost === "number" && order.setup_cost > 0) {
    costRows.push({ name: "Приладка машины", cost: order.setup_cost });
  }
  if (typeof order.form_cost_total === "number" && order.form_cost_total > 0) {
    costRows.push({
      name: "Формы",
      detail: order.forms_count ? `${order.forms_count} шт` : undefined,
      cost: order.form_cost_total,
    });
  }
  if (ppTotal > 0) {
    costRows.push({ name: "Постпечать", detail: pp.length ? `${pp.length} операц.` : undefined, cost: ppTotal });
  } else if (typeof est.postpress === "number" && est.postpress > 0) {
    costRows.push({ name: "Постпечать", cost: est.postpress });
  }

  const costRowsHtml = costRows
    .map((r) => `<tr>
      <td class="name">${esc(r.name)}</td>
      <td class="unit">${esc(r.detail ?? "")}</td>
      <td class="num bold">${fmtMoney(r.cost)}</td>
    </tr>`)
    .join("");

  const perUnit = est.sale_price && order.circulation
    ? Math.round(est.sale_price / order.circulation)
    : null;

  return `
    <div class="pdf-root">
      <div class="pdf-header">
        <div class="brand">
          <div class="logo">P</div>
          <div>
            <div class="brand-name">Platebox</div>
            <div class="brand-sub">Просчёт от ИИ-ассистента</div>
          </div>
        </div>
        <div class="header-right">
          <div class="hr-date">${today}</div>
          <div class="hr-id">Предварительный расчёт</div>
        </div>
      </div>

      <h1 class="title">${esc(order.name || "Без названия")}</h1>

      ${specs.length ? `
        <div class="section-title">Распознанный заказ</div>
        <div class="meta-grid">${specCards}</div>
      ` : ""}

      ${prod.length ? `
        <div class="section-title">Производство</div>
        <table class="kv">${prodRows}</table>
      ` : ""}

      ${pp.length ? `
        <div class="section-title">Постпечать <span class="muted">· итого ${fmtMoney(ppTotal)}</span></div>
        <table class="spec">
          <thead><tr><th class="th-left">Операция</th><th class="th-left">Параметры</th><th class="th-right">Сумма</th></tr></thead>
          <tbody>${ppRows}</tbody>
        </table>
      ` : ""}

      ${costRows.length ? `
        <div class="section-title">Себестоимость</div>
        <table class="spec">
          <thead><tr><th class="th-left">Статья</th><th class="th-left">Расчёт</th><th class="th-right">Сумма</th></tr></thead>
          <tbody>${costRowsHtml}</tbody>
        </table>
      ` : ""}

      <div class="totals">
        <div class="totals-title">Итоги</div>
        ${typeof est.total === "number" ? `<div class="totals-row"><span>Себестоимость</span><span class="num">${fmtMoney(est.total)}</span></div>` : ""}
        ${typeof order.vat_amount === "number" && order.vat_amount > 0 ? `<div class="totals-row"><span>НДС ${order.vat_percent ?? ""}%</span><span class="num">${fmtMoney(order.vat_amount)}</span></div>` : ""}
        ${typeof order.margin_amount === "number" && order.margin_amount > 0 ? `<div class="totals-row"><span>Наценка ${order.margin_percent ?? ""}%</span><span class="num">${fmtMoney(order.margin_amount)}</span></div>` : ""}
        ${typeof est.sale_price === "number" ? `<div class="totals-row sale"><span>Цена продажи</span><span class="num">${fmtMoney(est.sale_price)}</span></div>` : ""}
        ${perUnit !== null ? `<div class="totals-grid"><div><span class="muted">За шт. (продажа): </span><b>${fmtMoney(perUnit)}</b></div></div>` : ""}
      </div>

      ${order.notes ? `<div class="notes"><b>Примечание:</b> ${esc(order.notes)}</div>` : ""}

      <div class="disclaimer">
        Расчёт предварительный, сформирован ИИ-ассистентом Platebox. Окончательная цена утверждается менеджером.
      </div>

      <div class="footer">
        <span>Platebox · platebox.kz</span>
        <span>${today}</span>
      </div>
    </div>

    <style>
      .pdf-root {
        width: 794px;
        padding: 40px 44px 56px;
        background: #ffffff;
        color: #0a0a0a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        box-sizing: border-box;
      }
      .pdf-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 16px 20px;
        background: #0a0a0a; color: #fafafa;
        border-radius: 12px; margin-bottom: 28px;
      }
      .brand { display: flex; align-items: center; gap: 12px; }
      .logo {
        width: 36px; height: 36px; border-radius: 8px;
        background: linear-gradient(135deg, #fafafa 0%, #d4d4d8 100%);
        color: #0a0a0a; font-weight: 800; font-size: 18px;
        display: flex; align-items: center; justify-content: center;
      }
      .brand-name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
      .brand-sub { font-size: 10px; opacity: 0.7; margin-top: 2px; }
      .header-right { text-align: right; font-size: 11px; }
      .hr-date { opacity: 0.7; }
      .hr-id { font-weight: 600; margin-top: 2px; letter-spacing: 0.04em; }

      .title {
        font-size: 24px; font-weight: 700; letter-spacing: -0.02em;
        margin: 0 0 18px; color: #0a0a0a;
      }
      .section-title {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        color: #525252; margin: 14px 0 8px; font-weight: 600;
      }
      .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
      .meta-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px; background: #fafafa; }
      .meta-l { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #737373; margin-bottom: 3px; }
      .meta-v { font-size: 12px; font-weight: 600; color: #0a0a0a; }

      .kv { width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
      .kv td { padding: 7px 12px; border-top: 1px solid #f0f0f0; font-size: 11.5px; }
      .kv tr:first-child td { border-top: 0; }
      .kv td.kv-l { color: #737373; width: 38%; }
      .kv td.kv-v { color: #0a0a0a; font-weight: 600; }

      .spec { width: 100%; border-collapse: collapse; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; }
      .spec thead th {
        background: #0a0a0a; color: #fafafa;
        padding: 9px 10px; font-size: 10px;
        text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
      }
      .th-left { text-align: left; } .th-right { text-align: right; }
      .spec td { padding: 7px 10px; border-top: 1px solid #f0f0f0; font-size: 11px; vertical-align: top; }
      .spec td.name { color: #0a0a0a; }
      .spec td.unit { color: #737373; }
      .spec td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .spec td.bold { font-weight: 600; }

      .totals {
        border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px 18px;
        background: linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%);
        margin-top: 16px;
      }
      .totals-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #525252; font-weight: 600; margin-bottom: 10px; }
      .totals-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; font-size: 12px; color: #404040; }
      .totals-row .num { font-variant-numeric: tabular-nums; color: #0a0a0a; font-weight: 600; }
      .totals-row.sale {
        margin-top: 6px; padding-top: 10px; border-top: 1px solid #e5e5e5;
        font-size: 13px; color: #0a0a0a; font-weight: 600;
      }
      .totals-row.sale .num { font-size: 18px; font-weight: 800; }
      .totals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e5e5; font-size: 11px; }
      .muted { color: #737373; }

      .notes { margin-top: 14px; padding: 10px 12px; border-left: 3px solid #d4d4d8; background: #fafafa; font-size: 11px; color: #404040; border-radius: 0 6px 6px 0; }
      .disclaimer { margin-top: 14px; font-size: 10px; color: #a3a3a3; font-style: italic; }

      .footer { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 9px; color: #a3a3a3; letter-spacing: 0.04em; }
    </style>
  `;
}

export async function exportProposedOrderToPdf(order: ProposedOrder, materialName: string | null = null) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.innerHTML = buildHtml(order, materialName);
  document.body.appendChild(container);

  try {
    const root = container.querySelector(".pdf-root") as HTMLElement;
    const canvas = await html2canvas(root, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, imgH);
    } else {
      const pageHeightPx = (canvas.width * pageH) / pageW;
      let y = 0;
      let pageNum = 0;
      while (y < canvas.height) {
        const sliceH = Math.min(pageHeightPx, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sliceH;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        if (pageNum > 0) pdf.addPage();
        const sliceImgH = (sliceH * imgW) / canvas.width;
        pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, imgW, sliceImgH);
        y += sliceH;
        pageNum++;
      }
    }

    const safe = String(order.name || "platebox-quote").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
    pdf.save(`${safe || "platebox-quote"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}