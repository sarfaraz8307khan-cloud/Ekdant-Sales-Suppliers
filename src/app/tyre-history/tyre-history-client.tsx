"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { BottomSheet } from "@/components/ui/drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatCurrency, formatKm } from "@/lib/format";
import type { TyreStatus, LifecycleEventType } from "@/lib/types";

type TyreModel = { id: string; brand: string; name: string; size: string };
type Vehicle = { id: string; registrationNo: string };
type Driver = { id: string; name: string };

type Installation = {
  id: string;
  installedAt: Date;
  odometer: number;
  notes: string | null;
  isCurrent: boolean;
  removedAt: Date | null;
  removalOdometer: number | null;
  removalNotes: string | null;
  vehicle: { id: string; registrationNo: string };
  position: { id: string; displayName: string; shortCode: string };
  driver: { id: string; name: string } | null;
  removalReason: { id: string; name: string } | null;
};

type LifecycleEvent = {
  id: string;
  type: LifecycleEventType;
  description: string;
  occurredAt: Date;
  metadata: string | null;
};

type Tyre = {
  id: string;
  internalId: string;
  serialNo: string | null;
  status: TyreStatus;
  purchaseDate: Date | null;
  unitPrice: string | number | null;
  tyreModel: TyreModel;
  vendor: { id: string; name: string } | null;
  purchase: { id: string; billNumber: string; purchaseDate: Date } | null;
  currentVehicle: { id: string; registrationNo: string } | null;
  currentPosition: { id: string; displayName: string } | null;
  installations: Installation[];
  lifecycleEvents: LifecycleEvent[];
};

const STATUS_OPTIONS: TyreStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "INSTALLED",
  "REMOVED",
  "WORN_OUT",
  "DAMAGED",
  "SCRAPPED",
];

const EVENT_ICONS: Record<LifecycleEventType, string> = {
  PURCHASED: "shopping-cart",
  INSTALLED: "wrench",
  REMOVED: "refresh-cw",
  REPLACED: "refresh-cw",
  STATUS_CHANGED: "settings-2",
  RESERVED: "circle-dot",
  UNRESERVED: "circle",
};

const EVENT_TONES: Record<LifecycleEventType, string> = {
  PURCHASED: "bg-success-soft text-success",
  INSTALLED: "bg-primary-soft text-primary",
  REMOVED: "bg-warning-soft text-warning",
  REPLACED: "bg-warning-soft text-warning",
  STATUS_CHANGED: "bg-muted-soft text-muted",
  RESERVED: "bg-info-soft text-info",
  UNRESERVED: "bg-muted-soft text-muted",
};

