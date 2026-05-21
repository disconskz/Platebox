import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logDataIssue } from "@/lib/data-issue";
import { toast } from "sonner";

export type AiThread = {
  id: string;
  title: string;
  updated_at: string;
  is_pinned: boolean;
  is_archived: boolean;
};

export type ThreadGroupKey = "pinned" | "today" | "yesterday" | "week" | "older";

const GROUP_LABELS: Record<ThreadGroupKey, string> = {
  pinned: "Закреплённые",
  today: "Сегодня",
  yesterday: "Вчера",
  week: "Последние 7 дней",
  older: "Раньше",
};

function bucketOf(t: AiThread, now: Date): ThreadGroupKey {
  if (t.is_pinned) return "pinned";
  const d = new Date(t.updated_at);
  const day = 24 * 60 * 60 * 1000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - day;
  const ts = d.getTime();
  if (ts >= startToday) return "today";
  if (ts >= startYesterday) return "yesterday";
  if (ts >= startToday - 7 * day) return "week";
  return "older";
}

export function useAiThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_threads")
      .select("id,title,updated_at,is_pinned,is_archived")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) {
      logDataIssue("ai-calc:threads-list", error);
      toast.error("Не удалось загрузить разговоры");
      setThreads([]);
    } else {
      setThreads((data ?? []) as AiThread[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("ai_threads")
      .insert({ user_id: user.id, title: "Новый разговор" })
      .select("id,title,updated_at,is_pinned,is_archived")
      .single();
    if (error || !data) {
      logDataIssue("ai-calc:create", error);
      toast.error("Не удалось создать разговор");
      return null;
    }
    setThreads((p) => [data as AiThread, ...p]);
    return data.id;
  }, [user]);

  const rename = useCallback(async (id: string, title: string) => {
    const t = title.trim().slice(0, 80);
    if (!t) return;
    setThreads((p) => p.map((x) => (x.id === id ? { ...x, title: t } : x)));
    const { error } = await supabase.from("ai_threads").update({ title: t }).eq("id", id);
    if (error) { logDataIssue("ai-calc:rename", error); toast.error("Не удалось переименовать"); void load(); }
  }, [load]);

  const togglePin = useCallback(async (id: string) => {
    const cur = threads.find((x) => x.id === id);
    if (!cur) return;
    const next = !cur.is_pinned;
    setThreads((p) => p.map((x) => (x.id === id ? { ...x, is_pinned: next } : x)));
    const { error } = await supabase.from("ai_threads").update({ is_pinned: next }).eq("id", id);
    if (error) { logDataIssue("ai-calc:pin", error); void load(); }
  }, [threads, load]);

  const toggleArchive = useCallback(async (id: string) => {
    const cur = threads.find((x) => x.id === id);
    if (!cur) return;
    const next = !cur.is_archived;
    setThreads((p) => p.map((x) => (x.id === id ? { ...x, is_archived: next } : x)));
    const { error } = await supabase.from("ai_threads").update({ is_archived: next }).eq("id", id);
    if (error) { logDataIssue("ai-calc:archive", error); void load(); }
  }, [threads, load]);

  const remove = useCallback(async (id: string) => {
    setThreads((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("ai_threads").delete().eq("id", id);
    if (error) { logDataIssue("ai-calc:delete", error); toast.error("Не удалось удалить"); void load(); }
  }, [load]);

  const touch = useCallback((id: string, patch?: Partial<AiThread>) => {
    setThreads((p) => {
      const i = p.findIndex((x) => x.id === id);
      if (i < 0) return p;
      const updated = { ...p[i], ...patch, updated_at: new Date().toISOString() };
      const rest = p.filter((_, idx) => idx !== i);
      return [updated, ...rest];
    });
  }, []);

  return { threads, loading, load, create, rename, togglePin, toggleArchive, remove, touch };
}

export function groupThreads(threads: AiThread[], query: string): Array<{ key: ThreadGroupKey; label: string; items: AiThread[] }> {
  const q = query.trim().toLowerCase();
  const active = threads.filter((t) => !t.is_archived).filter((t) => !q || t.title.toLowerCase().includes(q));
  const now = new Date();
  const groups = new Map<ThreadGroupKey, AiThread[]>();
  for (const t of active) {
    const k = bucketOf(t, now);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  const order: ThreadGroupKey[] = ["pinned", "today", "yesterday", "week", "older"];
  return order
    .filter((k) => (groups.get(k)?.length ?? 0) > 0)
    .map((k) => ({ key: k, label: GROUP_LABELS[k], items: groups.get(k)! }));
}

export const archivedThreads = (threads: AiThread[]) => threads.filter((t) => t.is_archived);