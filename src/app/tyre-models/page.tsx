import { db } from "@/lib/db";
import { TyreModelsClient } from "./tyre-models-client";

export const dynamic = "force-dynamic";

export default async function TyreModelsPage() {
  const [models, vehicleTypes] = await Promise.all([
    db.tyreModel.findMany({
      orderBy: [{ status: "asc" }, { brand: "asc" }, { name: "asc" }],
      include: {
        compatibleVehicleTypes: {
          include: { vehicleType: true },
        },
        _count: {
          select: { tyres: true },
        },
      },
    }),
    db.vehicleType.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <TyreModelsClient initialModels={models} vehicleTypes={vehicleTypes} />;
}