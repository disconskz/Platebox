import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMultipageCalcOptional } from "@/lib/calc/multipage/context";

/**
 * Редактируемая панель глобальных параметров изделия — единый источник
 * правды для всех блоков (обложка, подложка, внутренние страницы и т.д.).
 *
 * Любое изменение здесь сразу попадает в `MultipageCalcContext.global`
 * и автоматически каскадно наследуется блоками без `override`.
 */
export default function GlobalParamsBar({ className }: { className?: string }) {
  const ctx = useMultipageCalcOptional();
  if (!ctx) return null;
  const g = ctx.global;
  const set = ctx.setGlobal;

  return (
    <div className={"rounded-md border bg-muted/30 px-2 py-2 " + (className ?? "")}>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        Общие параметры — наследуются всеми блоками
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <div className="space-y-1">
          <Label className="text-[11px]">Формат</Label>
          <Input
            value={g.format ?? ""}
            onChange={(e) => set({ format: e.target.value || undefined })}
            placeholder="A5"
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Тираж</Label>
          <Input
            type="number"
            min={1}
            value={g.circulation ?? ""}
            onChange={(e) =>
              set({ circulation: e.target.value ? Number(e.target.value) : undefined })
            }
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Ориентация</Label>
          <Select
            value={g.orientation ?? ""}
            onValueChange={(v) =>
              set({ orientation: (v || undefined) as "portrait" | "landscape" | undefined })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Книжная</SelectItem>
              <SelectItem value="landscape">Альбомная</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Печать</Label>
          <Select
            value={g.printType ?? ""}
            onValueChange={(v) => set({ printType: v || undefined })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="offset">Офсет</SelectItem>
              <SelectItem value="digital">Цифровая</SelectItem>
              <SelectItem value="uv">UV</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Сборка</Label>
          <Input
            value={g.bindingType ?? ""}
            onChange={(e) => set({ bindingType: e.target.value || undefined })}
            placeholder="kbs / saddle / spiral"
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Срок, дн.</Label>
          <Input
            type="number"
            min={1}
            value={g.leadTimeDays ?? ""}
            onChange={(e) =>
              set({ leadTimeDays: e.target.value ? Number(e.target.value) : undefined })
            }
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Наценка, %</Label>
          <Input
            type="number"
            min={0}
            value={g.marginPercent ?? ""}
            onChange={(e) =>
              set({ marginPercent: e.target.value ? Number(e.target.value) : undefined })
            }
            className="h-7 text-xs"
          />
        </div>
      </div>
    </div>
  );
}