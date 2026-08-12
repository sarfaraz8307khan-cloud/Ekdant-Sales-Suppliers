"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; errors: Record<string, string> };

export type AdjustInventoryInput = {
  tyreModelId: string;
  quantity: number;
  reason: string;
  notes?: string;
};

export async function adjustInventory(input: AdjustInventoryInput): Promise<ActionResult> {
  const errors: Record<string, string> = {};
  if (!input.tyreModelId) errors.tyreModelId = "Model is required";
  if (!input.quantity || input.quantity <= 0 || !Number.isInteger(input.quantity)) {
    errors.quantity = "Quantity must be a positive whole number";
  }
  if (!input.reason?.trim()) errors.reason = "A reason is required";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    await db.$transaction(async (tx) => {
      const model = await tx.tyreModel.findUnique({ where: { id: input.tyreModelId } });
      if (!model || model.status !== "ACTIVE") {
        throw new Error("MODEL_INVALID");
      }

      const availableCount = await tx.tyre.count({
        where: { tyreModelId: input.tyreModelId, status: "AVAILABLE" },
      });
      if (input.quantity > availableCount) {
        throw new Error("INSUFFICIENT");
      }

      // Mark N available tyres as REMOVED for the selected model
      const tyres = await tx.tyre.findMany({
        where: { tyreModelId: input.tyreModelId, status: "AVAILABLE" },
        take: input.quantity,
        orderBy: { createdAt: "asc" },
      });

      for (const tyre of tyres) {
        await tx.tyre.update({
          where: { id: tyre.id },
          data: { status: "REMOVED" },
        });
        await tx.tyreLifecycleEvent.create({
          data: {
            tyreId: tyre.id,
            type: "ADJUSTED",
            description: `Inventory adjusted: removed from available stock (${input.reason.trim()})`,
            metadata: JSON.stringify({ reason: input.reason.trim(), notes: input.notes?.trim() || null }),
          },
        });
      }

      await tx.inventoryAdjustment.create({
        data: {
          tyreModelId: input.tyreModelId,
          quantity: input.quantity,
          reason: input.reason.trim(),
          notes: input.notes?.trim() || null,
        },
      });

      return { count: tyres.length };
    });

    await logActivity({
      action: "INVENTORY_ADJUST",
      entityType: "TyreModel",
      entityId: input.tyreModelId,
      description: `Inventory adjusted: ${input.quantity} tyre(s) removed from available stock for ${input.reason.trim()}`,
      newValue: JSON.stringify({ quantity: input.quantity, reason: input.reason.trim() }),
    });

    revalidatePath("/inventory");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT") {
      return {
        ok: false,
        errors: { _form: "Cannot remove more tyres than are currently available." },
      };
    }
    if (error instanceof Error && error.message === "MODEL_INVALID") {
      return {
        ok: false,
        errors: { _form: "The selected model is invalid or inactive." },
      };
    }
    console.error("adjustInventory failed:", error);
    return { ok: false, errors: { _form: "Unable to adjust inventory. Please try again." } };
  }
}

export async function deleteTyreModel(modelId: string): Promise<ActionResult> {
  try {
    const model = await db.tyreModel.findUnique({
      where: { id: modelId },
      include: { tyres: { select: { id: true } }, purchaseItems: { select: { id: true } } },
    });
    if (!model) return { ok: false, errors: { _form: "Model not found." } };

    if (model.tyres.length > 0 || model.purchaseItems.length > 0) {
      return {
        ok: false,
        errors: {
          _form:
            "This model is linked to tyres or purchase history and cannot be permanently deleted. Deactivate it instead.",
        },
      };
    }

    await db.tyreModel.delete({ where: { id: modelId } });

    await logActivity({
      action: "DELETE",
      entityType: "TyreModel",
      entityId: modelId,
      description: `Tyre model "${model.brand} ${model.name}" deleted`,
    });

    revalidatePath("/inventory");
    revalidatePath("/tyre-models");
    return { ok: true };
  } catch (error) {
    console.error("deleteTyreModel failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this model. Please try again." } };
  }
}