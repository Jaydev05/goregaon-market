<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Order pricing, coupon checks, coin redemption, minimum order and delivery-radius checks run in the `place_order` database function; `src/lib/pricing.ts` mirrors it only for on-screen previews — change both together. Why: customers must not be able to alter totals from the browser.
- Coins are credited/refunded by the `on_order_status_change` trigger (delivered → earn, cancelled → refund + restock). Why: one place owns wallet changes.
- Customers cannot change their own `coins`/`segment` (trigger `protect_profile_fields`); trusted DB functions set `app.trusted` to bypass. Why: prevents self-granting coins.
- All store-wide numbers (radius, min order, fees, coin rules, store location) live in the single `store_settings` row, editable in the admin panel; never hardcode them in UI. Why: admin must be able to change them.
- Product/banner images go to the private `product-images` bucket and are stored as long-lived signed URLs (public buckets are blocked in this workspace).
- Products may have options (`product_variants`); a trigger keeps the product's price (cheapest option) and total stock in sync, and `place_order` requires a `variant_id` when active options exist. Cart lines are keyed by `src/lib/variants.ts` `cartKey` (product+option or combo). Why: one source of truth for option pricing/stock.
- Cost prices live only in admin-only `product_costs` / `variant_costs` tables, never on shopper-readable rows. Why: shoppers must never see cost.
- Combos (`combo_offers.items` = [{product_id, variant_id, qty}]) are priced and stock-checked in `place_order`; order snapshots keep `components` so cancellation restocks them. Why: same server-side trust rule as single items.
- Admin panel is one route (`/admin`) with section components in `src/components/admin/`; shopper pages use `src/components/shop/`.
- Shoppers read store settings only through the `get_public_store_settings` database function (no phone); the `store_settings` table itself is admin-only. Why: keeps private contact fields out of public reads — add new public settings columns to that function too.
