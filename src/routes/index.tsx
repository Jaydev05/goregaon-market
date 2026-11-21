import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Truck, Coins, ShoppingBag, ArrowRight, ArrowUpRight, MapPin, Zap } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { AddControl, ProductCard } from "@/components/shop/ProductCard";
import { catalogQuery } from "@/lib/queries";
import { inr, offerPercent } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Goregaon Mart — Deals delivered in minutes" },
      { name: "description", content: "Browse offers on footwear, watches, electronics and more. Cash on Delivery across Goregaon." },
      { property: "og:title", content: "Goregaon Mart — Deals delivered in minutes" },
      { property: "og:description", content: "Browse offers and get fast Cash on Delivery across Goregaon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Home,
});

const PASTELS = ["bg-pastel-1", "bg-pastel-2", "bg-pastel-3", "bg-pastel-4"];

function Home() {
  const { data } = useSuspenseQuery(catalogQuery);
  const { settings: s, banners, products } = data;
  const [api, setApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  useEffect(() => {
    if (!api) return;
    const onSel = () => setSlide(api.selectedScrollSnap());
    api.on("select", onSel);
    const t = setInterval(() => api.scrollNext(), 4500);
    return () => { clearInterval(t); api.off("select", onSel); };
  }, [api]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const deals = useMemo(
    () => products.filter((p) => offerPercent(p.mrp, p.selling_price) > 0)
      .sort((a, b) => offerPercent(b.mrp, b.selling_price) - offerPercent(a.mrp, a.selling_price)).slice(0, 8),
    [products],
  );
  const filtered = products.filter(
    (p) => (cat === "All" || p.category === cat) && (q === "" || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())),
  );
  const toShop = () => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="animate-fade-up relative mt-3 overflow-hidden rounded-[2rem] bg-hero p-5 md:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 text-[11px] font-bold backdrop-blur">
          <MapPin className="h-3.5 w-3.5" /> {s.delivery_eta_minutes} min delivery · {s.delivery_radius_km} km
        </span>
        <h1 className="mt-3 font-display text-[2.15rem] font-extrabold leading-[1.02] tracking-tight md:text-6xl">
          Shop smarter,<br />delivered <span className="inline-block -rotate-2 rounded-2xl bg-primary px-2.5 text-primary-foreground">fast.</span>
        </h1>
        <p className="mt-3 max-w-md text-sm text-foreground/70 md:text-base">The best offers in Goregaon — pay with cash or UPI at your door.</p>
        <div className="mt-5 rounded-[1.6rem] bg-card/80 p-2 shadow-card backdrop-blur md:max-w-xl">
          <label className="flex items-center gap-3 rounded-full bg-secondary px-4 py-3 ring-primary/15 transition focus-within:ring-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); }} onFocus={toShop} placeholder="What are you looking for?" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Tile icon={Truck} t="Free delivery" d={`Above ${inr(s.free_delivery_above)}`} />
            <Tile icon={Coins} t="Earn coins" d={`${s.coins_per_step} per ${inr(s.coin_spend_step)}`} />
            <button onClick={toShop} className="group flex flex-col justify-between rounded-2xl bg-primary p-3 text-left text-primary-foreground transition active:scale-95">
              <span className="text-xs font-bold">Shop all</span>
              <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground transition group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
            </button>
          </div>
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 && (
        <section className="animate-fade-up pt-5" style={{ animationDelay: "120ms" }}>
          <Carousel setApi={setApi} opts={{ loop: true }}>
            <CarouselContent>
              {banners.map((b) => (
                <CarouselItem key={b.id}>
                  <div className="relative aspect-[16/8] overflow-hidden rounded-[2rem] bg-muted shadow-card md:aspect-[16/5]">
                    {b.image_url && <img src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/30 to-transparent" />
                    <div className="relative flex h-full flex-col justify-end gap-1 p-5 text-background md:justify-center md:p-10">
                      <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-accent-foreground">LIMITED OFFER</span>
                      <h2 className="font-display text-2xl font-extrabold leading-tight md:text-5xl">{b.title}</h2>
                      {b.subtitle && <p className="text-sm opacity-85 md:text-lg">{b.subtitle}</p>}
                      <button onClick={toShop} className="mt-2 flex w-fit items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-bold text-foreground transition active:scale-95">Shop now <ArrowRight className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          {banners.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {banners.map((b, i) => (
                <button key={b.id} aria-label={`Slide ${i + 1}`} onClick={() => api?.scrollTo(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "w-6 bg-primary" : "w-1.5 bg-primary/25"}`} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Daily deals */}
      {deals.length > 0 && q === "" && (
        <section className="mt-6 rounded-[2rem] bg-primary py-5 text-primary-foreground md:py-7">
          <div className="flex items-end justify-between px-5 md:px-7">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold md:text-3xl"><Zap className="h-5 w-5 fill-accent text-accent" /> Daily deals</h2>
            <span className="text-xs opacity-70">Up to {deals[0] ? offerPercent(deals[0].mrp, deals[0].selling_price) : 0}% off</span>
          </div>
          <div className="scrollbar-none mt-4 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:px-7">
            {deals.map((p, i) => (
              <div key={p.id} data-product-card className={`w-40 shrink-0 snap-start rounded-[1.6rem] p-3 text-foreground transition duration-300 hover:-translate-y-1 md:w-48 ${PASTELS[i % PASTELS.length]}`}>
                <Link to="/product/$id" params={{ id: p.id }} className="block">
                  <p className="line-clamp-1 text-sm font-extrabold">{p.name}</p>
                  <p className="text-[11px] font-semibold opacity-70">{offerPercent(p.mrp, p.selling_price)}% off today</p>
                  <div className="mt-2 aspect-square overflow-hidden rounded-2xl bg-card/60">
                    {p.images[0] && <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                </Link>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <span className="leading-tight"><s className="block text-[10px] opacity-60">{inr(p.mrp)}</s><b className="font-display text-base">{inr(p.selling_price)}</b></span>
                  <AddControl p={p} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalogue */}
      <section id="shop" className="scroll-mt-20 pt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-4xl">{cat === "All" ? "Explore" : cat}</h2>
          <span className="text-xs font-semibold text-muted-foreground">{filtered.length} items</span>
        </div>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition duration-300 active:scale-95 ${cat === c ? "bg-primary text-primary-foreground shadow-card" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {filtered.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
        {filtered.length === 0 && <p className="pb-10 text-center text-sm text-muted-foreground">No products found.</p>}
      </section>
      <CartBar />
    </main>
  );
}

function Tile({ icon: I, t, d }: { icon: typeof Truck; t: string; d: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
      <I className="h-4 w-4" />
      <span className="leading-tight"><span className="block text-xs font-bold">{t}</span><span className="block text-[10px] text-muted-foreground">{d}</span></span>
    </div>
  );
}

function CartBar() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <Link to="/cart" className="animate-fade-up fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center gap-3 rounded-full bg-accent py-2 pl-2 pr-5 text-accent-foreground shadow-float md:bottom-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ShoppingBag className="h-5 w-5" /></span>
      <span className="leading-tight"><span className="block text-xs font-semibold opacity-75">{count} item{count > 1 ? "s" : ""}</span><span key={subtotal} className="animate-pop block font-extrabold">{inr(subtotal)}</span></span>
      <span className="ml-auto flex items-center gap-1 text-sm font-extrabold">View cart <ArrowRight className="h-4 w-4" /></span>
    </Link>
  );
}
