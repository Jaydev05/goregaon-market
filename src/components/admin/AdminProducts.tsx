import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { inr, offerPercent } from "@/lib/pricing";
import { uploadImage } from "@/lib/upload";

type P = Tables<"products"> & { product_variants: { id: string }[] };
type VRow = { id?: string; name: string; subtitle: string; sku: string; cost: string; mrp: string; selling_price: string; stock: string; image_url: string; is_active: boolean };
const empty = { name: "", description: "", category_id: "", subcategory_id: "", mrp: "", selling_price: "", stock: "100", cost: "", images: [] as string[], is_active: true, is_featured: false };
const emptyV = (): VRow => ({ name: "", subtitle: "", sku: "", cost: "", mrp: "", selling_price: "", stock: "10", image_url: "", is_active: true });
export const selectCls = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Profit per unit and margin % shown to the admin only. */
export function Margin({ cost, sp }: { cost: number; sp: number }) {
  if (!(cost > 0) || !(sp > 0)) return null;
  const profit = sp - cost;
  return <span className={`text-xs font-semibold ${profit >= 0 ? "text-offer" : "text-destructive"}`}>Profit {inr(profit)} ({Math.round((profit / sp) * 100)}%)</span>;
}

export function AdminProducts() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => ((await supabase.from("products").select("*, product_variants(id)").order("created_at", { ascending: false })).data ?? []) as P[],
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [vars, setVars] = useState<VRow[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const top = cats.filter((c) => !c.parent_id);
  const subs = cats.filter((c) => c.parent_id && c.parent_id === f.category_id);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["product"] }); };

  async function edit(p?: P) {
    setEditId(p?.id ?? null);
    setRemoved([]);
    if (!p) { setF({ ...empty, category_id: top[0]?.id ?? "" }); setVars([]); setOpen(true); return; }
    setBusy(true);
    const [{ data: vs }, { data: pc }] = await Promise.all([
      supabase.from("product_variants").select("*").eq("product_id", p.id).order("sort_order"),
      supabase.from("product_costs").select("cost_price").eq("product_id", p.id).maybeSingle(),
    ]);
    const ids = (vs ?? []).map((v) => v.id);
    const { data: vc } = ids.length ? await supabase.from("variant_costs").select("*").in("variant_id", ids) : { data: [] as Tables<"variant_costs">[] };
    setF({ name: p.name, description: p.description, category_id: p.category_id ?? "", subcategory_id: p.subcategory_id ?? "", mrp: String(p.mrp), selling_price: String(p.selling_price), stock: String(p.stock), cost: pc ? String(pc.cost_price) : "", images: p.images, is_active: p.is_active, is_featured: p.is_featured });
    setVars((vs ?? []).map((v) => ({ id: v.id, name: v.name, subtitle: v.subtitle ?? "", sku: v.sku ?? "", cost: String(vc?.find((c) => c.variant_id === v.id)?.cost_price ?? ""), mrp: String(v.mrp), selling_price: String(v.selling_price), stock: String(v.stock), image_url: v.image_url ?? "", is_active: v.is_active })));
    setBusy(false);
    setOpen(true);
  }

  const mrp = Number(f.mrp), sp = Number(f.selling_price);
  const setV = (i: number, patch: Partial<VRow>) => setVars((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  async function save() {
    if (!f.name.trim()) { toast.error("Product name is required"); return; }
    if (vars.length === 0) {
      if (!(mrp > 0) || !(sp > 0)) { toast.error("MRP and selling price are required"); return; }
      if (sp > mrp) { toast.error("Selling price can't be more than MRP"); return; }
    }
    for (const v of vars) {
      const vm = Number(v.mrp), vsp = Number(v.selling_price);
      if (!v.name.trim()) { toast.error("Every option needs a name (e.g. 500 g)"); return; }
      if (!(vm > 0) || !(vsp > 0)) { toast.error(`Add MRP and selling price for ${v.name}`); return; }
      if (vsp > vm) { toast.error(`${v.name}: selling price can't be more than MRP`); return; }
    }
    setBusy(true);
    try {
      const catName = cats.find((c) => c.id === f.category_id)?.name ?? "General";
      const first = vars[0];
      const row = {
        name: f.name.trim(), description: f.description, category: catName,
        category_id: f.category_id || null, subcategory_id: f.subcategory_id || null,
        mrp: first ? Number(first.mrp) : mrp, selling_price: first ? Number(first.selling_price) : sp,
        stock: first ? vars.reduce((n, v) => n + (Number(v.stock) || 0), 0) : Number(f.stock) || 0,
        images: f.images, is_active: f.is_active, is_featured: f.is_featured,
      };
      let pid = editId;
      if (pid) {
        const { error } = await supabase.from("products").update(row).eq("id", pid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        pid = data.id;
      }
      if (removed.length) {
        const { error } = await supabase.from("product_variants").delete().in("id", removed);
        if (error) throw error;
      }
      const costs: { variant_id: string; cost_price: number }[] = [];
      for (const [i, v] of vars.entries()) {
        const vr = { product_id: pid, name: v.name.trim(), subtitle: v.subtitle.trim() || null, sku: v.sku.trim() || null, mrp: Number(v.mrp), selling_price: Number(v.selling_price), stock: Math.max(0, Number(v.stock) || 0), image_url: v.image_url || null, is_active: v.is_active, sort_order: i };
        let vid = v.id;
        if (vid) {
          const { error } = await supabase.from("product_variants").update(vr).eq("id", vid);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("product_variants").insert(vr).select("id").single();
          if (error) throw error;
          vid = data.id;
        }
        if (v.cost !== "") costs.push({ variant_id: vid, cost_price: Math.max(0, Number(v.cost) || 0) });
      }
      if (costs.length) {
        const { error } = await supabase.from("variant_costs").upsert(costs.map((c) => ({ ...c, updated_at: new Date().toISOString() })));
        if (error) throw error;
      }
      if (vars.length === 0 && f.cost !== "") {
        const { error } = await supabase.from("product_costs").upsert({ product_id: pid, cost_price: Math.max(0, Number(f.cost) || 0), updated_at: new Date().toISOString() });
        if (error) throw error;
      }
      toast.success("Product saved"); setOpen(false); refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Could not save");
    }
    setBusy(false);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, 6).map((file) => uploadImage(file, "products")));
      setF((v) => ({ ...v, images: [...v.images, ...urls] }));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
  }

  async function onVariantFile(i: number, file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try { setV(i, { image_url: await uploadImage(file, "variants") }); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
  }

  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Products ({products.length})</h2>
        <div className="flex gap-2"><Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-44" /><Button onClick={() => edit()} disabled={busy}><Plus />Add product</Button></div>
      </div>
      <div className="grid gap-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">{p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{p.name} {!p.is_active && <span className="ml-1 rounded bg-muted px-1.5 text-xs text-muted-foreground">Hidden</span>}</p>
              <p className="text-muted-foreground">{p.category} · Stock {p.stock}{p.product_variants.length > 0 && <> · <Layers className="inline h-3 w-3" /> {p.product_variants.length} options</>}</p>
              <p>{p.product_variants.length > 0 && <span className="text-xs text-muted-foreground">from </span>}<span className="font-semibold">{inr(p.selling_price)}</span> <span className="text-xs text-muted-foreground line-through">{inr(p.mrp)}</span> {offerPercent(p.mrp, p.selling_price) > 0 && <span className="text-xs font-semibold text-offer">{offerPercent(p.mrp, p.selling_price)}% off</span>}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => edit(p)} disabled={busy} aria-label="Edit"><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => {
              if (!confirm(`Delete ${p.name}?`)) return;
              const { error } = await supabase.from("products").delete().eq("id", p.id);
              if (error) { toast.error(error.message); return; }
              refresh();
            }}><Trash2 /></Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <select className={selectCls} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value, subcategory_id: "" })}>
                  <option value="">General</option>
                  {top.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>)}
                </select>
              </div>
              <div><Label>Subcategory</Label>
                <select className={selectCls} value={f.subcategory_id} disabled={subs.length === 0} onChange={(e) => setF({ ...f, subcategory_id: e.target.value })}>
                  <option value="">{subs.length ? "None" : "No subcategories"}</option>
                  {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {vars.length === 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div><Label>Cost price (₹)</Label><Input type="number" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="Private" /></div>
                  <div><Label>MRP (₹)</Label><Input type="number" value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} /></div>
                  <div><Label>Selling price (₹)</Label><Input type="number" value={f.selling_price} onChange={(e) => setF({ ...f, selling_price: e.target.value })} /></div>
                  <div><Label>Stock</Label><Input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
                </div>
                {mrp > 0 && sp > 0 && <p className="flex flex-wrap gap-3 text-sm">{offerPercent(mrp, sp) > 0 ? <span className="font-semibold text-offer">Shows as {offerPercent(mrp, sp)}% off</span> : <span className="text-muted-foreground">No offer (selling price = MRP)</span>}<Margin cost={Number(f.cost)} sp={sp} /></p>}
              </>
            )}

            <div className="rounded-2xl border bg-secondary/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-sm font-semibold">Sizes / flavours</p><p className="text-xs text-muted-foreground">{vars.length ? "Price and stock come from these options." : "Optional — e.g. 500 g, 1 kg or Magic Masala."}</p></div>
                <Button type="button" size="sm" variant="outline" onClick={() => setVars((vs) => [...vs, emptyV()])}><Plus />Add option</Button>
              </div>
              <div className="mt-3 grid gap-3">
                {vars.map((v, i) => {
                  const vm = Number(v.mrp), vsp = Number(v.selling_price);
                  return (
                    <div key={v.id ?? `new-${i}`} className="grid gap-2 rounded-xl border bg-card p-3">
                      <div className="flex items-start gap-2">
                        <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed text-muted-foreground hover:border-primary" aria-label="Option photo">
                          {v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => onVariantFile(i, e.target.files?.[0])} />
                        </label>
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <Input placeholder="Name (e.g. 1 kg)" value={v.name} onChange={(e) => setV(i, { name: e.target.value })} />
                          <Input placeholder="Subtitle (optional)" value={v.subtitle} onChange={(e) => setV(i, { subtitle: e.target.value })} />
                          <Input placeholder="SKU / barcode" value={v.sku} onChange={(e) => setV(i, { sku: e.target.value })} className="col-span-2 sm:col-span-1" />
                          <label className="col-span-2 flex items-center gap-2 text-xs sm:col-span-1"><Switch checked={v.is_active} onCheckedChange={(x) => setV(i, { is_active: x })} />Available</label>
                        </div>
                        <Button type="button" size="icon" variant="ghost" aria-label="Remove option" onClick={() => { if (v.id) setRemoved((r) => [...r, v.id!]); setVars((vs) => vs.filter((_, j) => j !== i)); }}><Trash2 /></Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div><Label className="text-xs">Cost (₹)</Label><Input type="number" value={v.cost} onChange={(e) => setV(i, { cost: e.target.value })} placeholder="Private" /></div>
                        <div><Label className="text-xs">MRP (₹)</Label><Input type="number" value={v.mrp} onChange={(e) => setV(i, { mrp: e.target.value })} /></div>
                        <div><Label className="text-xs">Selling (₹)</Label><Input type="number" value={v.selling_price} onChange={(e) => setV(i, { selling_price: e.target.value })} /></div>
                        <div><Label className="text-xs">Stock</Label><Input type="number" value={v.stock} onChange={(e) => setV(i, { stock: e.target.value })} /></div>
                      </div>
                      {vm > 0 && vsp > 0 && <p className="flex flex-wrap gap-3 text-xs">{offerPercent(vm, vsp) > 0 ? <span className="font-semibold text-offer">{offerPercent(vm, vsp)}% off · saves {inr(vm - vsp)}</span> : <span className="text-muted-foreground">No offer</span>}<Margin cost={Number(v.cost)} sp={vsp} /></p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Images</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {f.images.map((src) => (
                  <div key={src} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button className="absolute right-0.5 top-0.5 rounded-full bg-card p-0.5" onClick={() => setF({ ...f, images: f.images.filter((x) => x !== src) })} aria-label="Remove image"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-primary">
                  <Plus /><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
                </label>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />Visible in store</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_featured} onCheckedChange={(v) => setF({ ...f, is_featured: v })} />Featured</label>
            </div>
            <Button onClick={save} disabled={busy}>{busy ? "Please wait…" : "Save product"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
