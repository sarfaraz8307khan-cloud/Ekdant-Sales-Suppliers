"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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
    return `Odometer reading (${reading.toLocaleString("en-IN")} km) is below the vehicle's current reading (${currentOdometer.toLocaleString("en-IN")} km). Enter a reading equal to or greater than the current odometer. If you need to record a lower reading, enable the override and provide a documented reason.`;
  }
  return null;
}

export type ReplaceInput = {
  installationId: string;
  vehicleId: string;
  tyreId: string;
  newTyreId: string;
  driverId?: string;
  removedAt: string;
  odometer: number;
  removalReasonId?: string;
  removalNotes?: string;
  notes?: string;
  odometerOverride?: boolean;
  odometerOverrideReason?: string;
};

export async function replaceTyre(input: ReplaceInput): Promise<ActionResult> {
  const errors: Record<string, string> = {};
  if (!input.installationId) errors.installationId = "Current installation is required";
  if (!input.newTyreId) errors.newTyreId = "Replacement tyre is required";
  if (!input.removedAt) errors.removedAt = "Replacement date is required";
  if (!input.removalReasonId) errors.removalReasonId = "Replacement reason is required";
  if (input.odometer === undefined || input.odometer === null || isNaN(input.odometer)) {
    errors.odometer = "Odometer is required";
  }
  if (Object.keys(errors).length > 0) return err(errors);

  const removalDate = new Date(input.removedAt);
  if (isNaN(removalDate.getTime())) return err({ removedAt: "Invalid replacement date" });
  const reason = await db.removalReason.findUnique({ where: { id: input.removalReasonId } });
  if (!reason || reason.status !== "ACTIVE") {
    return err({ removalReasonId: "The selected replacement reason is invalid." });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.installation.findUnique({
        where: { id: input.installationId },
        include: { tyre: true, vehicle: { include: { vehicleType: true } } },
      });
      if (!current || !current.isCurrent) {
        throw new ServiceError("installationId", "The current installation was not found or is no longer active.");
      }
      if (current.vehicleId !== input.vehicleId) {
        throw new ServiceError("installationId", "The installation does not belong to the selected vehicle.");
      }
      if (removalDate < current.installedAt) {
        throw new ServiceError("removedAt", "Replacement date cannot be before the installation date.");
      }

      const newTyre = await tx.tyre.findUnique({
        where: { id: input.newTyreId },
        include: { tyreModel: { include: { compatibleVehicleTypes: true } } },
      });
      if (!newTyre) throw new ServiceError("newTyreId", "The replacement tyre does not exist.");
      if (newTyre.status !== "AVAILABLE") {
        throw new ServiceError("newTyreId", `Tyre ${newTyre.internalId} is ${newTyre.status.replace("_", " ").toLowerCase()} and cannot be installed.`);
      }
      if (newTyre.tyreModel.status !== "ACTIVE") {
        throw new ServiceError("newTyreId", "This tyre model is inactive.");
      }
      if (newTyre.currentInstallationId) {
        throw new ServiceError("newTyreId", "The replacement tyre is already installed on a vehicle.");
      }

      const position = await tx.tyrePosition.findUnique({ where: { id: current.positionId } });
      if (position && position.vehicleTypeId !== current.vehicle.vehicleTypeId) {
        throw new ServiceError("newTyreId", "Position configuration mismatch.");
      }

      const token = newTyre.tyreModel.compatibleVehicleTypes;
      const compatible = token.length === 0 || token.some((c) => c.vehicleTypeId === current.vehicle.vehicleTypeId);
      if (!compatible) {
        throw new ServiceError("newTyreId", "The replacement tyre model is not compatible with this vehicle type.");
      }

      const odometerError = validateOdometer(input.odometer, current.vehicle.currentOdometer, input.odometerOverride, input.odometerOverrideReason);
      if (odometerError) throw new ServiceError("odometer", odometerError);

      // 1. Close the current installation
      await tx.installation.update({
        where: { id: current.id },
        data: {
          isCurrent: false,
          removedAt: removalDate,
          removalOdometer: input.odometer,
          removalReasonId: input.removalReasonId || null,
          removalNotes: input.removalNotes?.trim() || null,
        },
      });

      // 2. Mark the old tyre removed per business rule (INSTALLED → REMOVED)
      // Removed tyres remain reusable; scrapping is a separate disposal step.
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
          description: `Removed from ${current.vehicle.registrationNo} at ${position?.displayName ?? ""} (${input.odometer.toLocaleString("en-IN")} km)`,
          installationId: current.id,
          metadata: JSON.stringify({ replacementTyreId: newTyre.id, odometer: input.odometer }),
        },
      });

      // 3. Create the new installation
      const created = await tx.installation.create({
        data: {
          tyreId: newTyre.id,
          vehicleId: current.vehicleId,
          positionId: current.positionId,
          driverId: input.driverId || null,
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
          currentVehicleId: current.vehicleId,
          currentPositionId: current.positionId,
          currentInstallationId: created.id,
        },
      });

      await tx.tyreLifecycleEvent.create({
        data: {
          tyreId: newTyre.id,
          type: "INSTALLED",
          description: `Installed on ${current.vehicle.registrationNo} at position ${position?.displayName ?? ""} (${input.odometer.toLocaleString("en-IN")} km)`,
          installationId: created.id,
          metadata: JSON.stringify({ vehicleId: current.vehicleId, positionId: current.positionId, odometer: input.odometer }),
        },
      });

      if (input.odometer !== current.vehicle.currentOdometer) {
        await tx.vehicle.update({
          where: { id: current.vehicleId },
          data: { currentOdometer: input.odometer },
        });
      }
      await tx.odometerReading.create({
        data: {
          vehicleId: current.vehicleId,
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
        registrationNo: current.vehicle.registrationNo,
        positionName: position?.displayName ?? "",
      };
    });

    await logActivity({
      action: "REPLACE",
      entityType: "Installation",
      entityId: result.installationId,
      description: `Tyre ${result.oldInternalId} replaced with ${result.newInternalId} on ${result.registrationNo} at ${result.positionName}`,
      tyreId: input.newTyreId,
      vehicleId: input.vehicleId,
      newValue: JSON.stringify({ oldTyreId: input.tyreId, newTyreId: input.newTyreId, odometer: input.odometer }),
    });

    revalidatePath(`/vehicles/${input.vehicleId}`);
    revalidatePath("/vehicles");
    revalidatePath("/inventory");
    revalidatePath("/tyres");
    revalidatePath("/tyre-history");
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) return err({ [error.field]: error.message });
    console.error("replaceTyre failed:", error);
    return err({ _form: "Failed to replace tyre. Please try again." });
  }
}

