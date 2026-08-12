"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type TyreModelFormData = {
  brand: string;
  name: string;
  size: string;
  description?: string;
  minStockLevel: number;
  compatibleVehicleTypeIds: string[];
};

function validateTyreModel(data: TyreModelFormData) {
  const errors: Record<string, string> = {};
  if (!data.brand?.trim()) errors.brand = "Brand is required";
  if (!data.name?.trim()) errors.name = "Model name is required";
  if (!data.size?.trim()) errors.size = "Tyre size is required";
  if (data.minStockLevel < 0) errors.minStockLevel = "Minimum stock cannot be negative";
  return errors;
}

export async function createTyreModel(data: TyreModelFormData) {
  const errors = validateTyreModel(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const model = await db.tyreModel.create({
      data: {
        brand: data.brand.trim(),
        name: data.name.trim(),
        size: data.size.trim(),
        description: data.description?.trim() || null,
        minStockLevel: data.minStockLevel,
        compatibleVehicleTypes: {
          create: data.compatibleVehicleTypeIds.map((vehicleTypeId) => ({
            vehicleTypeId,
          })),
        },
      },
    });

    await logActivity({
      action: "CREATE",
      entityType: "TyreModel",
      entityId: model.id,
      description: `Tyre model "${model.brand} ${model.name} ${model.size}" created`,
      newValue: `${model.brand} ${model.name} ${model.size}`,
    });

    revalidatePath("/tyre-models");
    return { ok: true, id: model.id };
  } catch (error) {
    console.error("createTyreModel failed:", error);
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { ok: false, errors: { _form: "A tyre model with this brand, name and size already exists." } };
    }
    return { ok: false, errors: { _form: "Failed to create tyre model. Please try again." } };
  }
}

export async function updateTyreModel(id: string, data: TyreModelFormData) {
  const errors = validateTyreModel(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const existing = await db.tyreModel.findUnique({ where: { id } });
    if (!existing) {
      return { ok: false, errors: { _form: "Tyre model not found." } };
    }

    const model = await db.$transaction(async (tx) => {
      await tx.tyreModelVehicleType.deleteMany({ where: { tyreModelId: id } });
      return tx.tyreModel.update({
        where: { id },
        data: {
          brand: data.brand.trim(),
          name: data.name.trim(),
          size: data.size.trim(),
          description: data.description?.trim() || null,
          minStockLevel: data.minStockLevel,
          compatibleVehicleTypes: {
            create: data.compatibleVehicleTypeIds.map((vehicleTypeId) => ({
              vehicleTypeId,
            })),
          },
        },
      });
    });

    await logActivity({
      action: "UPDATE",
      entityType: "TyreModel",
      entityId: model.id,
      description: `Tyre model "${model.brand} ${model.name} ${model.size}" updated`,
      previousValue: `${existing.brand} ${existing.name} ${existing.size}`,
      newValue: `${model.brand} ${model.name} ${model.size}`,
    });

    revalidatePath("/tyre-models");
    return { ok: true, id: model.id };
  } catch (error) {
    console.error("updateTyreModel failed:", error);
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { ok: false, errors: { _form: "A tyre model with this brand, name and size already exists." } };
    }
    return { ok: false, errors: { _form: "Failed to update tyre model. Please try again." } };
  }
}

export async function deleteTyreModel(id: string) {
  try {
    const model = await db.tyreModel.findUnique({
      where: { id },
      include: {
        tyres: { select: { id: true } },
        purchaseItems: { select: { id: true } },
        inventoryAdjustments: { select: { id: true } },
      },
    });
    if (!model) return { ok: false, errors: { _form: "Tyre model not found." } };

    if (
      model.tyres.length > 0 ||
      model.purchaseItems.length > 0 ||
      model.inventoryAdjustments.length > 0
    ) {
      return {
        ok: false,
        errors: {
          _form:
            "This tyre model is linked to tyres, purchase items or inventory adjustments and cannot be permanently deleted. Deactivate it instead.",
        },
      };
    }

    await db.tyreModel.delete({ where: { id } });

    await logActivity({
      action: "DELETE",
      entityType: "TyreModel",
      entityId: id,
      description: `Tyre model "${model.brand} ${model.name} ${model.size}" deleted`,
      previousValue: `${model.brand} ${model.name} ${model.size}`,
    });

    revalidatePath("/tyre-models");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (error) {
    console.error("deleteTyreModel failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this tyre model. Please try again." } };
  }
}

export async function setTyreModelStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  try {
    const model = await db.tyreModel.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "TyreModel",
      entityId: model.id,
      description: `Tyre model "${model.brand} ${model.name}" ${status === "ACTIVE" ? "activated" : "deactivated"}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
    });

    revalidatePath("/tyre-models");
    return { ok: true };
  } catch (error) {
    console.error("setTyreModelStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update tyre model status." } };
  }
}