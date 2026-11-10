import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { ApiError, getLocalToken } from "@/lib/api";
import { fetchAdminProfile, signOut, type AuthUser } from "@/services/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  accessError: string | null;
  clearAccessError: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const resolveProfile = useCallback(async (hasSession: boolean) => {
    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await fetchAdminProfile();
      setUser(profile);
      setAccessError(null);
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 403) {
        setAccessError("This account does not have admin access.");
        setTimeout(() => {
          void signOut();
        }, 0);
      } else if (error instanceof ApiError && error.status === 401) {
        setTimeout(() => {
          void signOut();
        }, 0);
      } else {
        setAccessError(
          error instanceof Error
            ? error.message
            : "Could not verify your session. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (getLocalToken()) {
        if (!cancelled) await resolveProfile(true);
        return;
      }
      if (!supabaseConfigured) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        await resolveProfile(Boolean(data.session));
      } catch {
        if (cancelled) return;
        setUser(null);
        setLoading(false);
        setAccessError("Could not restore your session. Please sign in again.");
      }
    }

    void restore();

    const { data } = supabaseConfigured
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
          if (cancelled || getLocalToken()) return;
          setLoading(true);
          setTimeout(() => {
            if (!cancelled) void resolveProfile(Boolean(session));
          }, 0);
        })
      : { data: { subscription: { unsubscribe() {} } } };

    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, [resolveProfile]);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (getLocalToken()) {
      await resolveProfile(true);
      return;
    }
    if (!supabaseConfigured) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    await resolveProfile(Boolean(data.session));
  }, [resolveProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      accessError,
      clearAccessError: () => setAccessError(null),
      refresh,
    }),
    [user, loading, accessError, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
