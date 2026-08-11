"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea, FormSection } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatCurrency } from "@/lib/format";
import { createPurchase } from "./actions";

type Vendor = { id: string; name: string };
type TyreModel = { id: string; brand: string; name: string; size: string };

type PurchaseItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  tax: string;
  discount: string;
  subtotal: string;
  total: string;
  tyreModel: TyreModel;
};

type Purchase = {
  id: string;
  billNumber: string;
  purchaseDate: Date;
  finalAmount: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  notes: string | null;
  vendor: Vendor | null;
  items: PurchaseItem[];
  _count: { tyres: number };
};

type DraftItem = {
  id: string;
  tyreModelId: string;
  quantity: string;
  unitPrice: string;
  tax: string;
  discount: string;
};

const EMPTY_ITEM: DraftItem = {
  id: "",
  tyreModelId: "",
  quantity: "1",
  unitPrice: "",
  tax: "0",
  discount: "0",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function PurchasesClient({
  initialPurchases,
  vendors,
  tyreModels,
}: {
  initialPurchases: Purchase[];
  vendors: Vendor[];
  tyreModels: TyreModel[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [purchases, setPurchases] = React.useState(initialPurchases);
  // Keep client state in sync after server mutations + router.refresh()
  React.useEffect(() => {
    setPurchases(initialPurchases);
  }, [initialPurchases]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [form, setForm] = React.useState({
    vendorId: "",
    billNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    tax: "0",
    discount: "0",
    notes: "",
  });
  const [items, setItems] = React.useState<DraftItem[]>([
    { ...EMPTY_ITEM, id: uid() },
  ]);

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateItem = (id: string, key: keyof DraftItem, value: string) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, [key]: value } : it)));

  const addItem = () => setItems((list) => [...list, { ...EMPTY_ITEM, id: uid() }]);

  const removeItem = (id: string) =>
    setItems((list) => (list.length > 1 ? list.filter((it) => it.id !== id) : list));

  const itemTotals = React.useMemo(() => {
    return items.map((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const price = parseFloat(it.unitPrice) || 0;
      const tax = parseFloat(it.tax) || 0;
      const discount = parseFloat(it.discount) || 0;
      const subtotal = qty * price;
      const total = subtotal + tax - discount;
      return { ...it, subtotal, total };
    });
  }, [items]);

  const grandTotal = React.useMemo(
    () => itemTotals.reduce((sum, it) => sum + it.total, 0),
    [itemTotals]
  );

  const totalQty = React.useMemo(
    () => itemTotals.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0),
    [itemTotals]
  );

  const closeModal = () => {
    setModalOpen(false);
    setErrors({});
    setForm({
      vendorId: "",
      billNumber: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      tax: "0",
      discount: "0",
      notes: "",
    });
    setItems([{ ...EMPTY_ITEM, id: uid() }]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrors({});
    const result = await createPurchase({
      vendorId: form.vendorId,
      billNumber: form.billNumber,
      purchaseDate: form.purchaseDate,
      tax: parseFloat(form.tax) || 0,
      discount: parseFloat(form.discount) || 0,
      notes: form.notes,
      items: items.map((it) => ({
        tyreModelId: it.tyreModelId,
        quantity: Math.round(parseFloat(it.quantity) || 0),
        unitPrice: parseFloat(it.unitPrice) || 0,
        tax: parseFloat(it.tax) || 0,
        discount: parseFloat(it.discount) || 0,
      })),
    });
    setSubmitting(false);

    if (result.ok) {
      toast(
        "success",
        `Purchase created — ${totalQty} tyre${totalQty === 1 ? "" : "s"} added to inventory`
      );
      closeModal();
      router.refresh();
    } else {
      setErrors(result.errors ?? {});
      toast("error", result.errors?._form ?? "Failed to create purchase");
    }
  };

  const resolveModel = (id: string) => tyreModels.find((m) => m.id === id);

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Record tyre purchases and create individual tyre records"
        actionLabel="New Purchase"
        onAction={() => setModalOpen(true)}
        actionIcon="plus"
      />

      {purchases.length === 0 ? (
        <EmptyState
          icon="shopping-cart"
          title="No purchases yet"
          description="Record a purchase to add tyres to inventory."
          actionLabel="New Purchase"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      Bill #{p.billNumber}
                    </h3>
                    <StatusBadge status={p.status === "ACTIVE" ? "AVAILABLE" : "SCRAPPED"} />
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    {p.vendor?.name ?? "Unknown vendor"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-foreground">
                    {formatCurrency(p.finalAmount)}
                  </p>
                  <p className="text-xs text-muted">{formatDate(p.purchaseDate)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                {p.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm gap-3"
                  >
                    <span className="text-muted min-w-0 truncate">
                      {item.tyreModel.brand} {item.tyreModel.name} · {item.tyreModel.size}
                    </span>
                    <span className="shrink-0 text-muted">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted">
                  {p._count.tyres} tyre{p._count.tyres === 1 ? "" : "s"} created
                </span>
                {p.notes && <span className="text-muted truncate ml-3">{p.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title="New Purchase"
        description="Creating a purchase will generate one individual tyre record per tyre."
        size="lg"
      >
        <div className="space-y-5">
          <FormSection title="Bill details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Vendor *"
                name="vendorId"
                value={form.vendorId}
                onChange={(e) => updateForm("vendorId", e.target.value)}
                placeholder="Select vendor"
                error={errors.vendorId}
                options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              />
              <Input
                label="Bill number *"
                name="billNumber"
                value={form.billNumber}
                onChange={(e) => updateForm("billNumber", e.target.value)}
                placeholder="e.g. INV-2026-001"
                error={errors.billNumber}
              />
              <Input
                label="Purchase date *"
                name="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => updateForm("purchaseDate", e.target.value)}
                error={errors.purchaseDate}
              />
            </div>
          </FormSection>

          <FormSection
            title="Tyre items"
            description="Each quantity creates that many individual tyre records."
          >
            <div className="space-y-4">
              {itemTotals.map((item) => {
                const model = resolveModel(item.tyreModelId);
                return (
                  <div key={item.id} className="rounded-xl border border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">Item</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="p-1.5 rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-40"
                        aria-label="Remove item"
                      >
                        <Icon name="trash-2" size={14} />
                      </button>
                    </div>
                    <Select
                      label="Tyre model *"
                      name={`model-${item.id}`}
                      value={item.tyreModelId}
                      onChange={(e) => updateItem(item.id, "tyreModelId", e.target.value)}
                      placeholder="Select tyre model"
                      error={errors[`items.${items.findIndex((x) => x.id === item.id)}.tyreModelId`]}
                      options={tyreModels.map((m) => ({
                        value: m.id,
                        label: `${m.brand} ${m.name} · ${m.size}`,
                      }))}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Input
                        label="Quantity *"
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        error={errors[`items.${items.findIndex((x) => x.id === item.id)}.quantity`]}
                      />
                      <Input
                        label="Unit price *"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                        placeholder="0.00"
                        error={errors[`items.${items.findIndex((x) => x.id === item.id)}.unitPrice`]}
                      />
                      <Input
                        label="Tax"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.tax}
                        onChange={(e) => updateItem(item.id, "tax", e.target.value)}
                        placeholder="0.00"
                        error={errors[`items.${items.findIndex((x) => x.id === item.id)}.tax`]}
                      />
                      <Input
                        label="Discount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, "discount", e.target.value)}
                        placeholder="0.00"
                        error={errors[`items.${items.findIndex((x) => x.id === item.id)}.discount`]}
                      />
                    </div>
                    {model && (
                      <div className="flex items-center justify-between text-sm bg-muted-soft rounded-lg px-3 py-2">
                        <span className="text-muted">Subtotal</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={addItem} type="button">
                <Icon name="plus" size={14} />
                Add another tyre item
              </Button>
            </div>
          </FormSection>

          <FormSection title="Bill totals">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Global tax"
                type="number"
                min={0}
                step="0.01"
                value={form.tax}
                onChange={(e) => updateForm("tax", e.target.value)}
              />
              <Input
                label="Global discount"
                type="number"
                min={0}
                step="0.01"
                value={form.discount}
                onChange={(e) => updateForm("discount", e.target.value)}
              />
            </div>
            <div className="rounded-xl bg-muted-soft p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-muted">
                <span>Total tyres</span>
                <span className="font-medium text-foreground">{totalQty}</span>
              </div>
              <div className="flex justify-between text-sm text-muted">
                <span>Final amount</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </FormSection>

          <FormSection title="Notes">
            <Textarea
              name="notes"
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              placeholder="Optional notes about this purchase"
            />
          </FormSection>

          {errors._form && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
              {errors._form}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={closeModal} type="button">
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} loading={submitting} type="button">
              Create Purchase
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}