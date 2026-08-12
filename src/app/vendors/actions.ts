"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type VendorFormData = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
};

function validateVendor(data: VendorFormData) {
  const errors: Record<string, string> = {};
  if (!data.name?.trim()) errors.name = "Vendor name is required";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Enter a valid email address";
  }
  return errors;
}

export async function createVendor(data: VendorFormData) {
  const errors = validateVendor(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const vendor = await db.vendor.create({
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "Vendor",
      entityId: vendor.id,
      description: `Vendor "${vendor.name}" created`,
      newValue: vendor.name,
    });

    revalidatePath("/vendors");
    return { ok: true, id: vendor.id };
  } catch (error) {
    console.error("createVendor failed:", error);
    return { ok: false, errors: { _form: "Failed to create vendor. Please try again." } };
  }
}

export async function updateVendor(id: string, data: VendorFormData) {
  const errors = validateVendor(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const existing = await db.vendor.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, errors: { _form: "Vendor not found." } };
    }

    const vendor = await db.vendor.update({
      where: { id },
      data: {
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        gstNumber: data.gstNumber?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await logActivity({
      action: "UPDATE",
      entityType: "Vendor",
      entityId: vendor.id,
      description: `Vendor "${vendor.name}" updated`,
      previousValue: existing.name,
      newValue: vendor.name,
    });

    revalidatePath("/vendors");
    return { ok: true, id: vendor.id };
  } catch (error) {
    console.error("updateVendor failed:", error);
    return { ok: false, errors: { _form: "Failed to update vendor. Please try again." } };
  }
}

export async function deleteVendor(id: string) {
  try {
    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        purchases: { select: { id: true } },
        tyres: { select: { id: true } },
        expenditures: { select: { id: true } },
      },
    });
    if (!vendor) return { ok: false, errors: { _form: "Vendor not found." } };

    if (vendor.purchases.length > 0 || vendor.tyres.length > 0 || vendor.expenditures.length > 0) {
      return {
        ok: false,
        errors: {
          _form:
            "This vendor is linked to purchase, tyre or expense records and cannot be permanently deleted. Deactivate it instead.",
        },
      };
    }

    await db.vendor.delete({ where: { id } });

    await logActivity({
      action: "DELETE",
      entityType: "Vendor",
      entityId: id,
      description: `Vendor "${vendor.name}" deleted`,
      previousValue: vendor.name,
    });

    revalidatePath("/vendors");
    return { ok: true };
  } catch (error) {
    console.error("deleteVendor failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this vendor. Please try again." } };
  }
}

export async function setVendorStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const vendor = await db.vendor.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Vendor",
      entityId: vendor.id,
      description: `Vendor "${vendor.name}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/vendors");
    return { ok: true };
  } catch (error) {
    console.error("setVendorStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update vendor status." } };
  }
}