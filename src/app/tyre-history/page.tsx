import { db } from "@/lib/db";
import { TyreHistoryClient } from "./tyre-history-client";

export const dynamic = "force-dynamic";

export default async function TyreHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tyre?: string }>;
}) {
  const { tyre } = await searchParams;
  const initialTyreId = tyre ?? null;
  const [tyres, tyreModels, vehicles, drivers] = await Promise.all([
    db.tyre.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        tyreModel: { select: { id: true, brand: true, name: true, size: true } },
        vendor: { select: { id: true, name: true } },
        purchase: { select: { id: true, billNumber: true, purchaseDate: true } },
        currentVehicle: { select: { id: true, registrationNo: true } },
        currentPosition: { select: { id: true, displayName: true } },
        installations: {
          orderBy: { installedAt: "asc" },
          include: {
            vehicle: { select: { id: true, registrationNo: true } },
            position: { select: { id: true, displayName: true, shortCode: true } },
            driver: { select: { id: true, name: true } },
            removalReason: { select: { id: true, name: true } },
          },
        },
        lifecycleEvents: {
          orderBy: { occurredAt: "asc" },
        },
      },
    }),
    db.tyreModel.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: { id: true, brand: true, name: true, size: true },
    }),
    db.vehicle.findMany({
      where: { status: "ACTIVE" },
      orderBy: { registrationNo: "asc" },
      select: { id: true, registrationNo: true },
    }),
    db.driver.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serializedTyres = tyres.map((t) => ({
    ...t,
    unitPrice: t.unitPrice ? t.unitPrice.toString() : null,
  }));

  return (
    <TyreHistoryClient
      initialTyres={serializedTyres}
      tyreModels={tyreModels}
      vehicles={vehicles}
      drivers={drivers}
      initialTyreId={initialTyreId}
    />
  );
}