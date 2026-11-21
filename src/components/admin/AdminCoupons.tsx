import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/pricing";
import { useCustomers } from "./AdminCustomers";

const blank = { code: "", description: "", discount_type: "percent", discount_value: "", max_discount: "", min_order: "0", target_type: "all", target_segment: "", target_user_id: "", usage_limit_per_user: "1", expires_at: "" };

export function AdminCoupons() {
  const qc = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: coupons = [] } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [f, setF] = useState(blank);
  const segments = Array.from(new Set(["regular", "vip", "wholesale", ...customers.map((c) => c.segment)]));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-coupons"] });

  async function create() {
    if (!f.code.trim() || !(Number(f.discount_value) > 0)) { toast.error("Code and discount are required"); return; }
    if (f.target_type === "segment" && !f.target_segment) { toast.error("Choose a customer type"); return; }
    if (f.target_type === "user" && !f.target_user_id) { toast.error("Choose a customer"); return; }
    const { error } = await supabase.from("coupons").insert({
      code: f.code.trim().toUpperCase(), description: f.description || null, discount_type: f.discount_type,
      discount_value: Number(f.discount_value), max_discount: f.max_discount ? Number(f.max_discount) : null,
      min_order: Number(f.min_order) || 0, target_type: f.target_type,
      target_segment: f.target_type === "segment" ? f.target_segment : null,
      target_user_id: f.target_type === "user" ? f.target_user_id : null,
      usage_limit_per_user: Number(f.usage_limit_per_user) || 1,
      expires_at: f.expires_at ? new Date(f.expires_at + "T23:59:59").toISOString() : null,
    });
    if (error) { toast.error(error.message.includes("duplicate") ? "That code already exists" : error.message); return; }
    toast.success("Coupon created"); setF(blank); refresh();
  }

  const who = (c: (typeof coupons)[number]) =>
    c.target_type === "all" ? "Everyone" : c.target_type === "new_users" ? "First order only"
      : c.target_type === "segment" ? `Type: ${c.target_segment}` : `Only ${customers.find((x) => x.id === c.target_user_id)?.full_name || customers.find((x) => x.id === c.target_user_id)?.email || "one customer"}`;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Coupons</h2>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="DIWALI20" /></div>
        <div><Label>Discount type</Label>
          <Select value={f.discount_type} onValueChange={(v) => setF({ ...f, discount_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percent">% off</SelectItem><SelectItem value="flat">Flat ₹ off</SelectItem></SelectContent></Select></div>
        <div><Label>{f.discount_type === "percent" ? "Percent" : "Amount (₹)"}</Label><Input type="number" value={f.discount_value} onChange={(e) => setF({ ...f, discount_value: e.target.value })} /></div>
        {f.discount_type === "percent" && <div><Label>Max discount ₹ (optional)</Label><Input type="number" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: e.target.value })} /></div>}
        <div><Label>Minimum order ₹</Label><Input type="number" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} /></div>
        <div><Label>Uses per customer</Label><Input type="number" value={f.usage_limit_per_user} onChange={(e) => setF({ ...f, usage_limit_per_user: e.target.value })} /></div>
        <div><Label>Who can use it</Label>
          <Select value={f.target_type} onValueChange={(v) => setF({ ...f, target_type: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="new_users">New customers (first order)</SelectItem><SelectItem value="segment">A customer type</SelectItem><SelectItem value="user">One specific customer</SelectItem></SelectContent></Select></div>
        {f.target_type === "segment" && <div><Label>Customer type</Label>
          <Select value={f.target_segment} onValueChange={(v) => setF({ ...f, target_segment: v })}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>}
        {f.target_type === "user" && <div><Label>Customer</Label>
          <Select value={f.target_user_id} onValueChange={(v) => setF({ ...f, target_user_id: v })}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
            <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>)}</SelectContent></Select></div>}
        <div><Label>Expires on (optional)</Label><Input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Description shown to customer</Label><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={create}>Create coupon</Button></div>
      </div>
      <div className="grid gap-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm">
            <div className="flex-1">
              <p><span className="font-mono font-bold">{c.code}</span> · {c.discount_type === "percent" ? `${c.discount_value}% off${c.max_discount ? ` (max ${inr(c.max_discount)})` : ""}` : `${inr(c.discount_value)} off`}</p>
              <p className="text-xs text-muted-foreground">{who(c)} · min {inr(c.min_order)} · {c.usage_limit_per_user}× per customer{c.expires_at ? ` · till ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : ""}</p>
            </div>
            <Switch checked={c.is_active} aria-label="Active" onCheckedChange={async (v) => { await supabase.from("coupons").update({ is_active: v }).eq("id", c.id); refresh(); }} />
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm(`Delete ${c.code}?`)) { await supabase.from("coupons").delete().eq("id", c.id); refresh(); } }}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
