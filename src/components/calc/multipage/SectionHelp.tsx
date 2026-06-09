import * as React from "react";
import { HelpHint } from "@/components/HelpHint";

/**
 * Унифицированная подсказка для секций калькулятора многостраничных изделий.
 * Объясняет назначение секции и поведение в трёх режимах отображения
 * (Простой / Расширенный / Технологический).
 */
export interface SectionHelpProps {
  /** Что это за секция и зачем нужна. */
  what: React.ReactNode;
  /** Что доступно/что делать в Простом режиме. */
  simple: React.ReactNode;
  /** Что доступно в Расширенном режиме. */
  advanced: React.ReactNode;
  /** Что доступно в Технологическом режиме. */
  tech: React.ReactNode;
  /** Якорь раздела в /knowledge (опционально). */
  learnMore?: string;
  /** Заголовок подсказки. */
  title?: string;
}

export function SectionHelp({ what, simple, advanced, tech, learnMore, title }: SectionHelpProps) {
  return (
    <HelpHint title={title} learnMore={learnMore} side="right">
      <div className="space-y-2">
        <p>{what}</p>
        <div className="space-y-1">
          <div>
            <span className="font-medium text-foreground">Простой:</span>{" "}
            <span className="text-muted-foreground">{simple}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">Расширенный:</span>{" "}
            <span className="text-muted-foreground">{advanced}</span>
          </div>
          <div>
            <span className="font-medium text-foreground">Технологический:</span>{" "}
            <span className="text-muted-foreground">{tech}</span>
          </div>
        </div>
      </div>
    </HelpHint>
  );
}

export default SectionHelp;