import type { Tables } from "@/integrations/supabase/types";
import type { CartItem } from "./cart";

export type Variant = Tables<"product_variants">;
export type CatalogProduct = Tables<"products"> & { product_variants?: Variant[] | null };
export type ComboItem = { product_id: string; variant_id: string | null; qty: number };
export type PublicCombo = Omit<Tables<"combo_offers">, "items"> & { items: ComboItem[] };

/** Active options of a product, in the admin's order. */
export function activeVariants(p: CatalogProduct): Variant[] {
  return (p.product_variants ?? []).filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

/** The option a shopper sees first: the first one in stock, else the first one. */
export function defaultVariant(p: CatalogProduct): Variant | null {
  const vs = activeVariants(p);
  return vs.find((v) => v.stock > 0) ?? vs[0] ?? null;
}

/** Price, stock and image to show for a product with the chosen option (or the product itself). */
export function optionView(p: CatalogProduct, v: Variant | null) {
  if (v) return { mrp: v.mrp, price: v.selling_price, stock: v.stock, image: v.image_url || p.images[0], label: v.name as string | null };
  return { mrp: p.mrp, price: p.selling_price, stock: p.stock, image: p.images[0], label: null as string | null };
}

export function cartKey(i: { product_id?: string | undefined; variant_id?: string | null | undefined; combo_id?: string | undefined }): string {
  return i.combo_id ? `c:${i.combo_id}` : `p:${i.product_id ?? ""}:${i.variant_id ?? ""}`;
}

export function productLine(p: CatalogProduct, v: Variant | null): Omit<CartItem, "qty"> {
  const o = optionView(p, v);
  return {
    key: cartKey({ product_id: p.id, variant_id: v?.id }),
    product_id: p.id,
    variant_id: v?.id,
    name: v ? `${p.name} — ${v.name}` : p.name,
    price: o.price,
    mrp: o.mrp,
    image: o.image,
    max: o.stock,
  };
}

export function parseComboItems(raw: unknown): ComboItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const r = x as Record<string, unknown>;
    if (typeof r["product_id"] !== "string") return [];
    const qty = Math.max(1, Math.floor(Number(r["qty"]) || 1));
    return [{ product_id: r["product_id"], variant_id: typeof r["variant_id"] === "string" ? r["variant_id"] : null, qty }];
  });
}

/** Resolves a combo against the catalogue. Returns null if any item is no longer sold. */
export function comboView(c: PublicCombo, products: CatalogProduct[]) {
  if (c.items.length === 0) return null;
  const parts: { name: string; qty: number; image: string | undefined }[] = [];
  let mrp = 0;
  let available = Infinity;
  for (const it of c.items) {
    const p = products.find((x) => x.id === it.product_id);
    if (!p) return null;
    let v: Variant | null = null;
    if (it.variant_id) {
      v = activeVariants(p).find((x) => x.id === it.variant_id) ?? null;
      if (!v) return null;
    }
    const o = optionView(p, v);
    mrp += o.mrp * it.qty;
    available = Math.min(available, Math.floor(o.stock / it.qty));
    parts.push({ name: v ? `${p.name} (${v.name})` : p.name, qty: it.qty, image: o.image });
  }
  mrp = Math.max(mrp, c.combo_price);
  return { parts, mrp, save: mrp - c.combo_price, available: Number.isFinite(available) ? available : 0 };
}

export function comboLine(c: PublicCombo, view: NonNullable<ReturnType<typeof comboView>>): Omit<CartItem, "qty"> {
  return {
    key: cartKey({ combo_id: c.id }),
    combo_id: c.id,
    name: `Combo: ${c.title}`,
    price: c.combo_price,
    mrp: view.mrp,
    image: c.image_url ?? view.parts[0]?.image,
    max: view.available,
  };
}

/** Search matches product name, description, category and option names / SKUs. */
export function matchesSearch(p: CatalogProduct, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [p.name, p.description, p.category, ...activeVariants(p).flatMap((v) => [v.name, v.subtitle ?? "", v.sku ?? ""])].join(" ").toLowerCase();
  return s.split(/\s+/).every((w) => hay.includes(w));
}
