import * as XLSX from "xlsx";

export function exportSpecToExcel(calcName: string, items: any[], totals: { cost: number; sale: number; margin: number }) {
  const stageMap: Record<string, string> = {
    prepress: "Допечатные",
    material: "Материалы",
    print: "Печать",
    postpress: "Послепечатные",
    logistics: "Логистика",
  };
  const rows = items.map((it) => ({
    Этап: stageMap[it.stage] || it.stage,
    Статья: it.name,
    "Кол-во": Number(it.quantity || 0),
    Ед: it.unit || "",
    Цена: Number(it.unit_price ?? it.unitPrice ?? 0),
    Сумма: Number(it.total_price ?? it.total ?? 0),
  }));
  rows.push({ Этап: "", Статья: "Итого себестоимость", "Кол-во": "" as any, Ед: "", Цена: "" as any, Сумма: totals.cost });
  rows.push({ Этап: "", Статья: `Наценка ${totals.margin}%`, "Кол-во": "" as any, Ед: "", Цена: "" as any, Сумма: totals.sale - totals.cost });
  rows.push({ Этап: "", Статья: "Цена продажи", "Кол-во": "" as any, Ед: "", Цена: "" as any, Сумма: totals.sale });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 16 }, { wch: 38 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Спецификация");
  const safe = calcName.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60);
  XLSX.writeFile(wb, `${safe || "calculation"}.xlsx`);
}