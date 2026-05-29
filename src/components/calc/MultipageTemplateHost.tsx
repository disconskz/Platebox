import BrochureCalculator from "@/pages/BrochureCalculator";
import NotepadCalculator from "@/pages/NotepadCalculator";
import DeskCalendarCalculator from "@/pages/DeskCalendarCalculator";
import PocketCalendarCalculator from "@/pages/PocketCalendarCalculator";
import BoxProCalculator from "@/pages/BoxProCalculator";
import type { ProductType } from "@/lib/calc/types";
import type { BoxProResultPayload } from "@/pages/BoxProCalculator";

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
  onBoxResult?: (payload: BoxProResultPayload) => void;
}

export default function MultipageTemplateHost({ productType, onBoxResult }: MultipageTemplateHostProps) {
  switch (productType) {
    case "brochure":
      return <BrochureCalculator embedded mode="brochure" />;
    case "magazine":
      return <BrochureCalculator embedded mode="magazine" />;
    case "catalog":
      return <BrochureCalculator embedded mode="catalog" />;
    case "book":
      return <BrochureCalculator embedded mode="softcover" />;
    case "book_hardcover":
      return <BrochureCalculator embedded mode="hardcover" />;
    case "planner":
      return <BrochureCalculator embedded mode="planner" />;
    case "calendar_quarter":
      return <BrochureCalculator embedded mode="quartercal" />;
    case "notepad":
      return <NotepadCalculator embedded />;
    case "calendar_desk":
    case "calendar_wall":
      return <DeskCalendarCalculator embedded />;
    case "calendar_pocket":
      return <PocketCalendarCalculator embedded />;
    case "box":
      return <BoxProCalculator embedded onResult={onBoxResult} />;
    default:
      return null;
  }
}