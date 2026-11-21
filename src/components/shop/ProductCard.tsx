import { Link } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { flyToCart } from "@/lib/fly-to-cart";
import { inr, offerPercent } from "@/lib/pricing";
import type { Tables } from "@/integrations/supabase/types";

export function PriceRow({ mrp, sp, size = "sm" }: { mrp: number; sp: number; size?: "sm" | "lg" }) {
  const off = offerPercent(mrp, sp);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={size === "lg" ? "font-display text-3xl font-extrabold" : "font-display text-lg font-extrabold"}>{inr(sp)}</span>
      {off > 0 && (
        <>
          <span className={`text-muted-foreground line-through ${size === "lg" ? "text-base" : "text-xs"}`}>{inr(mrp)}</span>
          <span className={`rounded-full bg-accent px-2 py-0.5 font-bold text-accent-foreground ${size === "lg" ? "text-sm" : "text-[11px]"}`}>{off}% off</span>
        </>
      )}
    </div>
  );
}

/** Round "+" that turns into a − qty + stepper. Shared by product and deal cards. */
export function AddControl({ p, dark = true }: { p: Tables<"products">; dark?: boolean }) {
  const cart = useCart();
  const qty = cart.items.find((i) => i.product_id === p.id)?.qty ?? 0;
  const tone = dark ? "bg-primary text-primary-foreground" : "bg-card text-foreground";
  if (qty > 0)
    return (
      <div className={`animate-pop flex h-10 items-center rounded-full shadow-card ${tone}`}>
        <button aria-label="Decrease" onClick={() => cart.setQty(p.id, qty - 1)} className="h-full px-2.5 transition active:scale-75"><Minus className="h-4 w-4" /></button>
        <span key={qty} className="animate-pop min-w-4 text-center text-sm font-bold">{qty}</span>
        <button aria-label="Increase" disabled={qty >= p.stock} onClick={() => cart.setQty(p.id, qty + 1)} className="h-full px-2.5 transition active:scale-75 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
      </div>
    );
  return (
    <button
      disabled={p.stock <= 0}
      aria-label={`Add ${p.name} to cart`}
      onClick={(e) => {
        flyToCart(e.currentTarget.closest("[data-product-card]")?.querySelector("img") ?? e.currentTarget, p.images[0]);
        cart.add({ product_id: p.id, name: p.name, price: p.selling_price, mrp: p.mrp, image: p.images[0] });
        toast.success("Added to cart", { duration: 1200 });
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-card transition duration-200 hover:scale-110 active:scale-90 disabled:opacity-30 ${tone}`}
    >
      <Plus className="h-5 w-5" />
    </button>
  );
}

export function ProductCard({ p, index = 0 }: { p: Tables<"products">; index?: number }) {
  const off = offerPercent(p.mrp, p.selling_price);
  const save = p.mrp - p.selling_price;
  return (
    <div data-product-card style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }} className="animate-fade-up group flex flex-col rounded-[1.75rem] bg-card p-2 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float">
      <Link to="/product/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden rounded-[1.4rem] bg-secondary">
        {p.images[0] ? (
          <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground">−{off}%</span>}
        {p.stock <= 0 && <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-bold text-destructive">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{p.category}</p>
        <Link to="/product/$id" params={{ id: p.id }} className="mt-0.5 line-clamp-2 min-h-10 text-sm font-bold leading-snug">{p.name}</Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 leading-tight">
            <span className="block font-display text-lg font-extrabold">{inr(p.selling_price)}</span>
            {save > 0 && <><s className="block text-[11px] text-muted-foreground">{inr(p.mrp)}</s><b className="block text-[11px] text-offer">Save {inr(save)}</b></>}
          </div>
          <AddControl p={p} />
        </div>
      </div>
    </div>
  );
}
