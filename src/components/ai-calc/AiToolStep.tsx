import { useState } from "react";
import {
  Search, Calculator, Layers, Settings2, ListTree, Wand2, CheckCircle2, AlertCircle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolTraceItem = {
  name: string;
  args: unknown;
  result_summary: string;
  ok: boolean;
};

const TOOL_META: Record<string, { label: string; icon: typeof Search }> = {
  list_product_types: { label: "Список типов продукции", icon: ListTree },
  list_materials: { label: "Поиск материалов", icon: Layers },
  list_print_formats: { label: "Печатные форматы", icon: Layers },
  list_press_machines: { label: "Печатные машины", icon: Settings2 },
  search_operations: { label: "Поиск операций", icon: Search },
  get_operation_detail: { label: "Детали операции", icon: Settings2 },
  evaluate_formula: { label: "Расчёт формулы", icon: Calculator },
  calculate_order: { label: "Расчёт заказа", icon: Calculator },
  propose_order_card: { label: "Карточка заказа", icon: Wand2 },
};

export function AiToolTrace({ trace }: { trace: ToolTraceItem[] }) {
  if (!trace?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {trace.map((t, i) => <ToolRow key={i} item={t} />)}
    </div>
  );
}

function ToolRow({ item }: { item: ToolTraceItem }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[item.name] ?? { label: item.name, icon: Settings2 };
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 text-[11px] overflow-hidden animate-scale-in">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-muted/60 transition-colors"
      >
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-medium text-foreground truncate">{meta.label}</span>
        {item.result_summary && (
          <span className="text-muted-foreground truncate ml-1">· {item.result_summary}</span>
        )}
        {item.ok
          ? <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 ml-auto" />
          : <AlertCircle className="h-3 w-3 text-destructive shrink-0 ml-auto" />}
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-2.5 pb-2 pt-1 space-y-1 border-t border-border/60 bg-background/50 animate-accordion-down">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Параметры</p>
            <pre className="text-[10px] bg-muted/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(item.args, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}