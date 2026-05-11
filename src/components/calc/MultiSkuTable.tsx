import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpHint } from "@/components/HelpHint";
import type { SkuItem } from "@/lib/calc/multi-sku";

type Props = {
  skus: SkuItem[];
  onChange: (skus: SkuItem[]) => void;
};

export function MultiSkuTable({ skus, onChange }: Props) {
  const update = (idx: number, patch: Partial<SkuItem>) => {
    onChange(skus.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const add = () => onChange([...skus, { name: `SKU-${skus.length + 1}`, width: 105, height: 148, circulation: 100 }]);
  const remove = (idx: number) => onChange(skus.filter((_, i) => i !== idx));

  const totalCirc = skus.reduce((s, x) => s + (x.circulation || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center text-sm font-medium">
          Виды (SKU): {skus.length}
          <HelpHint title="Список видов" learnMore="multi-sku">
            Каждая строка — отдельный дизайн (вид). Все они печатаются вместе на одном листе.
            Общий тираж: {totalCirc.toLocaleString("ru-RU")} шт.
          </HelpHint>
        </Label>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Добавить вид
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left font-medium">№</th>
              <th className="px-2 py-2 text-left font-medium">Имя</th>
              <th className="px-2 py-2 text-left font-medium">Ш, мм</th>
              <th className="px-2 py-2 text-left font-medium">В, мм</th>
              <th className="px-2 py-2 text-left font-medium">Тираж</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {skus.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Нажмите «Добавить вид», чтобы начать
                </td>
              </tr>
            )}
            {skus.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1.5 text-muted-foreground w-10">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    value={s.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5 w-24">
                  <Input
                    type="number"
                    value={s.width}
                    onChange={(e) => update(i, { width: Number(e.target.value) })}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5 w-24">
                  <Input
                    type="number"
                    value={s.height}
                    onChange={(e) => update(i, { height: Number(e.target.value) })}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5 w-32">
                  <Input
                    type="number"
                    value={s.circulation}
                    onChange={(e) => update(i, { circulation: Number(e.target.value) })}
                    className="h-8"
                  />
                </td>
                <td className="px-2 py-1.5 w-10">
                  <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MultiSkuTable;