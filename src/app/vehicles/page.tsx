import { db } from "@/lib/db";
import { VehiclesClient } from "./vehicles-client";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const [vehicles, vehicleTypes, drivers, currentByVehicle, positionCounts] =
    await Promise.all([
      db.vehicle.findMany({
        orderBy: [{ status: "asc" }, { registrationNo: "asc" }],
        select: {
          id: true,
          registrationNo: true,
          vehicleTypeId: true,
          currentOdometer: true,
          status: true,
          vehicleDate: true,
          location: true,
          notes: true,
          vehicleType: { select: { id: true, name: true, tyreCount: true } },
          driver: { select: { id: true, name: true } },
          _count: { select: { installations: true } },
        },
      }),
      db.vehicleType.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, tyreCount: true },
      }),
      db.driver.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.installation.groupBy({
        by: ["vehicleId"],
        where: { isCurrent: true },
        _count: { _all: true },
      }),
      db.tyrePosition.groupBy({
        by: ["vehicleTypeId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
    ]);

  const currentMap = new Map(
    currentByVehicle.map((g) => [g.vehicleId, g._count._all])
  );
  const positionMap = new Map(
    positionCounts.map((g) => [g.vehicleTypeId, g._count._all])
  );

  const incompleteVehicleIds = vehicles
    .filter(
      (v) =>
        (currentMap.get(v.id) ?? 0) < (positionMap.get(v.vehicleTypeId) ?? 0)
    )
    .map((v) => v.id);

  // Serialize dates so the client receives plain ISO strings (RSC-safe).
  const serializedVehicles = vehicles.map((v) => ({
    ...v,
    vehicleDate: v.vehicleDate.toISOString(),
  }));

  return (
    <VehiclesClient
      initialVehicles={serializedVehicles}
      vehicleTypes={vehicleTypes}
      drivers={drivers}
      incompleteVehicleIds={incompleteVehicleIds}
      action={action}
    />
  );
}