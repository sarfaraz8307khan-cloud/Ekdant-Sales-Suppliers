"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { saveExpenditure, deleteExpenditure } from "./actions";

type Exp = {
  id: string;
  date: string;
  category: string;
  description: string | null;
  vehicleId: string | null;
  vendorId: string | null;
  quantity: string;
  unitCost: string;
  tax: string;
  discount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: { id: string; registrationNo: string } | null;
  vendor: { id: string; name: string } | null;
};

type FormState = {
  date: string;
  category: string;
  description: string;
  vehicleId: string;
  vendorId: string;
  quantity: string;
  unitCost: string;
  tax: string;
  discount: string;
  notes: string;
};

const CATEGORIES = ["Fuel", "Repairs", "Tyre Purchase", "Tyre Service", "Insurance", "Tax", "Spare Parts", "Other"];
const empty: FormState = { date: new Date().toISOString().slice(0, 10), category: "", description: "", vehicleId: "", vendorId: "", quantity: "1", unitCost: "", tax: "0", discount: "0", notes: "" };
const inputCls = "w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
const labelCls = "block text-sm font-medium text-foreground mb-1.5";
const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function ExpenditureClient({ initialExpenditures, vehicles, vendors }: { initialExpenditures: Exp[]; vehicles: { id: string; registrationNo: string }[]; vendors: { id: string; name: string }[] }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState(initialExpenditures);
  const [open, setOpen] = React.useState(false);
  const [del, setDel] = React.useState<Exp | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [f, setF] = React.useState(empty);

  const total = React.useMemo(() => items.reduce((s, i) => s + Number(i.total), 0), [items]);
  const sub = Number(f.quantity || 0) * Number(f.unitCost || 0);
  const calcTotal = Math.max(0, sub + Number(f.tax || 0) - Number(f.discount || 0));

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const openAdd = () => { setEditId(null); setF(empty); setErr(null); setOpen(true); };
  const openEdit = (i: Exp) => {
    setEditId(i.id);
    setF({ date: i.date.slice(0, 10), category: i.category, description: i.description || "", vehicleId: i.vehicleId || "", vendorId: i.vendorId || "", quantity: i.quantity, unitCost: i.unitCost, tax: i.tax, discount: i.discount, notes: i.notes || "" } satisfies FormState);
    setErr(null); setOpen(true);
  };

  const readError = (r: unknown, fallback: string): string => {
    if (r && typeof r === "object" && "errors" in r && r.errors) {
      return Object.values(r.errors as Record<string, string>)[0] ?? fallback;
    }
    return fallback;
  };

  const save = async () => {
    setBusy(true); setErr(null);
    const r = (await saveExpenditure({ id: editId || undefined, date: f.date, category: f.category, description: f.description || undefined, vehicleId: f.vehicleId || undefined, vendorId: f.vendorId || undefined, quantity: Number(f.quantity), unitCost: Number(f.unitCost), tax: Number(f.tax), discount: Number(f.discount), notes: f.notes || undefined })) as { ok: boolean; errors?: Record<string, string> };
    setBusy(false);
    if (r.ok) { toast("success", editId ? "Expense updated successfully" : "Expense added successfully"); setOpen(false); }
    else setErr(readError(r, "Unable to save this record."));
  };

  const doDelete = async () => {
    if (!del) return;
    setBusy(true);
    const r = (await deleteExpenditure(del.id)) as { ok: boolean; errors?: Record<string, string> };
    setBusy(false);
    if (r.ok) { setItems((p) => p.filter((x) => x.id !== del.id)); toast("success", "Record deleted successfully"); setDel(null); }
    else { toast("error", readError(r, "Unable to delete this record.")); setDel(null); }
  };

  return (
    <div>
      <PageHeader title="Expenditure" description="Track and manage expenses" actionLabel="Add Expenditure" actionIcon="plus" onAction={openAdd} />
      <div className="rounded-xl border border-border bg-surface p-4 mb-5">
        <p className="text-xs text-muted">Total Expenditure</p>
        <p className="text-3xl font-bold text-primary mt-1">₹{fmt(total)}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon="wallet" title="No expenditure yet" description="Add your first expense to start tracking." />
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{i.category}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(i.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {i.vehicle ? ` · ${i.vehicle.registrationNo}` : ""}
                    {i.vendor ? ` · ${i.vendor.name}` : ""}
                  </p>
                  {i.description && <p className="text-xs text-muted mt-1 truncate">{i.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground">₹{fmt(Number(i.total))}</p>
                  <div className="flex gap-1 mt-1.5 justify-end">
                    <button type="button" onClick={() => openEdit(i)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-soft" aria-label={`Edit ${i.category}`}>
                      <Icon name="pencil" size={15} />
                    </button>
                    <button type="button" onClick={() => setDel(i)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft" aria-label={`Delete ${i.category}`}>
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center text-[11px] text-muted border-t border-border pt-2">
                <span>Qty: {i.quantity}</span>
                <span>Unit: ₹{fmt(Number(i.unitCost))}</span>
                <span>Tax: ₹{fmt(Number(i.tax))}</span>
                <span>Disc: ₹{fmt(Number(i.discount))}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editId ? "Edit Expenditure" : "Add Expenditure"}>
        <div className="space-y-4">
          {err && <div className="rounded-lg bg-danger-soft border border-danger/20 px-3 py-2 text-sm text-danger">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expDate" className={labelCls}>Date</label>
              <input id="expDate" type="date" required value={f.date} onChange={setField("date")} className={inputCls} />
            </div>
            <div>
              <label htmlFor="expCat" className={labelCls}>Category</label>
              <select id="expCat" value={f.category} onChange={setField("category")} className={inputCls}>
                <option value="">Select</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="expDesc" className={labelCls}>Description</label>
            <input id="expDesc" type="text" value={f.description} onChange={setField("description")} placeholder="Optional" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expVeh" className={labelCls}>Vehicle</label>
              <select id="expVeh" value={f.vehicleId} onChange={setField("vehicleId")} className={inputCls}>
                <option value="">None</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNo}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="expVen" className={labelCls}>Vendor</label>
              <select id="expVen" value={f.vendorId} onChange={setField("vendorId")} className={inputCls}>
                <option value="">None</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expQty" className={labelCls}>Quantity</label>
              <input id="expQty" type="number" min={0} step="any" value={f.quantity} onChange={setField("quantity")} className={inputCls} />
            </div>
            <div>
              <label htmlFor="expUnit" className={labelCls}>Unit Cost (₹)</label>
              <input id="expUnit" type="number" min={0} step="any" value={f.unitCost} onChange={setField("unitCost")} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expTax" className={labelCls}>Tax (₹)</label>
              <input id="expTax" type="number" min={0} step="any" value={f.tax} onChange={setField("tax")} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label htmlFor="expDisc" className={labelCls}>Discount (₹)</label>
              <input id="expDisc" type="number" min={0} step="any" value={f.discount} onChange={setField("discount")} placeholder="0.00" className={inputCls} />
            </div>
          </div>
          <div className="rounded-xl bg-muted-soft p-3 text-sm space-y-1">
            <div className="flex justify-between text-muted"><span>Subtotal</span><span className="text-foreground">₹{fmt(sub)}</span></div>
            <div className="flex justify-between text-muted"><span>+ Tax</span><span className="text-foreground">₹{fmt(Number(f.tax || 0))}</span></div>
            <div className="flex justify-between text-muted"><span>− Discount</span><span className="text-foreground">₹{fmt(Number(f.discount || 0))}</span></div>
            <div className="flex justify-between font-semibold pt-2 border-t border-border"><span className="text-foreground">Total</span><span className="text-primary">₹{fmt(calcTotal)}</span></div>
          </div>
          <div>
            <label htmlFor="expNotes" className={labelCls}>Notes</label>
            <textarea id="expNotes" value={f.notes} onChange={setField("notes")} rows={2} placeholder="Optional" className={cn(inputCls, "h-auto py-2")} />
          </div>
          <Button className="w-full" loading={busy} disabled={!f.category || !f.date || !f.unitCost} onClick={save}>
            {editId ? "Save Changes" : "Add Expenditure"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={del !== null} onClose={() => setDel(null)} title="Delete Expenditure?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {del && (
              <>
                <span className="font-medium text-foreground">{del.category}</span> on{" "}
                {new Date(del.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — total ₹{fmt(Number(del.total))}.
              </>
            )}
          </p>
          <p className="text-sm text-muted">This action cannot be undone.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDel(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={doDelete}>Delete</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}