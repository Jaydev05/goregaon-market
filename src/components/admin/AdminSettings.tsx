import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { coinsEarnedFor, inr } from "@/lib/pricing";

type S = Tables<"store_settings">;
const NUM: [keyof S, string][] = [
  ["delivery_radius_km", "Delivery radius (km)"],
  ["min_order_amount", "Minimum order for delivery (₹)"],
  ["delivery_fee", "Delivery fee (₹)"],
  ["free_delivery_above", "Free delivery above (₹)"],
  ["delivery_eta_minutes", "Delivery time (minutes)"],
  ["coin_spend_step", "Coins: for every ₹ spent"],
  ["coins_per_step", "Coins: customer gets"],
  ["coin_value", "1 coin is worth (₹)"],
  ["max_coin_redeem_percent", "Max % of order payable by coins"],
  ["store_lat", "Store latitude"],
  ["store_lng", "Store longitude"],
];

export function AdminSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("store_settings").select("*").eq("id", 1).single()).data });
  const [f, setF] = useState<S | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (!f) return <p className="text-muted-foreground">Loading…</p>;
  const set = (k: keyof S, v: string | number) => setF({ ...f, [k]: v } as S);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Store settings</h2>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div><Label>Store name</Label><Input value={f.store_name} onChange={(e) => set("store_name", e.target.value)} /></div>
        <div><Label>Store phone</Label><Input value={f.store_phone ?? ""} onChange={(e) => set("store_phone", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Store address</Label><Input value={f.store_address} onChange={(e) => set("store_address", e.target.value)} /></div>
        {NUM.map(([k, label]) => (
          <div key={k}><Label>{label}</Label><Input type="number" step="any" value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} /></div>
        ))}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setF({ ...f, store_lat: p.coords.latitude, store_lng: p.coords.longitude }), () => toast.error("Allow location access"))}>
            <LocateFixed />Use my current location as store location
          </Button>
          <a className="text-sm text-primary underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${f.store_lat},${f.store_lng}`}>Check store pin on map</a>
        </div>
      </div>
      <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
        Example: an order of {inr(500)} earns {coinsEarnedFor(500, Number(f.coin_spend_step), Number(f.coins_per_step))} coins. Delivery only within {f.delivery_radius_km} km and for orders of {inr(Number(f.min_order_amount))} or more.
      </p>
      <Button className="w-fit" onClick={async () => {
        const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, NUM.some(([n]) => n === k) ? Number(v) : v])) as S;
        const { id: _id, updated_at: _u, ...rest } = row;
        const { error } = await supabase.from("store_settings").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", 1);
        if (error) { toast.error(error.message); return; }
        toast.success("Settings saved");
        qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["catalog"] });
      }}>Save settings</Button>
    </div>
  );
}
