import { supabase, supabaseConfigured } from "@/lib/supabase";

const LOCAL_TOKEN_KEY = "mcq.local.token";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getLocalToken(): string | null {
  try {
    return window.localStorage.getItem(LOCAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setLocalToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
    else window.localStorage.removeItem(LOCAL_TOKEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

async function getAccessToken(): Promise<string | null> {
  const local = getLocalToken();
  if (local) return local;
  if (!supabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = await getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeoutMs = options.body instanceof FormData ? 180000 : 120000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort());
  }
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || "Request failed", response.status);
  }
  return payload as T;
}
