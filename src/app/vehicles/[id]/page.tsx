import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { VehicleDetailClient } from "./vehicle-detail-client";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const { id } = await params;
  const { action } = await searchParams;

  const vehicle = await db.vehicle.findUnique({
    where: { id },
    include: {
      vehicleType: {
        include: {
          axles: {
            where: { status: "ACTIVE" },
            orderBy: { sequence: "asc" },
            include: {
              positions: {
                where: { status: "ACTIVE" },
                orderBy: { sequence: "asc" },
              },
            },
          },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });

  if (!vehicle) notFound();

  const [currentInstallations, availableTyres, drivers, removalReasons] =
    await Promise.all([
      db.installation.findMany({
        where: { vehicleId: vehicle.id, isCurrent: true },
        include: {
          tyre: {
            select: {
              id: true,
              internalId: true,
              status: true,
              purchaseId: true,
              tyreModel: { select: { id: true, brand: true, name: true, size: true } },
            },
          },
          driver: { select: { id: true, name: true } },
        },
      }),
      db.tyre.findMany({
        where: { status: "AVAILABLE" },
        orderBy: { internalId: "asc" },
        include: {
          tyreModel: {
            include: { compatibleVehicleTypes: true },
          },
        },
      }),
      db.driver.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.removalReason.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const positions = vehicle.vehicleType.axles.flatMap((axle) =>
    axle.positions.map((p) => ({
      id: p.id,
      positionId: p.positionId,
      displayName: p.displayName,
      shortCode: p.shortCode,
      side: p.side,
      sequence: p.sequence,
      positionType: p.positionType,
      axle: {
        id: axle.id,
        axleNumber: axle.axleNumber,
        name: axle.name,
        sequence: axle.sequence,
      },
    }))
  );

  const currentByPosition = new Map(
    currentInstallations.map((inst) => [inst.positionId, inst])
  );

  const layout = positions.map((pos) => {
    const inst = currentByPosition.get(pos.id);
    return {
      ...pos,
      currentTyre: inst
        ? {
            id: inst.tyre.id,
            internalId: inst.tyre.internalId,
            status: inst.tyre.status,
            // A tyre with no purchase link is a company-fitted (factory) tyre
            factoryFitted: inst.tyre.purchaseId === null,
            tyreModel: inst.tyre.tyreModel,
            currentInstallation: {
              id: inst.id,
              installedAt: inst.installedAt,
              odometer: inst.odometer,
              driver: inst.driver,
            },
          }
        : null,
    };
  });

  const serializedAvailableTyres = availableTyres.map((t) => ({
    id: t.id,
    internalId: t.internalId,
    status: t.status,
    tyreModel: {
      id: t.tyreModel.id,
      brand: t.tyreModel.brand,
      name: t.tyreModel.name,
      size: t.tyreModel.size,
      compatibleVehicleTypeIds: t.tyreModel.compatibleVehicleTypes.map(
        (c) => c.vehicleTypeId
      ),
    },
  }));

  return (
    <VehicleDetailClient
      vehicle={{
        id: vehicle.id,
        registrationNo: vehicle.registrationNo,
        currentOdometer: vehicle.currentOdometer,
        status: vehicle.status,
        vehicleDate: vehicle.vehicleDate.toISOString(),
        location: vehicle.location,
        notes: vehicle.notes,
        vehicleType: {
          id: vehicle.vehicleType.id,
          name: vehicle.vehicleType.name,
          tyreCount: vehicle.vehicleType.tyreCount,
        },
        driver: vehicle.driver,
      }}
      layout={layout}
      availableTyres={serializedAvailableTyres}
      drivers={drivers}
      removalReasons={removalReasons}
      action={action}
    />
  );
}