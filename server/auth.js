import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { get, now as isoNow, run } from "./db.js";

const PROFILE_CACHE_TTL_MS = 60 * 1000;
const LOCAL_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SCRYPT_KEYLEN = 64;

let client = null;
const profileCache = new Map();

function getConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

export function isAuthConfigured() {
  return true;
}

export function supabaseReady() {
  const { url, serviceKey, anonKey } = getConfig();
  return Boolean(url && (serviceKey || anonKey));
}

function getClient() {
  if (client) return client;
  const { url, serviceKey, anonKey } = getConfig();
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function tokenSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-dev-auth-secret"
  );
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64").toString("utf8");
}

function signLocalToken(admin) {
  const payload = {
    sub: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    role: admin.role,
    exp: Date.now() + LOCAL_TOKEN_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  return `loc.${body}.${sig}`;
}

function verifyLocalToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "loc") return null;
  const [, body, sig] = parts;
  const expected = createHmac("sha256", tokenSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body));
    if (!payload?.sub || !payload.exp || payload.exp < Date.now()) return null;
    return {
      id: payload.sub,
      email: payload.email ?? "",
      full_name: payload.full_name ?? "",
      role: payload.role === "admin" ? "admin" : "super_admin",
    };
  } catch {
    return null;
  }
}

function defaultAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || "admin@local.test").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "admin1234",
    fullName: process.env.ADMIN_FULL_NAME || "Local Admin",
  };
}

export function ensureDefaultAdmin() {
  const existing = get("SELECT id FROM admins LIMIT 1");
  if (existing) return;
  const creds = defaultAdminCredentials();
  const created = isoNow();
  run(
    `INSERT INTO admins (id, email, password_hash, full_name, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      creds.email,
      hashPassword(creds.password),
      creds.fullName,
      "super_admin",
      created,
      created,
    ],
  );
  console.log(`[auth] seeded local admin ${creds.email}`);
}

ensureDefaultAdmin();

function publicAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
  };
}

export function loginLocalAdmin(email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  const row = get("SELECT * FROM admins WHERE email = ?", [normalized]);
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  const admin = publicAdmin(row);
  return { admin, token: signLocalToken(admin) };
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function verifyToken(token) {
  const local = verifyLocalToken(token);
  if (local) return { source: "local", user: local };

  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { source: "supabase", user: data.user };
}

async function loadAdminProfile(user) {
  const cached = profileCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const supabase = getClient();
  if (!supabase) return { profile: null, lookupFailed: true };

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[auth] admin_profiles lookup failed:", error.message);
    return { profile: null, lookupFailed: true };
  }

  const profile = data
    ? {
        id: user.id,
        email: user.email ?? "",
        full_name: data.full_name,
        role: data.role,
      }
    : null;
  const result = { profile, lookupFailed: false };
  profileCache.set(user.id, {
    ...result,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
  return result;
}

function fallbackAdminFromUser(user) {
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name || user.email || "Admin",
    role: "admin",
  };
}

export async function requireAdmin(req, res, next) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const verified = await verifyToken(token);
    if (!verified) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    if (verified.source === "local") {
      const row = get("SELECT * FROM admins WHERE id = ?", [verified.user.id]);
      if (!row) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      req.admin = publicAdmin(row);
      next();
      return;
    }

    const lookup = await loadAdminProfile(verified.user);
    if (lookup.profile) {
      req.admin = lookup.profile;
      next();
      return;
    }
    if (lookup.lookupFailed) {
      req.admin = fallbackAdminFromUser(verified.user);
      next();
      return;
    }
    res.status(403).json({ error: "Admin access required" });
  } catch (error) {
    console.error("[auth]", error);
    res.status(401).json({ error: "Invalid or expired session" });
  }
}
