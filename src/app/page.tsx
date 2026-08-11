import { db } from "@/lib/db";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    vehicleCount,
    activeVehicleCount,
    tyreCounts,
    purchaseCount,
    tyreExpenditure,
    lowStockModels,
    recentActivity,
    incompleteVehicles,
  ] = await Promise.all([
    db.vehicle.count(),
    db.vehicle.count({ where: { status: "ACTIVE" } }),
    db.tyre.groupBy({
      by: ["status"],
      _count: { _all: true },
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

  const lowStock = lowStockModels
    .filter((m) => m._count.tyres < m.minStockLevel)
    .map((m) => ({
      id: m.id,
      brand: m.brand,
      name: m.name,
      size: m.size,
      minStockLevel: m.minStockLevel,
      available: m._count.tyres,
    }));

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
        installedTyres: countByStatus("INSTALLED"),
        removedTyres: countByStatus("REMOVED"),
        totalPurchases: purchaseCount,
        tyreExpenditure: tyreExpenditure._sum.finalAmount?.toString() ?? "0",
      }}
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