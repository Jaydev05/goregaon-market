import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Goregaon Mart" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set a new password — Goregaon Mart" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  return (
    <main className="mx-auto max-w-md p-4 py-10">
      <h1 className="mb-4 text-2xl font-bold">Set a new password</h1>
      <form className="flex flex-col gap-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        const { error } = await supabase.auth.updateUser({ password: pw });
        setBusy(false);
        if (error) { toast.error(error.message); return; }
        toast.success("Password updated"); nav({ to: "/" });
      }}>
        <Label htmlFor="pw">New password</Label>
        <Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button disabled={busy}>Update password</Button>
      </form>
    </main>
  );
}
