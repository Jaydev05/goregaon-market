import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/pricing";
import { uploadImage } from "@/lib/upload";
import { parseComboItems, type ComboItem } from "@/lib/variants";
import { selectCls } from "./AdminProducts";

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const empty = { title: "", description: "", image_url: "", combo_price: "", starts_at: "", ends_at: "", is_active: true, items: [] as ComboItem[] };

export function AdminCombos() {
  const qc = useQueryClient();
  const { data: combos = [] } = useQuery({
    queryKey: ["admin-combos"],
    queryFn: async () => (await supabase.from("combo_offers").select("*").order("sort_order").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["admin-combo-products"],
    queryFn: async () => (await supabase.from("products").select("id, name, mrp, is_active, product_variants(id, name, mrp, is_active)").order("name")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-combos"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };

  const unitMrp = (it: ComboItem) => {
    const p = products.find((x) => x.id === it.product_id);
    if (!p) return 0;
    const v = it.variant_id ? p.product_variants.find((x) => x.id === it.variant_id) : null;
    return (v ? v.mrp : p.mrp) * it.qty;
  };
  const describe = (it: ComboItem) => {
    const p = products.find((x) => x.id === it.product_id);
    const v = it.variant_id ? p?.product_variants.find((x) => x.id === it.variant_id) : null;
    return `${it.qty > 1 ? `${it.qty} × ` : ""}${p?.name ?? "Removed product"}${v ? ` (${v.name})` : ""}`;
  };
  const totalMrp = f.items.reduce((n, it) => n + unitMrp(it), 0);
  const price = Number(f.combo_price);

  function edit(c?: (typeof combos)[number]) {
    setEditId(c?.id ?? null);
    setF(c ? { title: c.title, description: c.description ?? "", image_url: c.image_url ?? "", combo_price: String(c.combo_price), starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at), is_active: c.is_active, items: parseComboItems(c.items) } : empty);
    setOpen(true);
  }
  const setItem = (i: number, patch: Partial<ComboItem>) => setF((v) => ({ ...v, items: v.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  async function save() {
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    if (!(price > 0)) { toast.error("Combo price is required"); return; }
    if (f.items.length < 2) { toast.error("Add at least 2 items to a combo"); return; }
    for (const it of f.items) {
      const p = products.find((x) => x.id === it.product_id);
      if (!p) { toast.error("Choose a product for every item"); return; }
      if (p.product_variants.some((v) => v.is_active) && !it.variant_id) { toast.error(`Choose an option for ${p.name}`); return; }
    }
    if (f.starts_at && f.ends_at && f.ends_at <= f.starts_at) { toast.error("End date must be after the start date"); return; }
    setBusy(true);
    const row = { title: f.title.trim(), description: f.description.trim() || null, image_url: f.image_url || null, combo_price: price, items: f.items, starts_at: fromLocal(f.starts_at), ends_at: fromLocal(f.ends_at), is_active: f.is_active };
    const { error } = editId ? await supabase.from("combo_offers").update(row).eq("id", editId) : await supabase.from("combo_offers").insert({ ...row, sort_order: combos.length + 1 });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Combo saved"); setOpen(false); refresh();
  }

  const status = (c: (typeof combos)[number]) => {
    const now = new Date().toISOString();
    if (!c.is_active) return "Hidden";
    if (c.starts_at && c.starts_at > now) return "Scheduled";
    if (c.ends_at && c.ends_at <= now) return "Ended";
    return "Live";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Combo offers</h2>
        <Button onClick={() => edit()}><Plus />New combo</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {combos.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="aspect-[16/7] bg-muted">{c.image_url && <img src={c.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex items-start gap-2 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.title} <span className={`ml-1 rounded px-1.5 text-xs ${status(c) === "Live" ? "bg-offer/15 text-offer" : "bg-muted text-muted-foreground"}`}>{status(c)}</span></p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{parseComboItems(c.items).map(describe).join(" + ")}</p>
                <p className="mt-1 font-semibold">{inr(c.combo_price)}</p>
              </div>
              <Switch checked={c.is_active} aria-label="Show" onCheckedChange={async (v) => { await supabase.from("combo_offers").update({ is_active: v }).eq("id", c.id); refresh(); }} />
              <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => edit(c)}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this combo?")) { await supabase.from("combo_offers").delete().eq("id", c.id); refresh(); } }}><Trash2 /></Button>
            </div>
          </div>
        ))}
        {combos.length === 0 && <p className="text-sm text-muted-foreground">No combos yet. Create one like “Tea + Sugar Combo @ ₹199”.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editId ? "Edit combo" : "New combo"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Tea + Sugar Combo" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div>
              <Label>Combo banner</Label>
              <div className="mt-1 flex items-center gap-3">
                {f.image_url && <img src={f.image_url} alt="" className="h-14 w-28 rounded-lg object-cover" />}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload image"}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    setBusy(true);
                    try { const url = await uploadImage(file, "combos"); setF((v) => ({ ...v, image_url: url })); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
                    setBusy(false);
                  }} />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border bg-secondary/40 p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Items in this combo</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setF((v) => ({ ...v, items: [...v.items, { product_id: "", variant_id: null, qty: 1 }] }))}><Plus />Add item</Button>
              </div>
              <div className="mt-2 grid gap-2">
                {f.items.map((it, i) => {
                  const p = products.find((x) => x.id === it.product_id);
                  const vs = p?.product_variants.filter((v) => v.is_active) ?? [];
                  return (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-xl bg-card p-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                      <select className={selectCls} value={it.product_id} onChange={(e) => setItem(i, { product_id: e.target.value, variant_id: null })} aria-label="Product">
                        <option value="">Choose product…</option>
                        {products.map((x) => <option key={x.id} value={x.id}>{x.name}{x.is_active ? "" : " (hidden)"}</option>)}
                      </select>
                      <select className={`${selectCls} col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto`} value={it.variant_id ?? ""} disabled={vs.length === 0} onChange={(e) => setItem(i, { variant_id: e.target.value || null })} aria-label="Option">
                        <option value="">{vs.length ? "Choose option…" : "No options"}</option>
                        {vs.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                      <Input type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(1, Number(e.target.value) || 1) })} className="w-16" aria-label="Quantity" />
                      <Button type="button" size="icon" variant="ghost" aria-label="Remove item" onClick={() => setF((v) => ({ ...v, items: v.items.filter((_, j) => j !== i) }))}><Trash2 /></Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Combo price (₹)</Label><Input type="number" value={f.combo_price} onChange={(e) => setF({ ...f, combo_price: e.target.value })} /></div>
              <div className="flex flex-col justify-end text-sm">
                <span className="text-muted-foreground">Items MRP: {inr(totalMrp)}</span>
                {price > 0 && totalMrp > price && <span className="font-semibold text-offer">Shopper saves {inr(totalMrp - price)} ({Math.round(((totalMrp - price) / totalMrp) * 100)}%)</span>}
              </div>
              <div><Label>Starts (optional)</Label><Input type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></div>
              <div><Label>Ends (optional)</Label><Input type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />Show in store</label>
            <Button onClick={save} disabled={busy}>{busy ? "Please wait…" : "Save combo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
