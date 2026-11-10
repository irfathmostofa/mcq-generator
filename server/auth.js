import { createClient } from "@supabase/supabase-js";

const PROFILE_CACHE_TTL_MS = 60 * 1000;

let client = null;
const profileCache = new Map();

function getConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export function isAuthConfigured() {
  const { url, serviceKey } = getConfig();
  return Boolean(url && serviceKey);
}

function getClient() {
  if (client) return client;
  const { url, serviceKey } = getConfig();
  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

/**
 * Asks Supabase Auth to validate the access token. This also honours
 * revoked sessions, unlike verifying the JWT signature alone.
 */
async function verifyToken(token) {
  const { data, error } = await getClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/** Looks up the admin role in public.admin_profiles (source of truth, same table RLS uses). */
async function loadAdminProfile(user) {
  const cached = profileCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const { data, error } = await getClient()
    .from("admin_profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Admin lookup failed: ${error.message}`);

  const profile = data
    ? {
        id: user.id,
        email: user.email ?? "",
        full_name: data.full_name,
        role: data.role,
      }
    : null;
  profileCache.set(user.id, {
    profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
  return profile;
}

/**
 * Express middleware.
 *   401 - missing or invalid/expired token
 *   403 - valid Supabase user that is not in admin_profiles
 *   503 - server is missing Supabase credentials
 */
export async function requireAdmin(req, res, next) {
  if (!isAuthConfigured()) {
    res.status(503).json({
      error: "Authentication is not configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    });
    return;
  }
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = await verifyToken(token);
    if (!user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    const admin = await loadAdminProfile(user);
    if (!admin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    req.admin = admin;
    next();
  } catch (error) {
    console.error("[auth]", error);
    res.status(500).json({ error: "Authentication check failed" });
  }
}
