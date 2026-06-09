import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, FunctionSquare, Pencil } from "lucide-react";
import { AdvancedOnly, TechOnly } from "./ModeVisibility";
import type { SpecLine } from "./CostByStageBlock";
import { InlineFormulaEditor } from "./InlineFormulaEditor";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

function fmt(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n);
}
function fmtMoney(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₸";
}

/**
 * Одна операция спецификации: имя, кол-во × цена = сумма, формула, переменные.
 * Видимость деталей зависит от режима интерфейса (Advanced / Tech).
 */
export function OperationFormulaRow({ line }: { line: SpecLine }) {
  const details = line.details ?? [];
  const opCode = details.find((d) => d.label === "__opCode")?.value;
  const formulaQty = details.find((d) => d.label === "Формула кол-ва")?.value;
  const formulaPrice = details.find((d) => d.label === "Формула цены")?.value;
  const workItemCode = details.find((d) => d.label === "__workItemCode")?.value;
  const quantitySource = details.find((d) => d.label === "__quantitySource")?.value ?? "";
  const priceSource = details.find((d) => d.label === "__priceSource")?.value ?? "";
  const vars = details.filter((d) => d.label.startsWith("пер. "));
  // Дополнительные текстовые детали (не служебные и не «пер. …»).
  const extras = details.filter(
    (d) => !d.label.startsWith("пер. ") && !d.label.startsWith("__") &&
           d.label !== "Источник" && d.label !== "Формула кол-ва" && d.label !== "Формула цены",
  );
  const hasFormula = Boolean(formulaQty || formulaPrice);
  const canEdit = useIsAdmin() && opCode && workItemCode;
  const [edit, setEdit] = React.useState<null | { field: "price_source" | "quantity_source"; title: string; initial: string }>(null);

  return (
    <div className="text-[11px] space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-foreground/90 truncate" title={line.name}>{line.name}</span>
        <span className="tabular-nums text-muted-foreground shrink-0">
          {fmt(line.qty)} {line.unit} × {fmt(line.price)} ={" "}
          <span className="text-foreground font-medium">{fmtMoney(line.total)}</span>
        </span>
      </div>
      {hasFormula && (
        <AdvancedOnly>
          <div className="font-mono text-[10px] leading-tight text-muted-foreground space-y-0.5">
            {formulaQty && (
              <div className="flex items-start gap-1">
                <span className="flex-1">кол-во: {formulaQty}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-primary"
                    title="Изменить формулу количества"
                    onClick={() => setEdit({ field: "quantity_source", title: `Количество: ${line.name}`, initial: quantitySource })}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            {formulaPrice && (
              <div className="flex items-start gap-1">
                <span className="flex-1">цена: {formulaPrice}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="text-muted-foreground/60 hover:text-primary"
                    title="Изменить формулу цены"
                    onClick={() => setEdit({ field: "price_source", title: `Цена: ${line.name}`, initial: priceSource })}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </AdvancedOnly>
      )}
      {extras.length > 0 && !hasFormula && (
        <AdvancedOnly>
          <div className="text-[10px] leading-tight text-muted-foreground space-y-0.5">
            {extras.slice(0, 3).map((d) => (
              <div key={d.label}><span className="text-foreground/60">{d.label}:</span> {d.value}</div>
            ))}
          </div>
        </AdvancedOnly>
      )}
      {(vars.length > 0 || opCode) && (
        <TechOnly>
          <div className="rounded-sm bg-muted/30 px-1.5 py-1 space-y-1">
            {vars.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {vars.map((v) => (
                  <span
                    key={v.label}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border"
                  >
                    {v.label.replace(/^пер\.\s*/, "")} = {v.value}
                  </span>
                ))}
              </div>
            )}
            {opCode && (
              <Link
                to={`/references?tab=__op_catalog&op=${opCode}`}
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                Открыть операцию в справочнике
              </Link>
            )}
          </div>
        </TechOnly>
      )}
      {edit && opCode && workItemCode && (
        <InlineFormulaEditor
          open
          onClose={() => setEdit(null)}
          title={edit.title}
          initial={edit.initial}
          opCode={Number(opCode)}
          workItemCode={Number(workItemCode)}
          field={edit.field}
        />
      )}
    </div>
  );
}

/** Проверяет, что текущий пользователь — администратор (для inline-правок формул). */
function useIsAdmin(): boolean {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    (supabase as any).from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }: any) => setIsAdmin(!!data));
  }, [user]);
  return isAdmin;
}

/**
 * Список применённых сейчас формул для одного блока / секции.
 * Сворачивается; по умолчанию свернут, чтобы не загромождать форму.
 */
export function BlockFormulas({
  lines,
  title = "Формулы расчёта блока",
  defaultOpen = false,
  emptyHint = "Формулы появятся, когда блок начнёт считаться.",
}: {
  lines: SpecLine[];
  title?: string;
  defaultOpen?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const total = lines.reduce((s, l) => s + (l.total || 0), 0);

  if (!lines.length) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <FunctionSquare className="inline h-3 w-3 mr-1 align-[-2px]" />
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <FunctionSquare className="h-3 w-3 text-muted-foreground" />
          {title}
          <span className="text-[10px] font-normal text-muted-foreground">· {lines.length} стр.</span>
        </span>
        <span className="tabular-nums text-foreground font-medium">{fmtMoney(total)}</span>
      </button>
      {open && (
        <div className="border-t px-3 py-2 space-y-2">
          {lines.map((l, i) => (
            <OperationFormulaRow key={`${l.stage}-${i}-${l.name}`} line={l} />
          ))}
        </div>
      )}
    </div>
  );
}