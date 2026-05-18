export const SUPABASE_QUERY_TIMEOUT_MS = 12000;

export const createSupabaseTimeout = (ms = SUPABASE_QUERY_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timeoutId),
  };
};

export const isAbortError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
};