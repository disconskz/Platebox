// Описание инструментов (OpenAI-compatible tool calling) и их исполнение
// поверх загруженного снапшота справочника + движка расчёта.

import { evalFormula } from "./formula.ts";
import { estimateOrder, type OrderEstimate, type OrderInput } from "./calc-engine.ts";
import type { ReferenceSnapshot } from "./references.ts";

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "list_product_types",
      description: "Список типов продукции из словаря изделий и из вариантов расчёта (calc_variants). Возвращает базовые типы и доступные варианты.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_materials",
      description: "Поиск материалов из справочника. Фильтры по типу (coated/uncoated/designer/cardboard), плотности и минимальному формату.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "coated, uncoated, designer, cardboard" },
          density_min: { type: "number" },
          density_max: { type: "number" },
          min_w_mm: { type: "number" },
          min_h_mm: { type: "number" },
          query: { type: "string", description: "Поиск по имени" },
          limit: { type: "number", default: 15 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_print_formats",
      description: "Список печатных форматов. Можно отфильтровать по закупочному формату или по габаритам.",
      parameters: {
        type: "object",
        properties: {
          purchase_format_id: { type: "string" },
          max_w_mm: { type: "number" },
          max_h_mm: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_press_machines",
      description: "Печатные машины с фильтром по типу продукции и тиражу.",
      parameters: {
        type: "object",
        properties: {
          product_type: { type: "string" },
          circulation: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_operations",
      description: "Поиск постпечатных операций по фразе (ламинация, биговка, фальцовка, вырубка, нумерация, тиснение и т.д.). Возвращает code, параметры и состав работ с формулами price_source/quantity_source.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: "string" },
          limit: { type: "number", default: 10 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_operation_detail",
      description: "Полная информация по операции из operation_catalog по её code.",
      parameters: {
        type: "object",
        properties: { code: { type: "number" } },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_formula",
      description: "Вычислить произвольную формулу с переменными в квадратных скобках, например '[ТИРАЖ]*0.5'. Поддерживает + - * / ( ) и cast(... as numericN).",
      parameters: {
        type: "object",
        properties: {
          formula: { type: "string" },
          context: { type: "object", additionalProperties: { type: "number" }, description: "Карта переменная→число" },
        },
        required: ["formula"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_constants",
      description: "Все калькуляционные константы (form_cost, ИНК, наценки и пр.) с описанием и единицами.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_lamination",
      description: "Прайс ламинации по плёнке и диапазону размеров.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_custom_reference",
      description: "Получить произвольный пользовательский справочник по slug (например 'tirage_discount').",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_order",
      description: "Полный построчный расчёт заказа по введённым параметрам. Использует те же формулы и operation_catalog, что и калькулятор. Возвращает spec[], себестоимость, маржу, НДС, цену продажи.",
      parameters: {
        type: "object",
        properties: {
          product_type: { type: "string", description: "leaflet, booklet, business_card, poster, flyer, brochure, other" },
          circulation: { type: "number" },
          format: { type: "string", description: "A3, A4, A5, A6, custom" },
          custom_width_mm: { type: "number" },
          custom_height_mm: { type: "number" },
          color_front: { type: "number" },
          color_back: { type: "number" },
          material_id: { type: "string" },
          press_machine_id: { type: "string" },
          print_format_id: { type: "string" },
          items_per_sheet: { type: "number" },
          margin_percent: { type: "number" },
          postpress: {
            type: "array",
            items: {
              type: "object",
              properties: {
                operation_code: { type: "number" },
                params: { type: "object", additionalProperties: { type: "number" } },
              },
              required: ["operation_code"],
            },
          },
        },
        required: ["product_type", "circulation", "format", "color_front", "color_back"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_order_card",
      description: "Зафиксировать итоговую карточку заказа в формате, который ожидает интерфейс калькулятора. Вызывай ОДИН раз после calculate_order, когда параметры подтверждены.",
      parameters: {
        type: "object",
        properties: {
          order: {
            type: "object",
            description: "Финальный объект proposed_order. Содержит material_id, press_machine_id, print_format_id, postpress_breakdown, estimated_cost и т.д.",
            additionalProperties: true,
          },
        },
        required: ["order"],
      },
    },
  },
];

function matchSearch(text: string, q: string): boolean {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

export interface ToolExecutionState {
  proposed_order: Record<string, unknown> | null;
  last_estimate: OrderEstimate | null;
}

export function createState(): ToolExecutionState {
  return { proposed_order: null, last_estimate: null };
}

/** Исполнение одного tool_call. Возвращает строковый JSON для tool message. */
export function runTool(
  name: string,
  args: Record<string, unknown>,
  snapshot: ReferenceSnapshot,
  state: ToolExecutionState,
): unknown {
  switch (name) {
    case "list_product_types": {
      return {
        glossary: snapshot.glossary.map((g) => ({
          slug: g.slug, name: g.name, base: g.base_product_type,
          category: g.category, calculable: g.is_calculable,
        })),
        variants: snapshot.calc_variants.map((v) => ({
          id: v.id, name: v.name, base: v.base_product_type, category: v.category,
          description: v.description,
        })),
      };
    }
    case "list_materials": {
      const t = String(args.type ?? "").trim();
      const dMin = Number(args.density_min ?? -Infinity);
      const dMax = Number(args.density_max ?? Infinity);
      const wMin = Number(args.min_w_mm ?? 0);
      const hMin = Number(args.min_h_mm ?? 0);
      const q = String(args.query ?? "");
      const limit = Math.min(50, Number(args.limit ?? 15) || 15);
      const items = snapshot.materials
        .filter((m) => !t || m.type === t)
        .filter((m) => m.density >= dMin && m.density <= dMax)
        .filter((m) => m.w >= wMin && m.h >= hMin)
        .filter((m) => matchSearch(m.name, q))
        .slice(0, limit);
      return { count: items.length, items };
    }
    case "list_print_formats": {
      const pfId = args.purchase_format_id as string | undefined;
      const mw = Number(args.max_w_mm ?? Infinity);
      const mh = Number(args.max_h_mm ?? Infinity);
      const items = snapshot.print_formats
        .filter((p) => !pfId || p.purchase_format_id === pfId)
        .filter((p) => p.w <= mw && p.h <= mh);
      return { items };
    }
    case "list_press_machines": {
      const pt = String(args.product_type ?? "");
      const circ = Number(args.circulation ?? 0);
      const items = snapshot.press_machines.filter((m) => {
        if (pt && m.product_types?.length && !m.product_types.includes(pt)) return false;
        if (circ && (circ < m.min_circ || (m.max_circ != null && circ > m.max_circ))) return false;
        return true;
      });
      return { items };
    }
    case "search_operations": {
      const q = String(args.query ?? "");
      const cat = String(args.category ?? "");
      const limit = Math.min(20, Number(args.limit ?? 10) || 10);
      const items = snapshot.operation_catalog
        .filter((o) => !cat || o.category === cat)
        .filter((o) => !q || matchSearch(o.name, q) || matchSearch(o.description, q))
        .slice(0, limit)
        .map((o) => ({
          code: o.code, name: o.name, category: o.category, description: o.description,
          parameters: o.parameters.map((p) => ({
            name: p.name, default: p.default_value, formula: p.formula, notes: p.notes,
          })),
          work_items: o.work_items.map((w) => ({
            name: w.name, price_source: w.price_source, quantity_source: w.quantity_source,
          })),
        }));
      return { count: items.length, items };
    }
    case "get_operation_detail": {
      const code = Number(args.code);
      const op = snapshot.operation_catalog.find((o) => o.code === code);
      if (!op) return { error: "not_found" };
      return op;
    }
    case "evaluate_formula": {
      const formula = String(args.formula ?? "");
      const ctx = (args.context ?? {}) as Record<string, number>;
      const r = evalFormula(formula, ctx);
      return r;
    }
    case "list_constants": {
      return { items: snapshot.constants };
    }
    case "list_lamination": {
      return { items: snapshot.lamination };
    }
    case "list_custom_reference": {
      const slug = String(args.slug ?? "");
      const ref = snapshot.custom_references.find((r) => r.slug === slug);
      if (!ref) return { error: "not_found" };
      return ref;
    }
    case "calculate_order": {
      const input = args as unknown as OrderInput;
      const est = estimateOrder(input, snapshot);
      state.last_estimate = est;
      return est;
    }
    case "propose_order_card": {
      const order = (args.order ?? {}) as Record<string, unknown>;
      // Если в order не приехало estimated_cost, обогащаем последним расчётом
      const est = state.last_estimate;
      if (est) {
        const enriched: Record<string, unknown> = {
          ...order,
          items_per_sheet: order.items_per_sheet ?? est.items_per_sheet,
          sheets_useful: order.sheets_useful ?? est.sheets_useful,
          sheets_setup: order.sheets_setup ?? est.sheets_setup,
          sheets_total: order.sheets_total ?? est.sheets_total,
          impressions: order.impressions ?? est.impressions,
          forms_count: order.forms_count ?? est.forms_count,
          form_cost_total: order.form_cost_total ?? est.prepress_cost,
          material_price_per_sheet: order.material_price_per_sheet ?? est.resolved.material_price_per_sheet,
          cost_per_impression: order.cost_per_impression ?? est.resolved.cost_per_impression,
          setup_cost: order.setup_cost ?? est.resolved.setup_cost,
          press_machine_name: order.press_machine_name ?? est.resolved.press_machine_name,
          print_format_label: order.print_format_label ?? est.resolved.print_format_label,
          purchase_format_label: order.purchase_format_label ?? est.resolved.purchase_format_label,
          purchase_format_id: order.purchase_format_id ?? est.resolved.purchase_format_id,
          vat_percent: order.vat_percent ?? est.vat_percent,
          vat_amount: order.vat_amount ?? est.vat_amount,
          margin_percent: order.margin_percent ?? est.margin_percent,
          margin_amount: order.margin_amount ?? est.margin_amount,
          postpress_breakdown: order.postpress_breakdown ?? est.spec
            .filter((s) => s.stage === "postpress")
            .map((s) => ({ name: s.name, qty: s.quantity, unit: s.unit, unit_cost: s.unit_price, cost: s.total })),
          estimated_cost: order.estimated_cost ?? {
            paper: est.paper_cost,
            print: est.print_cost,
            postpress: est.postpress_cost,
            total: est.total_cost,
            with_vat: est.total_cost + est.vat_amount,
            sale_price: est.sale_price,
            currency: "KZT",
          },
          cost_breakdown: order.cost_breakdown ?? [
            `Бумага: ${est.paper_cost.toLocaleString("ru-RU")} ₸ (${est.sheets_total} листов)`,
            `Печать: ${est.print_cost.toLocaleString("ru-RU")} ₸ (${est.impressions} оттисков)`,
            est.postpress_cost > 0 ? `Постпечать: ${est.postpress_cost.toLocaleString("ru-RU")} ₸` : "",
            `Наценка ${est.margin_percent}% + НДС ${est.vat_percent}%`,
          ].filter(Boolean),
        };
        state.proposed_order = enriched;
      } else {
        state.proposed_order = order;
      }
      return { ok: true, stored: true };
    }
    default:
      return { error: `unknown_tool:${name}` };
  }
}