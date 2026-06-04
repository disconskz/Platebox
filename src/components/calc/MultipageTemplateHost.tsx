import BrochureCalculator from "@/pages/BrochureCalculator";
import NotepadCalculator from "@/pages/NotepadCalculator";
import DeskCalendarCalculator from "@/pages/DeskCalendarCalculator";
import PocketCalendarCalculator from "@/pages/PocketCalendarCalculator";
import BoxProCalculator from "@/pages/BoxProCalculator";
import type { ProductType } from "@/lib/calc/types";
import type { BoxProResultPayload } from "@/pages/BoxProCalculator";
import { MultipageCalcProvider } from "@/lib/calc/multipage/context";
import ModeSwitcher from "@/components/calc/multipage/ModeSwitcher";
import GlobalParamsBar from "@/components/calc/multipage/GlobalParamsBar";

/**
 * Список типов продукции, для которых вместо стандартных секций «Нового расчёта»
 * подключается соответствующий многостраничный шаблон-калькулятор.
 * Это гарантирует, что и страница-шаблон (/calculator/brochure и т.д.),
 * и универсальный экран используют одну и ту же реализацию расчёта.
 */
export const TEMPLATE_DRIVEN_PRODUCT_TYPES: ProductType[] = [
  "brochure",
  "magazine",
  "catalog",
  "book",
  "book_hardcover",
  "notepad",
  "planner",
  "calendar_wall",
  "calendar_desk",
  "calendar_quarter",
  "calendar_pocket",
  "box",
];

export function isTemplateDriven(pt: ProductType): boolean {
  return TEMPLATE_DRIVEN_PRODUCT_TYPES.includes(pt);
}

export interface MultipageTemplateHostProps {
  productType: ProductType;
  /**
   * Получает унифицированный payload расчёта от любого шаблона
   * (коробка, брошюра, блокнот, календарь и т.д.). Используется в
   * Calculator.tsx, чтобы синхронизировать боковую панель/шапку с шаблоном.
   */
  onTemplateResult?: (payload: BoxProResultPayload) => void;
}

export default function MultipageTemplateHost({ productType, onTemplateResult }: MultipageTemplateHostProps) {
  const onResult = onTemplateResult;
  const inner = (() => {
    switch (productType) {
    case "brochure":
      return <BrochureCalculator embedded mode="brochure" onResult={onResult} />;
    case "magazine":
      return <BrochureCalculator embedded mode="magazine" onResult={onResult} />;
    case "catalog":
      return <BrochureCalculator embedded mode="catalog" onResult={onResult} />;
    case "book":
      return <BrochureCalculator embedded mode="softcover" onResult={onResult} />;
    case "book_hardcover":
      return <BrochureCalculator embedded mode="hardcover" onResult={onResult} />;
    case "planner":
      return <BrochureCalculator embedded mode="planner" onResult={onResult} />;
    case "calendar_quarter":
      return <BrochureCalculator embedded mode="quartercal" onResult={onResult} />;
    case "notepad":
      return <NotepadCalculator embedded onResult={onResult} />;
    case "calendar_desk":
    case "calendar_wall":
      return <DeskCalendarCalculator embedded onResult={onResult} />;
    case "calendar_pocket":
      return <PocketCalendarCalculator embedded onResult={onResult} />;
    case "box":
      return <BoxProCalculator embedded onResult={onResult} />;
    default:
      return null;
    }
  })();

  if (!inner) return null;

  return (
    <MultipageCalcProvider>
      <GlobalParamsBar className="mb-3" />
      {inner}
    </MultipageCalcProvider>
  );
}