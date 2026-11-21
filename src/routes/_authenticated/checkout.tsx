import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Coins, LocateFixed, MapPin, Tag, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { catalogQuery } from "@/lib/queries";
import { computeTotals, distanceKm, inr } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Goregaon Mart" },
      { name: "description", content: "Confirm your address and pay with Cash on Delivery or coins." },
      { property: "og:title", content: "Checkout — Goregaon Mart" },
      { property: "og:description", content: "Confirm your address and pay with Cash on Delivery or coins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const nav = useNavigate();
  const { data: cat } = useQuery(catalogQuery);
  const s = cat?.settings;
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["my-coupons", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);
  const [useCoins, setUseCoins] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.full_name || "");
    setPhone((v) => v || profile.phone || "");
    setAddress((v) => v || profile.address || "");
    if (profile.lat && profile.lng) setLoc((v) => v ?? { lat: profile.lat!, lng: profile.lng! });
  }, [profile]);

  useEffect(() => { setApplied(null); }, [cart.subtotal]);

  const dist = s && loc ? distanceKm(s.store_lat, s.store_lng, loc.lat, loc.lng) : null;
  const inRange = dist !== null && s ? dist <= s.delivery_radius_km : false;
  const balance = profile?.coins ?? 0;
  const totals = useMemo(() => s && computeTotals({
    subtotal: cart.subtotal, couponDiscount: applied?.discount ?? 0,
    coinsRequested: useCoins ? balance : 0, coinBalance: balance, settings: s,
  }), [s, cart.subtotal, applied, useCoins, balance]);

  function locate() {
    if (!navigator.geolocation) { toast.error("Location isn't available on this device"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast.error("Please allow location access to check delivery"); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function applyCoupon(c = code) {
    if (!c.trim()) return;
    const { data, error } = await supabase.rpc("preview_coupon", { _code: c.trim(), _subtotal: cart.subtotal });
    if (error) { toast.error(error.message); return; }
    setApplied({ code: c.trim().toUpperCase(), discount: Number(data) });
    setCode(c.trim().toUpperCase());
    toast.success(`Coupon applied: ${inr(Number(data))} off`);
  }

  async function place() {
    if (!loc) { toast.error("Please share your delivery location"); return; }
    setPlacing(true);
    const { data, error } = await supabase.rpc("place_order", {
      _items: cart.items.map((i) => (i.combo_id ? { combo_id: i.combo_id, qty: i.qty } : { product_id: i.product_id, variant_id: i.variant_id ?? null, qty: i.qty })),
      _coupon_code: applied?.code ?? "",
      _coins_to_use: totals?.coinsUsed ?? 0,
      _name: name, _phone: phone, _address: address, _lat: loc.lat, _lng: loc.lng,
    });
    setPlacing(false);
    if (error) { toast.error(error.message); return; }
    cart.clear();
    toast.success("Order placed! Pay cash on delivery.");
    nav({ to: "/orders/$id", params: { id: data as string } });
  }

  if (cart.items.length === 0)
    return <main className="p-10 text-center"><p className="mb-3">Your cart is empty.</p><Link to="/" className="text-primary underline">Shop now</Link></main>;
  if (!s || !totals) return <main className="p-10 text-center text-muted-foreground">Loading…</main>;

  const canPlace = inRange && totals.meetsMinimum && name && phone && address && !placing;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[1fr_360px] md:py-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Checkout</h1>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Delivery address</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="n">Name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="p">Mobile</Label><Input id="p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label htmlFor="a">Full address (flat, building, landmark)</Label><Textarea id="a" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={locate} disabled={locating}>
              <LocateFixed /> {locating ? "Locating…" : loc ? "Update my location" : "Use my current location"}
            </Button>
            {dist !== null && (
              <span className={`text-sm font-medium ${inRange ? "text-offer" : "text-destructive"}`}>
                {dist.toFixed(1)} km from store · {inRange ? "Delivery available" : `Outside ${s.delivery_radius_km} km delivery area`}
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Tag className="h-4 w-4" />Coupons</h2>
          <div className="flex gap-2">
            <Input placeholder="Enter coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            {applied ? <Button variant="outline" onClick={() => { setApplied(null); setCode(""); }}>Remove</Button> : <Button onClick={() => applyCoupon()}>Apply</Button>}
          </div>
          {coupons.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {coupons.map((c) => (
                <button key={c.id} onClick={() => applyCoupon(c.code)} className="flex items-center justify-between rounded-xl border border-dashed p-3 text-left hover:border-primary">
                  <span><span className="font-mono font-bold">{c.code}</span><span className="block text-xs text-muted-foreground">{c.description || (c.discount_type === "percent" ? `${c.discount_value}% off` : `${inr(c.discount_value)} off`)}{c.min_order > 0 ? ` · min ${inr(c.min_order)}` : ""}</span></span>
                  <span className="text-sm font-semibold text-primary">Apply</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><Coins className="h-4 w-4" />Use coins</h2>
              <p className="text-sm text-muted-foreground">Balance {balance} coins · 1 coin = {inr(s.coin_value)} · up to {s.max_coin_redeem_percent}% of order</p>
            </div>
            <Switch checked={useCoins} disabled={totals.maxCoins === 0} onCheckedChange={setUseCoins} aria-label="Use coins" />
          </div>
          {useCoins && totals.coinsUsed > 0 && <p className="mt-2 text-sm text-offer">Using {totals.coinsUsed} coins = {inr(totals.coinDiscount)} off</p>}
        </section>

        <section className="flex items-center gap-3 rounded-2xl border-2 border-primary bg-secondary p-4 text-secondary-foreground">
          <Banknote className="h-5 w-5" /><div><p className="font-semibold">Cash on Delivery</p><p className="text-xs">Pay when your order arrives. Online payments coming soon.</p></div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border bg-card p-4 md:sticky md:top-20">
        <h2 className="mb-3 font-semibold">Order summary</h2>
        <ul className="mb-3 space-y-1 text-sm">
          {cart.items.map((i) => <li key={i.key} className="flex justify-between gap-2"><span className="line-clamp-1">{i.qty} × {i.name}</span><span>{inr(i.qty * i.price)}</span></li>)}
        </ul>
        <dl className="space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between"><dt>Items total</dt><dd>{inr(cart.subtotal)}</dd></div>
          {applied && <div className="flex justify-between text-offer"><dt>Coupon {applied.code}</dt><dd>− {inr(applied.discount)}</dd></div>}
          {totals.coinDiscount > 0 && <div className="flex justify-between text-offer"><dt>Coins</dt><dd>− {inr(totals.coinDiscount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{totals.fee === 0 ? <span className="text-offer">FREE</span> : inr(totals.fee)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold"><dt>To pay</dt><dd>{inr(totals.total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">You'll earn {totals.coinsEarned} coins when this order is delivered.</p>
        {!totals.meetsMinimum && <p className="mt-2 text-sm text-destructive">Minimum order for delivery is {inr(s.min_order_amount)}.</p>}
        {!loc && <p className="mt-2 text-sm text-muted-foreground">Share your location to check delivery.</p>}
        <Button className="mt-4 w-full" size="lg" disabled={!canPlace} onClick={place}>{placing ? "Placing…" : `Place order · ${inr(totals.total)}`}</Button>
      </aside>
    </main>
  );
}
