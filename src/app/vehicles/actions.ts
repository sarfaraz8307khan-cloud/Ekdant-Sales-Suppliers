"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
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
    const vehicle = await db.vehicle.create({
      data: {
        registrationNo: data.registrationNo.trim().toUpperCase(),
        vehicleTypeId: data.vehicleTypeId,
        driverId: data.driverId || null,
        currentOdometer: data.currentOdometer,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      description: `Vehicle "${vehicle.registrationNo}" created`,
      newValue: vehicle.registrationNo,
    });

    revalidatePath("/vehicles");
    return { ok: true, id: vehicle.id };
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
        driverId: data.driverId || null,
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