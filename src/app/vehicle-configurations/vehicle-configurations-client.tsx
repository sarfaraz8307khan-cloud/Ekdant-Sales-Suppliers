"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { VehicleTypeDialog, AxleDialog, PositionDialog } from "./dialogs";
import {
  createVehicleType, updateVehicleType, setVehicleTypeStatus,
  createAxle, updateAxle, setAxleStatus,
  createPosition, updatePosition, setPositionStatus,
  type VehicleTypeFormData, type AxleFormData, type PositionFormData,
} from "./actions";

type VehicleType = { id: string; name: string; description: string | null; axleCount: number; tyreCount: number; status: "ACTIVE" | "INACTIVE" | "ARCHIVED"; axles: Axle[]; _count: { vehicles: number } };
type Axle = { id: string; axleNumber: number; name: string; sequence: number; status: "ACTIVE" | "INACTIVE" | "ARCHIVED"; positions: Position[] };
type Position = { id: string; positionId: string; displayName: string; shortCode: string; side: "LEFT" | "RIGHT" | "CENTER"; sequence: number; positionType: "STEERING" | "DRIVE" | "TRAILER" | "LIFT" | "OTHER"; status: "ACTIVE" | "INACTIVE" | "ARCHIVED" };

const emptyVT: VehicleTypeFormData = { name: "", description: "", axleCount: 2, tyreCount: 10 };
const emptyAxle: AxleFormData = { vehicleTypeId: "", axleNumber: 1, name: "", sequence: 1 };
const emptyPos: PositionFormData = { vehicleTypeId: "", axleId: "", positionId: "", displayName: "", shortCode: "", side: "LEFT", sequence: 1, positionType: "DRIVE" };

