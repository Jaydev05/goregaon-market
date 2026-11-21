import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { inr } from "@/lib/pricing";

export function useCustomers() {
  return useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const [p, o] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id,total,status,created_at").limit(5000),
      ]);
      const stats = new Map<string, { orders: number; spent: number; last?: string }>();
      for (const x of o.data ?? []) {
        if (x.status === "cancelled") continue;
        const s = stats.get(x.user_id) ?? { orders: 0, spent: 0 };
        s.orders += 1;
        if (x.status === "delivered") s.spent += Number(x.total);
        if (!s.last || x.created_at > s.last) s.last = x.created_at;
        stats.set(x.user_id, s);
      }
      return (p.data ?? []).map((c) => ({ ...c, ...(stats.get(c.id) ?? { orders: 0, spent: 0 }) }));
    },
  });
}

export function AdminCustomers() {
  const qc = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<(Tables<"profiles">) | null>(null);
  const [segment, setSegment] = useState("");
  const [coins, setCoins] = useState("");

  const list = customers
    .filter((c) => `${c.full_name} ${c.email} ${c.phone} ${c.segment}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.spent - a.spent);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Customers ({customers.length})</h2>
        <Input placeholder="Search name, phone, type…" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3 text-right">Orders</th><th className="p-3 text-right">Spent</th><th className="p-3 text-right">Coins</th><th className="p-3">Last order</th><th /></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3"><p className="font-medium">{c.full_name || "—"}</p><p className="text-xs text-muted-foreground">{c.email} {c.phone && `· ${c.phone}`}</p></td>
                <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{c.segment}</span></td>
                <td className="p-3 text-right">{c.orders}</td>
                <td className="p-3 text-right font-semibold">{inr(c.spent)}</td>
                <td className="p-3 text-right">{c.coins}</td>
                <td className="p-3 text-xs text-muted-foreground">{c.last ? format(new Date(c.last), "d MMM yyyy") : "—"}</td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => { setEdit(c); setSegment(c.segment); setCoins(String(c.coins)); }}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.full_name || edit?.email}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Customer type (e.g. regular, vip, wholesale)</Label><Input value={segment} onChange={(e) => setSegment(e.target.value.toLowerCase())} /></div>
            <div><Label>Coin balance</Label><Input type="number" value={coins} onChange={(e) => setCoins(e.target.value)} /></div>
            <Button onClick={async () => {
              const { error } = await supabase.from("profiles").update({ segment: segment.trim() || "regular", coins: Math.max(0, Number(coins) || 0) }).eq("id", edit!.id);
              if (error) { toast.error(error.message); return; }
              toast.success("Customer updated"); setEdit(null); qc.invalidateQueries({ queryKey: ["admin-customers"] });
            }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
