"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/form";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { createVendor, updateVendor, setVendorStatus, deleteVendor, type VendorFormData } from "./actions";

type Vendor = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  _count: { purchases: number; tyres: number };
};

const emptyForm: VendorFormData = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstNumber: "",
  notes: "",
};

export function VendorsClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const vendors = initialVendors;
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Vendor | null>(null);
  const [form, setForm] = React.useState<VendorFormData>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<Vendor | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Vendor | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.contactPerson?.toLowerCase().includes(q) ?? false) ||
        (v.phone?.toLowerCase().includes(q) ?? false) ||
        (v.gstNumber?.toLowerCase().includes(q) ?? false)
    );
  }, [vendors, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setEditing(v);
    setForm({
      name: v.name,
      contactPerson: v.contactPerson ?? "",
      phone: v.phone ?? "",
      email: v.email ?? "",
      address: v.address ?? "",
      gstNumber: v.gstNumber ?? "",
      notes: v.notes ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const result = editing
      ? await updateVendor(editing.id, form)
      : await createVendor(form);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
      return;
    }

    toast("success", editing ? "Vendor updated" : "Vendor created");
    setDialogOpen(false);
    router.refresh();
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setVendorStatus(statusTarget.id, next);
    setStatusLoading(false);
    if (result.ok) {
      toast("success", next === "ACTIVE" ? "Vendor activated" : "Vendor deactivated");
      setStatusTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteVendor(deleteTarget.id);
    setDeleteLoading(false);
    if (result.ok) {
      toast("success", "Vendor deleted successfully");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Unable to delete this vendor.");
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Manage tyre suppliers and vendors"
        actionLabel="Add Vendor"
        onAction={openCreate}
        actionIcon="plus"
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search vendors..."
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="building-2"
          title={search ? "No vendors found" : "No vendors yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first vendor to start recording tyre purchases."
          }
          actionLabel={search ? undefined : "Add Vendor"}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-surface rounded-xl border border-border shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{v.name}</h3>
                    <StatusBadge status={v.status} />
                  </div>
                  {v.contactPerson && (
                    <p className="text-sm text-muted mt-0.5">{v.contactPerson}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(v)}
                    className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                    aria-label={`Edit ${v.name}`}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="p-2 rounded-lg hover:bg-danger-soft hover:text-danger text-muted transition-colors"
                    aria-label={`Delete ${v.name}`}
                  >
                    <Icon name="trash-2" size={16} />
                  </button>
                  <button
                    onClick={() => setStatusTarget(v)}
                    className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                    aria-label={v.status === "ACTIVE" ? `Deactivate ${v.name}` : `Activate ${v.name}`}
                  >
                    <Icon
                      name={v.status === "ACTIVE" ? "power" : "power-off"}
                      size={16}
                      className={v.status === "ACTIVE" ? "text-danger" : "text-muted"}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                {v.phone && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <Icon name="phone" size={14} />
                    <span className="truncate">{v.phone}</span>
                  </div>
                )}
                {v.gstNumber && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <Icon name="file-text" size={14} />
                    <span className="truncate">GST: {v.gstNumber}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted">
                <span>{v._count.purchases} purchases</span>
                <span>{v._count.tyres} tyres</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Vendor" : "Add Vendor"}
        description={editing ? `Update details for ${editing.name}` : "Create a new tyre vendor"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <div className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2" role="alert">
              {errors._form}
            </div>
          )}
          <Input
            label="Vendor name *"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. ABC Tyres"
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact person"
              name="contactPerson"
              value={form.contactPerson ?? ""}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              error={errors.contactPerson}
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Input
              label="GST number"
              name="gstNumber"
              value={form.gstNumber ?? ""}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              error={errors.gstNumber}
            />
          </div>
          <Textarea
            label="Address"
            name="address"
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            error={errors.address}
          />
          <Textarea
            label="Notes"
            name="notes"
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            error={errors.notes}
          />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? "Save Changes" : "Create Vendor"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusToggle}
        title={statusTarget?.status === "ACTIVE" ? "Deactivate vendor?" : "Activate vendor?"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `"${statusTarget?.name}" will be deactivated. Historical purchases will remain intact.`
            : `"${statusTarget?.name}" will be reactivated.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        danger={statusTarget?.status === "ACTIVE"}
        loading={statusLoading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete vendor?"
        message={`Delete ${deleteTarget?.name ?? ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}