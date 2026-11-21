import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MapPin, Navigation, Phone } from "lucide-react";
import { DeliveryMap } from "@/components/shop/DeliveryMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery as useQ } from "@tanstack/react-query";
import { catalogQuery, ORDER_STATUSES, statusLabel } from "@/lib/queries";
import { inr } from "@/lib/pricing";

export function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("active");
  const [openMap, setOpenMap] = useState<string | null>(null);
  const { data: cat } = useQ(catalogQuery);
  const s = cat?.settings;
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
    refetchInterval: 30_000,
  });
  const list = orders.filter((o) => filter === "all" || (filter === "active" ? !["delivered", "cancelled"].includes(o.status) : o.status === filter));

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${statusLabel[status]}`);
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Orders</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (to deliver)</SelectItem>
            <SelectItem value="all">All orders</SelectItem>
            {ORDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No orders here.</p>}
      {list.map((o) => {
        const items = o.items as { name: string; qty: number; price: number }[];
        const late = o.expected_delivery_at && !["delivered", "cancelled"].includes(o.status) && new Date(o.expected_delivery_at) < new Date();
        const done = o.status === "delivered" || o.status === "cancelled";
        return (
          <div key={o.id} className="rounded-2xl border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">#{o.order_no} · {o.customer_name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "d MMM, h:mm a")} · {Number(o.distance_km).toFixed(1)} km away</p>
                {o.expected_delivery_at && !done && <p className={`text-xs ${late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>{late ? "Late — was due " : "Due by "}{format(new Date(o.expected_delivery_at), "h:mm a")}</p>}
              </div>
              <div className="text-right"><p className="text-lg font-bold">{inr(o.total)}</p><p className="text-xs text-muted-foreground">Cash on Delivery</p></div>
            </div>
            <p className="mt-2">{items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
            {(o.coupon_discount > 0 || o.coins_used > 0) && <p className="text-xs text-offer">{o.coupon_code ? `Coupon ${o.coupon_code} −${inr(o.coupon_discount)} ` : ""}{o.coins_used > 0 ? `· ${o.coins_used} coins −${inr(o.coin_discount)}` : ""}</p>}
            <p className="mt-1 text-muted-foreground">{o.address}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)} disabled={done}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{ORDER_STATUSES.map((st) => <SelectItem key={st} value={st}>{statusLabel[st]}</SelectItem>)}</SelectContent>
              </Select>
              <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 rounded-md border px-3 py-2"><Phone className="h-4 w-4" />{o.phone}</a>
              <a target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-primary"
                href={`https://www.google.com/maps/dir/?api=1${s ? `&origin=${s.store_lat},${s.store_lng}` : ""}&destination=${o.lat},${o.lng}`}>
                <Navigation className="h-4 w-4" />Directions
              </a>
              <button type="button" onClick={() => setOpenMap(openMap === o.id ? null : o.id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-2">
                <MapPin className="h-4 w-4" />{openMap === o.id ? "Hide map" : "Show map"}
              </button>
            </div>
            {openMap === o.id && <DeliveryMap lat={Number(o.lat)} lng={Number(o.lng)} className="mt-3" />}
          </div>
        );
      })}
    </div>
  );
}
