import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAiThreads } from "@/hooks/useAiThreads";
import aiLogo from "@/assets/ai-calc-logo.png";

export default function AiCalc() {
  const navigate = useNavigate();
  const { create } = useAiThreads();
  const start = async () => {
    const id = await create();
    if (id) navigate(`/ai-calc/${id}`);
  };
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
      <div className="max-w-md text-center space-y-5">
        <img src={aiLogo} alt="" width={72} height={72} className="mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">ИИ-расчёт</h1>
          <p className="text-sm text-muted-foreground">
            Опишите заказ обычными словами — ассистент задаст уточняющие вопросы, подберёт материалы и сразу прикинет стоимость по справочнику.
          </p>
        </div>
        <Button onClick={start} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> Начать новый разговор
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-2">
          <Sparkles className="h-3 w-3" /> Все ваши разговоры — слева в сайдбаре
        </div>
      </div>
    </div>
  );
}