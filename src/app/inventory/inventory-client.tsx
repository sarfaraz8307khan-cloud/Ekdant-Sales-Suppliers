"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page";
import { SearchInput } from "@/components/ui/search-input";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatCurrency } from "@/lib/format";
import { setTyreStatus } from "./actions";
import type { TyreStatus } from "@/lib/types";

type Tyre = {
  id: string;
  internalId: string;
  status: TyreStatus;
  purchaseDate: Date | null;
  unitPrice: string | number | null;
  tyreModel: { id: string; brand: string; name: string; size: string };
  vendor: { id: string; name: string } | null;
  purchase: { id: string; billNumber: string } | null;
  currentVehicle: { id: string; registrationNo: string } | null;
  currentPosition: { id: string; displayName: string } | null;
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

export function InventoryClient({
  initialTyres,
}: {
  initialTyres: Tyre[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tyres] = React.useState(initialTyres);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<TyreStatus | "ALL">("ALL");
  const [statusTarget, setStatusTarget] = React.useState<Tyre | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return tyres.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.internalId.toLowerCase().includes(q) ||
        t.tyreModel.brand.toLowerCase().includes(q) ||
        t.tyreModel.name.toLowerCase().includes(q) ||
        t.tyreModel.size.toLowerCase().includes(q) ||
        (t.vendor?.name.toLowerCase().includes(q) ?? false) ||
        (t.purchase?.billNumber.toLowerCase().includes(q) ?? false) ||
        (t.currentVehicle?.registrationNo.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tyres, search, statusFilter]);

  const stats = React.useMemo(() => {
    const count = (s: TyreStatus) => tyres.filter((t) => t.status === s).length;
    return {
      available: count("AVAILABLE"),
      installed: count("INSTALLED"),
      removed: count("REMOVED"),
      total: tyres.length,
    };
  }, [tyres]);

  const handleStatusChange = async (newStatus: TyreStatus) => {
    if (!statusTarget) return;
    setStatusLoading(true);
    const result = await setTyreStatus(statusTarget.id, newStatus);
    setStatusLoading(false);
    if (result.ok) {
      toast("success", `Tyre ${statusTarget.internalId} marked as ${newStatus}`);
      setStatusTarget(null);
      router.refresh();
    } else {
      toast("error", result.errors?._form ?? "Failed to update tyre status");
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track every physical tyre in the fleet"
        actionLabel="Purchase Tyres"
        onAction={() => router.push("/purchases")}
        actionIcon="shopping-cart"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Available" value={stats.available} tone="success" />
        <StatCard label="Installed" value={stats.installed} tone="primary" />
        <StatCard label="Removed" value={stats.removed} tone="warning" />
        <StatCard label="Total" value={stats.total} tone="muted" />
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by tyre ID, brand, model, vehicle..."
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
      {filtered.length === 0 ? (
        <EmptyState
          icon="package"
          title={search || statusFilter !== "ALL" ? "No tyres found" : "No tyres in inventory"}
          description={
            search || statusFilter !== "ALL"
              ? "Try adjusting your search or filters."
              : "Purchase tyres to add them to inventory."
          }
          actionLabel={search || statusFilter !== "ALL" ? undefined : "Purchase Tyres"}
          onAction={search || statusFilter !== "ALL" ? undefined : () => router.push("/purchases")}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-border shadow-sm p-4">
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
                <button
                  onClick={() => setStatusTarget(t)}
                  className="p-2 rounded-lg hover:bg-muted-soft transition-colors shrink-0"
                  aria-label={`Change status of ${t.internalId}`}
                >
                  <Icon name="settings-2" size={16} />
                </button>
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
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={`Change status — ${statusTarget?.internalId ?? ""}`}
        description="Select the new status for this tyre"
        size="sm"
      >
        <div className="space-y-2">
          {STATUS_OPTIONS.filter((s) => s !== statusTarget?.status).map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={statusLoading}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted-soft transition-colors disabled:opacity-50"
            >
              <span className="text-sm font-medium">{s.replace("_", " ")}</span>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "success" | "primary" | "warning" | "muted" }) {
  const tones = { success: "text-success", primary: "text-primary", warning: "text-warning", muted: "text-foreground" };
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${tones[tone]}`}>{value}</p>
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