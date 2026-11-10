import { api } from "@/lib/api";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "super_admin";
};

export class AuthError extends Error {}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabaseConfigured) {
    throw new AuthError(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Do not reveal whether the email exists.
    throw new AuthError(
      error.status === 400 ? "Invalid email or password." : error.message,
    );
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Asks the API who the current token belongs to. The server verifies the JWT
 * with Supabase and checks the admin_profiles table, so a valid Supabase
 * account that is not an admin gets a 403 here.
 */
export function fetchAdminProfile(): Promise<AuthUser> {
  return api<AuthUser>("/api/auth/me");
}
