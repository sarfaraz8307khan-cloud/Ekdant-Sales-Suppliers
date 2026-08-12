import { db } from "@/lib/db";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [models, modelsWithCounts, removalHistory] = await Promise.all([
    db.tyreModel.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
    }),
    db.tyre.groupBy({
      by: ["tyreModelId", "status"],
      _count: { _all: true },
    }),
    db.installation.findMany({
      where: { isCurrent: false, removedAt: { not: null } },
      orderBy: { removedAt: "desc" },
      take: 100,
      include: {
        tyre: { include: { tyreModel: { select: { id: true, brand: true, name: true, size: true } } } },
        vehicle: { select: { id: true, registrationNo: true } },
        position: { select: { displayName: true } },
      },
    }),
  ]);

  const removalItems = removalHistory
    .filter((r) => r.removedAt)
    .map((r) => ({
      id: r.id,
      tyreModel: `${r.tyre.tyreModel.brand} ${r.tyre.tyreModel.name} ${r.tyre.tyreModel.size}`.trim(),
      vehicleReg: r.vehicle.registrationNo,
      position: r.position.displayName,
      removedAt: (r.removedAt as Date).toISOString(),
      odometer: r.removalOdometer,
    }));

  const summary = models.map((m) => {
    const counts = modelsWithCounts.filter((c) => c.tyreModelId === m.id);
    const countFor = (status: string) =>
      counts.find((c) => c.status === status)?._count._all ?? 0;
    const available = countFor("AVAILABLE");
    const removed =
      countFor("REMOVED") + countFor("WORN_OUT") + countFor("DAMAGED") + countFor("SCRAPPED");
    const total = counts.reduce((sum, c) => sum + c._count._all, 0);
    const lowStock = available > 0 && available < m.minStockLevel;
    const outOfStock = available === 0 && total > 0;
    return {
      id: m.id,
      brand: m.brand,
      name: m.name,
      size: m.size,
      minStockLevel: m.minStockLevel,
      available,
      removed,
      total,
      lowStock: lowStock || outOfStock,
    };
  });

  return (
    <InventoryClient
      models={summary}
      removalItems={removalItems}
      lowStockThresholds={summary
        .filter((s) => s.lowStock)
        .map((s) => ({ modelId: s.id, available: s.available, minimum: s.minStockLevel }))}
    />
  );
}