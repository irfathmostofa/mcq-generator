import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Single browser-side Supabase client. Only the public anon key is used here;
 * all privileged work happens on the server with the service role key.
 * Sessions are persisted and refreshed automatically by supabase-js.
 */
export const supabase = createClient(
  supabaseUrl || "http://localhost:54321",
  supabaseAnonKey || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
