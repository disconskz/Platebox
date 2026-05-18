import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { readStoredAuthSession } from "@/lib/auth-session";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, error: null, refreshSession: async () => null, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !!readStoredAuthSession(true));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let initialSessionResolved = false;

    const applySession = (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // Subscribe first, but do not treat an early empty INITIAL_SESSION as final:
    // on cold refresh it can arrive before storage is fully restored, which
    // previously sent users back to /auth and made RLS queries return [].
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;
      if (event === "INITIAL_SESSION" && !s && !initialSessionResolved) return;
      applySession(s);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        initialSessionResolved = true;
        applySession(s);
      })
      .catch((e) => {
        console.error("[useAuth] getSession error:", e);
        initialSessionResolved = true;
        setError(e instanceof Error ? e.message : String(e));
        applySession(null);
      });

    // Страховка от вечной загрузки, но даём storage restore достаточно времени.
    const safety = setTimeout(() => {
      if (!cancelled && !initialSessionResolved) {
        const stored = readStoredAuthSession();
        if (stored) {
          console.warn("[useAuth] session restore timeout; using cached session");
          initialSessionResolved = true;
          applySession(stored);
          return;
        }
        console.warn("[useAuth] session restore timeout");
        initialSessionResolved = true;
        applySession(null);
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshSession = async () => {
    try {
      const { data: { session: s }, error: err } = await supabase.auth.getSession();
      if (err) throw err;
      setError(null);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
      return null;
    }
  };

  const signOut = async () => {
    // Гарантированно очищаем локальное состояние, даже если запрос на сервер
    // упал (например, токен уже невалиден / нет сети). Иначе UI может остаться
    // в полузалогиненном состоянии.
    try {
      const { error: err } = await supabase.auth.signOut();
      if (err && !/session/i.test(err.message)) {
        console.warn("[useAuth] signOut error:", err.message);
      }
    } catch (e) {
      console.warn("[useAuth] signOut threw:", e);
    } finally {
      setSession(null);
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  return <Ctx.Provider value={{ user, session, loading, error, refreshSession, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);