import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ParsedOrder = {
  product_type?: string;
  name?: string;
  circulation?: number;
  format?: string;
  custom_width_mm?: number;
  custom_height_mm?: number;
  color_front?: number;
  color_back?: number;
  material_category?: string;
  material_density?: number;
  has_lamination?: boolean;
  lamination_film?: string;
  lamination_sides?: number;
  has_fold?: boolean;
  fold_count?: number;
  has_numbering?: boolean;
  has_stamping?: boolean;
  has_die_cut?: boolean;
  margin_percent?: number;
  notes?: string;
};

interface Props {
  onApply: (order: ParsedOrder) => void;
}

const FIELD_LABELS: Record<keyof ParsedOrder, string> = {
  product_type: "Тип продукции",
  name: "Название",
  circulation: "Тираж",
  format: "Формат",
  custom_width_mm: "Ширина (мм)",
  custom_height_mm: "Высота (мм)",
  color_front: "Красочность лицо",
  color_back: "Красочность оборот",
  material_category: "Тип бумаги",
  material_density: "Плотность (г/м²)",
  has_lamination: "Ламинация",
  lamination_film: "Плёнка ламинации",
  lamination_sides: "Сторон ламинации",
  has_fold: "Биговка/фальц",
  fold_count: "Кол-во фальцев",
  has_numbering: "Нумерация",
  has_stamping: "Тиснение",
  has_die_cut: "Высечка",
  margin_percent: "Наценка (%)",
  notes: "Замечания",
};

function formatValue(v: any): string {
  if (typeof v === "boolean") return v ? "да" : "нет";
  return String(v);
}

export default function AiOrderAssistant({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedOrder | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { mode: "parse-order", text },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Ошибка ИИ");
      setResult(data.order || {});
    } catch (e: any) {
      toast.error(e?.message || "Не удалось разобрать заказ");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result);
    toast.success("Поля заполнены");
    setOpen(false);
    setText("");
    setResult(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-6 right-6 z-50 shadow-lg gap-2 rounded-full h-12 px-5"
          size="lg"
        >
          <Sparkles className="h-4 w-4" /> ИИ-ассистент
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Опишите заказ</SheetTitle>
          <SheetDescription>
            Напишите параметры словами — ИИ заполнит форму калькулятора.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <Textarea
            autoFocus
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Например: листовка А5, 4+4, 3000 шт, мелованная 130 г, матовая ламинация с одной стороны, биговка"
          />

          {result && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-2">Распознано:</div>
              <ul className="text-sm space-y-1">
                {Object.entries(result)
                  .filter(([k, v]) => k !== "notes" && v !== undefined && v !== null && v !== "")
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{FIELD_LABELS[k as keyof ParsedOrder] || k}</span>
                      <span className="font-medium tabular-nums text-right">{formatValue(v)}</span>
                    </li>
                  ))}
              </ul>
              {result.notes && <div className="mt-2 text-[11px] text-muted-foreground italic">{result.notes}</div>}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground space-y-1">
            <div>Примеры:</div>
            <button type="button" className="block text-left underline-offset-2 hover:underline" onClick={() => setText("Визитки 90×50, 4+0, 1000 шт, дизайнерская 300 г")}>Визитки 90×50, 4+0, 1000 шт, дизайнерская 300 г</button>
            <button type="button" className="block text-left underline-offset-2 hover:underline" onClick={() => setText("Флаер А6, 4+4, 5000 шт, мелованная 130 г, наценка 25%")}>Флаер А6, 4+4, 5000 шт, мелованная 130 г, наценка 25%</button>
            <button type="button" className="block text-left underline-offset-2 hover:underline" onClick={() => setText("Постер А3, цвет 4+0, 200 шт, плотность 200, ламинация глянец")}>Постер А3, 4+0, 200 шт, плотность 200, глянцевая ламинация</button>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t">
          {!result ? (
            <Button className="w-full gap-2" onClick={run} disabled={loading || !text.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Разбор…</> : <><Send className="h-4 w-4" /> Разобрать</>}
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>Переделать</Button>
              <Button className="flex-1" onClick={apply}>Применить</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}