export function TyreHistoryClient({
  initialTyres,
  tyreModels,
  vehicles,
  drivers,
  initialTyreId,
}: {
  initialTyres: Tyre[];
  tyreModels: TyreModel[];
  vehicles: Vehicle[];
  drivers: Driver[];
  initialTyreId?: string | null;
}) {
  const [tyres] = React.useState(initialTyres);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<TyreStatus | "ALL">("ALL");
  const [modelFilter, setModelFilter] = React.useState<string>("ALL");
  const [vehicleFilter, setVehicleFilter] = React.useState<string>("ALL");
  const [driverFilter, setDriverFilter] = React.useState<string>("ALL");
  const [selected, setSelected] = React.useState<Tyre | null>(
    initialTyreId
      ? initialTyres.find((t) => t.internalId === initialTyreId) ?? null
      : null
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tyres.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (modelFilter !== "ALL" && t.tyreModel.id !== modelFilter) return false;
      if (vehicleFilter !== "ALL") {
        const onVehicle = t.installations.some(
          (i) => i.vehicle.id === vehicleFilter
        );
        if (!onVehicle) return false;
      }
      if (driverFilter !== "ALL") {
        const withDriver = t.installations.some(
          (i) => i.driver?.id === driverFilter
        );
        if (!withDriver) return false;
      }
      if (!q) return true;
      return (
        t.internalId.toLowerCase().includes(q) ||
        t.serialNo?.toLowerCase().includes(q) ||
        t.tyreModel.brand.toLowerCase().includes(q) ||
        t.tyreModel.name.toLowerCase().includes(q) ||
        t.tyreModel.size.toLowerCase().includes(q) ||
        (t.vendor?.name.toLowerCase().includes(q) ?? false) ||
        (t.purchase?.billNumber.toLowerCase().includes(q) ?? false) ||
        t.installations.some((i) =>
          i.vehicle.registrationNo.toLowerCase().includes(q)
        )
      );
    });
  }, [tyres, search, statusFilter, modelFilter, vehicleFilter, driverFilter]);

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "ALL" ||
    modelFilter !== "ALL" ||
    vehicleFilter !== "ALL" ||
    driverFilter !== "ALL";

  return (
    <div>
      <PageHeader
        title="Tyre History"
        description="Complete lifecycle timeline for every tyre"
      />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by tyre ID, brand, model, vehicle, bill..."
        className="mb-3"
      />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        <FilterChip label="All" active={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")} />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s}
            label={s.replace("_", " ")}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <SelectFilter
          label="Model"
          value={modelFilter}
          onChange={setModelFilter}
          options={tyreModels.map((m) => ({
            value: m.id,
            label: `${m.brand} ${m.name} · ${m.size}`,
          }))}
        />
        <SelectFilter
          label="Vehicle"
          value={vehicleFilter}
          onChange={setVehicleFilter}
          options={vehicles.map((v) => ({
            value: v.id,
            label: v.registrationNo,
          }))}
        />
        <SelectFilter
          label="Driver"
          value={driverFilter}
          onChange={setDriverFilter}
          options={drivers.map((d) => ({ value: d.id, label: d.name }))}
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="history"
          title={hasActiveFilters ? "No tyres found" : "No tyre history yet"}
          description={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : "Purchase tyres to start tracking their lifecycle."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left bg-white rounded-xl border border-border shadow-sm p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{t.internalId}</h3>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    {t.tyreModel.brand} {t.tyreModel.name} · {t.tyreModel.size}
                  </p>
                </div>
                <Icon name="chevron-right" size={16} className="text-muted shrink-0 mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <InfoRow icon="calendar" label="Purchased" value={formatDate(t.purchaseDate)} />
                <InfoRow icon="building-2" label="Vendor" value={t.vendor?.name ?? "—"} />
                <InfoRow icon="file-text" label="Bill" value={t.purchase?.billNumber ?? "—"} />
                <InfoRow icon="indian-rupee" label="Cost" value={formatCurrency(t.unitPrice)} />
              </div>
              {t.currentVehicle && t.currentPosition && (
                <div className="mt-3 pt-3 border-t border-border text-sm">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Icon name="truck" size={14} />
                    <span className="font-medium">{t.currentVehicle.registrationNo}</span>
                    <span className="text-muted">· {t.currentPosition.displayName}</span>
                  </div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted mb-2">
                  {t.installations.length} installation{t.installations.length === 1 ? "" : "s"} ·{" "}
                  {t.lifecycleEvents.length} event{t.lifecycleEvents.length === 1 ? "" : "s"}
                </p>
                <TimelinePreview events={t.lifecycleEvents} />
              </div>
            </button>
          ))}
        </div>
      )}
      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Tyre ${selected.internalId}` : ""}
      >
        {selected && <TyreDetail tyre={selected} />}
      </BottomSheet>
    </div>
  );
}

function TyreDetail({ tyre }: { tyre: Tyre }) {
  const currentInstallation = tyre.installations.find((i) => i.isCurrent);
  const totalKm = tyre.installations.reduce(
    (sum, i) => sum + ((i.removalOdometer ?? 0) - i.odometer),
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">{tyre.internalId}</h3>
          <p className="text-sm text-muted">
            {tyre.tyreModel.brand} {tyre.tyreModel.name} · {tyre.tyreModel.size}
          </p>
        </div>
        <StatusBadge status={tyre.status} />
      </div>

      {tyre.serialNo && (
        <p className="text-sm text-muted">
          Serial: <span className="font-medium text-foreground">{tyre.serialNo}</span>
        </p>
      )}

      <Section title="Purchase">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow icon="building-2" label="Vendor" value={tyre.vendor?.name ?? "—"} />
          <InfoRow icon="file-text" label="Bill" value={tyre.purchase?.billNumber ?? "—"} />
          <InfoRow icon="calendar" label="Date" value={formatDate(tyre.purchaseDate)} />
          <InfoRow icon="indian-rupee" label="Cost" value={formatCurrency(tyre.unitPrice)} />
        </div>
      </Section>

      {currentInstallation && (
        <Section title="Currently Installed">
          <div className="flex items-center gap-2 text-sm mb-2">
            <Icon name="truck" size={14} className="text-primary" />
            <span className="font-medium">{currentInstallation.vehicle.registrationNo}</span>
            <span className="text-muted">· {currentInstallation.position.displayName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow icon="calendar" label="Installed" value={formatDate(currentInstallation.installedAt)} />
            <InfoRow icon="gauge" label="Odometer" value={formatKm(currentInstallation.odometer)} />
            <InfoRow icon="user" label="Driver" value={currentInstallation.driver?.name ?? "—"} />
          </div>
        </Section>
      )}

      {tyre.installations.length > 0 && (
        <Section title="Installation History">
          <div className="space-y-3">
            {tyre.installations.map((inst) => (
              <div
                key={inst.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon name="truck" size={14} className="text-primary" />
                    {inst.vehicle.registrationNo}
                    <span className="text-muted">· {inst.position.displayName}</span>
                  </div>
                  {inst.isCurrent && <StatusBadge status="INSTALLED" />}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <InfoRow icon="calendar" label="Installed" value={formatDate(inst.installedAt)} />
                  <InfoRow icon="gauge" label="Odometer" value={formatKm(inst.odometer)} />
                  <InfoRow icon="user" label="Driver" value={inst.driver?.name ?? "—"} />
                  {inst.removedAt && (
                    <>
                      <InfoRow icon="calendar" label="Removed" value={formatDate(inst.removedAt)} />
                      <InfoRow icon="gauge" label="Removal km" value={formatKm(inst.removalOdometer)} />
                      <InfoRow
                        icon="alert-triangle"
                        label="Reason"
                        value={inst.removalReason?.name ?? "—"}
                      />
                    </>
                  )}
                </div>
                {inst.removalNotes && (
                  <p className="text-xs text-muted mt-2">{inst.removalNotes}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Usage">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow icon="trending-up" label="Total distance" value={formatKm(totalKm)} />
          <InfoRow icon="refresh-cw" label="Installations" value={String(tyre.installations.length)} />
        </div>
      </Section>

      <Section title="Timeline">
        <Timeline events={tyre.lifecycleEvents} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="bg-muted-soft/50 rounded-xl p-3">{children}</div>
    </div>
  );
}

function Timeline({ events }: { events: LifecycleEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted">No events recorded.</p>;
  }
  return (
    <ol className="relative space-y-4">
      {events.map((event, idx) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${EVENT_TONES[event.type] ?? "bg-muted-soft text-muted"}`}
            >
              <Icon name={EVENT_ICONS[event.type] ?? "circle"} size={14} />
            </div>
            {idx < events.length - 1 && (
              <div className="w-px flex-1 bg-border my-1" aria-hidden="true" />
            )}
          </div>
          <div className="pb-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{event.description}</p>
            <p className="text-xs text-muted mt-0.5">{formatDate(event.occurredAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function TimelinePreview({ events }: { events: LifecycleEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted">No events recorded.</p>;
  }
  const recent = events.slice(-3).reverse();
  return (
    <div className="space-y-1">
      {recent.map((event) => (
        <div key={event.id} className="flex items-center gap-2 text-xs">
          <Icon
            name={EVENT_ICONS[event.type] ?? "circle"}
            size={12}
            className="text-muted shrink-0"
          />
          <span className="text-muted truncate">{event.description}</span>
          <span className="text-muted/60 shrink-0 ml-auto">{formatDate(event.occurredAt)}</span>
        </div>
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-primary text-white" : "bg-white border border-border text-muted hover:bg-muted-soft"
      }`}
    >
      {label}
    </button>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value="ALL">All {label.toLowerCase()}s</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted min-w-0">
      <Icon name={icon} size={14} className="shrink-0" />
      <span className="truncate">
        <span className="text-muted/70">{label}: </span>
        {value}
      </span>
    </div>
  );
}