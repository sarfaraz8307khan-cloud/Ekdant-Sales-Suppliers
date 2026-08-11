"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BottomSheet } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatNumber, formatKm } from "@/lib/format";
import { InstallForm, ReplaceForm, RemoveForm } from "./tyre-forms";

export type LayoutPosition = {
  id: string;
  positionId: string;
  displayName: string;
  shortCode: string;
  side: "LEFT" | "RIGHT" | "CENTER" | null;
  sequence: number;
  positionType: string;
  axle: { id: string; axleNumber: number; name: string; sequence: number };
  currentTyre: {
    id: string;
    internalId: string;
    status: string;
    tyreModel: { id: string; brand: string; name: string; size: string };
    currentInstallation: {
      id: string;
      installedAt: string | Date;
      odometer: number;
      driver: { id: string; name: string } | null;
    };
  } | null;
};

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

type Mode = "view" | "install" | "replace" | "remove";

export function VehicleDetailClient({
  vehicle,
  layout,
  availableTyres,
  drivers,
  removalReasons,
  action,
}: {
  vehicle: Vehicle;
  layout: LayoutPosition[];
  availableTyres: AvailableTyre[];
  drivers: Driver[];
  removalReasons: RemovalReason[];
  action?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<LayoutPosition | null>(null);
  const [mode, setMode] = React.useState<Mode>("view");

  const intent: "install" | "replace" | null =
    action === "install" ? "install" : action === "replace" ? "replace" : null;

  // Auto-open the correct workflow when arriving with an intent
  React.useEffect(() => {
    if (!intent) return;
    const target =
      intent === "install"
        ? layout.find((p) => !p.currentTyre)
        : layout.find((p) => p.currentTyre);
    if (target) {
      setSelected(target);
      setMode(intent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  const compatibleTyres = React.useMemo(() => {
    return availableTyres.filter(
      (t) =>
        t.tyreModel.compatibleVehicleTypeIds.length === 0 ||
        t.tyreModel.compatibleVehicleTypeIds.includes(vehicle.vehicleType.id)
    );
  }, [availableTyres, vehicle.vehicleType.id]);

  const openPosition = (pos: LayoutPosition) => {
    setSelected(pos);
    setMode("view");
  };

  const closeSheet = () => {
    setSelected(null);
    setMode("view");
  };

  const handleSuccess = (message: string) => {
    toast("success", message);
    closeSheet();
    router.refresh();
  };

  const handleError = (errors: Record<string, string>) => {
    const formError = errors._form;
    if (formError) toast("error", formError);
  };

  const installedCount = layout.filter((p) => p.currentTyre).length;

  return (
    <div>
      <PageHeader
        title={vehicle.registrationNo}
        description={`${vehicle.vehicleType.name} · ${vehicle.vehicleType.tyreCount} tyres`}
        backHref="/vehicles"
      />

      {/* Vehicle summary card */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">{vehicle.registrationNo}</h2>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="text-sm text-muted mt-1">
              {vehicle.vehicleType.name} · {vehicle.vehicleType.tyreCount} tyres
            </p>
            <p className="text-sm text-muted mt-0.5">
              Odometer: {formatKm(vehicle.currentOdometer)}
            </p>
            {vehicle.driver && (
              <p className="text-sm text-muted mt-0.5">Driver: {vehicle.driver.name}</p>
            )}
            {vehicle.notes && (
              <p className="text-sm text-muted mt-1">{vehicle.notes}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-foreground">
              {installedCount}
              <span className="text-sm font-normal text-muted">/{vehicle.vehicleType.tyreCount}</span>
            </p>
            <p className="text-xs text-muted">tyres installed</p>
          </div>
        </div>
      </div>

      {vehicle.status !== "ACTIVE" && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
          <p>
            This vehicle is deactivated. Activate it from the Vehicles page before
            installing or replacing tyres.
          </p>
        </div>
      )}

      {/* Dynamic tyre layout */}
      <h3 className="text-sm font-semibold text-foreground mb-2">Tyre Layout</h3>
      {layout.length === 0 ? (
        <EmptyState
          icon="settings-2"
          title="No positions configured"
          description="This vehicle type has no active tyre positions. Configure positions in Vehicle Configurations."
        />
      ) : (
        <div className="space-y-4">
          {groupByAxle(layout).map(({ axle, positions }) => (
            <div key={axle.id} className="bg-white rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {axle.name}
                </h4>
                <span className="text-xs text-muted">
                  Axle {axle.axleNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {positions.map((pos) => (
                  <PositionCard
                    key={pos.id}
                    position={pos}
                    onTap={() => openPosition(pos)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Position action sheet */}
      <BottomSheet
        open={selected !== null}
        onClose={closeSheet}
        title={
          mode === "view"
            ? selected?.displayName
            : mode === "install"
              ? `Install Tyre — ${selected?.displayName}`
              : mode === "replace"
                ? `Replace Tyre — ${selected?.displayName}`
                : `Remove Tyre — ${selected?.displayName}`
        }
      >
        {selected && mode === "view" && (
          <PositionView
            position={selected}
            vehicle={vehicle}
            onInstall={() => setMode("install")}
            onReplace={() => setMode("replace")}
            onRemove={() => setMode("remove")}
          />
        )}
        {selected && mode === "install" && (
          <InstallForm
            vehicle={vehicle}
            position={selected}
            tyres={compatibleTyres}
            drivers={drivers}
            onCancel={() => setMode("view")}
            onSuccess={(msg) => handleSuccess(msg)}
            onError={handleError}
          />
        )}
        {selected && mode === "replace" && (
          <ReplaceForm
            vehicle={vehicle}
            position={selected}
            tyres={compatibleTyres}
            drivers={drivers}
            removalReasons={removalReasons}
            onCancel={() => setMode("view")}
            onSuccess={(msg) => handleSuccess(msg)}
            onError={handleError}
          />
        )}
        {selected && mode === "remove" && (
          <RemoveForm
            vehicle={vehicle}
            position={selected}
            removalReasons={removalReasons}
            onCancel={() => setMode("view")}
            onSuccess={(msg) => handleSuccess(msg)}
            onError={handleError}
          />
        )}
      </BottomSheet>
    </div>
  );
}

function groupByAxle(positions: LayoutPosition[]) {
  const map = new Map<string, { axle: LayoutPosition["axle"]; positions: LayoutPosition[] }>();
  for (const pos of positions) {
    const existing = map.get(pos.axle.id);
    if (existing) {
      existing.positions.push(pos);
    } else {
      map.set(pos.axle.id, { axle: pos.axle, positions: [pos] });
    }
  }
  return Array.from(map.values());
}

function PositionCard({
  position,
  onTap,
}: {
  position: LayoutPosition;
  onTap: () => void;
}) {
  const tyre = position.currentTyre;
  return (
    <button
      onClick={onTap}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        tyre
          ? "bg-primary-soft/50 border-primary/30 hover:bg-primary-soft"
          : "bg-muted-soft/50 border-dashed border-border hover:bg-muted-soft"
      )}
      aria-label={`${position.displayName}${tyre ? `, ${tyre.internalId}` : ", empty"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">{position.shortCode}</span>
        {tyre ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
            Installed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-muted" aria-hidden="true" />
            Empty
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground mt-1.5 truncate">
        {tyre ? tyre.internalId : "No tyre"}
      </p>
      {tyre && (
        <p className="text-xs text-muted mt-0.5 truncate">
          {tyre.tyreModel.brand} {tyre.tyreModel.name}
        </p>
      )}
    </button>
  );
}

function PositionView({
  position,
  vehicle,
  onInstall,
  onReplace,
  onRemove,
}: {
  position: LayoutPosition;
  vehicle: Vehicle;
  onInstall: () => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const tyre = position.currentTyre;
  const inst = tyre?.currentInstallation;

  return (
    <div className="space-y-4">
      <div className="bg-muted-soft/50 rounded-lg p-3">
        <p className="text-xs text-muted">Position</p>
        <p className="text-sm font-semibold text-foreground">
          {position.displayName} ({position.shortCode})
        </p>
        <p className="text-xs text-muted mt-1">
          {position.axle.name} · {position.positionType}
        </p>
      </div>

      {tyre && inst ? (
        <div className="space-y-3">
          <div className="bg-white border border-border rounded-lg p-3">
            <p className="text-xs text-muted">Current Tyre</p>
            <p className="text-base font-semibold text-foreground">{tyre.internalId}</p>
            <p className="text-sm text-muted">
              {tyre.tyreModel.brand} {tyre.tyreModel.name} · {tyre.tyreModel.size}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-border rounded-lg p-3">
              <p className="text-xs text-muted">Installed</p>
              <p className="text-sm font-medium text-foreground">{formatDate(inst.installedAt)}</p>
            </div>
            <div className="bg-white border border-border rounded-lg p-3">
              <p className="text-xs text-muted">Odometer</p>
              <p className="text-sm font-medium text-foreground">{formatNumber(inst.odometer)} km</p>
            </div>
          </div>
          {inst.driver && (
            <div className="bg-white border border-border rounded-lg p-3">
              <p className="text-xs text-muted">Driver</p>
              <p className="text-sm font-medium text-foreground">{inst.driver.name}</p>
            </div>
          )}
          <div className="space-y-2 pt-1">
            <Button className="w-full" onClick={onReplace} disabled={vehicle.status !== "ACTIVE"}>
              <Icon name="refresh-cw" size={16} />
              Replace Tyre
            </Button>
            <Button variant="outline" className="w-full" onClick={onRemove} disabled={vehicle.status !== "ACTIVE"}>
              <Icon name="x-circle" size={16} />
              Remove Tyre
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-muted-soft/50 rounded-lg p-3 text-sm text-muted">
            This position is currently empty.
          </div>
          <Button className="w-full" onClick={onInstall} disabled={vehicle.status !== "ACTIVE"}>
            <Icon name="plus" size={16} />
            Install Tyre
          </Button>
        </div>
      )}
    </div>
  );
}

// Local cn helper to avoid importing utils in this file
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}