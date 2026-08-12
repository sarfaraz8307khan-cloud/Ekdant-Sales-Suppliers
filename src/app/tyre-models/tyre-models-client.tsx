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
import { createTyreModel, updateTyreModel, setTyreModelStatus, deleteTyreModel, type TyreModelFormData } from "./actions";

type VehicleType = { id: string; name: string };
type TyreModel = {
  id: string;
  brand: string;
  name: string;
  size: string;
  description: string | null;
  minStockLevel: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  compatibleVehicleTypes: { vehicleType: VehicleType }[];
  _count: { tyres: number };
};

const emptyForm: TyreModelFormData = {
  brand: "",
  name: "",
  size: "",
  description: "",
  minStockLevel: 2,
  compatibleVehicleTypeIds: [],
};

export function TyreModelsClient({
  initialModels,
  vehicleTypes,
}: {
  initialModels: TyreModel[];
  vehicleTypes: VehicleType[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const models = initialModels;
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TyreModel | null>(null);
  const [form, setForm] = React.useState<TyreModelFormData>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<TyreModel | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TyreModel | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.brand.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.size.toLowerCase().includes(q)
    );
  }, [models, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (m: TyreModel) => {
    setEditing(m);
    setForm({
      brand: m.brand,
      name: m.name,
      size: m.size,
      description: m.description ?? "",
      minStockLevel: m.minStockLevel,
      compatibleVehicleTypeIds: m.compatibleVehicleTypes.map((c) => c.vehicleType.id),
    });
    setErrors({});
    setDialogOpen(true);
  };

  const toggleVehicleType = (id: string) => {
    setForm((prev) => ({
      ...prev,
      compatibleVehicleTypeIds: prev.compatibleVehicleTypeIds.includes(id)
        ? prev.compatibleVehicleTypeIds.filter((x) => x !== id)
        : [...prev.compatibleVehicleTypeIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const result = editing
      ? await updateTyreModel(editing.id, form)
      : await createTyreModel(form);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
      return;
    }
    toast("success", editing ? "Tyre model updated" : "Tyre model created");
    setDialogOpen(false);
    router.refresh();
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setTyreModelStatus(statusTarget.id, next);
    setStatusLoading(false);
    if (result.ok) {
      toast("success", next === "ACTIVE" ? "Tyre model activated" : "Tyre model deactivated");
      setStatusTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteTyreModel(deleteTarget.id);
    setDeleteLoading(false);
    if (result.ok) {
      toast("success", "Tyre model deleted successfully");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Unable to delete this tyre model.");
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tyre Models"
        description="Manage tyre brands and models"
        actionLabel="Add Model"
        onAction={openCreate}
        actionIcon="plus"
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by brand, model or size..."
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="disc"
          title={search ? "No tyre models found" : "No tyre models yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first tyre model to start purchasing and tracking tyres."
          }
          actionLabel={search ? undefined : "Add Model"}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const lowStock = m._count.tyres < m.minStockLevel;
            return (
              <div key={m.id} className="bg-surface rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {m.brand} {m.name}
                      </h3>
                      <StatusBadge status={m.status} />
                    </div>
                    <p className="text-sm text-muted mt-0.5">{m.size}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(m)}
                      className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                      aria-label={`Edit ${m.brand} ${m.name}`}
                    >
                      <Icon name="pencil" size={16} />
                    </button>
                  <button
                    onClick={() => setStatusTarget(m)}
                    className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                    aria-label={m.status === "ACTIVE" ? `Deactivate ${m.brand} ${m.name}` : `Activate ${m.brand} ${m.name}`}
                  >
                    <Icon
                      name={m.status === "ACTIVE" ? "power" : "refresh"}
                      size={16}
                      className={m.status === "ACTIVE" ? "text-danger" : "text-muted"}
                    />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(m)}
                    className="p-2 rounded-lg hover:bg-danger-soft hover:text-danger text-muted transition-colors"
                    aria-label={`Delete ${m.brand} ${m.name}`}
                  >
                    <Icon name="trash-2" size={16} />
                  </button>
                  </div>
                </div>

                {m.compatibleVehicleTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.compatibleVehicleTypes.map((c) => (
                      <span
                        key={c.vehicleType.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted-soft text-xs text-muted"
                      >
                        {c.vehicleType.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs">
                  <span className="text-muted">{m._count.tyres} tyres in stock</span>
                  {lowStock && m.status === "ACTIVE" && (
                    <span className="inline-flex items-center gap-1 text-danger font-medium">
                      <Icon name="alert-triangle" size={12} />
                      LOW STOCK
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Tyre Model" : "Add Tyre Model"}
        description={editing ? `Update details for ${editing.brand} ${editing.name}` : "Create a new tyre model"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <div className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2" role="alert">
              {errors._form}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Brand *"
              name="brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              error={errors.brand}
              placeholder="e.g. MRF"
              autoFocus
            />
            <Input
              label="Model name *"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. Muscler"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tyre size *"
              name="size"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              error={errors.size}
              placeholder="e.g. 12.00 R20"
            />
            <Input
              label="Minimum stock level"
              name="minStockLevel"
              type="number"
              min={0}
              value={form.minStockLevel}
              onChange={(e) => setForm({ ...form, minStockLevel: Number(e.target.value) })}
              error={errors.minStockLevel}
            />
          </div>
          <Textarea
            label="Description"
            name="description"
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            error={errors.description}
          />

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Compatible vehicle types</p>
            {vehicleTypes.length === 0 ? (
              <p className="text-xs text-muted">No vehicle types configured yet. Add vehicle types first.</p>
            ) : (
              <div className="space-y-2">
                {vehicleTypes.map((vt) => {
                  const checked = form.compatibleVehicleTypeIds.includes(vt.id);
                  return (
                    <label
                      key={vt.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted-soft transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVehicleType(vt.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                      />
                      <span className="text-sm text-foreground">{vt.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? "Save Changes" : "Create Model"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusToggle}
        title={statusTarget?.status === "ACTIVE" ? "Deactivate tyre model?" : "Activate tyre model?"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `"${statusTarget?.brand} ${statusTarget?.name} ${statusTarget?.size}" will be deactivated. Historical records will remain intact.`
            : `"${statusTarget?.brand} ${statusTarget?.name} ${statusTarget?.size}" will be reactivated.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        danger={statusTarget?.status === "ACTIVE"}
        loading={statusLoading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete tyre model?"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.brand} ${deleteTarget.name} ${deleteTarget.size}"? This action cannot be undone. Models linked to tyres or purchases cannot be deleted and should be deactivated instead.`
            : "Delete this tyre model?"
        }
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}