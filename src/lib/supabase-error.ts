import { toast } from "sonner";

type ErrorLike = { message?: string; code?: string | number; details?: string | null } | null | undefined;

/**
 * Унифицированная обработка ошибок Supabase / PostgREST.
 * Если есть ошибка — показывает toast.error и возвращает true.
 */
export function handleSupabaseError(error: ErrorLike, context?: string): boolean {
  if (!error) return false;
  const msg = error.message || error.details || "Неизвестная ошибка";
  const prefix = context ? `${context}: ` : "";
  // eslint-disable-next-line no-console
  console.error(`[supabase] ${prefix}${msg}`, error);
  toast.error(`${prefix}${msg}`);
  return true;
}

/** True, если PostgREST вернул "пусто" (PGRST116) — это не ошибка, а отсутствие строки. */
export function isNotFoundError(error: ErrorLike): boolean {
  return !!error && (error.code === "PGRST116" || /no rows/i.test(error.message || ""));
}