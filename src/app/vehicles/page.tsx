import { db } from "@/lib/db";
import { VehiclesClient } from "./vehicles-client";

export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const [vehicles, vehicleTypes, drivers] = await Promise.all([
    db.vehicle.findMany({
      orderBy: [{ status: "asc" }, { registrationNo: "asc" }],
      include: {
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
  ]);

  return (
    <VehiclesClient
      initialVehicles={vehicles}
      vehicleTypes={vehicleTypes}
      drivers={drivers}
      action={action}
    />
  );
}