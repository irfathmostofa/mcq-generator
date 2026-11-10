import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations";
import { supabaseConfigured } from "@/lib/supabase";
import { signIn } from "@/services/auth";

export function LoginPage() {
  const { user, loading, accessError, clearAccessError, refresh } = useAuth();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/admin";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!loading && !user) setPending(false);
  }, [loading, user]);

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (loading && !pending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    clearAccessError();
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
    });
    if (!parsed.success) {
      setError("Enter a valid email and password (min 8 characters).");
      return;
    }
    setPending(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {!supabaseConfigured ? (
              <p className="text-sm text-destructive" role="alert">
                Supabase is not configured. Set VITE_SUPABASE_URL and
                VITE_SUPABASE_ANON_KEY.
              </p>
            ) : null}
            {error || accessError ? (
              <p className="text-sm text-destructive" role="alert">
                {error ?? accessError}
              </p>
            ) : null}
            <Button
              className="w-full"
              type="submit"
              disabled={pending || loading || !supabaseConfigured}
            >
              {pending || loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
