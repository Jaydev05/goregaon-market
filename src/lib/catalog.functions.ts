import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parseComboItems } from "./variants";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [settings, banners, products, categories, combos] = await Promise.all([
    sb.rpc("get_public_store_settings").single(),
    sb.from("banners").select("*").eq("is_active", true).order("sort_order"),
    sb.from("products").select("*, product_variants(*)").eq("is_active", true).order("created_at", { ascending: false }),
    sb.from("categories").select("*").eq("is_active", true).order("sort_order"),
    sb.from("combo_offers").select("*").order("sort_order"),
  ]);
  if (settings.error) throw new Error(settings.error.message);
  return {
    settings: settings.data,
    banners: banners.data ?? [],
    products: products.data ?? [],
    categories: categories.data ?? [],
    combos: (combos.data ?? []).map((c) => ({ ...c, items: parseComboItems(c.items) })),
  };
});

export const getProduct = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input.id)) throw new Error("Invalid product");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: product } = await sb.from("products").select("*, product_variants(*)").eq("id", data.id).eq("is_active", true).maybeSingle();
    return product;
  });
