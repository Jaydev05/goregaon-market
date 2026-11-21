import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { inr } from "@/lib/pricing";
import { statusLabel } from "@/lib/queries";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My orders — Goregaon Mart" },
      { name: "description", content: "Track your orders and delivery status." },
      { property: "og:title", content: "My orders — Goregaon Mart" },
      { property: "og:description", content: "Track your orders and delivery status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const match = useMatchRoute();
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  if (match({ to: "/orders/$id" })) return <Outlet />;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3 p-4 md:py-8">
      <h1 className="text-2xl font-bold">My orders</h1>
      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center"><Package className="h-12 w-12 text-muted-foreground" /><p>No orders yet.</p><Link to="/" className="text-primary underline">Start shopping</Link></div>
      )}
      {orders.map((o) => {
        const items = o.items as { name: string; qty: number; image?: string }[];
        return (
          <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex gap-3 rounded-2xl border bg-card p-3 hover:border-primary">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">{items[0]?.image && <img src={items[0].image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex-1 text-sm">
              <div className="flex justify-between"><span className="font-semibold">Order #{o.order_no}</span><span className="font-semibold">{inr(o.total)}</span></div>
              <p className="line-clamp-1 text-muted-foreground">{items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
              <p className="mt-1 flex justify-between text-xs"><span className={o.status === "cancelled" ? "text-destructive" : o.status === "delivered" ? "text-offer" : "text-primary"}>{statusLabel[o.status]}</span><span className="text-muted-foreground">{format(new Date(o.created_at), "d MMM, h:mm a")}</span></p>
            </div>
          </Link>
        );
      })}
    </main>
  );
}
