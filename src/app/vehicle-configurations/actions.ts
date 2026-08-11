"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

function isPrismaError(error: unknown, code: string) {
  return error instanceof Error && "code" in error && (error as { code?: string }).code === code;
}

export type VehicleTypeFormData = {
  name: string;
  description?: string;
  axleCount: number;
  tyreCount: number;
};

export type AxleFormData = {
  vehicleTypeId: string;
  axleNumber: number;
  name: string;
  sequence: number;
};

export type PositionFormData = {
  vehicleTypeId: string;
  axleId: string;
  positionId: string;
  displayName: string;
  shortCode: string;
  side: "LEFT" | "RIGHT" | "CENTER";
  sequence: number;
  positionType: "STEERING" | "DRIVE" | "TRAILER" | "LIFT" | "OTHER";
};

function validateVehicleType(data: VehicleTypeFormData) {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = "Name is required";
  if (data.axleCount < 1) errors.axleCount = "At least 1 axle is required";
  if (data.tyreCount < 1) errors.tyreCount = "At least 1 tyre is required";
  return errors;
}

function validateAxle(data: AxleFormData) {
  const errors: Record<string, string> = {};
  if (data.axleNumber < 1) errors.axleNumber = "Axle number must be at least 1";
  if (!data.name?.trim()) errors.name = "Axle name is required";
  return errors;
}

function validatePosition(data: PositionFormData) {
  const errors: Record<string, string> = {};
  if (!data.positionId?.trim()) errors.positionId = "Position ID is required";
  if (!data.displayName?.trim()) errors.displayName = "Display name is required";
  if (!data.shortCode?.trim()) errors.shortCode = "Short code is required";
  return errors;
}

export async function createVehicleType(data: VehicleTypeFormData) {
  const errors = validateVehicleType(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const vt = await db.vehicleType.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        axleCount: data.axleCount,
        tyreCount: data.tyreCount,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "VehicleType",
      entityId: vt.id,
      description: `Vehicle type "${vt.name}" created (${vt.axleCount} axles, ${vt.tyreCount} tyres)`,
      newValue: `${vt.name} (${vt.axleCount} axles, ${vt.tyreCount} tyres)`,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: vt.id };
  } catch (error) {
    console.error("createVehicleType failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "A vehicle type with this name already exists." } };
    }
    return { ok: false, errors: { _form: "Failed to create vehicle type. Please try again." } };
  }
}

export async function updateVehicleType(id: string, data: VehicleTypeFormData) {
  const errors = validateVehicleType(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const existing = await db.vehicleType.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, errors: { _form: "Vehicle type not found." } };
    }

    const vt = await db.vehicleType.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        axleCount: data.axleCount,
        tyreCount: data.tyreCount,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "VehicleType",
      entityId: vt.id,
      description: `Vehicle type "${vt.name}" updated`,
      previousValue: `${existing.name} (${existing.axleCount} axles, ${existing.tyreCount} tyres)`,
      newValue: `${vt.name} (${vt.axleCount} axles, ${vt.tyreCount} tyres)`,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: vt.id };
  } catch (error) {
    console.error("updateVehicleType failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "A vehicle type with this name already exists." } };
    }
    return { ok: false, errors: { _form: "Failed to update vehicle type. Please try again." } };
  }
}

export async function setVehicleTypeStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const vt = await db.vehicleType.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "VehicleType",
      entityId: vt.id,
      description: `Vehicle type "${vt.name}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true };
  } catch (error) {
    console.error("setVehicleTypeStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update vehicle type status." } };
  }
}

export async function createAxle(data: AxleFormData) {
  const errors = validateAxle(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const axle = await db.axle.create({
      data: {
        vehicleTypeId: data.vehicleTypeId,
        axleNumber: data.axleNumber,
        name: data.name.trim(),
        sequence: data.sequence,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Axle",
      entityId: axle.id,
      description: `Axle "${axle.name}" created for vehicle type`,
      newValue: axle.name,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: axle.id };
  } catch (error) {
    console.error("createAxle failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "An axle with this number already exists for this vehicle type." } };
    }
    return { ok: false, errors: { _form: "Failed to create axle. Please try again." } };
  }
}

export async function updateAxle(id: string, data: AxleFormData) {
  const errors = validateAxle(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const axle = await db.axle.update({
      where: { id },
      data: {
        axleNumber: data.axleNumber,
        name: data.name.trim(),
        sequence: data.sequence,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Axle",
      entityId: axle.id,
      description: `Axle "${axle.name}" updated`,
      newValue: axle.name,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: axle.id };
  } catch (error) {
    console.error("updateAxle failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "An axle with this number already exists for this vehicle type." } };
    }
    return { ok: false, errors: { _form: "Failed to update axle. Please try again." } };
  }
}

export async function setAxleStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const axle = await db.axle.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Axle",
      entityId: axle.id,
      description: `Axle "${axle.name}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true };
  } catch (error) {
    console.error("setAxleStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update axle status." } };
  }
}

export async function createPosition(data: PositionFormData) {
  const errors = validatePosition(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const position = await db.tyrePosition.create({
      data: {
        vehicleTypeId: data.vehicleTypeId,
        axleId: data.axleId,
        positionId: data.positionId.trim().toUpperCase(),
        displayName: data.displayName.trim(),
        shortCode: data.shortCode.trim().toUpperCase(),
        side: data.side,
        sequence: data.sequence,
        positionType: data.positionType,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "TyrePosition",
      entityId: position.id,
      description: `Tyre position "${position.displayName}" created`,
      newValue: position.displayName,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: position.id };
  } catch (error) {
    console.error("createPosition failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "A position with this ID already exists for this vehicle type." } };
    }
    return { ok: false, errors: { _form: "Failed to create position. Please try again." } };
  }
}

export async function updatePosition(id: string, data: PositionFormData) {
  const errors = validatePosition(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const position = await db.tyrePosition.update({
      where: { id },
      data: {
        positionId: data.positionId.trim().toUpperCase(),
        displayName: data.displayName.trim(),
        shortCode: data.shortCode.trim().toUpperCase(),
        side: data.side,
        sequence: data.sequence,
        positionType: data.positionType,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "TyrePosition",
      entityId: position.id,
      description: `Tyre position "${position.displayName}" updated`,
      newValue: position.displayName,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true, id: position.id };
  } catch (error) {
    console.error("updatePosition failed:", error);
    if (isPrismaError(error, "P2002")) {
      return { ok: false, errors: { _form: "A position with this ID already exists for this vehicle type." } };
    }
    return { ok: false, errors: { _form: "Failed to update position. Please try again." } };
  }
}

export async function setPositionStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const position = await db.tyrePosition.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "TyrePosition",
      entityId: position.id,
      description: `Tyre position "${position.displayName}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/vehicle-configurations");
    return { ok: true };
  } catch (error) {
    console.error("setPositionStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update position status." } };
  }
}