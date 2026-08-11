"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/states";
import { formatDate, formatCurrency, formatKm, formatNumber } from "@/lib/format";
import type { TyreStatus, Side, PositionType } from "@/lib/types";
import { ReportToolbar, escapeHtml, type SortConfig } from "./report-export";

type PurchaseItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  total: string;
  tyreModel: { id: string; brand: string; name: string; size: string };
};

type Purchase = {
  id: string;
  billNumber: string;
  purchaseDate: Date | string;
  tax: string;
  discount: string;
  finalAmount: string;
  vendor: { id: string; name: string };
  items: PurchaseItem[];
};

type TyreModel = {
  id: string;
  brand: string;
  name: string;
  size: string;
  minStockLevel: number;
  status: string;
  _count: { tyres: number };
};

type VehicleTyre = {
  id: string;
  internalId: string;
  tyreModel: { id: string; brand: string; name: string; size: string };
  currentPositionId: string | null;
  installations: { id: string; installedAt: Date | string; odometer: number }[];
};

type Vehicle = {
  id: string;
  registrationNo: string;
  vehicleType: {
    id: string;
    name: string;
    tyrePositions: {
      id: string;
      displayName: string;
      shortCode: string;
      side: Side;
      positionType: PositionType;
    }[];
  };
  currentTyres: VehicleTyre[];
  installations: { id: string }[];
};

type TyreInstallation = {
  id: string;
  installedAt: Date | string;
  odometer: number;
  removedAt: Date | string | null;
  removalOdometer: number | null;
  vehicle: { id: string; registrationNo: string };
  position: { id: string; displayName: string };
  removalReason: { id: string; name: string } | null;
};

type Tyre = {
  id: string;
  internalId: string;
  status: TyreStatus;
  purchaseDate: Date | string | null;
  unitPrice: string | null;
  tyreModel: { id: string; brand: string; name: string; size: string };
  vendor: { id: string; name: string } | null;
  purchase: { id: string; billNumber: string; purchaseDate: Date | string } | null;
  installations: TyreInstallation[];
};

type ReportTab = "purchase" | "inventory" | "vehicle" | "lifecycle" | "expense";

const TABS: { id: ReportTab; label: string; icon: string }[] = [
  { id: "purchase", label: "Purchase", icon: "shopping-cart" },
  { id: "inventory", label: "Inventory", icon: "package" },
  { id: "vehicle", label: "Vehicle Tyres", icon: "truck" },
  { id: "lifecycle", label: "Lifecycle", icon: "history" },
  { id: "expense", label: "Expense", icon: "indian-rupee" },
];

const DEFAULT_SORT: Record<ReportTab, SortConfig> = {
  purchase: { key: "date", asc: false },
  inventory: { key: "name", asc: true },
  vehicle: { key: "regno", asc: true },
  lifecycle: { key: "id", asc: true },
  expense: { key: "vehicle", asc: true },
};

