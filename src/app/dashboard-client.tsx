"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface DashboardData {
  kpis: {
    totalVehicles: number;
    activeVehicles: number;
    availableTyres: number;
    installedTyres: number;
    removedTyres: number;
    totalPurchases: number;
    tyreExpenditure: string;
  };
  tyreStatus: {
    available: number;
    installed: number;
    removed: number;
    reserved: number;
    damaged: number;
  };
  tyresByModel: {
    id: string;
    brand: string;
    name: string;
    size: string;
    minStockLevel: number;
    available: number;
    installed: number;
    removed: number;
    other: number;
    total: number;
  }[];
  lowStock: {
    id: string;
    brand: string;
    name: string;
    size: string;
    minStockLevel: number;
    available: number;
  }[];
  incompleteVehicles: {
    id: string;
    registrationNo: string;
    vehicleTypeName: string;
    installed: number;
    expected: number;
  }[];
  recentActivity: {
    id: string;
    action: string;
    description: string;
    createdAt: string;
    tyreInternalId: string | null;
    vehicleRegistrationNo: string | null;
    purchaseBillNumber: string | null;
  }[];
}

const quickActions = [
  { label: "Purchase Tyres", href: "/purchases", icon: "shopping-cart" },
  { label: "Replace Tyre", href: "/vehicles?action=replace", icon: "refresh-cw" },
  { label: "Add Vehicle", href: "/vehicles", icon: "truck" },
  { label: "Add Driver", href: "/drivers", icon: "user" },
  { label: "Add Vendor", href: "/vendors", icon: "building-2" },
];

function SectionTitle({
  icon,
  title,
  action,
}: {
  icon: string;
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon name={icon} size={16} className="text-primary" />
        {title}
      </h2>
      {action && (
        <Link
          href={action.href}
          className="text-xs font-medium text-primary hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

function StatusBar({ tyreStatus }: { tyreStatus: DashboardData["tyreStatus"] }) {
  const segments = [
    { key: "available", label: "Available", color: "bg-success", value: tyreStatus.available },
    { key: "installed", label: "Installed", color: "bg-primary", value: tyreStatus.installed },
    { key: "removed", label: "Removed", color: "bg-warning", value: tyreStatus.removed },
    { key: "reserved", label: "Reserved", color: "bg-info", value: tyreStatus.reserved },
    { key: "damaged", label: "Worn/Damaged/Scrapped", color: "bg-danger", value: tyreStatus.damaged },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <p className="text-sm text-muted py-2">No tyres recorded yet.</p>;
  }

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted-soft"
        role="img"
        aria-label="Tyre status distribution"
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.key}
              className={s.color}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color} shrink-0`} aria-hidden="true" />
            <span className="text-muted truncate">{s.label}</span>
            <span className="font-semibold text-foreground ml-auto tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelInventory({ models }: { models: DashboardData["tyresByModel"] }) {
  const maxTotal = Math.max(1, ...models.map((m) => m.total));
  if (models.length === 0) {
    return <p className="text-sm text-muted py-2">No tyre models configured yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {models.map((m) => (
        <li key={m.id}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-foreground truncate">
              {m.brand} {m.name}
              <span className="text-xs font-normal text-muted"> · {m.size}</span>
            </p>
            <span className="text-xs text-muted tabular-nums shrink-0">
              {m.available} avail · {m.total} total
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted-soft">
            {m.available > 0 && (
              <div className="bg-success" style={{ width: `${(m.available / maxTotal) * 100}%` }} />
            )}
            {m.installed > 0 && (
              <div className="bg-primary" style={{ width: `${(m.installed / maxTotal) * 100}%` }} />
            )}
            {m.removed + m.other > 0 && (
              <div
                className="bg-warning"
                style={{ width: `${((m.removed + m.other) / maxTotal) * 100}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-muted">
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1" />
              Available {m.available}
            </span>
            <span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1" />
              Installed {m.installed}
            </span>
            {m.minStockLevel > 0 && <span>Min stock {m.minStockLevel}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function DashboardClient({
  kpis,
  tyreStatus,
  tyresByModel,
  lowStock,
  incompleteVehicles,
  recentActivity,
}: DashboardData) {
  const fleetUtilization =
    kpis.installedTyres + kpis.availableTyres + kpis.removedTyres === 0
      ? 0
      : Math.round(
          (kpis.installedTyres /
            (kpis.installedTyres + kpis.availableTyres + kpis.removedTyres)) *
            100
        );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-0.5">Fleet overview and tyre operations</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Vehicles" value={kpis.totalVehicles} icon="truck" tone="primary" sub={`${kpis.activeVehicles} active`} />
        <StatCard label="Available Tyres" value={kpis.availableTyres} icon="package" tone="success" />
        <StatCard label="Installed Tyres" value={kpis.installedTyres} icon="wrench" tone="primary" />
        <StatCard label="Removed Tyres" value={kpis.removedTyres} icon="history" tone="warning" />
        <StatCard label="Total Purchases" value={kpis.totalPurchases} icon="shopping-cart" />
        <StatCard label="Tyre Expenditure" value={formatCurrency(kpis.tyreExpenditure)} icon="indian-rupee" tone="danger" />
        <StatCard label="Fleet Utilization" value={`${fleetUtilization}%`} icon="gauge" sub="installed / total tyres" />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-surface hover:bg-muted-soft hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
                  <Icon name={action.icon} size={18} />
                </div>
                <span className="text-xs font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(lowStock.length > 0 || incompleteVehicles.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-warning-soft">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon name="alert-triangle" size={18} className="text-warning shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.brand} {m.name} ({m.size})
                    </p>
                    <p className="text-xs text-muted">
                      Low stock: {m.available} available, minimum {m.minStockLevel}
                    </p>
                  </div>
                </div>
                <Badge variant="warning">LOW STOCK</Badge>
              </div>
            ))}
            {incompleteVehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-info-soft">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon name="info" size={18} className="text-info shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {v.registrationNo} ({v.vehicleTypeName})
                    </p>
                    <p className="text-xs text-muted">
                      Incomplete configuration: {v.installed} of {v.expected} positions filled
                    </p>
                  </div>
                </div>
                <Link
                  href={`/vehicles/${v.id}`}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fleet overview + Inventory by model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionTitle icon="circle-dot" title="Tyre Status" action={{ label: "Inventory", href: "/inventory" }} />
            <StatusBar tyreStatus={tyreStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inventory by Model</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionTitle icon="package" title="Tyres by Model" action={{ label: "View inventory", href: "/inventory" }} />
            <ModelInventory models={tyresByModel} />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              No activity yet. Start by adding vehicles, vendors, and purchasing tyres.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((a) => (
                <li key={a.id} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="clock" size={14} className="text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.description}</p>
                    <p className="text-xs text-muted mt-0.5">{formatDateTime(a.createdAt)}</p>
                  </div>
                  {a.tyreInternalId && (
                    <Link
                      href={`/tyre-history?tyre=${encodeURIComponent(a.tyreInternalId)}`}
                      className="text-xs font-medium text-primary hover:underline shrink-0"
                    >
                      {a.tyreInternalId}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
