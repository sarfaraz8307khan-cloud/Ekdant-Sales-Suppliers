"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { formatDate, formatNumber } from "@/lib/format";
import { installTyre, replaceTyre, removeTyre } from "./actions";
import type { LayoutPosition } from "./vehicle-detail-client";

type AvailableTyre = {
  id: string;
  internalId: string;
  status: string;
  tyreModel: {
    id: string;
    brand: string;
    name: string;
    size: string;
    compatibleVehicleTypeIds: string[];
  };
};

type Driver = { id: string; name: string };
type RemovalReason = { id: string; name: string };

type Vehicle = {
  id: string;
  registrationNo: string;
  currentOdometer: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  notes: string | null;
  vehicleType: { id: string; name: string; tyreCount: number };
  driver: Driver | null;
};

type FormErrors = Record<string, string>;

function todayInputValue(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function OdometerOverride({
  currentOdometer,
  value,
  override,
  reason,
  onOverrideChange,
  onReasonChange,
}: {
  currentOdometer: number;
  value: string;
  override: boolean;
  reason: string;
  onOverrideChange: (v: boolean) => void;
  onReasonChange: (v: string) => void;
}) {
  const numeric = parseFloat(value);
  const isLower = !isNaN(numeric) && numeric < currentOdometer;

  if (!isLower) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Icon name="alert-triangle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          This reading is below the current odometer for this vehicle ({formatNumber(currentOdometer)} km).
          To record it, enable the override and provide a documented reason.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={override}
          onChange={(e) => onOverrideChange(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        Allow lower odometer reading
      </label>
      {override && (
        <Input
          label="Override reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. Odometer was reset during service"
          required
        />
      )}
    </div>
  );
}

export function InstallForm({
  vehicle,
  position,
  tyres,
  drivers,
  onCancel,
  onSuccess,
  onError,
}: {
  vehicle: Vehicle;
  position: LayoutPosition;
  tyres: AvailableTyre[];
  drivers: Driver[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (errors: FormErrors) => void;
}) {
  const [tyreId, setTyreId] = React.useState("");
  const [driverId, setDriverId] = React.useState("");
  const [installedAt, setInstalledAt] = React.useState(todayInputValue());
  const [odometer, setOdometer] = React.useState(String(vehicle.currentOdometer));
  const [notes, setNotes] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);

  const selectedTyre = tyres.find((t) => t.id === tyreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const result = await installTyre({
      vehicleId: vehicle.id,
      positionId: position.id,
      tyreId,
      driverId: driverId || undefined,
      installedAt,
      odometer: parseFloat(odometer),
      notes: notes || undefined,
      odometerOverride: override,
      odometerOverrideReason: overrideReason || undefined,
    });
    setLoading(false);
    if (result.ok) {
      onSuccess(`Tyre ${selectedTyre?.internalId ?? ""} installed on ${position.displayName}`);
    } else {
      setErrors(result.errors);
      onError(result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="bg-muted-soft/50 rounded-lg p-3 text-sm">
        <p className="text-muted">Installing into</p>
        <p className="font-semibold text-foreground">
          {vehicle.registrationNo} · {position.displayName}
        </p>
      </div>

      <Select
        label="Tyre"
        name="tyreId"
        value={tyreId}
        onChange={(e) => setTyreId(e.target.value)}
        error={errors.tyreId}
        placeholder="Select available tyre"
        options={tyres.map((t) => ({
          value: t.id,
          label: `${t.internalId} — ${t.tyreModel.brand} ${t.tyreModel.name} (${t.tyreModel.size})`,
        }))}
        required
      />

      <Select
        label="Driver"
        name="driverId"
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        error={errors.driverId}
        placeholder="Select driver (optional)"
        options={drivers.map((d) => ({ value: d.id, label: d.name }))}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Installation date"
          name="installedAt"
          type="date"
          value={installedAt}
          onChange={(e) => setInstalledAt(e.target.value)}
          error={errors.installedAt}
          required
        />
        <Input
          label="Odometer (km)"
          name="odometer"
          type="number"
          min="0"
          inputMode="numeric"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          error={errors.odometer}
          required
        />
      </div>

      <OdometerOverride
        currentOdometer={vehicle.currentOdometer}
        value={odometer}
        override={override}
        reason={overrideReason}
        onOverrideChange={setOverride}
        onReasonChange={setOverrideReason}
      />

      <Textarea
        label="Notes"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes"
        error={errors.notes}
      />

      {errors._form && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          {errors._form}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading} disabled={!tyreId}>
          Install Tyre
        </Button>
      </div>
    </form>
  );
}

export function ReplaceForm({
  vehicle,
  position,
  tyres,
  drivers,
  removalReasons,
  onCancel,
  onSuccess,
  onError,
}: {
  vehicle: Vehicle;
  position: LayoutPosition;
  tyres: AvailableTyre[];
  drivers: Driver[];
  removalReasons: RemovalReason[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (errors: FormErrors) => void;
}) {
  const currentTyre = position.currentTyre;
  const currentInst = currentTyre?.currentInstallation;

  const [newTyreId, setNewTyreId] = React.useState("");
  const [driverId, setDriverId] = React.useState("");
  const [removedAt, setRemovedAt] = React.useState(todayInputValue());
  const [odometer, setOdometer] = React.useState(String(vehicle.currentOdometer));
  const [removalReasonId, setRemovalReasonId] = React.useState("");
  const [removalNotes, setRemovalNotes] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);

  const selectedTyre = tyres.find((t) => t.id === newTyreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTyre || !currentInst) return;
    setErrors({});
    setLoading(true);
    const result = await replaceTyre({
      installationId: currentInst.id,
      vehicleId: vehicle.id,
      tyreId: currentTyre.id,
      newTyreId,
      driverId: driverId || undefined,
      removedAt,
      odometer: parseFloat(odometer),
      removalReasonId: removalReasonId || undefined,
      removalNotes: removalNotes || undefined,
      notes: notes || undefined,
      odometerOverride: override,
      odometerOverrideReason: overrideReason || undefined,
    });
    setLoading(false);
    if (result.ok) {
      onSuccess(
        `Tyre ${currentTyre.internalId} replaced with ${selectedTyre?.internalId ?? ""} at ${position.displayName}`
      );
    } else {
      setErrors(result.errors);
      onError(result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Current tyre summary */}
      {currentTyre && currentInst && (
        <div className="bg-white border border-border rounded-lg p-3 space-y-2">
          <p className="text-xs text-muted">Current tyre</p>
          <p className="text-sm font-semibold text-foreground">{currentTyre.internalId}</p>
          <p className="text-xs text-muted">
            {currentTyre.tyreModel.brand} {currentTyre.tyreModel.name} · {currentTyre.tyreModel.size}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-[10px] text-muted">Installed</p>
              <p className="text-xs font-medium text-foreground">{formatDate(currentInst.installedAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Odometer</p>
              <p className="text-xs font-medium text-foreground">{formatNumber(currentInst.odometer)} km</p>
            </div>
          </div>
          {currentInst.driver && (
            <p className="text-xs text-muted">Driver: {currentInst.driver.name}</p>
          )}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Removal information</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Removal date"
            name="removedAt"
            type="date"
            value={removedAt}
            onChange={(e) => setRemovedAt(e.target.value)}
            error={errors.removedAt}
            required
          />
          <Input
            label="Odometer (km)"
            name="odometer"
            type="number"
            min="0"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            error={errors.odometer}
            required
          />
        </div>

        <div className="mt-3">
          <OdometerOverride
            currentOdometer={vehicle.currentOdometer}
            value={odometer}
            override={override}
            reason={overrideReason}
            onOverrideChange={setOverride}
            onReasonChange={setOverrideReason}
          />
        </div>

        <div className="mt-3">
          <Select
            label="Removal reason"
            name="removalReasonId"
            value={removalReasonId}
            onChange={(e) => setRemovalReasonId(e.target.value)}
            error={errors.removalReasonId}
            placeholder="Select reason (optional)"
            options={removalReasons.map((r) => ({ value: r.id, label: r.name }))}
          />
        </div>

        <div className="mt-3">
          <Textarea
            label="Removal notes"
            name="removalNotes"
            value={removalNotes}
            onChange={(e) => setRemovalNotes(e.target.value)}
            placeholder="Optional notes about the removed tyre"
            error={errors.removalNotes}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Replacement tyre</h4>
        <Select
          label="New tyre"
          name="newTyreId"
          value={newTyreId}
          onChange={(e) => setNewTyreId(e.target.value)}
          error={errors.newTyreId}
          placeholder="Select available tyre"
          options={tyres.map((t) => ({
            value: t.id,
            label: `${t.internalId} — ${t.tyreModel.brand} ${t.tyreModel.name} (${t.tyreModel.size})`,
          }))}
          required
        />
        <div className="mt-3">
          <Select
            label="Driver"
            name="driverId"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            error={errors.driverId}
            placeholder="Select driver (optional)"
            options={drivers.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="Installation notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the new installation"
            error={errors.notes}
          />
        </div>
      </div>

      {errors._form && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          {errors._form}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading} disabled={!newTyreId}>
          Replace Tyre
        </Button>
      </div>
    </form>
  );
}

export function RemoveForm({
  vehicle,
  position,
  removalReasons,
  onCancel,
  onSuccess,
  onError,
}: {
  vehicle: Vehicle;
  position: LayoutPosition;
  removalReasons: RemovalReason[];
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onError: (errors: FormErrors) => void;
}) {
  const currentTyre = position.currentTyre;
  const currentInst = currentTyre?.currentInstallation;

  const [removedAt, setRemovedAt] = React.useState(todayInputValue());
  const [odometer, setOdometer] = React.useState(String(vehicle.currentOdometer));
  const [removalReasonId, setRemovalReasonId] = React.useState("");
  const [removalNotes, setRemovalNotes] = React.useState("");
  const [override, setOverride] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTyre || !currentInst) return;
    setErrors({});
    setLoading(true);
    const result = await removeTyre({
      installationId: currentInst.id,
      vehicleId: vehicle.id,
      tyreId: currentTyre.id,
      removedAt,
      odometer: parseFloat(odometer),
      removalReasonId: removalReasonId || undefined,
      removalNotes: removalNotes || undefined,
      odometerOverride: override,
      odometerOverrideReason: overrideReason || undefined,
    });
    setLoading(false);
    if (result.ok) {
      onSuccess(`Tyre ${currentTyre.internalId} removed from ${position.displayName}`);
    } else {
      setErrors(result.errors);
      onError(result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {currentTyre && (
        <div className="bg-muted-soft/50 rounded-lg p-3 text-sm">
          <p className="text-muted">Removing</p>
          <p className="font-semibold text-foreground">
            {currentTyre.internalId} from {position.displayName}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Removal date"
          name="removedAt"
          type="date"
          value={removedAt}
          onChange={(e) => setRemovedAt(e.target.value)}
          error={errors.removedAt}
          required
        />
        <Input
          label="Odometer (km)"
          name="odometer"
          type="number"
          min="0"
          inputMode="numeric"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          error={errors.odometer}
          required
        />
      </div>

      <OdometerOverride
        currentOdometer={vehicle.currentOdometer}
        value={odometer}
        override={override}
        reason={overrideReason}
        onOverrideChange={setOverride}
        onReasonChange={setOverrideReason}
      />

      <Select
        label="Removal reason"
        name="removalReasonId"
        value={removalReasonId}
        onChange={(e) => setRemovalReasonId(e.target.value)}
        error={errors.removalReasonId}
        placeholder="Select reason (optional)"
        options={removalReasons.map((r) => ({ value: r.id, label: r.name }))}
      />

      <Textarea
        label="Removal notes"
        name="removalNotes"
        value={removalNotes}
        onChange={(e) => setRemovalNotes(e.target.value)}
        placeholder="Optional notes"
        error={errors.removalNotes}
      />

      {errors._form && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          {errors._form}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" className="flex-1" loading={loading}>
          Remove Tyre
        </Button>
      </div>
    </form>
  );
}