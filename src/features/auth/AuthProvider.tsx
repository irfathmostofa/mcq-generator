import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { ApiError } from "@/lib/api";
import { fetchAdminProfile, signOut, type AuthUser } from "@/services/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  /** Set when a valid Supabase account was rejected (e.g. not an admin). */
  accessError: string | null;
  clearAccessError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [accessError, setAccessError] = useState<string | null>(null);

  const resolveProfile = useCallback(async (hasSession: boolean) => {
    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await fetchAdminProfile());
      setAccessError(null);
    } catch (error) {
      setUser(null);
      if (error instanceof ApiError && error.status === 403) {
        setAccessError("This account does not have admin access.");
        await signOut();
      } else if (error instanceof ApiError && error.status === 401) {
        await signOut();
      } else {
        setAccessError("Could not verify your session. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return;

    // onAuthStateChange fires INITIAL_SESSION on subscribe, so no separate
    // getSession() call is needed. Callbacks must not await supabase calls
    // directly, so the profile lookup is deferred.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      setLoading(true);
      setTimeout(() => void resolveProfile(Boolean(session)), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [resolveProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      accessError,
      clearAccessError: () => setAccessError(null),
    }),
    [user, loading, accessError],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
