import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartKey } from "./variants";

export type CartItem = {
  key: string;
  product_id?: string | undefined;
  variant_id?: string | undefined;
  combo_id?: string | undefined;
  name: string;
  price: number;
  mrp: number;
  image?: string | undefined;
  /** Stock known when added; caps the quantity on screen (the server re-checks). */
  max?: number | undefined;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "gm-cart-v1";
const cap = (i: { max?: number | undefined }) => Math.min(50, i.max ?? 50);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Older carts had no `key`; derive it so they keep working.
      if (raw) setItems((JSON.parse(raw) as CartItem[]).map((i) => ({ ...i, key: i.key ?? cartKey(i) })));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.qty * i.price, 0),
    add: (item, qty = 1) =>
      setItems((prev) => {
        const found = prev.find((p) => p.key === item.key);
        if (found) return prev.map((p) => (p.key === item.key ? { ...p, ...item, qty: Math.min(p.qty + qty, cap(item)) } : p));
        return [...prev, { ...item, qty: Math.min(qty, cap(item)) }];
      }),
    setQty: (key, qty) =>
      setItems((prev) => (qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, qty: Math.min(qty, cap(p)) } : p)))),
    remove: (key) => setItems((prev) => prev.filter((p) => p.key !== key)),
    clear: () => setItems([]),
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
