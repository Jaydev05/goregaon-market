import { describe, expect, it } from "vitest";
import { cartKey, comboView, defaultVariant, matchesSearch, optionView, productLine, type CatalogProduct, type PublicCombo, type Variant } from "./variants";

const v = (o: Partial<Variant>): Variant => ({ id: "v", product_id: "p1", name: "500 g", subtitle: null, sku: null, mrp: 100, selling_price: 80, stock: 5, image_url: null, sort_order: 0, is_active: true, created_at: "", ...o });
const prod = (o: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: "p1", name: "Surf Excel", description: "Detergent", category: "Household", category_id: null, subcategory_id: null,
  mrp: 100, selling_price: 80, images: ["main.jpg"], stock: 10, is_active: true, is_featured: false, created_at: "", product_variants: [], ...o,
});

describe("product options", () => {
  it("defaults to the first option that is in stock", () => {
    const p = prod({ product_variants: [v({ id: "a", stock: 0, sort_order: 0 }), v({ id: "b", stock: 3, sort_order: 1 })] });
    expect(defaultVariant(p)?.id).toBe("b");
  });
  it("ignores options the admin switched off", () => {
    const p = prod({ product_variants: [v({ id: "a", is_active: false })] });
    expect(defaultVariant(p)).toBeNull();
  });
  it("shows the chosen option's price, MRP, stock and photo", () => {
    const o = optionView(prod(), v({ mrp: 250, selling_price: 199, stock: 2, image_url: "1kg.jpg" }));
    expect(o).toMatchObject({ mrp: 250, price: 199, stock: 2, image: "1kg.jpg" });
  });
  it("puts each option in its own cart line, named with the option", () => {
    const p = prod();
    const a = productLine(p, v({ id: "a", name: "500 g" }));
    const b = productLine(p, v({ id: "b", name: "1 kg", selling_price: 150 }));
    expect(a.key).not.toBe(b.key);
    expect(b.name).toBe("Surf Excel — 1 kg");
    expect(b.price).toBe(150);
    expect(cartKey({ combo_id: "c1" })).toBe("c:c1");
  });
  it("search matches option names", () => {
    const p = prod({ product_variants: [v({ name: "Magic Masala" })] });
    expect(matchesSearch(p, "magic")).toBe(true);
    expect(matchesSearch(p, "chocolate")).toBe(false);
  });
});

describe("combo offers", () => {
  const combo = (items: PublicCombo["items"]): PublicCombo => ({ id: "c1", title: "Tea + Sugar", description: null, image_url: null, combo_price: 199, items, starts_at: null, ends_at: null, is_active: true, sort_order: 0, created_at: "" });
  const tea = prod({ id: "tea", name: "Tea", mrp: 150, stock: 10 });
  const sugar = prod({ id: "sugar", name: "Sugar", mrp: 60, stock: 3 });
  it("adds up item MRPs to show the saving", () => {
    const view = comboView(combo([{ product_id: "tea", variant_id: null, qty: 1 }, { product_id: "sugar", variant_id: null, qty: 1 }]), [tea, sugar]);
    expect(view?.mrp).toBe(210);
    expect(view?.save).toBe(11);
  });
  it("limits how many combos can be bought by the scarcest item", () => {
    const view = comboView(combo([{ product_id: "tea", variant_id: null, qty: 1 }, { product_id: "sugar", variant_id: null, qty: 2 }]), [tea, sugar]);
    expect(view?.available).toBe(1);
  });
  it("hides a combo when one of its products is no longer sold", () => {
    expect(comboView(combo([{ product_id: "tea", variant_id: null, qty: 1 }, { product_id: "gone", variant_id: null, qty: 1 }]), [tea])).toBeNull();
  });
});
