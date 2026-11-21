import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/pricing";

export function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [o, p, e] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at,coupon_discount,coin_discount").order("created_at", { ascending: false }).limit(1000),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("expenses").select("amount"),
      ]);
      return { orders: o.data ?? [], customers: p.count ?? 0, expenses: (e.data ?? []).reduce((n, x) => n + Number(x.amount), 0) };
    },
  });
  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  const delivered = data.orders.filter((o) => o.status === "delivered");
  const active = data.orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const revenue = delivered.reduce((n, o) => n + Number(o.total), 0);
  const discounts = delivered.reduce((n, o) => n + Number(o.coupon_discount) + Number(o.coin_discount), 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    const key = format(d, "yyyy-MM-dd");
    const sales = data.orders.filter((o) => o.status !== "cancelled" && o.created_at.slice(0, 10) === key).reduce((n, o) => n + Number(o.total), 0);
    return { day: format(d, "d MMM"), sales };
  });
  const cards = [
    { label: "Revenue (delivered)", value: inr(revenue) },
    { label: "Expenses", value: inr(data.expenses) },
    { label: "Net profit", value: inr(revenue - data.expenses) },
    { label: "Active orders", value: active.length },
    { label: "Total orders", value: data.orders.length },
    { label: "Customers", value: data.customers },
    { label: "Discounts given", value: inr(discounts) },
    { label: "Avg order value", value: inr(delivered.length ? Math.round(revenue / delivered.length) : 0) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{c.label}</p><p className="font-display text-2xl font-bold">{c.value}</p></div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 font-semibold">Sales — last 14 days</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--muted-foreground)" />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Bar dataKey="sales" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
