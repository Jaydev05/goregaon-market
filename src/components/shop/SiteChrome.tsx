import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingCart, Package, User, LayoutDashboard, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { catalogQuery } from "@/lib/queries";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const { data } = useQuery(catalogQuery);
  const s = data?.settings;
  return (
    <header className="glass sticky top-0 z-40 border-b border-border/50 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-w-0 max-w-6xl items-center gap-3 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-[11px] text-primary-foreground">GM</span>
          <span className="truncate">{s?.store_name ?? "Goregaon Mart"}</span>
        </Link>
        <span className="hidden items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold sm:flex">
          <MapPin className="h-3.5 w-3.5" /> Delivery within {s?.delivery_radius_km ?? 8} km · {s?.delivery_eta_minutes ?? 45} min
        </span>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {isAdmin && (
            <Link to="/admin" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-secondary">Admin</Link>
          )}
          <Link to="/orders" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-secondary">Orders</Link>
          <Link to={user ? "/account" : "/auth"} className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-secondary">
            {user ? "Account" : "Sign in"}
          </Link>
        </nav>
        <Link to="/cart" data-cart-target className="relative ml-auto shrink-0 rounded-full bg-primary p-2.5 text-primary-foreground transition active:scale-90 md:ml-0" aria-label="Cart">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span key={count} className="animate-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">{count}</span>
          )}
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/cart", label: "Cart", icon: ShoppingCart, badge: count },
    { to: "/orders", label: "Orders", icon: Package },
    isAdmin
      ? { to: "/admin", label: "Admin", icon: LayoutDashboard }
      : { to: user ? "/account" : "/auth", label: user ? "Account" : "Sign in", icon: User },
  ] as const;
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-sm items-center justify-between gap-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-float">
        {items.map((it) => {
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.label}
              to={it.to}
              className={`relative flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-bold transition-all duration-300 active:scale-90 ${active ? "flex-[1.6] bg-card text-foreground shadow-card" : "flex-1 text-primary-foreground/60"}`}
            >
              <span {...(it.to === "/cart" ? { "data-cart-target": "" } : {})} className="relative inline-flex">
                <Icon className="h-5 w-5" />
                {"badge" in it && it.badge > 0 && (
                  <span key={it.badge} className="animate-pop absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{it.badge}</span>
                )}
              </span>
              {active && <span className="animate-fade-up whitespace-nowrap">{it.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
