import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { catalogQuery } from "@/lib/queries";
import { deliveryFeeFor, inr } from "@/lib/pricing";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Goregaon Mart" },
      { name: "description", content: "Review the items in your cart before checkout." },
      { property: "og:title", content: "Your cart — Goregaon Mart" },
      { property: "og:description", content: "Review the items in your cart before checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const nav = useNavigate();
  const { data } = useQuery(catalogQuery);
  const s = data?.settings;
  const mrpTotal = cart.items.reduce((n, i) => n + i.mrp * i.qty, 0);
  const savings = mrpTotal - cart.subtotal;
  const fee = s ? deliveryFeeFor(cart.subtotal, s.delivery_fee, s.free_delivery_above) : 0;
  const short = s ? s.min_order_amount - cart.subtotal : 0;

  if (cart.items.length === 0)
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
        <ShoppingBag className="h-14 w-14 text-muted-foreground" />
        <h1 className="text-xl font-bold">Your cart is empty</h1>
        <Button asChild><Link to="/">Start shopping</Link></Button>
      </main>
    );

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[1fr_340px] md:py-8">
      <section className="flex flex-col gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Cart ({cart.count})</h1>
        {cart.items.map((i) => (
          <div key={i.key} className="animate-fade-up flex gap-3 rounded-3xl bg-card p-3 shadow-card">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary">{i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex flex-1 flex-col">
              <p className="line-clamp-2 text-sm font-medium">{i.combo_id && <span className="mr-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-extrabold text-accent-foreground">COMBO</span>}{i.name.replace(/^Combo: /, "")}</p>
              <p className="text-sm"><span className="font-semibold">{inr(i.price)}</span>{i.mrp > i.price && <span className="ml-2 text-xs text-muted-foreground line-through">{inr(i.mrp)}</span>}</p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-full bg-secondary">
                  <button className="p-1.5" onClick={() => cart.setQty(i.key, i.qty - 1)} aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
                  <span key={i.qty} className="animate-pop w-7 text-center text-sm font-semibold">{i.qty}</span>
                  <button className="p-1.5 disabled:opacity-40" disabled={i.qty >= Math.min(50, i.max ?? 50)} onClick={() => cart.setQty(i.key, i.qty + 1)} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <button onClick={() => cart.remove(i.key)} className="text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </section>
      <aside className="h-fit rounded-[1.75rem] bg-card p-5 shadow-card md:sticky md:top-20">
        <h2 className="mb-3 font-semibold">Price details</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Price (MRP)</dt><dd>{inr(mrpTotal)}</dd></div>
          {savings > 0 && <div className="flex justify-between text-offer"><dt>Discount</dt><dd>− {inr(savings)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{fee === 0 ? <span className="text-offer">FREE</span> : inr(fee)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{inr(cart.subtotal + fee)}</dd></div>
        </dl>
        {savings > 0 && <p className="mt-3 rounded-lg bg-offer/10 p-2 text-center text-sm font-medium text-offer">You save {inr(savings)} on this order</p>}
        {short > 0 && <p className="mt-3 rounded-lg bg-accent/30 p-2 text-center text-sm">Add {inr(short)} more — minimum order for delivery is {inr(s!.min_order_amount)}</p>}
        <Button className="mt-4 w-full rounded-full shadow-float transition active:scale-95" size="lg" disabled={short > 0} onClick={() => nav({ to: "/checkout" })}>Checkout</Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">Use coins and coupons on the next step</p>
      </aside>
    </main>
  );
}
