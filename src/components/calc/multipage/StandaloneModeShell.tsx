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
      <div className="px-3 pt-3 sm:px-4">
        <div className="mb-2 flex justify-end">
          <ModeSwitcher />
        </div>
        <GlobalParamsBar className="mb-3" />
      </div>
      {children ?? <Outlet />}
    </MultipageCalcProvider>
  );
}