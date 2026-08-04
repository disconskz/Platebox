import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, FileDown, FileText, Loader2, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { exportCalculationToPdf } from "@/lib/pdf-export";
import { toast } from "sonner";

export type TplSpecItem = {
  stage: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
};

export type TemplateActionsProps = {
  /** Семантика продукта (см. PRODUCT_LABELS). */
  productType: string;
  /** Подсказка по имени, например «Листовка A4». */
  defaultName: string;
  circulation: number;
  totals: { cost: number; sale: number; withVat: number; perItem: number };
  margin: number;
  vatPercent: number;
  spec: TplSpecItem[];
  /** Доп. параметры, попадающие в payload расчёта (формат, цветность и т.п.). */
  extra?: Record<string, unknown>;
};

/**
 * Универсальный блок действий «Сохранить расчёт / шаблон / КП / PDF» —
 * для всех шаблонных страниц (Доработки 36–58).
 */
export function TemplateActions(props: TemplateActionsProps) {
  const { productType, defaultName, circulation, totals, margin, vatPercent, spec, extra } = props;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const buildPayload = () => ({
    name: (name || defaultName).slice(0, 200),
    product_type: productType,
    circulation,
    format_type: (extra?.format_type as string) ?? "custom",
    format_width: (extra?.format_width as number) ?? 0,
    format_height: (extra?.format_height as number) ?? 0,
    color_front: (extra?.color_front as number) ?? 4,
    color_back: (extra?.color_back as number) ?? 0,
    items_per_sheet: (extra?.items_per_sheet as number) ?? 1,
    print_format_width: (extra?.print_format_width as number) ?? 0,
    print_format_height: (extra?.print_format_height as number) ?? 0,
    purchase_format_width: (extra?.purchase_format_width as number) ?? null,
    purchase_format_height: (extra?.purchase_format_height as number) ?? null,
    turnaround_type: (extra?.turnaround_type as string) ?? "none",
    forms_count: (extra?.forms_count as number) ?? null,
    total_cost: totals.cost,
    margin_percent: margin,
    sale_price: totals.sale,
    profit: totals.sale - totals.cost,
    calculation_date: (extra?.calculation_date as string) ?? new Date().toISOString().slice(0, 10),
    client_id: (extra?.client_id as string) || null,
    contact_name: (extra?.contact_name as string) || null,
    contact_phone: (extra?.contact_phone as string) || null,
    lead_source_id: (extra?.lead_source_id as string) || null,
    comment: (extra?.comment as string) || null,
    calculation_payload: (extra?.calculation_payload as Record<string, unknown>) ?? extra ?? {},
    pricing_snapshot: { spec, totals, margin, vatPercent },
  });

  const persist = async (asTemplate: boolean): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Сессия истекла — войдите заново");
      return null;
    }
    const payload = { ...buildPayload(), is_template: asTemplate, user_id: user.id };
    const { data, error } = await supabase
      .from("calculations")
      .insert(payload as any)
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Ошибка сохранения: " + (error?.message ?? "нет данных"));
      return null;
    }
    const items = spec.map((s, i) => ({
      calculation_id: data.id,
      stage: s.stage,
      sort_order: i,
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      unit_price: s.unitPrice,
      total_price: s.total,
    }));
    if (items.length) await supabase.from("calculation_items").insert(items);
    return data.id;
  };

  const handleSave = async (asTemplate: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const id = await persist(asTemplate);
      if (id) {
        toast.success(asTemplate ? "Шаблон сохранён" : "Расчёт сохранён");
        navigate(`/calculation/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const calc = {
        id: "draft",
        name: name || defaultName,
        product_type: productType,
        circulation,
        format_type: (extra?.format_type as string) ?? "custom",
        format_width: (extra?.format_width as number) ?? 0,
        format_height: (extra?.format_height as number) ?? 0,
        color_front: (extra?.color_front as number) ?? 4,
        color_back: (extra?.color_back as number) ?? 0,
        items_per_sheet: (extra?.items_per_sheet as number) ?? 1,
        print_format_width: (extra?.print_format_width as number) ?? 0,
        print_format_height: (extra?.print_format_height as number) ?? 0,
        purchase_format_width: (extra?.purchase_format_width as number) ?? null,
        purchase_format_height: (extra?.purchase_format_height as number) ?? null,
        turnaround_type: (extra?.turnaround_type as string) ?? "none",
        forms_count: (extra?.forms_count as number) ?? null,
      };
      const items = spec.map((s) => ({
        stage: s.stage,
        name: s.name,
        quantity: s.quantity,
        unit: s.unit,
        unit_price: s.unitPrice,
        total_price: s.total,
      }));
      await exportCalculationToPdf(calc as any, items as any, {
        cost: totals.cost,
        sale: totals.sale,
        margin,
        profit: totals.sale - totals.cost,
      });
      toast.success("PDF готов");
    } catch (e: any) {
      toast.error("Ошибка экспорта PDF: " + (e?.message ?? "неизвестно"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-accent" /> Сохранение и КП
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Название</Label>
          <Input
            placeholder={defaultName}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={() => handleSave(false)} disabled={saving || !spec.length} size="sm" className="w-full justify-center">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить расчёт
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving || !spec.length} size="sm" variant="outline" className="w-full justify-center">
            <BookmarkPlus className="mr-2 h-4 w-4" />
            Сохранить как шаблон
          </Button>
          <Button onClick={exportPdf} disabled={exporting || !spec.length} size="sm" variant="outline" className="w-full justify-center">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Скачать КП / PDF
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          КП формируется на основе спецификации работ и материалов. Сохранённый
          расчёт откроется в карточке — там доступны печать, дублирование и история.
        </p>
      </CardContent>
    </Card>
  );
}

export default TemplateActions;
