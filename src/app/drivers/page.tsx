import { db } from "@/lib/db";
import { DriversClient } from "./drivers-client";

export const dynamic = "force-dynamic";

export default async function DriversPage() {
  const drivers = await db.driver.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { vehicles: true, installations: true },
      },
    },
  });

  return <DriversClient initialDrivers={drivers} />;
}