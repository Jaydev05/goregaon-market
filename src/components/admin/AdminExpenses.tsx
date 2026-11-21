import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/pricing";

export function AdminExpenses() {
  const qc = useQueryClient();
  const { data: expenses = [] } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*").order("spent_on", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState({ title: "", category: "Stock purchase", amount: "", spent_on: format(new Date(), "yyyy-MM-dd"), notes: "" });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-expenses"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); };
  const thisMonth = format(new Date(), "yyyy-MM");
  const monthTotal = expenses.filter((e) => e.spent_on.startsWith(thisMonth)).reduce((n, e) => n + Number(e.amount), 0);
  const byCat = Object.entries(expenses.reduce<Record<string, number>>((m, e) => ({ ...m, [e.category]: (m[e.category] ?? 0) + Number(e.amount) }), {}));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Expenses</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">This month</p><p className="font-display text-2xl font-bold">{inr(monthTotal)}</p></div>
        {byCat.slice(0, 3).map(([c, v]) => <div key={c} className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">{c}</p><p className="font-display text-2xl font-bold">{inr(v)}</p></div>)}
      </div>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2"><Label>What for</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Delivery boy salary" /></div>
        <div><Label>Category</Label><Input list="exp-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <datalist id="exp-cats">{["Stock purchase", "Salary", "Rent", "Delivery / fuel", "Electricity", "Marketing", "Other"].map((c) => <option key={c} value={c} />)}</datalist></div>
        <div><Label>Amount ₹</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div><Label>Date</Label><Input type="date" value={f.spent_on} onChange={(e) => setF({ ...f, spent_on: e.target.value })} /></div>
        <div className="sm:col-span-2 lg:col-span-4"><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={async () => {
          if (!f.title.trim() || !(Number(f.amount) > 0)) { toast.error("Enter what it was for and the amount"); return; }
          const { error } = await supabase.from("expenses").insert({ ...f, amount: Number(f.amount), notes: f.notes || null });
          if (error) { toast.error(error.message); return; }
          toast.success("Expense added"); setF({ ...f, title: "", amount: "", notes: "" }); refresh();
        }}>Add expense</Button></div>
      </div>
      <div className="grid gap-2">
        {expenses.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm">
            <div className="flex-1"><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.category} · {format(new Date(e.spent_on), "d MMM yyyy")}{e.notes ? ` · ${e.notes}` : ""}</p></div>
            <span className="font-semibold">{inr(e.amount)}</span>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete expense?")) { await supabase.from("expenses").delete().eq("id", e.id); refresh(); } }}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
