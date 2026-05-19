import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logDataIssue, noSessionIssue } from "@/lib/data-issue";
import { toast } from "sonner";
import ChatWindow, { type ChatMessage, type ChatPart } from "@/components/ai-calc/ChatWindow";

export default function AiCalcThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Разговор");
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) return;
    if (!user) { noSessionIssue("ai-calc:thread"); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: thread, error: tErr }, { data: msgs, error: mErr }] = await Promise.all([
        supabase.from("ai_threads").select("title").eq("id", threadId).maybeSingle(),
        supabase.from("ai_messages").select("id, role, parts, created_at").eq("thread_id", threadId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (tErr) {
        logDataIssue("ai-calc:thread-meta", tErr);
      }
      if (mErr) {
        logDataIssue("ai-calc:thread-msgs", mErr);
        toast.error("Не удалось загрузить сообщения");
      }
      if (!thread) {
        toast.error("Разговор не найден");
        navigate("/ai-calc", { replace: true });
        return;
      }
      setTitle(thread.title || "Разговор");
      setMessages(
        (msgs ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            parts: Array.isArray(m.parts) ? (m.parts as unknown as ChatPart[]) : [],
            created_at: m.created_at,
          })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [threadId, user?.id, navigate]);

  if (!threadId) return null;

  return (
    <div className="min-h-screen has-tabbar pb-0 flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/ai-calc" className="text-sm text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">К разговорам</span>
          </Link>
          <h1 className="text-sm sm:text-base font-medium truncate">{title}</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        {loading || messages === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <ChatWindow
            key={threadId}
            threadId={threadId}
            initialMessages={messages}
            onTitleSuggested={(t) => setTitle(t)}
          />
        )}
      </div>
    </div>
  );
}