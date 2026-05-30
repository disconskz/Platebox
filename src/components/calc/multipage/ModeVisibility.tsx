import * as React from "react";
import { useCalcMode, type CalcUiMode } from "@/lib/calc/multipage/context";

/**
 * Обёртки для условного рендера секций по режиму интерфейса.
 *
 * • <SimpleOnly>       — только в простом режиме
 * • <AdvancedOnly>     — расширенный и тех. режим (всё, что выше простого)
 * • <TechOnly>         — только тех. режим
 * • <ModeGate modes>   — произвольный набор режимов
 *
 * Если контекста режимов нет (страница используется вне ERP-обвязки),
 * по умолчанию ведём себя как «Расширенный» — показываем всё, кроме TechOnly.
 */

const RANK: Record<CalcUiMode, number> = { simple: 0, advanced: 1, tech: 2 };

function atLeast(current: CalcUiMode, min: CalcUiMode): boolean {
  return RANK[current] >= RANK[min];
}

export function SimpleOnly({ children }: { children: React.ReactNode }) {
  const mode = useCalcMode();
  return mode === "simple" ? <>{children}</> : null;
}

export function AdvancedOnly({ children }: { children: React.ReactNode }) {
  const mode = useCalcMode();
  return atLeast(mode, "advanced") ? <>{children}</> : null;
}

export function TechOnly({ children }: { children: React.ReactNode }) {
  const mode = useCalcMode();
  return mode === "tech" ? <>{children}</> : null;
}

export function ModeGate({
  modes,
  children,
}: {
  modes: CalcUiMode[];
  children: React.ReactNode;
}) {
  const mode = useCalcMode();
  return modes.includes(mode) ? <>{children}</> : null;
}