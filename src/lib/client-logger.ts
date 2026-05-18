import { supabase } from "@/integrations/supabase/client";

let installed = false;
let lastLogAt = 0;
const MIN_INTERVAL_MS = 1000; // anti-spam

async function send(message: string, stack?: string | null) {
  const now = Date.now();
  if (now - lastLogAt < MIN_INTERVAL_MS) return;
  lastLogAt = now;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // RLS требует authenticated
    await supabase.from("client_logs" as any).insert({
      user_id: user.id,
      message: String(message).slice(0, 2000),
      stack: stack ? String(stack).slice(0, 5000) : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // тихо игнорируем — логирование не должно ломать UX
  }
}

export function installClientLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const msg = event.message || "window.onerror";
    const stack = event.error?.stack || null;
    // eslint-disable-next-line no-console
    console.error("[client-error]", msg, event.error);
    void send(msg, stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: any = event.reason;
    const msg = (reason && (reason.message || String(reason))) || "unhandledrejection";
    const stack = reason?.stack || null;
    // eslint-disable-next-line no-console
    console.error("[client-rejection]", msg, reason);
    void send(msg, stack);
  });
}