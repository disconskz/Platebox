import type { Session } from "@supabase/supabase-js";

type StoredAuthPayload = {
  currentSession?: Session;
  session?: Session;
} & Partial<Session>;

const isFresh = (session: Session) => {
  if (!session.expires_at) return true;
  return session.expires_at > Math.floor(Date.now() / 1000) + 30;
};

export const readStoredAuthSession = (allowExpired = false): Session | null => {
  if (typeof window === "undefined") return null;

  const keys = Object.keys(window.localStorage).filter(
    (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
  );

  for (const key of keys) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const payload = JSON.parse(raw) as StoredAuthPayload;
      const session = payload.currentSession ?? payload.session ?? payload;
      if (session?.access_token && session?.refresh_token && session?.user) {
        if (allowExpired || isFresh(session as Session)) return session as Session;
      }
    } catch {
      // Ignore malformed storage from old sessions/extensions.
    }
  }

  return null;
};

export const getCachedAccessToken = (session?: Pick<Session, "access_token"> | null) =>
  session?.access_token ?? readStoredAuthSession()?.access_token ?? null;