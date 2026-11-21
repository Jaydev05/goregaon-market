import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DeliveryMap } from "@/components/shop/DeliveryMap";
import { inr } from "@/lib/pricing";
import { ORDER_STATUSES, statusLabel } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Goregaon Mart" },
      { name: "description", content: "Live status of your order." },
      { property: "og:title", content: "Order details — Goregaon Mart" },
      { property: "og:description", content: "Live status of your order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: o, refetch } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", id).maybeSingle()).data,
    refetchInterval: 30_000,
  });
  useEffect(() => { refetch(); }, [refetch]);

  if (!o) return <main className="p-10 text-center text-muted-foreground">Loading…</main>;
  const items = o.items as { name: string; qty: number; price: number; image?: string }[];
  const steps = ORDER_STATUSES.filter((s) => s !== "cancelled");
  const current = steps.indexOf(o.status as (typeof steps)[number]);

  async function cancel() {
    const { error } = await supabase.rpc("cancel_my_order", { _order_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Order cancelled");
    refetch(); qc.invalidateQueries({ queryKey: ["my-orders"] });
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:py-8">
      <Link to="/orders" className="text-sm text-primary">← All orders</Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Order #{o.order_no}</h1>
        <span className="text-sm text-muted-foreground">{format(new Date(o.created_at), "d MMM yyyy, h:mm a")}</span>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        {o.status === "cancelled" ? (
          <p className="font-semibold text-destructive">This order was cancelled.</p>
        ) : (
          <>
            {o.status !== "delivered" && o.expected_delivery_at && (
              <p className="mb-4 text-sm">Expected by <span className="font-semibold">{format(new Date(o.expected_delivery_at), "h:mm a, d MMM")}</span></p>
            )}
            <ol className="flex flex-col gap-0">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${i <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{i <= current && <Check className="h-4 w-4" />}</span>
                    {i < steps.length - 1 && <span className={`h-6 w-0.5 ${i < current ? "bg-primary" : "bg-border"}`} />}
                  </div>
                  <span className={`pt-1 text-sm ${i <= current ? "font-semibold" : "text-muted-foreground"}`}>{statusLabel[s]}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        {(o.status === "placed" || o.status === "confirmed") && <Button variant="outline" className="mt-4" onClick={cancel}>Cancel order</Button>}
      </section>

      <section className="rounded-2xl border bg-card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Items</h2>
        {items.map((i, idx) => <div key={idx} className="flex justify-between py-1"><span>{i.qty} × {i.name}</span><span>{inr(i.qty * i.price)}</span></div>)}
        <dl className="mt-2 space-y-1 border-t pt-2">
          <div className="flex justify-between"><dt>Items total</dt><dd>{inr(o.subtotal)}</dd></div>
          {o.coupon_discount > 0 && <div className="flex justify-between text-offer"><dt>Coupon {o.coupon_code}</dt><dd>− {inr(o.coupon_discount)}</dd></div>}
          {o.coin_discount > 0 && <div className="flex justify-between text-offer"><dt>{o.coins_used} coins</dt><dd>− {inr(o.coin_discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{o.delivery_fee > 0 ? inr(o.delivery_fee) : "FREE"}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Cash to pay</dt><dd>{inr(o.total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{o.status === "delivered" ? `${o.coins_earned} coins added to your wallet.` : `You'll earn ${o.coins_earned} coins on delivery.`}</p>
      </section>

      <section className="rounded-2xl border bg-card p-4 text-sm">
        <h2 className="mb-1 font-semibold">Delivering to</h2>
        <p>{o.customer_name} · {o.phone}</p>
        <p className="text-muted-foreground">{o.address}</p>
        {o.lat != null && o.lng != null && <DeliveryMap lat={Number(o.lat)} lng={Number(o.lng)} className="mt-3" />}
        {o.distance_km != null && <p className="mt-2 text-xs text-muted-foreground">{Number(o.distance_km).toFixed(1)} km from our Goregaon store</p>}
        <a className="mt-2 inline-flex items-center gap-1 text-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}`}><Navigation className="h-4 w-4" />Open in Google Maps</a>
      </section>
    </main>
  );
}
