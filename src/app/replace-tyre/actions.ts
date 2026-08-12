"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

type ActionResult = { ok: true } | { ok: false; errors: Record<string, string> };

function err(errors: Record<string, string>): ActionResult {
  return { ok: false, errors };
}

/** Carries a field-specific business error to the UI without leaking technical details. */
class ServiceError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.field = field;
  }
}

function validateOdometer(
  reading: number,
  currentOdometer: number,
  override: boolean | undefined,
  overrideReason: string | undefined
): string | null {
  if (reading < 0) return "Odometer cannot be negative";
  if (reading < currentOdometer) {
    if (override === true && overrideReason?.trim()) return null;
    return `Odometer reading (${reading.toLocaleString("en-IN")} km) is below the vehicle's current reading (${currentOdometer.toLocaleString("en-IN")} km). Enter a reading equal to or greater than the current odometer.`;
  }
  return null;
}

export type ReplaceTyreInput = {
  vehicleId: string;
  positionId: string;
  tyreId: string;
  removedReasonId?: string;
  removedAt: string;
  odometer: number;
  notes?: string;
  odometerOverride?: boolean;
  odometerOverrideReason?: string;
};

export async function replaceTyre(input: ReplaceTyreInput): Promise<ActionResult> {
  const errors: Record<string, string> = {};
  if (!input.vehicleId) errors.vehicleId = "Vehicle is required";
  if (!input.positionId) errors.positionId = "Location is required";
  if (!input.tyreId) errors.tyreId = "Replacement tyre is required";
  if (!input.removedAt) errors.removedAt = "Replacement date is required";
  if (!input.removedReasonId) errors.removedReasonId = "Replacement reason is required";
  if (input.odometer === undefined || input.odometer === null || isNaN(input.odometer)) {
    errors.odometer = "Odometer is required";
  }
  if (Object.keys(errors).length > 0) return err(errors);

  const removalDate = new Date(input.removedAt);
  if (isNaN(removalDate.getTime())) return err({ removedAt: "Invalid replacement date" });

  const reason = await db.removalReason.findUnique({ where: { id: input.removedReasonId } });
  if (!reason || reason.status !== "ACTIVE") {
    return err({ removedReasonId: "The selected reason is invalid." });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { vehicleType: true },
      });
      if (!vehicle) throw new ServiceError("vehicleId", "Vehicle not found.");
      if (vehicle.status !== "ACTIVE") {
        throw new ServiceError("vehicleId", "This vehicle is deactivated and cannot receive tyres.");
      }

      const position = await tx.tyrePosition.findUnique({ where: { id: input.positionId } });
      if (!position || position.status !== "ACTIVE") {
        throw new ServiceError("positionId", "The selected location is not active.");
      }
      if (position.vehicleTypeId !== vehicle.vehicleTypeId) {
        throw new ServiceError("positionId", "This location does not belong to the selected vehicle's configuration.");
      }

      // Locate the current installation at that position, if any
      const current = await tx.installation.findFirst({
        where: { vehicleId: vehicle.id, positionId: position.id, isCurrent: true },
        include: { tyre: true },
      });
      if (!current) {
        throw new ServiceError("positionId", "There is no current tyre installed at this location. Replacement requires an existing tyre.");
      }
      if (removalDate < current.installedAt) {
        throw new ServiceError("removedAt", "Replacement date cannot be before the current tyre was installed.");
      }

      // Validate the replacement tyre
      const newTyre = await tx.tyre.findUnique({
        where: { id: input.tyreId },
        include: { tyreModel: { include: { compatibleVehicleTypes: true } } },
      });
      if (!newTyre) throw new ServiceError("tyreId", "The replacement tyre does not exist.");
      if (newTyre.status !== "AVAILABLE") {
        throw new ServiceError("tyreId", `This tyre is currently ${newTyre.status.replace("_", " ").toLowerCase()} and cannot be installed.`);
      }
      if (newTyre.tyreModel.status !== "ACTIVE") {
        throw new ServiceError("tyreId", "This tyre model is inactive.");
      }
      if (newTyre.currentInstallationId) {
        throw new ServiceError("tyreId", "The replacement tyre is already installed on a vehicle.");
      }

      const token = newTyre.tyreModel.compatibleVehicleTypes;
      const compatible = token.length === 0 || token.some((c) => c.vehicleTypeId === vehicle.vehicleTypeId);
      if (!compatible) {
        throw new ServiceError("tyreId", "This tyre model is not compatible with this vehicle type.");
      }

      const odometerError = validateOdometer(input.odometer, vehicle.currentOdometer, input.odometerOverride, input.odometerOverrideReason);
      if (odometerError) throw new ServiceError("odometer", odometerError);

      // 1. Close the current installation
      await tx.installation.update({
        where: { id: current.id },
        data: {
          isCurrent: false,
          removedAt: removalDate,
          removalOdometer: input.odometer,
          removalReasonId: input.removedReasonId || null,
          removalNotes: input.notes?.trim() || null,
        },
      });

      // 2. Mark the old tyre removed per business rule
      await tx.tyre.update({
        where: { id: current.tyreId },
        data: {
          status: "REMOVED",
          currentVehicleId: null,
          currentPositionId: null,
          currentInstallationId: null,
        },
      });

      await tx.tyreLifecycleEvent.create({
        data: {
          tyreId: current.tyreId,
          type: "REPLACED",
          description: `Removed from ${vehicle.registrationNo} at ${position.displayName} (${input.odometer.toLocaleString("en-IN")} km)`,
          installationId: current.id,
          metadata: JSON.stringify({ replacementTyreId: newTyre.id, odometer: input.odometer, reasonId: input.removedReasonId }),
        },
      });

      // 3. Create the new installation
      const created = await tx.installation.create({
        data: {
          tyreId: newTyre.id,
          vehicleId: vehicle.id,
          positionId: position.id,
          installedAt: removalDate,
          odometer: input.odometer,
          notes: input.notes?.trim() || null,
          isCurrent: true,
        },
      });

      // 4. Mark the new tyre installed
      await tx.tyre.update({
        where: { id: newTyre.id },
        data: {
          status: "INSTALLED",
          currentVehicleId: vehicle.id,
          currentPositionId: position.id,
          currentInstallationId: created.id,
        },
      });

      await tx.tyreLifecycleEvent.create({
        data: {
          tyreId: newTyre.id,
          type: "INSTALLED",
          description: `Installed on ${vehicle.registrationNo} at position ${position.displayName} (${input.odometer.toLocaleString("en-IN")} km)`,
          installationId: created.id,
          metadata: JSON.stringify({ vehicleId: vehicle.id, positionId: position.id, odometer: input.odometer }),
        },
      });

      // 5. Update odometer
      if (input.odometer !== vehicle.currentOdometer) {
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { currentOdometer: input.odometer },
        });
      }
      await tx.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          reading: input.odometer,
          isOverride: input.odometerOverride === true,
          notes:
            input.odometerOverride === true
              ? input.odometerOverrideReason?.trim() || "Odometer override during tyre replacement"
              : "Recorded during tyre replacement",
        },
      });

      return {
        installationId: created.id,
        oldInternalId: current.tyre.internalId,
        newInternalId: newTyre.internalId,
        registrationNo: vehicle.registrationNo,
        positionName: position.displayName,
      };
    });

    await logActivity({
      action: "REPLACE",
      entityType: "Installation",
      entityId: result.installationId,
      description: `Tyre ${result.oldInternalId} replaced with ${result.newInternalId} on ${result.registrationNo} at ${result.positionName}`,
      tyreId: input.tyreId,
      vehicleId: input.vehicleId,
      newValue: JSON.stringify({ positionId: input.positionId, odometer: input.odometer, reasonId: input.removedReasonId }),
    });

    revalidatePath(`/vehicles/${input.vehicleId}`);
    revalidatePath("/vehicles");
    revalidatePath("/inventory");
    revalidatePath("/replace-tyre");
    revalidatePath("/tyre-history");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) return err({ [error.field]: error.message });
    console.error("replaceTyre failed:", error);
    return err({ _form: "Unable to complete the replacement. Please try again." });
  }
}