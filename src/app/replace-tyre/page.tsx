import { db } from "@/lib/db";
import { ReplaceTyreClient } from "./replace-tyre-client";

export const dynamic = "force-dynamic";

export default async function ReplaceTyrePage() {
  const [vehicles, availableTyres, reasons] = await Promise.all([
    db.vehicle.findMany({
      where: { status: "ACTIVE" },
      include: {
        vehicleType: {
          include: {
            tyrePositions: {
              where: { status: "ACTIVE" },
              orderBy: [{ axle: { sequence: "asc" } }, { sequence: "asc" }],
            },
          },
        },
        installations: {
          where: { isCurrent: true },
          include: { tyre: { include: { tyreModel: true } }, position: true },
        },
      },
      orderBy: { registrationNo: "asc" },
    }),
    db.tyre.findMany({
      where: { status: "AVAILABLE" },
      include: { tyreModel: true },
      orderBy: { createdAt: "asc" },
    }),
    db.removalReason.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const availableByModel = new Map<
    string,
    { modelId: string; brand: string; name: string; size: string; tyres: { id: string }[] }
  >();
  for (const tyre of availableTyres) {
    const key = tyre.tyreModelId;
    const existing = availableByModel.get(key);
    if (existing) {
      existing.tyres.push({ id: tyre.id });
    } else {
      availableByModel.set(key, {
        modelId: key,
        brand: tyre.tyreModel.brand,
        name: tyre.tyreModel.name,
        size: tyre.tyreModel.size,
        tyres: [{ id: tyre.id }],
      });
    }
  }

  const serializedVehicles = vehicles.map((v) => ({
    id: v.id,
    registrationNo: v.registrationNo,
    vehicleTypeName: v.vehicleType.name,
    tyreCount: v.vehicleType.tyreCount,
    positions: v.vehicleType.tyrePositions.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      shortCode: p.shortCode,
      positionType: p.positionType,
    })),
    current: v.installations.map((i) => ({
      positionId: i.positionId,
      tyreInternalId: i.tyre.internalId,
      tyreModel: `${i.tyre.tyreModel.brand} ${i.tyre.tyreModel.name}`,
      tyreSize: i.tyre.tyreModel.size,
      installedAt: i.installedAt.toISOString(),
    })),
  }));

  return (
    <ReplaceTyreClient
      vehicles={serializedVehicles}
      availableByModel={Array.from(availableByModel.values())}
      reasons={reasons.map((r) => ({ id: r.id, name: r.name }))}
    />
  );
}