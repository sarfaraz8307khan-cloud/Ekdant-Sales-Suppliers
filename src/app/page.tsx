import { db } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    vehicleCount,
    activeVehicleCount,
    tyreCounts,
    installedFromInventory,
    purchaseCount,
    tyreExpenditure,
    lowStockModels,
    modelStock,
    recentActivity,
    incompleteVehicles,
  ] = await Promise.all([
    db.vehicle.count(),
    db.vehicle.count({ where: { status: "ACTIVE" } }),
    db.tyre.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    // "Installed" on the dashboard means tyres that were changed from
    // purchased inventory (replacement tyres). Company-fitted factory tyres
    // arrive with the vehicle (no purchase link) and never interact with
    // inventory, so they are excluded here.
    db.tyre.count({
      where: {
        status: "INSTALLED",
        purchaseId: { not: null },
      },
    }),
    db.purchase.count(),
    db.purchase.aggregate({
      _sum: { finalAmount: true },
    }),
    db.tyreModel.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: {
          select: {
            tyres: {
              where: { status: "AVAILABLE" },
            },
          },
        },
        // Only purchased (inventory) tyres count towards low-stock alerts —
        // factory-fitted tyres are not stock and should not trigger them.
        tyres: {
          where: { purchaseId: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.tyreModel.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        brand: true,
        name: true,
        size: true,
        minStockLevel: true,
        // Dashboard "Tyres by Model" reflects INVENTORY only — factory-fitted
        // tyres (no purchase link) are excluded entirely, so a brand-new fleet
        // with no stock shows 0/0 rather than phantom totals.
        tyres: {
          where: { purchaseId: { not: null } },
          select: { status: true, purchaseId: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        tyre: { select: { id: true, internalId: true } },
        vehicle: { select: { id: true, registrationNo: true } },
        purchase: { select: { id: true, billNumber: true } },
      },
    }),
    db.vehicle.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        registrationNo: true,
        vehicleType: {
          select: {
            id: true,
            name: true,
            tyreCount: true,
            tyrePositions: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        },
        currentTyres: {
          where: { status: "INSTALLED" },
          select: { id: true },
        },
      },
    }),
  ]);

  const countByStatus = (status: string) =>
    tyreCounts.find((t) => t.status === status)?._count._all ?? 0;

  // Low-stock alerts only make sense for models that actually have tyre
  // records — a brand-new model with zero stock history is not "low", it is
  // simply not stocked yet (keeps a fresh database looking clean).
  const lowStock = lowStockModels
    .filter((m) => m.tyres.length > 0 && m._count.tyres < m.minStockLevel)
    .map((m) => ({
      id: m.id,
      brand: m.brand,
      name: m.name,
      size: m.size,
      minStockLevel: m.minStockLevel,
      available: m._count.tyres,
    }));

  const tyresByModel = modelStock.map((m) => {
    const byStatus = new Map<string, number>();
    for (const t of m.tyres) {
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    }
    return {
      id: m.id,
      brand: m.brand,
      name: m.name,
      size: m.size,
      minStockLevel: m.minStockLevel,
      available: byStatus.get("AVAILABLE") ?? 0,
      installed: byStatus.get("INSTALLED") ?? 0,
      removed: byStatus.get("REMOVED") ?? 0,
      other:
        (byStatus.get("WORN_OUT") ?? 0) +
        (byStatus.get("DAMAGED") ?? 0) +
        (byStatus.get("SCRAPPED") ?? 0) +
        (byStatus.get("RESERVED") ?? 0),
      total: m.tyres.length,
    };
  });

  const incomplete = incompleteVehicles
    .filter(
      (v) =>
        v.currentTyres.length < v.vehicleType.tyrePositions.length ||
        v.vehicleType.tyrePositions.length === 0
    )
    .map((v) => ({
      id: v.id,
      registrationNo: v.registrationNo,
      vehicleTypeName: v.vehicleType.name,
      installed: v.currentTyres.length,
      expected: v.vehicleType.tyrePositions.length,
    }));

  return (
    <DashboardClient
      kpis={{
        totalVehicles: vehicleCount,
        activeVehicles: activeVehicleCount,
        availableTyres: countByStatus("AVAILABLE"),
        installedTyres: installedFromInventory,
        removedTyres: countByStatus("REMOVED"),
        totalPurchases: purchaseCount,
        tyreExpenditure: tyreExpenditure._sum.finalAmount?.toString() ?? "0",
      }}
      tyreStatus={{
        available: countByStatus("AVAILABLE"),
        installed: installedFromInventory,
        removed: countByStatus("REMOVED"),
        reserved: countByStatus("RESERVED"),
        damaged: countByStatus("DAMAGED") + countByStatus("WORN_OUT") + countByStatus("SCRAPPED"),
      }}
      tyresByModel={tyresByModel}
      lowStock={lowStock}
      incompleteVehicles={incomplete}
      recentActivity={recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
        tyreInternalId: a.tyre?.internalId ?? null,
        vehicleRegistrationNo: a.vehicle?.registrationNo ?? null,
        purchaseBillNumber: a.purchase?.billNumber ?? null,
      }))}
    />
  );
}
