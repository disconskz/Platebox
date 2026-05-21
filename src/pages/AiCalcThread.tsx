import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Pin, PinOff, Archive, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logDataIssue, noSessionIssue } from "@/lib/data-issue";
import { toast } from "sonner";
import ChatWindow, { type ChatMessage, type ChatPart } from "@/components/ai-calc/ChatWindow";
import { useAiThreads } from "@/hooks/useAiThreads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import plataAvatar from "@/assets/plata-avatar.png";

export default function AiCalcThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Разговор");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { threads, rename, togglePin, toggleArchive, remove } = useAiThreads();
  const meta = threads.find((t) => t.id === threadId);

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

  const saveTitle = async () => {
    if (titleDraft.trim() && titleDraft !== title) {
      setTitle(titleDraft.trim());
      await rename(threadId, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!confirm("Удалить этот разговор?")) return;
    await remove(threadId);
    navigate("/ai-calc");
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/app");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-20 flex items-center gap-2 px-4 py-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 -ml-1.5 shrink-0" onClick={goBack} aria-label="Назад">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Назад</span>
        </Button>
        <div className="h-5 w-px bg-border/60 hidden sm:block" />
        <img src={plataAvatar} alt="" width={24} height={24} loading="lazy" className="h-6 w-6 rounded-md shrink-0" />
        {editingTitle ? (
          <Input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
            autoFocus
            className="h-8 text-sm max-w-md"
            maxLength={80}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
            className="flex items-center gap-1.5 text-sm font-medium truncate hover:text-primary transition-colors group/title"
            title="Переименовать"
          >
            <span className="truncate">{title}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-60 transition-opacity" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void togglePin(threadId)} title={meta?.is_pinned ? "Открепить" : "Закрепить"} aria-label={meta?.is_pinned ? "Открепить" : "Закрепить"}>
            {meta?.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => void toggleArchive(threadId)} title="В архив" aria-label="В архив">
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete} title="Удалить" aria-label="Удалить">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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