export function VehicleConfigurationsClient({ initialTypes }: { initialTypes: VehicleType[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [types] = React.useState(initialTypes);
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const [vtDialog, setVtDialog] = React.useState(false);
  const [vtEditing, setVtEditing] = React.useState<VehicleType | null>(null);
  const [vtForm, setVtForm] = React.useState<VehicleTypeFormData>(emptyVT);
  const [vtErrors, setVtErrors] = React.useState<Record<string, string>>({});
  const [vtSaving, setVtSaving] = React.useState(false);

  const [axleDialog, setAxleDialog] = React.useState(false);
  const [axleEditing, setAxleEditing] = React.useState<Axle | null>(null);
  const [axleForm, setAxleForm] = React.useState<AxleFormData>(emptyAxle);
  const [axleErrors, setAxleErrors] = React.useState<Record<string, string>>({});
  const [axleSaving, setAxleSaving] = React.useState(false);

  const [posDialog, setPosDialog] = React.useState(false);
  const [posEditing, setPosEditing] = React.useState<Position | null>(null);
  const [posForm, setPosForm] = React.useState<PositionFormData>(emptyPos);
  const [posErrors, setPosErrors] = React.useState<Record<string, string>>({});
  const [posSaving, setPosSaving] = React.useState(false);

  const [statusTarget, setStatusTarget] = React.useState<{ type: "vt" | "axle" | "pos"; id: string; name: string; current: string } | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q));
  }, [types, search]);

  const openVtCreate = () => { setVtEditing(null); setVtForm(emptyVT); setVtErrors({}); setVtDialog(true); };
  const openVtEdit = (t: VehicleType) => { setVtEditing(t); setVtForm({ name: t.name, description: t.description ?? "", axleCount: t.axleCount, tyreCount: t.tyreCount }); setVtErrors({}); setVtDialog(true); };

  const handleVtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVtSaving(true); setVtErrors({});
    const result = vtEditing ? await updateVehicleType(vtEditing.id, vtForm) : await createVehicleType(vtForm);
    setVtSaving(false);
    if (!result.ok) { setVtErrors(result.errors ?? {}); if (result.errors?._form) toast("error", result.errors._form); return; }
    toast("success", vtEditing ? "Vehicle type updated" : "Vehicle type created");
    setVtDialog(false); router.refresh();
  };

  const openAxleCreate = (vt: VehicleType) => { setAxleEditing(null); setAxleForm({ ...emptyAxle, vehicleTypeId: vt.id, axleNumber: vt.axles.length + 1, sequence: vt.axles.length + 1 }); setAxleErrors({}); setAxleDialog(true); };
  const openAxleEdit = (a: Axle, vtId: string) => { setAxleEditing(a); setAxleForm({ vehicleTypeId: vtId, axleNumber: a.axleNumber, name: a.name, sequence: a.sequence }); setAxleErrors({}); setAxleDialog(true); };

  const handleAxleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAxleSaving(true); setAxleErrors({});
    const result = axleEditing ? await updateAxle(axleEditing.id, axleForm) : await createAxle(axleForm);
    setAxleSaving(false);
    if (!result.ok) { setAxleErrors(result.errors ?? {}); if (result.errors?._form) toast("error", result.errors._form); return; }
    toast("success", axleEditing ? "Axle updated" : "Axle created");
    setAxleDialog(false); router.refresh();
  };

  const openPosCreate = (vt: VehicleType, axle: Axle) => { setPosEditing(null); setPosForm({ ...emptyPos, vehicleTypeId: vt.id, axleId: axle.id, sequence: axle.positions.length + 1 }); setPosErrors({}); setPosDialog(true); };
  const openPosEdit = (p: Position, vtId: string, axleId: string) => { setPosEditing(p); setPosForm({ vehicleTypeId: vtId, axleId, positionId: p.positionId, displayName: p.displayName, shortCode: p.shortCode, side: p.side, sequence: p.sequence, positionType: p.positionType }); setPosErrors({}); setPosDialog(true); };

  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosSaving(true); setPosErrors({});
    const result = posEditing ? await updatePosition(posEditing.id, posForm) : await createPosition(posForm);
    setPosSaving(false);
    if (!result.ok) { setPosErrors(result.errors ?? {}); if (result.errors?._form) toast("error", result.errors._form); return; }
    toast("success", posEditing ? "Position updated" : "Position created");
    setPosDialog(false); router.refresh();
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const next = statusTarget.current === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    let result;
    if (statusTarget.type === "vt") result = await setVehicleTypeStatus(statusTarget.id, next);
    else if (statusTarget.type === "axle") result = await setAxleStatus(statusTarget.id, next);
    else result = await setPositionStatus(statusTarget.id, next);
    setStatusLoading(false);
    if (result.ok) { toast("success", next === "ACTIVE" ? "Activated" : "Deactivated"); setStatusTarget(null); router.refresh(); }
    else toast("error", result.errors?._form ?? "Failed to update status");
  };

  return (
    <div>
      <PageHeader title="Vehicle Configurations" description="Define vehicle types, axles, and tyre positions" actionLabel="Add Vehicle Type" onAction={openVtCreate} actionIcon="plus" />
      <SearchInput value={search} onChange={setSearch} placeholder="Search vehicle types..." className="mb-4" />

      {filtered.length === 0 ? (
        <EmptyState icon="settings-2" title="No vehicle types" description="Create your first vehicle type to start configuring axles and tyre positions." actionLabel="Add Vehicle Type" onAction={openVtCreate} />
      ) : (
        <div className="space-y-3">
          {filtered.map((vt) => (
            <div key={vt.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button className="text-left font-semibold hover:underline" onClick={() => setExpanded(expanded === vt.id ? null : vt.id)}>{vt.name}</button>
                    <StatusBadge status={vt.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{vt.axleCount} axles · {vt.tyreCount} tyres{vt._count.vehicles > 0 && ` · ${vt._count.vehicles} vehicle${vt._count.vehicles > 1 ? "s" : ""}`}</p>
                  {vt.description && <p className="mt-1 text-sm text-muted-foreground">{vt.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openVtEdit(vt)}><Icon name="pencil" className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setStatusTarget({ type: "vt", id: vt.id, name: vt.name, current: vt.status })}><Icon name={vt.status === "ACTIVE" ? "ban" : "check"} className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === vt.id ? null : vt.id)}><Icon name="chevron-down" className={`h-4 w-4 transition-transform ${expanded === vt.id ? "rotate-180" : ""}`} /></Button>
                </div>
              </div>

              {expanded === vt.id && (
                <div className="border-t border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Axles</h3>
                    <Button size="sm" variant="outline" onClick={() => openAxleCreate(vt)}><Icon name="plus" className="mr-1 h-3.5 w-3.5" />Add Axle</Button>
                  </div>
                  {vt.axles.length === 0 ? (
                    <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No axles configured yet. Add an axle to start defining tyre positions.</p>
                  ) : (
                    <div className="space-y-3">
                      {[...vt.axles].sort((a, b) => a.sequence - b.sequence).map((axle) => (
                        <div key={axle.id} className="rounded-lg border border-border">
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Axle {axle.axleNumber}: {axle.name}</span>
                              <StatusBadge status={axle.status} />
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openAxleEdit(axle, vt.id)}><Icon name="pencil" className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => setStatusTarget({ type: "axle", id: axle.id, name: axle.name, current: axle.status })}><Icon name={axle.status === "ACTIVE" ? "ban" : "check"} className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => openPosCreate(vt, axle)}><Icon name="plus" className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                          {axle.positions.length > 0 && (
                            <div className="border-t border-border p-3">
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                {[...axle.positions].sort((a, b) => a.sequence - b.sequence).map((pos) => (
                                  <div key={pos.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">{pos.displayName}</p>
                                      <p className="text-xs text-muted-foreground">{pos.shortCode} · {pos.side.toLowerCase()}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openPosEdit(pos, vt.id, axle.id)}><Icon name="pencil" className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setStatusTarget({ type: "pos", id: pos.id, name: pos.displayName, current: pos.status })}><Icon name={pos.status === "ACTIVE" ? "ban" : "check"} className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <VehicleTypeDialog open={vtDialog} onClose={() => setVtDialog(false)} editing={!!vtEditing} form={vtForm} setForm={setVtForm} errors={vtErrors} saving={vtSaving} onSubmit={handleVtSubmit} />
      <AxleDialog open={axleDialog} onClose={() => setAxleDialog(false)} editing={!!axleEditing} form={axleForm} setForm={setAxleForm} errors={axleErrors} saving={axleSaving} onSubmit={handleAxleSubmit} />
      <PositionDialog open={posDialog} onClose={() => setPosDialog(false)} editing={!!posEditing} form={posForm} setForm={setPosForm} errors={posErrors} saving={posSaving} onSubmit={handlePosSubmit} />

      <ConfirmDialog
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusToggle}
        loading={statusLoading}
        title={statusTarget?.current === "ACTIVE" ? "Deactivate" : "Activate"}
        message={statusTarget ? `Are you sure you want to ${statusTarget.current === "ACTIVE" ? "deactivate" : "activate"} "${statusTarget.name}"?` : ""}
        confirmLabel={statusTarget?.current === "ACTIVE" ? "Deactivate" : "Activate"}
      />
    </div>
  );
}