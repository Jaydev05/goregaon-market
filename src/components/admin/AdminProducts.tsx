import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
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

type P = Tables<"products">;
const empty = { name: "", description: "", category: "General", mrp: "", selling_price: "", stock: "100", images: [] as string[], is_active: true, is_featured: false };

export function AdminProducts() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
  const edit = (p?: P) => {
    setEditId(p?.id ?? null);
    setF(p ? { name: p.name, description: p.description, category: p.category, mrp: String(p.mrp), selling_price: String(p.selling_price), stock: String(p.stock), images: p.images, is_active: p.is_active, is_featured: p.is_featured } : empty);
    setOpen(true);
  };
  const mrp = Number(f.mrp), sp = Number(f.selling_price);

  async function save() {
    if (!f.name.trim() || !(mrp > 0) || !(sp > 0)) { toast.error("Name, MRP and selling price are required"); return; }
    if (sp > mrp) { toast.error("Selling price can't be more than MRP"); return; }
    setBusy(true);
    const row = { name: f.name.trim(), description: f.description, category: f.category.trim() || "General", mrp, selling_price: sp, stock: Number(f.stock) || 0, images: f.images, is_active: f.is_active, is_featured: f.is_featured };
    const { error } = editId ? await supabase.from("products").update(row).eq("id", editId) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product saved"); setOpen(false); refresh();
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

  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Products ({products.length})</h2>
        <div className="flex gap-2"><Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-44" /><Button onClick={() => edit()}><Plus />Add product</Button></div>
      </div>
      <div className="grid gap-2">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">{p.images[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{p.name} {!p.is_active && <span className="ml-1 rounded bg-muted px-1.5 text-xs text-muted-foreground">Hidden</span>}</p>
              <p className="text-muted-foreground">{p.category} · Stock {p.stock}</p>
              <p><span className="font-semibold">{inr(p.selling_price)}</span> <span className="text-xs text-muted-foreground line-through">{inr(p.mrp)}</span> {offerPercent(p.mrp, p.selling_price) > 0 && <span className="text-xs font-semibold text-offer">{offerPercent(p.mrp, p.selling_price)}% off</span>}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => edit(p)} aria-label="Edit"><Pencil /></Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></div>
              <div><Label>Stock</Label><Input type="number" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} /></div>
              <div><Label>MRP (₹)</Label><Input type="number" value={f.mrp} onChange={(e) => setF({ ...f, mrp: e.target.value })} /></div>
              <div><Label>Selling price (₹)</Label><Input type="number" value={f.selling_price} onChange={(e) => setF({ ...f, selling_price: e.target.value })} /></div>
            </div>
            {mrp > 0 && sp > 0 && <p className="text-sm">{offerPercent(mrp, sp) > 0 ? <span className="font-semibold text-offer">Shows as {offerPercent(mrp, sp)}% off</span> : <span className="text-muted-foreground">No offer (selling price = MRP)</span>}</p>}
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
