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
  { label: "Install Tyre", href: "/vehicles?action=install", icon: "wrench" },
  { label: "Replace Tyre", href: "/vehicles?action=replace", icon: "refresh-cw" },
  { label: "Add Vehicle", href: "/vehicles", icon: "truck" },
  { label: "Add Driver", href: "/drivers", icon: "user" },
  { label: "Add Vendor", href: "/vendors", icon: "building-2" },
];

export function DashboardClient({ kpis, lowStock, incompleteVehicles, recentActivity }: DashboardData) {
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
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-white hover:bg-muted-soft transition-colors text-center"
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