import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, LayoutDashboard, Package, ShoppingBag, Users, Ticket, Image, Wallet, Settings, FolderTree, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminCombos } from "@/components/admin/AdminCombos";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminCustomers } from "@/components/admin/AdminCustomers";
import { AdminCoupons } from "@/components/admin/AdminCoupons";
import { AdminBanners } from "@/components/admin/AdminBanners";
import { AdminExpenses } from "@/components/admin/AdminExpenses";
import { AdminSettings } from "@/components/admin/AdminSettings";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
    return { isAdmin: !!data, email: u.user?.email ?? "" };
  },
  head: () => ({
    meta: [
      { title: "Admin panel — Goregaon Mart" },
      { name: "description", content: "Manage products, sizes, categories, combos, orders, customers, coupons and delivery." },
      { property: "og:title", content: "Admin panel — Goregaon Mart" },
      { property: "og:description", content: "Manage products, sizes, categories, combos, orders, customers, coupons and delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, C: AdminDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag, C: AdminOrders },
  { id: "products", label: "Products", icon: Package, C: AdminProducts },
  { id: "categories", label: "Categories", icon: FolderTree, C: AdminCategories },
  { id: "combos", label: "Combo offers", icon: Gift, C: AdminCombos },
  { id: "customers", label: "Customers", icon: Users, C: AdminCustomers },
  { id: "coupons", label: "Coupons", icon: Ticket, C: AdminCoupons },
  { id: "banners", label: "Offer banners", icon: Image, C: AdminBanners },
  { id: "expenses", label: "Expenses", icon: Wallet, C: AdminExpenses },
  { id: "settings", label: "Settings", icon: Settings, C: AdminSettings },
] as const;

function Admin() {
  const { isAdmin, email } = Route.useRouteContext();
  if (!isAdmin) return <NotAdmin email={email} />;
  return <AdminPanel />;
}

function NotAdmin({ email }: { email: string }) {
  const signOut = useSignOut();
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-bold">Admin access only</h1>
      <p className="text-sm text-muted-foreground">You're signed in as {email}, which isn't an admin account. Sign out and sign in with the admin login.</p>
      <div className="flex gap-2">
        <Button onClick={signOut}>Sign in as admin</Button>
        <Button variant="outline" asChild><Link to="/">Back to shop</Link></Button>
      </div>
    </main>
  );
}

function AdminPanel() {
  const signOut = useSignOut();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");
  const Active = TABS.find((t) => t.id === tab)!.C;
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 md:flex-row md:py-6">
      {/* Mobile top bar with visible logout */}
      <div className="flex items-center justify-between md:hidden">
        <h1 className="text-lg font-bold">Admin panel</h1>
        <Button variant="outline" size="sm" onClick={signOut} className="gap-2 text-destructive">
          <LogOut className="h-4 w-4" />Log out
        </Button>
      </div>
      <aside className="md:flex md:w-52 md:shrink-0 md:flex-col">
        <h1 className="mb-3 hidden text-lg font-bold md:block">Admin panel</h1>
        <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-1 md:flex-col md:gap-1 md:px-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary md:bg-transparent"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </nav>
        <Button variant="outline" onClick={signOut}
          className="mt-4 hidden w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive md:flex">
          <LogOut className="h-4 w-4" />Log out
        </Button>
      </aside>
      <section className="min-w-0 flex-1"><Active /></section>
    </div>
  );
}
