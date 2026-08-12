"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { adjustInventory } from "./actions";

type ModelSummary = {
  id: string;
  brand: string;
  name: string;
  size: string;
  minStockLevel: number;
  available: number;
  removed: number;
  total: number;
  lowStock: boolean;
};

type RemovalItem = {
  id: string;
  tyreModel: string;
  vehicleReg: string;
  position: string;
  removedAt: string;
  odometer: number | null;
};

type Tab = "ALL" | "AVAILABLE" | "REMOVED";

export function InventoryClient({
  models,
  removalItems,
  lowStockThresholds,
}: {
  models: ModelSummary[];
  removalItems: RemovalItem[];
  lowStockThresholds: { modelId: string; available: number; minimum: number }[];
}) {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>("ALL");
  const [filterModel, setFilterModel] = React.useState("all");
  const [sort, setSort] = React.useState<"asc" | "desc">("desc");
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [adjustModel, setAdjustModel] = React.useState("");
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustReason, setAdjustReason] = React.useState("");
  const [adjustNotes, setAdjustNotes] = React.useState("");
  const [adjustError, setAdjustError] = React.useState<string | null>(null);

  const stats = React.useMemo(() => {
    const available = models.reduce((s, m) => s + m.available, 0);
    const removed = models.reduce((s, m) => s + m.removed, 0);
    const total = models.reduce((s, m) => s + m.total, 0);
    return { available, removed, total };
  }, [models]);

  const filteredModels = React.useMemo(() => {
    let list = [...models];
    if (filterModel !== "all") {
      list = list.filter((m) => m.id === filterModel);
    }
    list = list.filter((m) => {
      if (tab === "AVAILABLE") return m.available > 0 || m.total === 0;
      if (tab === "REMOVED") return m.removed > 0;
      return true;
    });
    list.sort((a, b) => {
      const label = (m: ModelSummary) => `${m.brand} ${m.name}`.toLowerCase();
      const diff = label(a).localeCompare(label(b));
      return sort === "asc" ? diff : -diff;
    });
    return list;
  }, [models, tab, filterModel, sort]);

  const closedDialog = () => {
    setAdjustOpen(false);
    setAdjustModel("");
    setAdjustQty("");
    setAdjustReason("");
    setAdjustNotes("");
    setAdjustError(null);
  };

  const handleAdjust = async () => {
    setPending(true);
    setAdjustError(null);
    const result = await adjustInventory({
      tyreModelId: adjustModel,
      quantity: Number(adjustQty),
      reason: adjustReason,
      notes: adjustNotes || undefined,
    });
    setPending(false);
    if (result.ok) {
      toast("success", "Inventory adjusted successfully");
      closedDialog();
    } else {
      setAdjustError(Object.values(result.errors)[0] ?? "Unable to adjust inventory.");
    }
  };

  const adjustSelectedModel = models.find((m) => m.id === adjustModel);

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Available tyres by model"
        actionLabel="Adjust Inventory"
        actionIcon="arrow-down-circle"
        onAction={() => setAdjustOpen(true)}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <SummaryCard label="Available" value={stats.available} tone="success" />
        <SummaryCard label="Removed" value={stats.removed} tone="muted" />
        <SummaryCard label="Total" value={stats.total} tone="primary" />
      </div>

      {/* Low stock alert */}
      {lowStockThresholds.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="alert-triangle" size={18} className="text-warning" />
            <h2 className="font-semibold text-warning text-sm">⚠ LOW STOCK</h2>
          </div>
          <div className="space-y-1.5">
            {lowStockThresholds.map((l) => {
              const model = models.find((m) => m.id === l.modelId);
              return (
                <p key={l.modelId} className="text-sm text-foreground">
                  <span className="font-medium">{model ? `${model.brand} ${model.name}` : "Model"}</span>
                  <span className="text-muted">
                    {" "}
                    — Available: {l.available} · Minimum: {l.minimum}
                  </span>
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted-soft p-1 mb-4 overflow-x-auto">
        {(["ALL", "AVAILABLE", "REMOVED"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 min-w-[90px] px-3 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t ? "bg-background shadow-sm text-primary" : "text-muted hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Filter by model"
        >
          <option value="all">All models</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.brand} {m.name} {m.size}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "asc" | "desc")}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Sort by model name"
        >
          <option value="asc">Model A–Z</option>
          <option value="desc">Model Z–A</option>
        </select>
      </div>

      {/* Content */}
      {tab === "REMOVED" ? (
        removalItems.length === 0 ? (
          <EmptyState
            icon="history"
            title="No removed tyres yet"
            description="Removed/replacement history will appear here."
          />
        ) : (
          <div className="space-y-2">
            {removalItems.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-surface p-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm text-foreground">{r.tyreModel}</p>
                  <span className="text-xs text-muted shrink-0">
                    {new Date(r.removedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {r.vehicleReg} · {r.position}
                  {r.odometer != null ? ` · ${r.odometer.toLocaleString("en-IN")} km` : ""}
                </p>
              </div>
            ))}
          </div>
        )
      ) : filteredModels.length === 0 ? (
        <EmptyState icon="package" title="No tyres found" description="No tyre models match the current filters." />
      ) : (
        <div className="space-y-2">
          {filteredModels.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-xl border p-4",
                m.lowStock ? "border-warning/40 bg-warning-soft/40" : "border-border bg-surface"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">
                    {m.brand} {m.name}
                  </p>
                  <p className="text-xs text-muted truncate">{m.size}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-foreground">{m.available}</p>
                  <p className="text-[11px] text-muted">available</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted">
                <span>Total: {m.total}</span>
                <span>Min: {m.minStockLevel}</span>
                <span>Removed: {m.removed}</span>
              </div>
              {m.lowStock && (
                <p className="mt-2 text-xs font-medium text-warning flex items-center gap-1">
                  <Icon name="alert-triangle" size={14} />
                  Low stock — available below minimum
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Adjust Inventory dialog */}
      <Dialog open={adjustOpen} onClose={closedDialog} title="Adjust Inventory">
        <div className="space-y-4">
          {adjustError && (
            <div className="rounded-lg bg-danger-soft border border-danger/20 px-3 py-2 text-sm text-danger">
              {adjustError}
            </div>
          )}
          <div>
            <label htmlFor="adjustModel" className="block text-sm font-medium text-foreground mb-1.5">
              Model
            </label>
            <select
              id="adjustModel"
              value={adjustModel}
              onChange={(e) => setAdjustModel(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.name} {m.size} — {m.available} available
                </option>
              ))}
            </select>
          </div>
          {adjustSelectedModel && (
            <p className="text-sm text-muted">
              Current available:{" "}
              <span className="font-semibold text-foreground">{adjustSelectedModel.available}</span>
            </p>
          )}
          <div>
            <label htmlFor="adjustQty" className="block text-sm font-medium text-foreground mb-1.5">
              Quantity to Remove
            </label>
            <input
              id="adjustQty"
              type="number"
              min={1}
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. 2"
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="adjustReason" className="block text-sm font-medium text-foreground mb-1.5">
              Reason
            </label>
            <input
              id="adjustReason"
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Given to external party"
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label htmlFor="adjustNotes" className="block text-sm font-medium text-foreground mb-1.5">
              Notes (optional)
            </label>
            <textarea
              id="adjustNotes"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            className="w-full"
            loading={pending}
            disabled={!adjustModel || !adjustQty || !adjustReason.trim()}
            onClick={handleAdjust}
          >
            Save Adjustment
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "muted" | "primary";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p
        className={cn(
          "text-2xl font-bold",
          tone === "success"
            ? "text-success"
            : tone === "primary"
            ? "text-primary"
            : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}