function sortRows<T>(rows: T[], key: (r: T) => number | string | Date, asc: boolean): T[] {
  const dir = asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

function htmlTable(headers: string[], rows: string[][], numCols: number[] = []): string {
  return `<table><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr>${rows
    .map(
      (r) =>
        `<tr>${r
          .map((c, i) => `<td${numCols.includes(i) ? ' class="num"' : ""}>${c}</td>`)
          .join("")}</tr>`
    )
    .join("")}</table>`;
}

function summaryHtml(items: { label: string; value: string }[]): string {
  return `<div class="summary">${items
    .map(
      (s) =>
        `<div><div class="lbl">${escapeHtml(s.label)}</div><div class="val">${escapeHtml(s.value)}</div></div>`
    )
    .join("")}</div>`;
}

export function ReportsClient({
  purchases,
  tyreModels,
  vehicles,
  tyres,
  businessName,
  logoPath,
}: {
  purchases: Purchase[];
  tyreModels: TyreModel[];
  vehicles: Vehicle[];
  tyres: Tyre[];
  businessName: string;
  logoPath: string | null;
}) {
  const [tab, setTab] = React.useState<ReportTab>("purchase");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sort, setSort] = React.useState<Record<ReportTab, SortConfig>>(DEFAULT_SORT);

  const setTabSort = (s: SortConfig) => setSort((prev) => ({ ...prev, [tab]: s }));

  const inRange = (date: Date | string | null | undefined) => {
    if (!date) return true;
    const d = new Date(date);
    if (fromDate && d < new Date(fromDate)) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };

  const dateSubtitle =
    fromDate || toDate ? `${fromDate || "start"} → ${toDate || "today"}` : undefined;

  return (
    <div>
      <PageHeader title="Reports" description="Real-time reports from your fleet data" />

      {/* Date range filter */}
      <Card className="mb-4">
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <label className="block flex-1">
            <span className="text-xs font-medium text-muted mb-1 block">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-muted mb-1 block">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </label>
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
              }}
              className="self-end h-10 px-3 rounded-lg border border-border text-sm text-muted hover:bg-muted-soft transition-colors"
            >
              Clear
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 h-9 px-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-white border border-border text-muted hover:bg-muted-soft"
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "purchase" && (
        <PurchaseReport
          purchases={purchases}
          inRange={inRange}
          fromDate={fromDate}
          toDate={toDate}
          sort={sort.purchase}
          onSortChange={setTabSort}
          businessName={businessName}
          logoPath={logoPath}
          dateSubtitle={dateSubtitle}
        />
      )}
      {tab === "inventory" && (
        <InventoryReport
          tyreModels={tyreModels}
          sort={sort.inventory}
          onSortChange={setTabSort}
          businessName={businessName}
          logoPath={logoPath}
        />
      )}
      {tab === "vehicle" && (
        <VehicleTyreReport
          vehicles={vehicles}
          sort={sort.vehicle}
          onSortChange={setTabSort}
          businessName={businessName}
          logoPath={logoPath}
        />
      )}
      {tab === "lifecycle" && (
        <LifecycleReport
          tyres={tyres}
          inRange={inRange}
          fromDate={fromDate}
          toDate={toDate}
          sort={sort.lifecycle}
          onSortChange={setTabSort}
          businessName={businessName}
          logoPath={logoPath}
          dateSubtitle={dateSubtitle}
        />
      )}
      {tab === "expense" && (
        <ExpenseReport
          vehicles={vehicles}
          sort={sort.expense}
          onSortChange={setTabSort}
          businessName={businessName}
          logoPath={logoPath}
        />
      )}
    </div>
  );
}

