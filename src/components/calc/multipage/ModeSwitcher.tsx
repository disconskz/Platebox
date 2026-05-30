import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultipageCalcOptional, type CalcUiMode } from "@/lib/calc/multipage/context";
import { Gauge, Layers, Wrench } from "lucide-react";

/**
 * Переключатель режимов интерфейса ERP-расчёта:
 *  • Простой — менеджер/новичок
 *  • Расширенный — старший менеджер
 *  • Технологический — производство
 *
 * Работает только внутри <MultipageCalcProvider>. Если контекста нет —
 * компонент ничего не рендерит.
 */
export default function ModeSwitcher({ className }: { className?: string }) {
  const ctx = useMultipageCalcOptional();
  if (!ctx) return null;
  const { mode, setMode } = ctx;

  return (
    <div className={className}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as CalcUiMode)}>
        <TabsList className="h-9">
          <TabsTrigger value="simple" className="gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            Простой
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Расширенный
          </TabsTrigger>
          <TabsTrigger value="tech" className="gap-1.5 text-xs">
            <Wrench className="h-3.5 w-3.5" />
            Технолог
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}