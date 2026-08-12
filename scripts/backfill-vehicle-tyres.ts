import { db } from "../src/lib/db";

async function backfill() {
  const vehicles = await db.vehicle.findMany({
    include: { vehicleType: true, driver: true },
  });
  for (const vehicle of vehicles) {
    // Skip if vehicle already has any installation
    const installations = await db.installation.findMany({
      where: { vehicleId: vehicle.id },
    });
    if (installations.length > 0) continue;
    // Initialize tyres
    await initializeVehicleTyres(vehicle.id);
  }
}

async function initializeVehicleTyres(vehicleId: string) {
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    include: { vehicleType: true, driver: true },
  });
  if (!vehicle) return;
  const positions = await db.tyrePosition.findMany({
    where: { vehicleTypeId: vehicle.vehicleTypeId },
  });
  if (positions.length === 0) return;
  const settings = await db.applicationSettings.findFirst();
  if (!settings) return;
  let nextSeq = settings.tyreIdNextSeq;
  const defaultModel = await db.tyreModel.findFirst({
    where: {
      compatibleVehicleTypes: {
        some: { vehicleTypeId: vehicle.vehicleTypeId },
      },
    },
  });
  if (!defaultModel) return;
  await db.$transaction(async (tx) => {
    for (const pos of positions) {
      const existing = await tx.installation.findFirst({
        where: { vehicleId: vehicle.id, positionId: pos.id, isCurrent: true },
      });
      if (existing) continue;
      const internalId = `TYR-${String(nextSeq).padStart(6, "0")}`;
      nextSeq++;
      const tyre = await tx.tyre.create({
        data: {
          internalId,
          tyreModelId: defaultModel.id,
          status: "INSTALLED",
          currentVehicleId: vehicle.id,
          currentPositionId: pos.id,
          currentInstallationId: null,
        },
      });
      const installation = await tx.installation.create({
        data: {
          tyreId: tyre.id,
          vehicleId: vehicle.id,
          positionId: pos.id,
          driverId: vehicle.driver?.id ?? null,
          installedAt: new Date(),
          odometer: vehicle.currentOdometer,
          isCurrent: true,
        },
      });
      await tx.tyre.update({
        where: { id: tyre.id },
        data: { currentInstallationId: installation.id },
      });
      await tx.tyreLifecycleEvent.create({
        data: {
          tyreId: tyre.id,
          type: "INSTALLED",
          description: `Initial installation on ${vehicle.registrationNo}`,
          installationId: installation.id,
        },
      });
    }
    await tx.applicationSettings.update({
      where: { id: settings.id },
      data: { tyreIdNextSeq: nextSeq },
    });
  });
}

backfill()
  .then(() => {
    console.log("Backfill completed");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
