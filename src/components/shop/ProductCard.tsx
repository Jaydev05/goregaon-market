import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/lib/cart";
import { flyToCart } from "@/lib/fly-to-cart";
import { inr, offerPercent } from "@/lib/pricing";
import { activeVariants, defaultVariant, optionView, productLine, type CatalogProduct, type Variant } from "@/lib/variants";

export function PriceRow({ mrp, sp, size = "sm" }: { mrp: number; sp: number; size?: "sm" | "lg" }) {
  const off = offerPercent(mrp, sp);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span key={sp} className={`animate-pop ${size === "lg" ? "font-display text-3xl font-extrabold" : "font-display text-lg font-extrabold"}`}>{inr(sp)}</span>
      {off > 0 && (
        <>
          <span className={`text-muted-foreground line-through ${size === "lg" ? "text-base" : "text-xs"}`}>{inr(mrp)}</span>
          <span className={`rounded-full bg-accent px-2 py-0.5 font-bold text-accent-foreground ${size === "lg" ? "text-sm" : "text-[11px]"}`}>{off}% off</span>
        </>
      )}
    </div>
  );
}

/** Round "+" that turns into a − qty + stepper for any cart line (product option or combo). */
export function LineAddControl({ line, dark = true, flyFrom }: { line: Omit<CartItem, "qty">; dark?: boolean; flyFrom?: string }) {
  const cart = useCart();
  const qty = cart.items.find((i) => i.key === line.key)?.qty ?? 0;
  const max = Math.min(50, line.max ?? 50);
  const tone = dark ? "bg-primary text-primary-foreground" : "bg-card text-foreground";
  if (qty > 0)
    return (
      <div className={`animate-pop flex h-10 items-center rounded-full shadow-card ${tone}`}>
        <button aria-label="Decrease" onClick={() => cart.setQty(line.key, qty - 1)} className="h-full px-2.5 transition active:scale-75"><Minus className="h-4 w-4" /></button>
        <span key={qty} className="animate-pop min-w-4 text-center text-sm font-bold">{qty}</span>
        <button aria-label="Increase" disabled={qty >= max} onClick={() => cart.setQty(line.key, qty + 1)} className="h-full px-2.5 transition active:scale-75 disabled:opacity-40"><Plus className="h-4 w-4" /></button>
      </div>
    );
  return (
    <button
      disabled={max <= 0}
      aria-label={`Add ${line.name} to cart`}
      onClick={(e) => {
        const card = e.currentTarget.closest(flyFrom ?? "[data-product-card]");
        flyToCart(card?.querySelector("img") ?? e.currentTarget, line.image);
        cart.add(line);
        toast.success("Added to cart", { duration: 1200 });
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-card transition duration-200 hover:scale-110 active:scale-90 disabled:opacity-30 ${tone}`}
    >
      <Plus className="h-5 w-5" />
    </button>
  );
}

export function AddControl({ p, v, dark = true }: { p: CatalogProduct; v?: Variant | null; dark?: boolean }) {
  const chosen = v === undefined ? defaultVariant(p) : v;
  return <LineAddControl line={productLine(p, chosen)} dark={dark} />;
}

/** Small chip row to switch size / flavour. */
export function VariantChips({ variants, value, onChange, size = "sm" }: { variants: Variant[]; value: string | null; onChange: (id: string) => void; size?: "sm" | "lg" }) {
  return (
    <div role="radiogroup" aria-label="Choose option" className={`scrollbar-none flex gap-1.5 overflow-x-auto ${size === "lg" ? "flex-wrap gap-2" : ""}`}>
      {variants.map((x) => {
        const on = x.id === value;
        const out = x.stock <= 0;
        return (
          <button key={x.id} role="radio" aria-checked={on} onClick={() => onChange(x.id)}
            className={`shrink-0 rounded-full border font-bold transition active:scale-95 ${size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-[11px]"} ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"} ${out ? "opacity-50 line-through" : ""}`}>
            {x.name}
          </button>
        );
      })}
    </div>
  );
}

export function ProductCard({ p, index = 0 }: { p: CatalogProduct; index?: number }) {
  const vs = activeVariants(p);
  const [vid, setVid] = useState<string | null>(defaultVariant(p)?.id ?? null);
  const v = vs.find((x) => x.id === vid) ?? null;
  const o = optionView(p, v);
  const off = offerPercent(o.mrp, o.price);
  const save = o.mrp - o.price;
  return (
    <div data-product-card style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }} className="animate-fade-up group flex flex-col rounded-[1.75rem] bg-card p-2 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-float">
      <Link to="/product/$id" params={{ id: p.id }} className="relative block aspect-square overflow-hidden rounded-[1.4rem] bg-secondary">
        {o.image ? (
          <img src={o.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-foreground">−{off}%</span>}
        {o.stock <= 0 && <span className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm font-bold text-destructive">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-1 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{p.category}</p>
        <Link to="/product/$id" params={{ id: p.id }} className="mt-0.5 line-clamp-2 min-h-10 text-sm font-bold leading-snug">{p.name}</Link>
        {vs.length > 1 && <div className="mt-1.5"><VariantChips variants={vs} value={vid} onChange={setVid} /></div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 leading-tight">
            <span key={o.price} className="animate-pop block font-display text-lg font-extrabold">{inr(o.price)}</span>
            {save > 0 && <><s className="block text-[11px] text-muted-foreground">{inr(o.mrp)}</s><b className="block text-[11px] text-offer">Save {inr(save)}</b></>}
          </div>
          <AddControl p={p} v={v} />
        </div>
      </div>
    </div>
  );
}
