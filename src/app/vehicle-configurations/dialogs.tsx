"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/form";
import { Dialog } from "@/components/ui/dialog";
import type { VehicleTypeFormData, AxleFormData, PositionFormData } from "./actions";

const sideOptions = [
  { value: "LEFT", label: "Left" },
  { value: "RIGHT", label: "Right" },
  { value: "CENTER", label: "Center" },
];

const positionTypeOptions = [
  { value: "STEERING", label: "Steering" },
  { value: "DRIVE", label: "Drive" },
  { value: "TRAILER", label: "Trailer" },
  { value: "LIFT", label: "Lift" },
  { value: "OTHER", label: "Other" },
];

export function VehicleTypeDialog({
  open,
  onClose,
  editing,
  form,
  setForm,
  errors,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: VehicleTypeFormData;
  setForm: (f: VehicleTypeFormData) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit Vehicle Type" : "Add Vehicle Type"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="e.g. 12-Tyre Truck" required />
        <Textarea label="Description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} placeholder="Optional description" rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Axle Count" type="number" min={1} value={form.axleCount} onChange={(e) => setForm({ ...form, axleCount: Number(e.target.value) })} error={errors.axleCount} required />
          <Input label="Tyre Count" type="number" min={1} value={form.tyreCount} onChange={(e) => setForm({ ...form, tyreCount: Number(e.target.value) })} error={errors.tyreCount} required />
        </div>
        {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function AxleDialog({
  open,
  onClose,
  editing,
  form,
  setForm,
  errors,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: AxleFormData;
  setForm: (f: AxleFormData) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit Axle" : "Add Axle"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Axle Number" type="number" min={1} value={form.axleNumber} onChange={(e) => setForm({ ...form, axleNumber: Number(e.target.value) })} error={errors.axleNumber} required />
          <Input label="Sequence" type="number" min={1} value={form.sequence} onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })} error={errors.sequence} required />
        </div>
        <Input label="Axle Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="e.g. Front Axle" required />
        {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function PositionDialog({
  open,
  onClose,
  editing,
  form,
  setForm,
  errors,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: boolean;
  form: PositionFormData;
  setForm: (f: PositionFormData) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit Position" : "Add Position"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Position ID" value={form.positionId} onChange={(e) => setForm({ ...form, positionId: e.target.value })} error={errors.positionId} placeholder="e.g. L1" required />
          <Input label="Short Code" value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value })} error={errors.shortCode} placeholder="e.g. FL" required />
        </div>
        <Input label="Display Name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} error={errors.displayName} placeholder="e.g. Front Left 1" required />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Side" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as PositionFormData["side"] })} options={sideOptions} />
          <Select label="Position Type" value={form.positionType} onChange={(e) => setForm({ ...form, positionType: e.target.value as PositionFormData["positionType"] })} options={positionTypeOptions} />
        </div>
        <Input label="Sequence" type="number" min={1} value={form.sequence} onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })} error={errors.sequence} required />
        {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? "Save Changes" : "Create"}</Button>
        </div>
      </form>
    </Dialog>
  );
}