function PurchaseReport({
  purchases,
  inRange,
  fromDate,
  toDate,
  sort,
  onSortChange,
  businessName,
  logoPath,
  dateSubtitle,
}: {
  purchases: Purchase[];
  inRange: (d: Date | string | null | undefined) => boolean;
  fromDate: string;
  toDate: string;
  sort: SortConfig;
  onSortChange: (s: SortConfig) => void;
  businessName: string;
  logoPath: string | null;
  dateSubtitle?: string;
}) {
  const filtered = purchases.filter((p) => inRange(p.purchaseDate));
  const totalAmount = filtered.reduce((sum, p) => sum + parseFloat(p.finalAmount), 0);
  const totalQty = filtered.reduce(
    (sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const sortOptions = [
    { key: "date", label: "Date" },
    { key: "amount", label: "Amount" },
    { key: "vendor", label: "Vendor" },
    { key: "bill", label: "Bill No" },
  ];
  const getKey = (p: Purchase): number | string | Date => {
    switch (sort.key) {
      case "amount":
        return parseFloat(p.finalAmount);
      case "vendor":
        return p.vendor.name.toLowerCase();
      case "bill":
        return p.billNumber.toLowerCase();
      default:
        return new Date(p.purchaseDate).getTime();
    }
  };
  const sorted = sortRows(filtered, getKey, sort.asc);

  const contentHtml =
    summaryHtml([
      { label: "Purchases", value: formatNumber(sorted.length) },
      { label: "Total Amount", value: formatCurrency(totalAmount) },
      { label: "Total Tyres", value: formatNumber(totalQty) },
    ]) +
    htmlTable(
      ["Bill No", "Vendor", "Date", "Items", "Total"],
      sorted.map((p) => [
        escapeHtml(`Bill ${p.billNumber}`),
        escapeHtml(p.vendor.name),
        escapeHtml(formatDate(p.purchaseDate)),
        escapeHtml(
          p.items
            .map(
              (i) =>
                `${i.tyreModel.brand} ${i.tyreModel.name} ×${i.quantity} @ ${formatCurrency(i.unitPrice)}`
            )
            .join("; ")
        ),
        escapeHtml(formatCurrency(p.finalAmount)),
      ]),
      [4]
    );

  return (
    <div className="space-y-4">
      <ReportToolbar
        title="Purchase Report"
        businessName={businessName}
        logo={logoPath}
        subtitle={dateSubtitle}
        contentHtml={contentHtml}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={onSortChange}
      />
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Purchases" value={formatNumber(sorted.length)} icon="shopping-cart" />
        <SummaryCard label="Total Amount" value={formatCurrency(totalAmount)} icon="indian-rupee" />
        <SummaryCard label="Total Tyres" value={formatNumber(totalQty)} icon="package" />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="shopping-cart" title="No purchases found" description="Adjust the date range or add purchases." />
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <Card key={p.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">Bill {p.billNumber}</p>
                    <p className="text-sm text-muted">{p.vendor.name}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(p.finalAmount)}</p>
                </div>
                <p className="text-xs text-muted mt-1">{formatDate(p.purchaseDate)}</p>
                <div className="mt-3 space-y-1.5">
                  {p.items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted">
                        {i.tyreModel.brand} {i.tyreModel.name} · {i.tyreModel.size}
                      </span>
                      <span className="text-muted">
                        {i.quantity} × {formatCurrency(i.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted">
                    Tax {formatCurrency(p.tax)} · Discount {formatCurrency(p.discount)}
                  </span>
                  <span className="font-medium text-foreground">{formatCurrency(p.finalAmount)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryReport({
  tyreModels,
  sort,
  onSortChange,
  businessName,
  logoPath,
}: {
  tyreModels: TyreModel[];
  sort: SortConfig;
  onSortChange: (s: SortConfig) => void;
  businessName: string;
  logoPath: string | null;
}) {
  const totalTyres = tyreModels.reduce((sum, m) => sum + m._count.tyres, 0);
  const sortOptions = [
    { key: "name", label: "Model" },
    { key: "total", label: "Total Tyres" },
  ];
  const getKey = (m: TyreModel): number | string => {
    if (sort.key === "total") return m._count.tyres;
    return `${m.brand} ${m.name}`.toLowerCase();
  };
  const sorted = sortRows(tyreModels, getKey, sort.asc);

  const contentHtml =
    summaryHtml([{ label: "Total Tyres", value: formatNumber(totalTyres) }]) +
    htmlTable(
      ["Model", "Size", "Total", "Min Stock", "Status"],
      sorted.map((m) => [
        escapeHtml(`${m.brand} ${m.name}`),
        escapeHtml(m.size),
        formatNumber(m._count.tyres),
        formatNumber(m.minStockLevel),
        escapeHtml(m.status),
      ]),
      [2, 3]
    );

  return (
    <div className="space-y-4">
      <ReportToolbar
        title="Inventory Report"
        businessName={businessName}
        logo={logoPath}
        contentHtml={contentHtml}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={onSortChange}
      />
      <SummaryCard label="Total Tyres" value={formatNumber(totalTyres)} icon="package" />
      {sorted.length === 0 ? (
        <EmptyState icon="package" title="No tyre models" description="Add tyre models to see inventory reports." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Min Stock</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      {m.brand} {m.name}
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{m.size}</td>
                    <td className="py-2.5 pr-3 text-right">{formatNumber(m._count.tyres)}</td>
                    <td className="py-2.5 pr-3 text-right">{formatNumber(m.minStockLevel)}</td>
                    <td className="py-2.5 text-right">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VehicleTyreReport({
  vehicles,
  sort,
  onSortChange,
  businessName,
  logoPath,
}: {
  vehicles: Vehicle[];
  sort: SortConfig;
  onSortChange: (s: SortConfig) => void;
  businessName: string;
  logoPath: string | null;
}) {
  const sorted = sortRows(vehicles, (v) => v.registrationNo.toLowerCase(), sort.asc);
  const sortOptions = [{ key: "regno", label: "Vehicle" }];

  const contentHtml = sorted
    .map(
      (v) =>
        `<h3>${escapeHtml(v.registrationNo)} — ${escapeHtml(v.vehicleType.name)} (${
          v.currentTyres.length
        } of ${v.vehicleType.tyrePositions.length} filled)</h3>` +
        htmlTable(
          ["Position", "Tyre", "Model", "Installed", "Odometer"],
          v.vehicleType.tyrePositions.map((pos) => {
            const tyre = v.currentTyres.find((t) => t.currentPositionId === pos.id);
            return [
              escapeHtml(`${pos.displayName} (${pos.shortCode})`),
              tyre ? escapeHtml(tyre.internalId) : "—",
              tyre
                ? escapeHtml(`${tyre.tyreModel.brand} ${tyre.tyreModel.name} · ${tyre.tyreModel.size}`)
                : "—",
              tyre?.installations[0] ? escapeHtml(formatDate(tyre.installations[0].installedAt)) : "—",
              tyre?.installations[0] ? escapeHtml(formatKm(tyre.installations[0].odometer)) : "—",
            ];
          }),
          [4]
        )
    )
    .join("");

  return (
    <div className="space-y-4">
      <ReportToolbar
        title="Vehicle Tyre Report"
        businessName={businessName}
        logo={logoPath}
        contentHtml={contentHtml}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={onSortChange}
      />
      {sorted.length === 0 ? (
        <EmptyState icon="truck" title="No vehicles" description="Add vehicles to see tyre reports." />
      ) : (
        sorted.map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <CardTitle>{v.registrationNo}</CardTitle>
              <p className="text-sm text-muted">
                {v.vehicleType.name} · {v.currentTyres.length} of {v.vehicleType.tyrePositions.length} positions filled
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                    <th className="py-2 pr-3">Position</th>
                    <th className="py-2 pr-3">Tyre</th>
                    <th className="py-2 pr-3">Model</th>
                    <th className="py-2 pr-3">Installed</th>
                    <th className="py-2 text-right">Odometer</th>
                  </tr>
                </thead>
                <tbody>
                  {v.vehicleType.tyrePositions.map((pos) => {
                    const tyre = v.currentTyres.find((t) => t.currentPositionId === pos.id);
                    return (
                      <tr key={pos.id} className="border-b border-border last:border-0">
                        <td className="py-2.5 pr-3 font-medium text-foreground">
                          {pos.displayName}
                          <span className="text-xs text-muted ml-1">({pos.shortCode})</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {tyre ? (
                            <span className="font-medium text-primary">{tyre.internalId}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">
                          {tyre
                            ? `${tyre.tyreModel.brand} ${tyre.tyreModel.name} · ${tyre.tyreModel.size}`
                            : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">
                          {tyre?.installations[0] ? formatDate(tyre.installations[0].installedAt) : "—"}
                        </td>
                        <td className="py-2.5 text-right text-muted">
                          {tyre?.installations[0] ? formatKm(tyre.installations[0].odometer) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function LifecycleReport({
  tyres,
  inRange,
  fromDate,
  toDate,
  sort,
  onSortChange,
  businessName,
  logoPath,
  dateSubtitle,
}: {
  tyres: Tyre[];
  inRange: (d: Date | string | null | undefined) => boolean;
  fromDate: string;
  toDate: string;
  sort: SortConfig;
  onSortChange: (s: SortConfig) => void;
  businessName: string;
  logoPath: string | null;
  dateSubtitle?: string;
}) {
  const filtered = tyres.filter((t) => inRange(t.purchaseDate));
  const withKm = (t: Tyre) => ({
    tyre: t,
    totalKm: t.installations.reduce(
      (sum, i) => sum + ((i.removalOdometer ?? 0) - i.odometer),
      0
    ),
  });
  const sortOptions = [
    { key: "id", label: "Tyre ID" },
    { key: "model", label: "Model" },
    { key: "distance", label: "Total distance" },
  ];
  const getKey = (r: { tyre: Tyre; totalKm: number }): number | string => {
    if (sort.key === "model") return `${r.tyre.tyreModel.brand} ${r.tyre.tyreModel.name}`.toLowerCase();
    if (sort.key === "distance") return r.totalKm;
    return r.tyre.internalId.toLowerCase();
  };
  const sorted = sortRows(filtered.map(withKm), getKey, sort.asc);

  const contentHtml =
    summaryHtml([
      { label: "Tyres", value: formatNumber(sorted.length) },
      { label: "Total distance", value: formatKm(sorted.reduce((s, r) => s + r.totalKm, 0)) },
    ]) +
    htmlTable(
      ["Tyre", "Status", "Model", "Purchased", "Vendor", "Bill", "Total distance"],
      sorted.map(({ tyre: t, totalKm }) => [
        escapeHtml(t.internalId),
        escapeHtml(t.status),
        escapeHtml(`${t.tyreModel.brand} ${t.tyreModel.name} · ${t.tyreModel.size}`),
        escapeHtml(formatDate(t.purchaseDate)),
        escapeHtml(t.vendor?.name ?? "—"),
        escapeHtml(t.purchase?.billNumber ?? "—"),
        escapeHtml(formatKm(totalKm)),
      ]),
      [6]
    );

  return (
    <div className="space-y-4">
      <ReportToolbar
        title="Lifecycle Report"
        businessName={businessName}
        logo={logoPath}
        subtitle={dateSubtitle}
        contentHtml={contentHtml}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={onSortChange}
      />
      {sorted.length === 0 ? (
        <EmptyState icon="history" title="No tyres found" description="Adjust the date range or purchase tyres." />
      ) : (
        <div className="space-y-3">
          {sorted.map(({ tyre: t, totalKm }) => (
            <Card key={t.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{t.internalId}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-sm text-muted mt-0.5">
                      {t.tyreModel.brand} {t.tyreModel.name} · {t.tyreModel.size}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatCurrency(t.unitPrice)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
                  <InfoCell label="Purchased" value={formatDate(t.purchaseDate)} />
                  <InfoCell label="Vendor" value={t.vendor?.name ?? "—"} />
                  <InfoCell label="Bill" value={t.purchase?.billNumber ?? "—"} />
                  <InfoCell label="Total distance" value={formatKm(totalKm)} />
                </div>
                {t.installations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {t.installations.map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted">
                          {i.vehicle.registrationNo} · {i.position.displayName}
                        </span>
                        <span className="text-muted">
                          {formatDate(i.installedAt)}
                          {i.removedAt ? ` → ${formatDate(i.removedAt)}` : " → now"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseReport({
  vehicles,
  sort,
  onSortChange,
  businessName,
  logoPath,
}: {
  vehicles: Vehicle[];
  sort: SortConfig;
  onSortChange: (s: SortConfig) => void;
  businessName: string;
  logoPath: string | null;
}) {
  const rows = vehicles.map((v) => {
    const replacementCount = v.installations.length;
    return { vehicle: v, replacementCount };
  });
  const sorted = sortRows(rows, (r) => r.vehicle.registrationNo.toLowerCase(), sort.asc);
  const sortOptions = [{ key: "vehicle", label: "Vehicle" }];

  const contentHtml =
    summaryHtml([{ label: "Total Vehicles", value: formatNumber(sorted.length) }]) +
    htmlTable(
      ["Vehicle", "Type", "Current Tyres", "Replacements"],
      sorted.map((r) => [
        escapeHtml(r.vehicle.registrationNo),
        escapeHtml(r.vehicle.vehicleType.name),
        formatNumber(r.vehicle.currentTyres.length),
        formatNumber(r.replacementCount),
      ]),
      [2, 3]
    );

  return (
    <div className="space-y-4">
      <ReportToolbar
        title="Expense Report"
        businessName={businessName}
        logo={logoPath}
        contentHtml={contentHtml}
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={onSortChange}
      />
      <SummaryCard label="Total Vehicles" value={formatNumber(sorted.length)} icon="truck" />
      {sorted.length === 0 ? (
        <EmptyState icon="truck" title="No vehicles" description="Add vehicles to see expense reports." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="py-2 pr-3">Vehicle</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3 text-right">Current Tyres</th>
                  <th className="py-2 pr-3 text-right">Replacements</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.vehicle.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-foreground">{r.vehicle.registrationNo}</td>
                    <td className="py-2.5 pr-3 text-muted">{r.vehicle.vehicleType.name}</td>
                    <td className="py-2.5 pr-3 text-right">{formatNumber(r.vehicle.currentTyres.length)}</td>
                    <td className="py-2.5 text-right">{formatNumber(r.replacementCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
          <Icon name={icon} size={16} />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground mt-2">{value}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}