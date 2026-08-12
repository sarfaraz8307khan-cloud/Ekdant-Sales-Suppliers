"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatNumber } from "@/lib/format";
import {
  createVehicle,
  updateVehicle,
  setVehicleStatus,
  deleteVehicle,
  repairVehicleTyres,
  type VehicleFormData,
} from "./actions";

type VehicleType = { id: string; name: string; tyreCount: number };
type Driver = { id: string; name: string };
type Vehicle = {
  id: string;
  registrationNo: string;
  currentOdometer: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  notes: string | null;
  vehicleType: VehicleType;
  driver: Driver | null;
  _count: { installations: number };
};

const emptyForm: VehicleFormData = {
  registrationNo: "",
  vehicleTypeId: "",
  driverId: "",
  currentOdometer: 0,
  notes: "",
};

export function VehiclesClient({
  initialVehicles,
  vehicleTypes,
  drivers,
  incompleteVehicleIds,
  action,
}: {
  initialVehicles: Vehicle[];
  vehicleTypes: VehicleType[];
  drivers: Driver[];
  incompleteVehicleIds: string[];
  action?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const incomplete = new Set(incompleteVehicleIds);
  const [repairing, setRepairing] = React.useState(false);
  const intent: "replace" | null = action === "replace" ? "replace" : null;
  const vehicles = initialVehicles;
  const [working, setWorking] = React.useState<Vehicle | null>(null);
  const [workingLoading, setWorkingLoading] = React.useState(false);
  const startIntent = (v: Vehicle) => {
    setWorking(v);
    setWorkingLoading(true);
    router.push(`/vehicles/${v.id}?action=${intent}`);
  };
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Vehicle | null>(null);
  const [form, setForm] = React.useState<VehicleFormData>(emptyForm);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<Vehicle | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Vehicle | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch =
        !q ||
        v.registrationNo.toLowerCase().includes(q) ||
        v.vehicleType.name.toLowerCase().includes(q) ||
        (v.driver?.name.toLowerCase().includes(q) ?? false);
      const matchesType = !typeFilter || v.vehicleType.id === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [vehicles, search, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      registrationNo: v.registrationNo,
      vehicleTypeId: v.vehicleType.id,
      driverId: v.driver?.id ?? "",
      currentOdometer: v.currentOdometer,
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
      ? await updateVehicle(editing.id, form)
      : await createVehicle(form);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.errors?._form) toast("error", result.errors._form);
      return;
    }

    toast(
      "success",
      editing
        ? "Vehicle updated"
        : "tyresCreated" in result && result.tyresCreated
        ? `Vehicle created with ${result.tyresCreated} company-fitted initial tyres`
        : "Vehicle created"
    );
    setDialogOpen(false);
    router.refresh();
  };

  const handleRepair = async () => {
    setRepairing(true);
    const result = await repairVehicleTyres();
    setRepairing(false);
    if (result.ok) {
      if (result.tyresCreated > 0) {
        toast(
          "success",
          `Repaired ${result.repaired} vehicle(s) — ${result.tyresCreated} company-fitted initial tyres allocated`
        );
      } else {
        toast("success", "All vehicles already have their full tyre configuration");
      }
      router.refresh();
    } else {
      toast("error", "Unable to repair vehicles. Please try again.");
    }
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const result = await setVehicleStatus(statusTarget.id, next);
    setStatusLoading(false);
    if (result.ok) {
      toast("success", next === "ACTIVE" ? "Vehicle activated" : "Vehicle deactivated");
      setStatusTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteVehicle(deleteTarget.id);
    setDeleteLoading(false);
    if (result.ok) {
      toast("success", "Vehicle deleted successfully");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Unable to delete this vehicle.");
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage fleet vehicles and their tyre layouts"
        actionLabel="Add Vehicle"
        onAction={openCreate}
        actionIcon="plus"
      />

      {incomplete.size > 0 && (
        <div className="flex items-start gap-3 bg-warning-soft border border-warning/25 rounded-xl p-3 sm:p-4 mb-4 text-sm">
          <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Icon name="alert-triangle" size={18} className="text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {incomplete.size} vehicle{incomplete.size === 1 ? "" : "s"} missing company-fitted tyres
            </p>
            <p className="text-muted mt-0.5">
              Vehicles fitted from the showroom receive their initial tyre set
              automatically. Repair now to allocate the missing tyres.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={handleRepair}
              loading={repairing}
            >
              <Icon name="wrench" size={14} />
              Repair initial tyres
            </Button>
          </div>
        </div>
      )}

      {intent && (
        <div className="flex items-start gap-2 bg-primary-soft/60 border border-primary/20 rounded-lg p-3 mb-4 text-sm">
          <Icon
            name="refresh-cw"
            size={16}
            className="mt-0.5 shrink-0 text-primary"
          />
          <div>
            <p className="font-medium text-foreground">Replace Tyre</p>
            <p className="text-muted">
              Select a vehicle to replace a tyre on an occupied position.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by registration, type, driver..."
          className="flex-1"
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: "", label: "All vehicle types" },
            ...vehicleTypes.map((t) => ({ value: t.id, label: t.name })),
          ]}
          className="sm:w-56"
          aria-label="Filter by vehicle type"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="truck"
          title={search || typeFilter ? "No vehicles found" : "No vehicles yet"}
          description={
            search || typeFilter
              ? "Try adjusting your search or filters."
              : "Add your first vehicle to start tracking its tyre layout."
          }
          actionLabel={search || typeFilter ? undefined : "Add Vehicle"}
          onAction={search || typeFilter ? undefined : openCreate}
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
                    <Link
                      href={`/vehicles/${v.id}`}
                      className="font-semibold text-foreground hover:text-primary hover:underline truncate"
                    >
                      {v.registrationNo}
                    </Link>
                    <StatusBadge status={v.status} />
                    {incomplete.has(v.id) && (
                      <Badge variant="warning">Missing tyres</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    {v.vehicleType.name} · {v.vehicleType.tyreCount} tyres
                  </p>
                  <p className="text-sm text-muted mt-0.5">
                    Odometer: {formatNumber(v.currentOdometer)} km
                  </p>
                  {v.driver && (
                    <p className="text-sm text-muted mt-0.5">
                      Driver: {v.driver.name}
                    </p>
                  )}
                  {v._count.installations > 0 && (
                    <p className="text-xs text-muted mt-1">
                      {v._count.installations} installation
                      {v._count.installations === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  {intent && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startIntent(v)}
                      disabled={workingLoading && working?.id === v.id}
                      loading={workingLoading && working?.id === v.id}
                      className="sm:mr-1"
                    >
                      <Icon name="refresh-cw" size={14} />
                      Replace
                    </Button>
                  )}
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted-soft transition-colors"
                    aria-label={`View ${v.registrationNo}`}
                  >
                    <Icon name="eye" size={14} />
                    View
                  </Link>
                  <button
                    onClick={() => openEdit(v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted-soft transition-colors"
                    aria-label={`Edit ${v.registrationNo}`}
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => setStatusTarget(v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:bg-muted-soft transition-colors"
                    aria-label={`${v.status === "ACTIVE" ? "Deactivate" : "Activate"} ${v.registrationNo}`}
                  >
                    <Icon
                      name={v.status === "ACTIVE" ? "power" : "refresh"}
                      size={14}
                    />
                    {v.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-danger/30 text-xs font-medium text-danger hover:bg-danger-soft transition-colors"
                    aria-label={`Delete ${v.registrationNo}`}
                  >
                    <Icon name="trash-2" size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Vehicle" : "Add Vehicle"}
        description="Vehicles use a data-driven tyre configuration."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Registration Number"
            name="registrationNo"
            value={form.registrationNo}
            onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
            placeholder="e.g. MH-12-AB-1234"
            error={errors.registrationNo}
            required
          />
          <Select
            label="Vehicle Type"
            name="vehicleTypeId"
            value={form.vehicleTypeId}
            onChange={(e) => setForm({ ...form, vehicleTypeId: e.target.value })}
            options={vehicleTypes.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.tyreCount} tyres)`,
            }))}
            placeholder="Select vehicle type"
            error={errors.vehicleTypeId}
            required
          />
          <Select
            label="Driver"
            name="driverId"
            value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            options={drivers.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="No driver assigned"
          />
          <Input
            label="Current Odometer (km)"
            name="currentOdometer"
            type="number"
            min={0}
            value={form.currentOdometer}
            onChange={(e) =>
              setForm({ ...form, currentOdometer: Number(e.target.value) })
            }
            error={errors.currentOdometer}
            required
          />
          <Textarea
            label="Notes"
            name="notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes about this vehicle"
          />
          {errors._form && (
            <p className="text-sm text-danger" role="alert">
              {errors._form}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Vehicle"}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusToggle}
        title={statusTarget?.status === "ACTIVE" ? "Deactivate Vehicle" : "Activate Vehicle"}
        message={
          statusTarget?.status === "ACTIVE"
            ? `Deactivate ${statusTarget?.registrationNo}? It will no longer appear in active workflows.`
            : `Activate ${statusTarget?.registrationNo}? It will be available for tyre installations.`
        }
        confirmLabel={statusTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        danger={statusTarget?.status === "ACTIVE"}
        loading={statusLoading}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle?"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.registrationNo}? This action cannot be undone.`
            : "Delete this vehicle?"
        }
        confirmLabel="Delete"
        danger
        loading={deleteLoading}
      />
    </div>
  );
}