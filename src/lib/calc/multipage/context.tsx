import * as React from "react";

/**
 * Глобальный контекст ERP-расчёта многостраничных изделий.
 *
 * Содержит:
 *  - режим интерфейса (simple/advanced/tech)
 *  - глобальные параметры изделия (наследуются всеми блоками)
 *
 * Используется в Этапах 1+ переработки архитектуры:
 *  см. .lovable/plan.md → «Этап 1 — Фундамент».
 */

export type CalcUiMode = "simple" | "advanced" | "tech";

export interface GlobalProductParams {
  /** Формат изделия (название из справочника или произвольное "WxH мм"). */
  format?: string;
  formatWidth?: number;
  formatHeight?: number;
  /** Тираж изделия. */
  circulation?: number;
  /** Ориентация. */
  orientation?: "portrait" | "landscape";
  /** Тип печати: "offset" | "digital" | "uv" и т.д. */
  printType?: string;
  /** Тип сборки: "kbs" | "spiral" | "saddle" | ... */
  bindingType?: string;
  /** Срок производства, дней. */
  leadTimeDays?: number;
  /** Наценка, %. */
  marginPercent?: number;
  /** Тип изделия (брошюра, блокнот, календарь и т.д.). */
  productType?: string;
}

export interface MultipageCalcContextValue {
  mode: CalcUiMode;
  setMode: (m: CalcUiMode) => void;
  global: GlobalProductParams;
  setGlobal: (
    patch: Partial<GlobalProductParams> | ((prev: GlobalProductParams) => GlobalProductParams),
  ) => void;
}

const MultipageCalcContext = React.createContext<MultipageCalcContextValue | null>(null);

const MODE_STORAGE_KEY = "lovable.calc.mode";

function readStoredMode(): CalcUiMode {
  if (typeof window === "undefined") return "simple";
  try {
    const v = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "simple" || v === "advanced" || v === "tech") return v;
  } catch {}
  return "simple";
}

export interface MultipageCalcProviderProps {
  initialGlobal?: GlobalProductParams;
  children: React.ReactNode;
}

export function MultipageCalcProvider({ initialGlobal, children }: MultipageCalcProviderProps) {
  const [mode, setModeState] = React.useState<CalcUiMode>(() => readStoredMode());
  const [global, setGlobalState] = React.useState<GlobalProductParams>(() => initialGlobal ?? {});

  const setMode = React.useCallback((m: CalcUiMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, m);
    } catch {}
  }, []);

  const setGlobal = React.useCallback<MultipageCalcContextValue["setGlobal"]>((patch) => {
    setGlobalState((prev) =>
      typeof patch === "function" ? patch(prev) : { ...prev, ...patch },
    );
  }, []);

  const value = React.useMemo<MultipageCalcContextValue>(
    () => ({ mode, setMode, global, setGlobal }),
    [mode, setMode, global, setGlobal],
  );

  return <MultipageCalcContext.Provider value={value}>{children}</MultipageCalcContext.Provider>;
}

/**
 * Опциональный доступ к контексту — возвращает null, если шаблон используется
 * вне провайдера (например, на отдельной странице /calculator/brochure
 * до полной миграции на ERP-обвязку).
 */
export function useMultipageCalcOptional(): MultipageCalcContextValue | null {
  return React.useContext(MultipageCalcContext);
}

export function useMultipageCalc(): MultipageCalcContextValue {
  const ctx = React.useContext(MultipageCalcContext);
  if (!ctx) {
    throw new Error("useMultipageCalc must be used within <MultipageCalcProvider>");
  }
  return ctx;
}

export function useCalcMode(): CalcUiMode {
  return useMultipageCalcOptional()?.mode ?? "advanced";
}

/**
 * Хук наследования: возвращает глобальное значение, пока менеджер не
 * «Переопределил параметры блока». Если контекста нет — всегда локальное.
 *
 * @param key       поле глобального параметра
 * @param localValue локальное значение блока
 * @param override   true → используем localValue вне зависимости от глобального
 */
export function useInheritedParam<K extends keyof GlobalProductParams>(
  key: K,
  localValue: GlobalProductParams[K] | undefined,
  override: boolean,
): GlobalProductParams[K] | undefined {
  const ctx = useMultipageCalcOptional();
  if (!ctx) return localValue;
  if (override) return localValue;
  return ctx.global[key] ?? localValue;
}

/**
 * Хук синхронизации локальных «основных параметров» калькулятора с
 * глобальным контекстом ERP-расчёта. Дёшево: запускается на каждое
 * изменение, но `setGlobal` стабилен по ссылке.
 *
 * Передавайте только те поля, которые реально владеете на странице —
 * остальные не будут перезаписаны.
 */
export function useSyncMultipageGlobal(patch: Partial<GlobalProductParams>): void {
  const ctx = useMultipageCalcOptional();
  const setGlobal = ctx?.setGlobal;
  // сериализуем patch в стабильный ключ, чтобы избежать лишних апдейтов
  const key = React.useMemo(() => JSON.stringify(patch), [patch]);
  React.useEffect(() => {
    if (!setGlobal) return;
    setGlobal((prev) => {
      let changed = false;
      const next: GlobalProductParams = { ...prev };
      for (const k of Object.keys(patch) as (keyof GlobalProductParams)[]) {
        const v = patch[k];
        if (v === undefined) continue;
        if ((prev as any)[k] !== v) {
          (next as any)[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setGlobal]);
}