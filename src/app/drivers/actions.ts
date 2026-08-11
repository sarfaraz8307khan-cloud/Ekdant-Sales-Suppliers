"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type DriverFormData = {
  name: string;
  phone?: string;
  licenceNo?: string;
  address?: string;
  notes?: string;
};

function validateDriver(data: DriverFormData) {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = "Driver name is required";
  return errors;
}

export async function createDriver(data: DriverFormData) {
  const errors = validateDriver(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const driver = await db.driver.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        licenceNo: data.licenceNo?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Driver",
      entityId: driver.id,
      description: `Driver "${driver.name}" created`,
      newValue: driver.name,
    });

    revalidatePath("/drivers");
    return { ok: true, id: driver.id };
  } catch (error) {
    console.error("createDriver failed:", error);
    return { ok: false, errors: { _form: "Failed to create driver. Please try again." } };
  }
}

export async function updateDriver(id: string, data: DriverFormData) {
  const errors = validateDriver(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const existing = await db.driver.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, errors: { _form: "Driver not found." } };
    }

    const driver = await db.driver.update({
      where: { id },
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        licenceNo: data.licenceNo?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Driver",
      entityId: driver.id,
      description: `Driver "${driver.name}" updated`,
      previousValue: existing.name,
      newValue: driver.name,
    });

    revalidatePath("/drivers");
    return { ok: true, id: driver.id };
  } catch (error) {
    console.error("updateDriver failed:", error);
    return { ok: false, errors: { _form: "Failed to update driver. Please try again." } };
  }
}

export async function setDriverStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const driver = await db.driver.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Driver",
      entityId: driver.id,
      description: `Driver "${driver.name}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/drivers");
    return { ok: true };
  } catch (error) {
    console.error("setDriverStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update driver status." } };
  }
}