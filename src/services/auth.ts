import { api, setLocalToken } from "@/lib/api";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "super_admin";
};

export class AuthError extends Error {}

async function signInLocal(email: string, password: string): Promise<void> {
  const result = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setLocalToken(result.token);
}

export async function signIn(email: string, password: string): Promise<void> {
  if (supabaseConfigured) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        setLocalToken(null);
        return;
      }
    } catch {
      /* fall through to local login */
    }
  }
  try {
    await signInLocal(email, password);
  } catch (error) {
    throw new AuthError(
      error instanceof Error ? error.message : "Invalid email or password.",
    );
  }
}

export async function signOut(): Promise<void> {
  setLocalToken(null);
  if (supabaseConfigured) {
    await supabase.auth.signOut();
  }
}

export function fetchAdminProfile(): Promise<AuthUser> {
  return api<AuthUser>("/api/auth/me");
}
