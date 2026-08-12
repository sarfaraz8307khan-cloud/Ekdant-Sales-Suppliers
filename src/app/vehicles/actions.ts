"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { ensureVehicleTyres } from "@/lib/vehicle-tyres";
import { revalidatePath } from "next/cache";

export type VehicleFormData = {
  registrationNo: string;
  vehicleTypeId: string;
  driverId?: string;
  currentOdometer: number;
  notes?: string;
};

function validateVehicle(data: VehicleFormData) {
  const errors: Record<string, string> = {};
  if (!data.registrationNo?.trim()) errors.registrationNo = "Registration number is required";
  if (!data.vehicleTypeId) errors.vehicleTypeId = "Vehicle type is required";
  if (data.currentOdometer < 0) errors.currentOdometer = "Odometer cannot be negative";
  return errors;
}

export async function createVehicle(data: VehicleFormData) {
  const errors = validateVehicle(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    // Atomic: create the vehicle and allocate its company-fitted initial
    // tyres in a single transaction so we never leave a half-created vehicle.
    const { vehicle, tyreStats } = await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.create({
        data: {
          registrationNo: data.registrationNo.trim().toUpperCase(),
          vehicleTypeId: data.vehicleTypeId,
          // Empty string from an unset select must not become an FK value
          driverId: data.driverId ? data.driverId : undefined,
          currentOdometer: data.currentOdometer,
          notes: data.notes?.trim() || null,
        },
      });
      const tyreStats = await ensureVehicleTyres(vehicle.id, tx);
      return { vehicle, tyreStats };
    });

    await logActivity({
      action: "CREATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      description: `Vehicle "${vehicle.registrationNo}" created with ${tyreStats.created} company-fitted initial tyres`,
      newValue: vehicle.registrationNo,
    });

    revalidatePath("/vehicles");
    return { ok: true, id: vehicle.id, tyresCreated: tyreStats.created };
  } catch (error: unknown) {
    console.error("createVehicle failed:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return { ok: false, errors: { registrationNo: "This registration number already exists" } };
    }
    return { ok: false, errors: { _form: "Failed to create vehicle. Please try again." } };
  }
}

export async function updateVehicle(id: string, data: VehicleFormData) {
  const errors = validateVehicle(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const existing = await db.vehicle.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, errors: { _form: "Vehicle not found." } };
    }

    const vehicle = await db.vehicle.update({
      where: { id },
      data: {
        registrationNo: data.registrationNo.trim().toUpperCase(),
        vehicleTypeId: data.vehicleTypeId,
        // Empty string from an unset select must not become an FK value
        driverId: data.driverId ? data.driverId : undefined,
        currentOdometer: data.currentOdometer,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      description: `Vehicle "${vehicle.registrationNo}" updated`,
      previousValue: existing.registrationNo,
      newValue: vehicle.registrationNo,
    });

    revalidatePath("/vehicles");
    return { ok: true, id: vehicle.id };
  } catch (error: unknown) {
    console.error("updateVehicle failed:", error);
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return { ok: false, errors: { registrationNo: "This registration number already exists" } };
    }
    return { ok: false, errors: { _form: "Failed to update vehicle. Please try again." } };
  }
}

export async function deleteVehicle(id: string) {
  try {
    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        installations: { select: { id: true } },
        currentTyres: { select: { id: true } },
        odometerReadings: { select: { id: true } },
        activityLogs: { select: { id: true } },
        expenditures: { select: { id: true } },
      },
    });
    if (!vehicle) return { ok: false, errors: { _form: "Vehicle not found." } };

    if (
      vehicle.installations.length > 0 ||
      vehicle.currentTyres.length > 0 ||
      vehicle.odometerReadings.length > 0 ||
      vehicle.activityLogs.length > 0 ||
      vehicle.expenditures.length > 0
    ) {
      return {
        ok: false,
        errors: {
          _form:
            "This vehicle is linked to historical tyre, expense or activity records and cannot be permanently deleted. Deactivate it instead.",
        },
      };
    }

    await db.vehicle.delete({ where: { id } });

    await logActivity({
      action: "DELETE",
      entityType: "Vehicle",
      entityId: id,
      description: `Vehicle "${vehicle.registrationNo}" deleted`,
      previousValue: vehicle.registrationNo,
    });

    revalidatePath("/vehicles");
    return { ok: true };
  } catch (error) {
    console.error("deleteVehicle failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this vehicle. Please try again." } };
  }
}

export type RepairResult = {
  ok: true;
  scanned: number;
  repaired: number;
  tyresCreated: number;
};

/**
 * Repairs existing vehicles that are missing company-fitted initial tyres.
 * Idempotent — only fills positions without a current installation.
 */
export async function repairVehicleTyres(): Promise<RepairResult> {
  const vehicles = await db.vehicle.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  let repaired = 0;
  let tyresCreated = 0;
  for (const vehicle of vehicles) {
    const stats = await ensureVehicleTyres(vehicle.id);
    if (stats.created > 0) repaired += 1;
    tyresCreated += stats.created;
  }

  await logActivity({
    action: "REPAIR",
    entityType: "Vehicle",
    description: `Repaired ${repaired} vehicle(s): ${tyresCreated} company-fitted initial tyre(s) allocated`,
  });

  revalidatePath("/vehicles");
  revalidatePath("/");
  return { ok: true, scanned: vehicles.length, repaired, tyresCreated };
}

export async function setVehicleStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const vehicle = await db.vehicle.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      description: `Vehicle "${vehicle.registrationNo}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/vehicles");
    return { ok: true };
  } catch (error) {
    console.error("setVehicleStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update vehicle status." } };
  }
}