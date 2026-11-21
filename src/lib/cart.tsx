import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; name: string; price: number; mrp: number; image?: string | undefined; qty: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "gm-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
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
        const found = prev.find((p) => p.product_id === item.product_id);
        if (found) return prev.map((p) => (p.product_id === item.product_id ? { ...p, ...item, qty: Math.min(p.qty + qty, 50) } : p));
        return [...prev, { ...item, qty }];
      }),
    setQty: (id, qty) =>
      setItems((prev) => (qty <= 0 ? prev.filter((p) => p.product_id !== id) : prev.map((p) => (p.product_id === id ? { ...p, qty: Math.min(qty, 50) } : p)))),
    remove: (id) => setItems((prev) => prev.filter((p) => p.product_id !== id)),
    clear: () => setItems([]),
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}
