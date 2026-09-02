import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { localTimezone } from "@/lib/date";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("login" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — AI Vocabulary Streak" },
      {
        name: "description",
        content: "Create your account or log in to continue your daily vocabulary streak.",
      },
      { property: "og:title", content: "Sign in — AI Vocabulary Streak" },
      { property: "og:description", content: "Log in to continue your daily vocabulary streak." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(mode === "signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    if (isSignup) {
      if (fullName.trim().length < 2) {
        toast.error("Please enter your full name.");
        return;
      }
      if (password.length < 8) {
        toast.error("Use a password of at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        toast.error("Passwords don't match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim(), timezone: localTimezone() },
          },
        });
        if (error) throw error;
        // An existing email returns a user with no identities (obfuscated response).
        if (data.user && data.user.identities?.length === 0) {
          toast.error("An account with this email already exists. Log in or reset your password.");
          setIsSignup(false);
          return;
        }
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          toast.success("Welcome! Your first challenge is waiting.");
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Check your inbox to confirm your email, then log in.");
          setIsSignup(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("invalid login credentials")) {
            throw new Error("Incorrect email or password. Forgot it? Use “Forgot password” below.");
          }
          throw error;
        }
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email above first, then click “Forgot password”.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent. Check your inbox.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display font-bold">
          <Flame className="size-5 text-streak" aria-hidden />
          AI Vocabulary Streak
        </Link>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isSignup ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? "One word a day. Start your streak today."
                : "Log in to continue your streak."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {isSignup ? "Start Your Streak" : "Log in"}
              </Button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-muted-foreground text-xs uppercase">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
              Continue with Google
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              {isSignup ? "Already have an account?" : "New here?"}{" "}
              <button
                type="button"
                className="text-primary font-medium underline-offset-4 hover:underline"
                onClick={() => setIsSignup((value) => !value)}
              >
                {isSignup ? "Log in" : "Create an account"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
