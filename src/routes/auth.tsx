import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Goregaon Mart" },
      { name: "description", content: "Sign in or create your Goregaon Mart account to shop and earn coins." },
      { property: "og:title", content: "Sign in — Goregaon Mart" },
      { property: "og:description", content: "Sign in or create your account to shop and earn coins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const GoogleLogo = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  useEffect(() => {
    if (!loading && user) nav({ to: "/", replace: true });
  }, [user, loading, nav]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: form.name, phone: form.phone } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Sign-in failed");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 p-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">{mode === "forgot" ? "Reset password" : "Welcome"}</h1>
        <p className="text-sm text-muted-foreground">Shop, track orders and earn coins on every purchase.</p>
      </div>
      {mode !== "forgot" && (
        <>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => social("google")}
              style={{ background: "#FFFFFF", border: "1px solid #747775", color: "#1F1F1F" }}
              className="flex h-10 items-center justify-center gap-[10px] rounded-md px-3 text-sm font-medium">
              <GoogleLogo /> Continue with Google
            </button>
            <Button type="button" variant="outline" className="h-10" onClick={() => social("lovable")}>
              <LovableMark className="size-[18px]" /> Continue with Lovable
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" />
            <TabsContent value="signup" />
          </Tabs>
        </>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <>
            <div><Label htmlFor="name">Full name</Label><Input id="name" required value={form.name} onChange={set("name")} /></div>
            <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" type="tel" required value={form.phone} onChange={set("phone")} /></div>
          </>
        )}
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={form.email} onChange={set("email")} /></div>
        {mode !== "forgot" && (
          <div><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={form.password} onChange={set("password")} /></div>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
        <button type="button" className="text-sm text-primary" onClick={() => setMode(mode === "forgot" ? "signin" : "forgot")}>
          {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
        </button>
      </form>
    </main>
  );
}
