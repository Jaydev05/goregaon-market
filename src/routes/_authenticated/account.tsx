import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Coins, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useSignOut } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Goregaon Mart" },
      { name: "description", content: "Your profile, coin wallet and history." },
      { property: "og:title", content: "My account — Goregaon Mart" },
      { property: "og:description", content: "Your profile, coin wallet and history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, isAdmin } = useAuth();
  const signOut = useSignOut();
  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const { data: tx = [] } = useQuery({
    queryKey: ["coin-tx", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("coin_transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { if (profile) { setName(profile.full_name ?? ""); setPhone(profile.phone ?? ""); } }, [profile]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My account</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={signOut}><LogOut />Log out</Button>
      </div>
      <section className="flex items-center justify-between rounded-2xl bg-hero p-5 text-primary-foreground">
        <div><p className="text-sm opacity-85">Coin wallet</p><p className="font-display text-4xl font-bold">{profile?.coins ?? 0}</p><p className="text-xs opacity-85">Use coins as cash at checkout</p></div>
        <Coins className="h-12 w-12 text-accent" />
      </section>
      {isAdmin && <Button asChild variant="outline"><Link to="/admin"><LayoutDashboard />Open admin panel</Link></Button>}
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label htmlFor="p">Mobile</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        </div>
        <Button className="mt-3" onClick={async () => {
          const { error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", user!.id);
          if (error) { toast.error(error.message); return; }
          toast.success("Profile saved"); refetch();
        }}>Save</Button>
      </section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-semibold">Coin history</h2>
        {tx.length === 0 && <p className="text-sm text-muted-foreground">No coin activity yet. You earn coins when orders are delivered.</p>}
        {tx.map((t) => (
          <div key={t.id} className="flex justify-between border-b py-2 text-sm last:border-0">
            <span>{t.reason}<span className="block text-xs text-muted-foreground">{format(new Date(t.created_at), "d MMM yyyy")}</span></span>
            <span className={`font-semibold ${t.amount > 0 ? "text-offer" : "text-destructive"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
          </div>
        ))}
      </section>
      <Button variant="destructive" size="lg" onClick={signOut}><LogOut />Log out</Button>
    </main>
  );
}
