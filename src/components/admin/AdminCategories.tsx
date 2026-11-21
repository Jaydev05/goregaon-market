import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type C = Tables<"categories">;

export function AdminCategories() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order").order("name")).data ?? [],
  });
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const top = cats.filter((c) => !c.parent_id);
  const subsOf = (id: string) => cats.filter((c) => c.parent_id === id);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-categories"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["admin-products"] }); };
  const fail = (e: { message: string } | null) => { if (e) { toast.error(e.message.includes("categories_name_parent_uniq") ? "That name already exists here" : e.message); return true; } return false; };

  async function add(n: string, parent: string | null, ic?: string) {
    if (!n.trim()) return false;
    const siblings = parent ? subsOf(parent) : top;
    const { error } = await supabase.from("categories").insert({ name: n.trim(), parent_id: parent, icon: ic?.trim() || null, sort_order: siblings.length + 1 });
    if (fail(error)) return false;
    refresh(); return true;
  }
  async function update(c: C, patch: Partial<C>) {
    const { error } = await supabase.from("categories").update(patch).eq("id", c.id);
    if (fail(error)) return;
    // Product cards show the category name, so keep it in step on rename.
    if (patch.name && !c.parent_id) await supabase.from("products").update({ category: patch.name }).eq("category_id", c.id);
    refresh();
  }
  async function move(list: C[], i: number, dir: -1 | 1) {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    // Re-number the whole list so equal sort numbers can't block reordering.
    const order = [...list]; order[i] = b; order[i + dir] = a;
    await Promise.all(order.map((c, n) => supabase.from("categories").update({ sort_order: n + 1 }).eq("id", c.id)));
    refresh();
  }
  async function remove(c: C) {
    if (!confirm(`Delete "${c.name}"${c.parent_id ? "" : " and its subcategories"}? Products stay, but lose this category.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (!fail(error)) refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Categories</h2>
      <div className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🛒" className="w-16 text-center" aria-label="Icon (emoji)" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, e.g. Groceries" className="min-w-40 flex-1" />
        <Button onClick={async () => { if (await add(name, null, icon)) { setName(""); setIcon(""); toast.success("Category added"); } }}><Plus />Add</Button>
      </div>
      <div className="grid gap-3">
        {top.map((c, i) => (
          <div key={c.id} className="rounded-2xl border bg-card p-3">
            <Row c={c} first={i === 0} last={i === top.length - 1} onMove={(d) => move(top, i, d)} onUpdate={(p) => update(c, p)} onRemove={() => remove(c)} withIcon />
            <div className="mt-2 grid gap-2 border-l-2 border-border pl-3 sm:ml-8">
              {subsOf(c.id).map((s, j, arr) => (
                <Row key={s.id} c={s} first={j === 0} last={j === arr.length - 1} onMove={(d) => move(arr, j, d)} onUpdate={(p) => update(s, p)} onRemove={() => remove(s)} />
              ))}
              <AddSub onAdd={(n) => add(n, c.id)} />
            </div>
          </div>
        ))}
        {top.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
      </div>
    </div>
  );
}

function Row({ c, first, last, onMove, onUpdate, onRemove, withIcon }: { c: C; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onUpdate: (p: Partial<C>) => void; onRemove: () => void; withIcon?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {withIcon && <Input defaultValue={c.icon ?? ""} key={`i-${c.icon}`} onBlur={(e) => e.target.value !== (c.icon ?? "") && onUpdate({ icon: e.target.value.trim() || null })} className="w-12 px-1 text-center" aria-label="Icon" />}
      <Input defaultValue={c.name} key={`n-${c.name}`} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && onUpdate({ name: e.target.value.trim() })} className={withIcon ? "font-semibold" : "h-8 text-sm"} aria-label="Name" />
      <Switch checked={c.is_active} onCheckedChange={(v) => onUpdate({ is_active: v })} aria-label="Show in store" />
      <Button size="icon" variant="ghost" disabled={first} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp /></Button>
      <Button size="icon" variant="ghost" disabled={last} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown /></Button>
      <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Delete"><Trash2 /></Button>
    </div>
  );
}

function AddSub({ onAdd }: { onAdd: (n: string) => Promise<boolean> }) {
  const [n, setN] = useState("");
  return (
    <form className="flex gap-1.5" onSubmit={async (e) => { e.preventDefault(); if (await onAdd(n)) setN(""); }}>
      <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="Add subcategory…" className="h-8 text-sm" />
      <Button size="sm" variant="outline" type="submit"><Plus />Add</Button>
    </form>
  );
}
