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
import { createDriver, updateDriver, setDriverStatus, type DriverFormData } from "./actions";

type Driver = {
  id: string;
  name: string;
  phone: string | null;
  licenceNo: string | null;
  address: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  _count: { vehicles: number; installations: number };
};

const emptyForm: DriverFormData = {
  name: "",
  phone: "",
  licenceNo: "",
  address: "",
  notes: "",
};

export function DriversClient({ initialDrivers }: { initialDrivers: Driver[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [drivers, setDrivers] = React.useState(initialDrivers);
  // Keep client state in sync after server mutations + router.refresh()
  React.useEffect(() => {
    setDrivers(initialDrivers);
  }, [initialDrivers]);
  const [search, setSearch] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Driver | null>(null);
  const [form, setForm] = React.useState<DriverFormData>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<Driver | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.phone?.toLowerCase().includes(q) ?? false) ||
        (d.licenceNo?.toLowerCase().includes(q) ?? false)
    );
  }, [drivers, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      licenceNo: d.licenceNo ?? "",
      address: d.address ?? "",
      notes: d.notes ?? "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const result = editing
      ? await updateDriver(editing.id, form)
      : await createDriver(form);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
      return;
    }

    toast("success", editing ? "Driver updated" : "Driver created");
    setDialogOpen(false);
    router.refresh();
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setDriverStatus(statusTarget.id, next);
    setStatusLoading(false);
    if (result.ok) {
      toast("success", next === "ACTIVE" ? "Driver activated" : "Driver deactivated");
      setStatusTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Failed to update status");
    }
  };

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage fleet drivers"
        actionLabel="Add Driver"
        onAction={openCreate}
        actionIcon="plus"
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search drivers..."
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="user"
          title={search ? "No drivers found" : "No drivers yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first driver to assign to vehicles and tyre installations."
          }
          actionLabel={search ? undefined : "Add Driver"}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-border shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{d.name}</h3>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.licenceNo && (
                    <p className="text-sm text-muted mt-0.5">Licence: {d.licenceNo}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(d)}
                    className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                    aria-label={`Edit ${d.name}`}
                  >
                    <Icon name="pencil" size={16} />
                  </button>
                  <button
                    onClick={() => setStatusTarget(d)}
                    className="p-2 rounded-lg hover:bg-muted-soft transition-colors"
                    aria-label={d.status === "ACTIVE" ? `Deactivate ${d.name}` : `Activate ${d.name}`}
                  >
                    <Icon
                      name={d.status === "ACTIVE" ? "power" : "power-off"}
                      size={16}
                      className={d.status === "ACTIVE" ? "text-danger" : "text-muted"}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                {d.phone && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <Icon name="phone" size={14} />
                    <span className="truncate">{d.phone}</span>
                  </div>
                )}
                {d.address && (
                  <div className="flex items-center gap-1.5 text-muted">
                    <Icon name="map-pin" size={14} />
                    <span className="truncate">{d.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted">
                <span>{d._count.vehicles} vehicles</span>
                <span>{d._count.installations} installations</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Driver" : "Add Driver"}
        description={editing ? `Update details for ${editing.name}` : "Create a new driver record"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <div className="rounded-lg bg-danger-soft text-danger text-sm px-3 py-2" role="alert">
              {errors._form}
            </div>
          )}
          <Input
            label="Driver name *"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Rajesh Kumar"
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
            />
            <Input
              label="Licence number"
              name="licenceNo"
              value={form.licenceNo ?? ""}
              onChange={(e) => setForm({ ...form, licenceNo: e.target.value })}
              error={errors.licenceNo}
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
              {editing ? "Save Changes" : "Create Driver"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusToggle}
        title={statusTarget?.status === "ACTIVE" ? "Deactivate driver?" : "Activate driver?"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `"${statusTarget?.name}" will be deactivated. Historical installations will remain intact.`
            : `"${statusTarget?.name}" will be reactivated.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        danger={statusTarget?.status === "ACTIVE"}
        loading={statusLoading}
      />
    </div>
  );
}