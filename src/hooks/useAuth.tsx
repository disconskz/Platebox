import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, refreshSession: async () => null, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
        applySession(null);
      });

    // Страховка от вечной загрузки, но даём storage restore достаточно времени.
    const safety = setTimeout(() => {
      if (!cancelled && !initialSessionResolved) {
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
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    setUser(s?.user ?? null);
    setLoading(false);
    return s;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, loading, refreshSession, signOut }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);