import { db } from "@/lib/db";
import { VehicleConfigurationsClient } from "./vehicle-configurations-client";

export const dynamic = "force-dynamic";

export default async function VehicleConfigurationsPage() {
  const types = await db.vehicleType.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      axles: {
        orderBy: { sequence: "asc" },
        include: {
          positions: {
            orderBy: { sequence: "asc" },
          },
        },
      },
      _count: {
        select: { vehicles: true },
      },
    },
  });

  return <VehicleConfigurationsClient initialTypes={types} />;
}