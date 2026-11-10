import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window === "undefined" ? undefined : window.localStorage,
    },
  },
);
