import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logDataIssue, noSessionIssue } from "@/lib/data-issue";
import { DataState } from "@/components/DataState";

type Thread = { id: string; title: string; updated_at: string };

export default function AiCalc() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) { noSessionIssue("ai-calc:list"); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) {
      logDataIssue(error, { context: "ai-calc:list" });
      toast.error("Не удалось загрузить разговоры");
    } else {
      setThreads(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const createThread = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id, title: "Новый разговор" })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      logDataIssue(error, { context: "ai-calc:create" });
      toast.error("Не удалось создать разговор");
      return;
    }
    navigate(`/ai-calc/${data.id}`);
  };

  const removeThread = async (id: string) => {
    if (!confirm("Удалить этот разговор?")) return;
    const { error } = await supabase.from("ai_threads").delete().eq("id", id);
    if (error) {
      logDataIssue(error, { context: "ai-calc:delete" });
      toast.error("Не удалось удалить");
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="min-h-screen has-tabbar pb-24 md:pb-0">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold leading-tight truncate">ИИ-расчёт</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Опишите заказ словами — ИИ подберёт параметры</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button onClick={createThread} disabled={creating} className="gap-1.5">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="hidden sm:inline">Новый разговор</span>
              <span className="sm:hidden">Новый</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <DataState
          loading={loading}
          empty={threads.length === 0}
          emptyTitle="Ещё нет разговоров"
          emptyDescription="Создайте новый разговор и опишите заказ — например, «1000 листовок А5 4+4 на мелованной 130»."
          emptyAction={
            <Button onClick={createThread} disabled={creating} className="gap-1.5">
              <Plus className="h-4 w-4" /> Начать разговор
            </Button>
          }
        >
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center gap-2 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
                <Link to={`/ai-calc/${t.id}`} className="flex-1 min-w-0 px-3 py-2.5">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(t.updated_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeThread(t.id)}
                  className="px-3 py-2.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Удалить разговор"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </DataState>
      </main>
    </div>
  );
}