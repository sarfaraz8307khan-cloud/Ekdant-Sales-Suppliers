import { db } from "@/lib/db";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const tyres = await db.tyre.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      tyreModel: { select: { id: true, brand: true, name: true, size: true } },
      vendor: { select: { id: true, name: true } },
      purchase: { select: { id: true, billNumber: true } },
      currentVehicle: { select: { id: true, registrationNo: true } },
      currentPosition: { select: { id: true, displayName: true } },
    },
  });

  const serializedTyres = tyres.map((t) => ({
    ...t,
    unitPrice: t.unitPrice ? t.unitPrice.toString() : null,
  }));

  return <InventoryClient initialTyres={serializedTyres} />;
}