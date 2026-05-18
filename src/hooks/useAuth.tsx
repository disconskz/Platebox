import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Subscribe FIRST to avoid races. Любое событие (включая INITIAL_SESSION
    // и SIGNED_IN после логина) снимает loading. Supabase обновляет внутренний
    // токен синхронно ДО вызова колбэка, поэтому последующие запросы уже
    // будут с авторизацией.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return;
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("[useAuth] getSession error:", e);
        if (!cancelled) setLoading(false);
      });

    // Страховка: если ни getSession, ни onAuthStateChange не ответили —
    // снимаем loading, чтобы UI не залипал в «Загрузка…».
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, loading, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);