import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Ensures a vehicle has a company-fitted tyre installed at every active
 * position of its vehicle type.
 *
 * Business rule: vehicles arrive from the showroom with company-fitted
 * tyres. These initial tyres are NOT purchased through inventory and never
 * consume available stock. They are recorded as Tyre records with status
 * INSTALLED and no purchase link, exactly like the seed data.
 *
 * Idempotent: positions that already have a current installation are
 * skipped, so running this repeatedly never creates duplicates and never
 * disturbs replacement history.
 *
 * Accepts an optional transaction client so callers can wrap vehicle
 * creation + initial allocation in a single atomic transaction.
 */
export async function ensureVehicleTyres(
  vehicleId: string,
  client: Prisma.TransactionClient | typeof db = db
): Promise<{ created: number; total: number }> {
  const vehicle = await client.vehicle.findUnique({
    where: { id: vehicleId },
    include: { vehicleType: true, driver: true },
  });
  if (!vehicle) return { created: 0, total: 0 };

  // All active positions configured for this vehicle type.
  const positions = await client.tyrePosition.findMany({
    where: { vehicleTypeId: vehicle.vehicleTypeId, status: "ACTIVE" },
    orderBy: [{ axle: { sequence: "asc" } }, { sequence: "asc" }],
  });
  if (positions.length === 0) return { created: 0, total: 0 };

  // Positions that already hold a current tyre — never touched.
  const existing = await client.installation.findMany({
    where: { vehicleId: vehicle.id, isCurrent: true },
    select: { positionId: true },
  });
  const occupied = new Set(existing.map((i) => i.positionId));
  const missing = positions.filter((p) => !occupied.has(p.id));
  if (missing.length === 0) return { created: 0, total: positions.length };

  // Pick a default tyre model compatible with the vehicle type; fall back
  // to any active model so a freshly configured type still works.
  const compatible = await client.tyreModel.findFirst({
    where: {
      status: "ACTIVE",
      compatibleVehicleTypes: {
        some: { vehicleTypeId: vehicle.vehicleTypeId },
      },
    },
  });
  const defaultModel =
    compatible ??
    (await client.tyreModel.findFirst({ where: { status: "ACTIVE" } }));
  if (!defaultModel) return { created: 0, total: positions.length };

  const settings = await client.applicationSettings.findFirst();
  if (!settings) return { created: 0, total: positions.length };

  const prefix = settings.tyreIdPrefix || "TYR";
  let nextSeq = settings.tyreIdNextSeq;

  const run = async (tx: Prisma.TransactionClient) => {
    for (const pos of missing) {
      const internalId = `${prefix}-${String(nextSeq).padStart(6, "0")}`;
      nextSeq += 1;

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
          driverId: vehicle.driverId ?? null,
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
          description: `Company-fitted initial tyre on ${vehicle.registrationNo} at ${pos.displayName}`,
          installationId: installation.id,
        },
      });
    }

    await tx.applicationSettings.update({
      where: { id: settings.id },
      data: { tyreIdNextSeq: nextSeq },
    });
  };

  // If we were given an open transaction, run inside it; otherwise open one.
  if (client !== db) {
    await run(client as Prisma.TransactionClient);
  } else {
    await db.$transaction(run);
  }

  return { created: missing.length, total: positions.length };
}
