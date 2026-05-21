import { Plus, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAiThreads } from "@/hooks/useAiThreads";
import aiLogo from "@/assets/plata-avatar.png";

export default function AiCalc() {
  const navigate = useNavigate();
  const { create } = useAiThreads();
  const start = async () => {
    const id = await create();
    if (id) navigate(`/ai-calc/${id}`);
  };
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/app");
  };
  return (
    <div className="flex-1 flex flex-col px-6 py-4 animate-fade-in">
      <div className="hidden md:flex">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={goBack} aria-label="Назад">
          <ArrowLeft className="h-4 w-4" /> Назад
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center py-8">
      <div className="max-w-md text-center space-y-5">
        <img src={aiLogo} alt="Плата" width={96} height={96} loading="lazy" className="mx-auto rounded-2xl" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Привет, я Плата</h1>
          <p className="text-sm text-muted-foreground">
            Опишите заказ обычными словами — я задам уточняющие вопросы, подберу материалы и сразу прикину стоимость по справочнику.
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
    </div>
  );
}