import * as React from "react";
import { Outlet } from "react-router-dom";
import { MultipageCalcProvider } from "@/lib/calc/multipage/context";
import ModeSwitcher from "./ModeSwitcher";
import GlobalParamsBar from "./GlobalParamsBar";

/**
 * Обёртка для standalone-страниц шаблонных калькуляторов
 * (/calculator/brochure, /calculator/notepad и т.д.).
 *
 * Добавляет провайдер `MultipageCalcProvider` и плавающую панель с
 * переключателем режимов «Простой / Расширенный / Технолог», чтобы
 * SimpleOnly / AdvancedOnly / TechOnly корректно работали и вне
 * универсального экрана Calculator.tsx.
 */
export default function StandaloneModeShell({ children }: { children?: React.ReactNode }) {
  return (
    <MultipageCalcProvider>
      <div className="sticky top-0 z-30 mb-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Режим: Простой — менеджер · Расширенный — старший · Технолог — полный маршрут.
          </div>
          <ModeSwitcher />
        </div>
        <GlobalParamsBar className="mt-1.5" />
      </div>
      {children ?? <Outlet />}
    </MultipageCalcProvider>
  );
}