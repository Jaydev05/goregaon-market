import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/upload";

export function AdminBanners() {
  const qc = useQueryClient();
  const { data: banners = [] } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => (await supabase.from("banners").select("*").order("sort_order")).data ?? [],
  });
  const [f, setF] = useState({ title: "", subtitle: "", image_url: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Offer banners (home page slider)</h2>
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Weekend Sale — 40% off" /></div>
        <div><Label>Subtitle</Label><Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></div>
        <div className="sm:col-span-2">
          <Label>Image (wide, e.g. 1600×600)</Label>
          <div className="mt-1 flex items-center gap-3">
            {f.image_url && <img src={f.image_url} alt="" className="h-14 w-32 rounded-lg object-cover" />}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Upload className="h-4 w-4" />{busy ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                setBusy(true);
                try { setF({ ...f, image_url: await uploadImage(file, "banners") }); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
                setBusy(false);
              }} />
            </label>
          </div>
        </div>
        <Button disabled={busy} onClick={async () => {
          if (!f.title.trim()) { toast.error("Title is required"); return; }
          const { error } = await supabase.from("banners").insert({ title: f.title, subtitle: f.subtitle || null, image_url: f.image_url || null, sort_order: banners.length + 1 });
          if (error) { toast.error(error.message); return; }
          toast.success("Banner added"); setF({ title: "", subtitle: "", image_url: "" }); refresh();
        }}>Add banner</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="overflow-hidden rounded-2xl border bg-card">
            <div className="aspect-[16/6] bg-muted">{b.image_url && <img src={b.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex items-center gap-2 p-3 text-sm">
              <div className="flex-1"><p className="font-semibold">{b.title}</p><p className="text-xs text-muted-foreground">{b.subtitle}</p></div>
              <Switch checked={b.is_active} aria-label="Show" onCheckedChange={async (v) => { await supabase.from("banners").update({ is_active: v }).eq("id", b.id); refresh(); }} />
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete banner?")) { await supabase.from("banners").delete().eq("id", b.id); refresh(); } }}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
