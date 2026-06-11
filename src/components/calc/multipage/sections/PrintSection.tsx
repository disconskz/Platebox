import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { SectionHelp } from "../SectionHelp";

/**
 * 6. Печать (ТЗ задачи 3). Отдельный блок: тип печати, цветность,
 * формы, приладка, формат печати, кол-во печатных листов.
 * Это ОТОБРАЖЕНИЕ агрегированных параметров — реальные расчёты
 * выполняются движком страницы.
 */

export type PrintType = "auto" | "offset" | "digital";

export interface PrintState {
  printType: PrintType;
  colorFront: number;
  colorBack: number;
  forms: number;
  setup: number;
  printFormat: string;
  printSheets: number;
}

export const DEFAULT_PRINT: PrintState = {
  printType: "auto",
  colorFront: 4,
  colorBack: 4,
  forms: 0,
  setup: 0,
  printFormat: "—",
  printSheets: 0,
};

export interface PrintSectionProps {
  value: PrintState;
  onChange: (next: PrintState) => void;
  title?: string;
  /** Если true — все поля только для чтения (значения подставлены движком). */
  readonly?: boolean;
}

export default function PrintSection({ value, onChange, title = "Печать", readonly = true }: PrintSectionProps) {
  const set = <K extends keyof PrintState>(k: K, v: PrintState[K]) => onChange({ ...value, [k]: v });
  // Readonly режим: показываем значения как статичный текст,
  // чтобы колесо мыши / стрелки не «дёргали» числа в number-инпутах.
  if (readonly) {
    const printTypeLabel =
      value.printType === "offset" ? "Офсет" : value.printType === "digital" ? "Цифра" : "Авто";
    const Field = ({ label, val }: { label: string; val: React.ReactNode }) => (
      <div>
        <Label className="text-xs">{label}</Label>
        <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
          {val}
        </div>
      </div>
    );
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Printer className="h-4 w-4" />
            {title}
            <SectionHelp
              title="Печать"
              what="Сводка по печати: тип (офсет/цифра), цветность лицо/оборот, формы, приладка, формат и количество печатных листов. Значения рассчитываются автоматически по основным параметрам и блокам."
              simple="Видно как сводку только для просмотра."
              advanced="Можно сверить цветность и формат — основной выбор делается в основных параметрах."
              tech="Все значения берутся из спуска полос и проходят в техотчёт и спецификацию."
              learnMore="print"
            />
          </CardTitle>
          <CardDescription>Блок для просмотра параметров — редактирование не требуется</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Тип печати" val={printTypeLabel} />
          <Field label="Цветность лицо" val={value.colorFront} />
          <Field label="Цветность оборот" val={value.colorBack} />
          <Field label="Формы" val={value.forms} />
          <Field label="Приладка" val={value.setup} />
          <Field label="Формат печати" val={value.printFormat || "—"} />
          <Field label="Печатных листов" val={value.printSheets} />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Printer className="h-4 w-4" />
          {title}
          <SectionHelp
            title="Печать"
            what="Сводка по печати: тип (офсет/цифра), цветность лицо/оборот, формы, приладка, формат и количество печатных листов."
            simple="Видно как сводку только для просмотра."
            advanced="Можно сверить цветность и формат — основной выбор делается в основных параметрах."
            tech="Все значения берутся из спуска полос и проходят в техотчёт и спецификацию."
            learnMore="print"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Тип печати</Label>
          <Select value={value.printType} onValueChange={(v) => set("printType", v as PrintType)} disabled={readonly}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Авто</SelectItem>
              <SelectItem value="offset">Офсет</SelectItem>
              <SelectItem value="digital">Цифра</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Цветность лицо</Label>
          <Input type="number" min={0} max={6} className="h-8 text-xs"
            value={value.colorFront} onChange={(e) => set("colorFront", +e.target.value || 0)} readOnly={readonly} />
        </div>
        <div>
          <Label className="text-xs">Цветность оборот</Label>
          <Input type="number" min={0} max={6} className="h-8 text-xs"
            value={value.colorBack} onChange={(e) => set("colorBack", +e.target.value || 0)} readOnly={readonly} />
        </div>
        <div>
          <Label className="text-xs">Формы</Label>
          <div className="flex h-8 items-center rounded-md border border-input bg-muted/40 px-3 text-xs">
            {value.forms}
          </div>
          <p className="text-[10px] text-muted-foreground">Авто (ERP, по красочности и обороту)</p>
        </div>
        <div>
          <Label className="text-xs">Приладка</Label>
          <Input type="number" min={0} className="h-8 text-xs"
            value={value.setup} onChange={(e) => set("setup", +e.target.value || 0)} readOnly={readonly} />
        </div>
        <div>
          <Label className="text-xs">Формат печати</Label>
          <Input className="h-8 text-xs"
            value={value.printFormat} onChange={(e) => set("printFormat", e.target.value)} readOnly={readonly} />
        </div>
        <div>
          <Label className="text-xs">Печатных листов</Label>
          <Input type="number" min={0} className="h-8 text-xs"
            value={value.printSheets} onChange={(e) => set("printSheets", +e.target.value || 0)} readOnly={readonly} />
        </div>
      </CardContent>
    </Card>
  );
}