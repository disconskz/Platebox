import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fmtMoney, fmtNum } from "./format";
import { PRODUCT_LABELS } from "./calc/products";

const STAGE_LABELS: Record<string, string> = {
  prepress: "Допечатные",
  material: "Материалы",
  print: "Печать",
  postpress: "Послепечатные",
  logistics: "Логистика",
};

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml(calc: any, items: any[], totals: { cost: number; sale: number; margin: number; profit: number }) {
  const grouped: Record<string, any[]> = {};
  for (const it of items) (grouped[it.stage] ||= []).push(it);

  const today = new Date().toLocaleDateString("ru-RU");
  const shortId = String(calc.id || "").slice(0, 8).toUpperCase();

  const stageOrder = ["prepress", "material", "print", "postpress", "logistics"];
  const specRows = stageOrder
    .filter((s) => grouped[s]?.length)
    .map((stage) => {
      const list = grouped[stage];
      const head = `<tr><td colspan="5" class="stage">${STAGE_LABELS[stage]}</td></tr>`;
      const rows = list
        .map(
          (it) => `<tr>
            <td class="name">${escapeHtml(it.name)}</td>
            <td class="num">${fmtNum(Number(it.quantity || 0))}</td>
            <td class="unit">${escapeHtml(it.unit || "")}</td>
            <td class="num">${fmtMoney(Number(it.unit_price || 0))}</td>
            <td class="num bold">${fmtMoney(Number(it.total_price || 0))}</td>
          </tr>`
        )
        .join("");
      return head + rows;
    })
    .join("");

  const meta: [string, string][] = [
    ["Продукция", PRODUCT_LABELS[calc.product_type] || calc.product_type],
    ["Тираж", `${calc.circulation} шт`],
    ["Формат", `${calc.format_type} ${calc.format_width}×${calc.format_height} мм`],
    ["Цветность", `${calc.color_front}+${calc.color_back}`],
    ["Печ. формат", `${calc.print_format_width}×${calc.print_format_height} мм`],
    ...(calc.purchase_format_width && calc.purchase_format_height
      ? ([["Закуп. формат", `${calc.purchase_format_width}×${calc.purchase_format_height} мм`]] as [string, string][])
      : []),
    ["На листе", `${calc.items_per_sheet} шт`],
    ["Оборот", calc.turnaround_type === "none" ? "Без" : calc.turnaround_type === "own" ? "Свой" : "Чужой"],
    ["Форм", String(calc.forms_count ?? "—")],
  ];
  const metaCards = meta
    .map(
      ([l, v]) => `<div class="meta-card">
        <div class="meta-l">${l}</div>
        <div class="meta-v">${escapeHtml(v)}</div>
      </div>`
    )
    .join("");

  const perUnitCost = totals.cost / Math.max(1, calc.circulation);
  const perUnitSale = totals.sale / Math.max(1, calc.circulation);

  return `
    <div class="pdf-root">
      <div class="pdf-header">
        <div class="brand">
          <div class="logo">P</div>
          <div>
            <div class="brand-name">Platebox</div>
            <div class="brand-sub">Просчёт полиграфической продукции</div>
          </div>
        </div>
        <div class="header-right">
          <div class="hr-date">${today}</div>
          <div class="hr-id">№ ${shortId}</div>
        </div>
      </div>

      <h1 class="title">${escapeHtml(calc.name || "Без названия")}</h1>

      <div class="meta-grid">${metaCards}</div>

      <div class="section-title">Спецификация</div>
      <table class="spec">
        <thead>
          <tr>
            <th class="th-left">Статья</th>
            <th class="th-right">Кол-во</th>
            <th class="th-left">Ед</th>
            <th class="th-right">Цена</th>
            <th class="th-right">Сумма</th>
          </tr>
        </thead>
        <tbody>${specRows}</tbody>
      </table>

      <div class="totals">
        <div class="totals-title">Итоги</div>
        <div class="totals-row"><span>Себестоимость</span><span class="num">${fmtMoney(totals.cost)}</span></div>
        <div class="totals-row"><span>Наценка</span><span class="num">${totals.margin}%</span></div>
        <div class="totals-row sale"><span>Цена продажи</span><span class="num">${fmtMoney(totals.sale)}</span></div>
        <div class="totals-row profit"><span>Прибыль</span><span class="num">${fmtMoney(totals.profit)}</span></div>
        <div class="totals-grid">
          <div><span class="muted">За шт. (с/с): </span><b>${fmtMoney(perUnitCost)}</b></div>
          <div><span class="muted">За шт. (продажа): </span><b>${fmtMoney(perUnitSale)}</b></div>
        </div>
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
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #0a0a0a;
        color: #fafafa;
        border-radius: 12px;
        margin-bottom: 28px;
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
      .meta-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 24px;
      }
      .meta-card {
        border: 1px solid #e5e5e5; border-radius: 8px; padding: 8px 10px; background: #fafafa;
      }
      .meta-l {
        font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em;
        color: #737373; margin-bottom: 3px;
      }
      .meta-v { font-size: 12px; font-weight: 600; color: #0a0a0a; }

      .section-title {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        color: #525252; margin: 8px 0 10px; font-weight: 600;
      }
      .spec {
        width: 100%; border-collapse: collapse;
        border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;
        margin-bottom: 24px;
      }
      .spec thead th {
        background: #0a0a0a; color: #fafafa;
        padding: 9px 10px; font-size: 10px;
        text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
      }
      .th-left { text-align: left; }
      .th-right { text-align: right; }
      .spec td {
        padding: 7px 10px; border-top: 1px solid #f0f0f0;
        font-size: 11px; vertical-align: top;
      }
      .spec td.stage {
        background: #f4f4f5; color: #404040;
        font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
        font-weight: 700; padding: 6px 10px;
      }
      .spec td.name { color: #0a0a0a; }
      .spec td.unit { color: #737373; }
      .spec td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .spec td.bold { font-weight: 600; }

      .totals {
        border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px 18px;
        background: linear-gradient(180deg, #fafafa 0%, #f4f4f5 100%);
      }
      .totals-title {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        color: #525252; font-weight: 600; margin-bottom: 10px;
      }
      .totals-row {
        display: flex; justify-content: space-between; align-items: baseline;
        padding: 4px 0; font-size: 12px; color: #404040;
      }
      .totals-row .num { font-variant-numeric: tabular-nums; color: #0a0a0a; font-weight: 600; }
      .totals-row.sale {
        margin-top: 6px; padding-top: 10px; border-top: 1px solid #e5e5e5;
        font-size: 13px; color: #0a0a0a; font-weight: 600;
      }
      .totals-row.sale .num { font-size: 18px; font-weight: 800; }
      .totals-row.profit .num { color: #16a34a; }
      .totals-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e5e5;
        font-size: 11px;
      }
      .muted { color: #737373; }

      .footer {
        display: flex; justify-content: space-between;
        margin-top: 28px; padding-top: 12px;
        border-top: 1px solid #e5e5e5;
        font-size: 9px; color: #a3a3a3; letter-spacing: 0.04em;
      }
    </style>
  `;
}

export async function exportCalculationToPdf(
  calc: any,
  items: any[],
  totals: { cost: number; sale: number; margin: number; profit: number }
) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.innerHTML = buildHtml(calc, items, totals);
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
      // Slice the canvas across multiple A4 pages
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

    const safe = String(calc.name || "calculation").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
    pdf.save(`${safe || "calculation"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}