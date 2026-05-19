import { supabase } from "@/integrations/supabase/client";
import { isAbortError } from "@/lib/supabase-timeout";

/**
 * Единый журнал и классификация причин, по которым данные не загрузились
 * или вернулись пустыми. Сообщения формулируются для конечного пользователя,
 * а структурированный лог отправляется в client_logs (если есть сессия).
 */

export type DataIssueKind =
  | "no_session"
  | "unauthorized"   // 401
  | "forbidden"      // 403 / RLS / RPC forbidden
  | "rls_empty"      // запрос выполнен, но RLS отдал пусто
  | "not_found"      // PGRST116
  | "timeout"
  | "network"
  | "validation"     // invalid_price / invalid_margin / version_conflict
  | "unknown";

export type DataIssue = {
  kind: DataIssueKind;
  userMessage: string;
  technical: string;
};

type ErrLike =
  | { message?: string; code?: string | number; status?: number; details?: string | null }
  | Error
  | string
  | null
  | undefined;

const MESSAGES: Record<DataIssueKind, string> = {
  no_session: "Сессия входа не восстановлена. Войдите снова, чтобы увидеть данные.",
  unauthorized: "Сессия истекла. Войдите снова, чтобы продолжить.",
  forbidden: "Доступ запрещён: у вашей учётной записи нет прав на это действие.",
  rls_empty: "Данные есть в базе, но они недоступны вашей учётной записи.",
  not_found: "Запись не найдена. Возможно, она была удалена.",
  timeout: "Сервер не ответил вовремя. Проверьте интернет и повторите попытку.",
  network: "Не удалось связаться с сервером. Проверьте интернет-соединение.",
  validation: "Сервер отклонил данные: проверьте введённые значения.",
  unknown: "Не удалось загрузить данные. Попробуйте обновить страницу.",
};

function pick(err: ErrLike): { message: string; code: string; status?: number } {
  if (!err) return { message: "", code: "" };
  if (typeof err === "string") return { message: err, code: "" };
  const message = (err as any).message || (err as any).details || "";
  const code = String((err as any).code ?? "");
  const status = (err as any).status as number | undefined;
  return { message: String(message), code, status };
}

/**
 * Определяет тип проблемы по ошибке Supabase/PostgREST/fetch.
 * Если ошибки нет, но `emptyResult` === true и пользователь авторизован,
 * возвращает kind="rls_empty" — это сигнал «RLS отдала ноль строк».
 */
export function classifyDataIssue(err: ErrLike, opts?: { emptyResult?: boolean }): DataIssue {
  if (isAbortError(err as any)) {
    return { kind: "timeout", userMessage: MESSAGES.timeout, technical: "AbortError" };
  }
  const { message, code, status } = pick(err);
  const m = message.toLowerCase();

  if (!err && opts?.emptyResult) {
    return { kind: "rls_empty", userMessage: MESSAGES.rls_empty, technical: "empty result with RLS" };
  }
  if (!err) {
    return { kind: "unknown", userMessage: MESSAGES.unknown, technical: "" };
  }

  if (status === 401 || code === "401" || m.includes("jwt expired") || m.includes("invalid jwt")) {
    return { kind: "unauthorized", userMessage: MESSAGES.unauthorized, technical: message || "401" };
  }
  if (
    status === 403 ||
    code === "401" ||
    code === "42501" ||
    m.includes("permission denied") ||
    m.includes("forbidden") ||
    m.includes("row-level security") ||
    m.includes("row level security") ||
    m.includes("violates row-level security")
  ) {
    return { kind: "forbidden", userMessage: MESSAGES.forbidden, technical: message || `status=${status}` };
  }
  if (code === "PGRST116" || m.includes("no rows")) {
    return { kind: "not_found", userMessage: MESSAGES.not_found, technical: message };
  }
  if (
    m.includes("invalid_price") ||
    m.includes("invalid_margin") ||
    m.includes("version_conflict") ||
    m.includes("item_not_found")
  ) {
    return { kind: "validation", userMessage: MESSAGES.validation, technical: message };
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) {
    return { kind: "network", userMessage: MESSAGES.network, technical: message };
  }
  return { kind: "unknown", userMessage: MESSAGES.unknown, technical: message || code || "unknown" };
}

let lastLogAt = 0;
const MIN_INTERVAL_MS = 500;

async function persist(context: string, issue: DataIssue, extra?: Record<string, unknown>) {
  const now = Date.now();
  if (now - lastLogAt < MIN_INTERVAL_MS) return;
  lastLogAt = now;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // RLS требует authenticated
    await supabase.from("client_logs" as any).insert({
      user_id: user.id,
      message: `[data-issue:${issue.kind}] ${context} — ${issue.userMessage}`.slice(0, 2000),
      stack: JSON.stringify({ technical: issue.technical, ...(extra || {}) }).slice(0, 5000),
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // не ломаем UX
  }
}

/**
 * Классифицирует ошибку, пишет в console + client_logs и возвращает результат,
 * пригодный для DataState.error / toast.
 */
export function logDataIssue(
  context: string,
  err: ErrLike,
  opts?: { emptyResult?: boolean; extra?: Record<string, unknown> },
): DataIssue {
  const issue = classifyDataIssue(err, { emptyResult: opts?.emptyResult });
  // eslint-disable-next-line no-console
  console.error(`[data-issue:${issue.kind}] ${context}`, { technical: issue.technical, err });
  void persist(context, issue, opts?.extra);
  return issue;
}

/** Удобный шорткат: ручное сообщение «нет сессии». */
export function noSessionIssue(context: string): DataIssue {
  const issue: DataIssue = {
    kind: "no_session",
    userMessage: MESSAGES.no_session,
    technical: "ensureSupabaseSession() returned null",
  };
  // eslint-disable-next-line no-console
  console.warn(`[data-issue:no_session] ${context}`);
  void persist(context, issue);
  return issue;
}
}

export const DATA_ISSUE_MESSAGES = MESSAGES;