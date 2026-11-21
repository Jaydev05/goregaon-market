import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Truck, Coins } from "lucide-react";
import { toast } from "sonner";
import { flyToCart } from "@/lib/fly-to-cart";
import { Button } from "@/components/ui/button";
import { PriceRow, VariantChips } from "@/components/shop/ProductCard";
import { activeVariants, defaultVariant, optionView, productLine } from "@/lib/variants";
import { productQuery, catalogQuery } from "@/lib/queries";
import { useCart } from "@/lib/cart";
import { coinsEarnedFor, inr } from "@/lib/pricing";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ context, params }) => {
    const [p] = await Promise.all([
      context.queryClient.ensureQueryData(productQuery(params.id)),
      context.queryClient.ensureQueryData(catalogQuery),
    ]);
    if (!p) throw notFound();
    return { name: p.name, description: p.description, image: p.images[0] };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Goregaon Mart` : "Product — Goregaon Mart";
    const desc = loaderData?.description?.slice(0, 150) || "Shop this product with Cash on Delivery in Goregaon.";
    const img = loaderData?.image?.startsWith("https://") ? loaderData.image : undefined;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "product" }, { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <p className="mb-4">This product isn't available.</p>
      <Link to="/" className="text-primary underline">Back to shop</Link>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(id));
  const { data: cat } = useSuspenseQuery(catalogQuery);
  const s = cat.settings;
  const cart = useCart();
  const nav = useNavigate();
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [vid, setVid] = useState<string | null>(p ? defaultVariant(p)?.id ?? null : null);
  if (!p) return null;
  const vs = activeVariants(p);
  const v = vs.find((x) => x.id === vid) ?? null;
  const o = optionView(p, v);
  const gallery = v?.image_url ? [v.image_url, ...p.images.filter((x) => x !== v.image_url)] : p.images;
  const out = o.stock <= 0;
  const pick = (id: string) => {
    const next = vs.find((x) => x.id === id);
    setVid(id); setImg(0);
    if (next) setQty((n) => Math.max(1, Math.min(n, next.stock)));
  };
  const add = (fly = false) => {
    if (fly) flyToCart(document.querySelector("[data-product-hero] img"), o.image);
    cart.add(productLine(p, v), qty);
    toast.success("Added to cart");
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-2 md:gap-10 md:py-10">
      <div>
        <div data-product-hero className="animate-fade-up aspect-square overflow-hidden rounded-[2rem] bg-card shadow-card">
          {gallery[img] && <img key={gallery[img]} src={gallery[img]} alt={p.name} className="animate-pop h-full w-full object-cover" />}
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2">
            {gallery.map((src, i) => (
              <button key={src} onClick={() => setImg(i)} className={`h-16 w-16 overflow-hidden rounded-2xl border-2 transition active:scale-90 ${i === img ? "border-primary" : "border-transparent"}`}>
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="animate-fade-up flex flex-col gap-4" style={{ animationDelay: "100ms" }}>
        <p className="w-fit rounded-full bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{p.category}</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{p.name}</h1>
        {vs.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">{vs.length > 1 ? "Choose an option" : "Option"}{v ? <span className="font-normal text-muted-foreground"> · {v.name}{v.subtitle ? ` — ${v.subtitle}` : ""}</span> : null}</p>
            <VariantChips variants={vs} value={vid} onChange={pick} size="lg" />
          </div>
        )}
        <PriceRow mrp={o.mrp} sp={o.price} size="lg" />
        {!out && o.stock <= 5 && <p className="text-sm font-semibold text-destructive">Only {o.stock} left — order soon</p>}
        <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
        <p className="whitespace-pre-line leading-relaxed text-foreground/85">{p.description}</p>
        <div className="flex flex-col gap-2 rounded-3xl bg-card p-4 text-sm shadow-card">
          <span className="flex items-center gap-2"><Truck className="h-4 w-4" />Delivery in ~{s.delivery_eta_minutes} min within {s.delivery_radius_km} km · Cash on Delivery</span>
          <span className="flex items-center gap-2"><Coins className="h-4 w-4" />Earn {coinsEarnedFor(o.price * qty, s.coin_spend_step, s.coins_per_step)} coins on this purchase</span>
        </div>
        {out ? (
          <p className="font-semibold text-destructive">Out of stock</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Qty</span>
              <div className="flex items-center rounded-full bg-card shadow-card">
                <button className="p-2" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span key={qty} className="animate-pop w-8 text-center font-semibold">{qty}</span>
                <button className="p-2" onClick={() => setQty(Math.min(o.stock, 50, qty + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
              </div>
              <span className="text-sm text-muted-foreground">= {inr(o.price * qty)}</span>
            </div>
            <div className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-2 rounded-full bg-card/90 p-1.5 shadow-float backdrop-blur md:static md:bg-transparent md:p-0 md:shadow-none">
              <Button size="lg" variant="outline" className="rounded-full transition active:scale-95" onClick={() => add(true)}>Add to cart</Button>
              <Button size="lg" className="rounded-full shadow-float transition active:scale-95" onClick={() => { add(); nav({ to: "/cart" }); }}>Buy now</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
