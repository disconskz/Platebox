import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureSupabaseSession } from "@/lib/auth-session";
import { FormulaBuilder } from "@/components/references/FormulaBuilder";
import { useHandbook } from "@/lib/operations/HandbookProvider";
import type { BuilderConst } from "@/lib/operations/formula-builder";
import { toast } from "sonner";

/**
 * Диалог редактирования одной формулы статьи работ (operation_work_items)
 * прямо из калькулятора, без перехода в справочник.
 * Сохраняет в supabase и просит HandbookProvider перечитать данные.
 */
export function InlineFormulaEditor({
  open,
  onClose,
  title,
  initial,
  opCode,
  workItemCode,
  field,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  initial: string;
  opCode: number;
  workItemCode: number;
  /** Какое поле статьи работ редактируется. */
  field: "price_source" | "quantity_source";
}) {
  const { getOpVariables, refresh } = useHandbook();
  const [consts, setConsts] = useState<BuilderConst[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("calc_constants")
        .select("slug,name,value");
      setConsts(((data as any[]) || []) as BuilderConst[]);
    })();
  }, [open]);

  const variables = getOpVariables(opCode);

  return (
    <FormulaBuilder
      open={open}
      title={title}
      initialValue={initial}
      variables={variables}
      constants={consts}
      onClose={onClose}
      onSave={async (value) => {
        await ensureSupabaseSession();
        const { error } = await (supabase as any)
          .from("operation_work_items")
          .update({ [field]: value })
          .eq("operation_code", opCode)
          .eq("code", workItemCode);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Формула обновлена в справочнике");
        await refresh();
        onClose();
      }}
    />
  );
}