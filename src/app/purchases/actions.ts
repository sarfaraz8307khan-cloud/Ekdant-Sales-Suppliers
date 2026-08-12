"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type PurchaseItemInput = {
  tyreModelId: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  discount: number;
};

export type PurchaseFormData = {
  vendorId: string;
  billNumber: string;
  purchaseDate: string;
  tax: number;
  discount: number;
  notes?: string;
  items: PurchaseItemInput[];
};

function validatePurchase(data: PurchaseFormData) {
  const errors: Record<string, string> = {};
  if (!data.vendorId) errors.vendorId = "Vendor is required";
  if (!data.billNumber?.trim()) errors.billNumber = "Bill number is required";
  if (!data.purchaseDate) {
    errors.purchaseDate = "Purchase date is required";
  } else if (isNaN(new Date(data.purchaseDate).getTime())) {
    errors.purchaseDate = "Enter a valid date";
  }
  if (data.tax < 0) errors.tax = "Tax cannot be negative";
  if (data.discount < 0) errors.discount = "Discount cannot be negative";
  if (!data.items || data.items.length === 0) {
    errors.items = "Add at least one tyre item";
  } else {
    data.items.forEach((item, i) => {
      if (!item.tyreModelId) errors[`items.${i}.tyreModelId`] = "Select a tyre model";
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        errors[`items.${i}.quantity`] = "Quantity must be a positive whole number";
      }
      if (item.unitPrice < 0) errors[`items.${i}.unitPrice`] = "Unit price cannot be negative";
      if (item.tax < 0) errors[`items.${i}.tax`] = "Tax cannot be negative";
      if (item.discount < 0) errors[`items.${i}.discount`] = "Discount cannot be negative";
      if (item.discount > item.quantity * item.unitPrice + item.tax) {
        errors[`items.${i}.discount`] = "Discount cannot exceed item total";
      }
    });
  }
  return errors;
}

export async function createPurchase(data: PurchaseFormData) {
  const errors = validatePurchase(data);
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Load settings for tyre ID generation
      const settings = await tx.applicationSettings.findFirst();
      if (!settings) throw new Error("Application settings not found");
      const prefix = settings.tyreIdPrefix || "TYR";

      // Self-heal the sequence: never generate an internalId that collides
      // with an existing tyre (e.g. seed self-healed past the persisted
      // counter, manual inserts, or concurrent purchases). This prevents
      // the unique-constraint P2002 that caused the rollback error.
      const existingTyres = await tx.tyre.findMany({
        select: { internalId: true },
      });
      let maxSeq = 0;
      for (const t of existingTyres) {
        const match = t.internalId.match(/(\d+)$/);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
      let nextSeq = Math.max(settings.tyreIdNextSeq, maxSeq + 1);

      // 2. Create purchase
      const purchase = await tx.purchase.create({
        data: {
          vendorId: data.vendorId,
          billNumber: data.billNumber.trim(),
          purchaseDate: new Date(data.purchaseDate),
          tax: data.tax,
          discount: data.discount,
          finalAmount: 0, // computed below
          notes: data.notes?.trim() || null,
        },
      });

      // 3. Create purchase items + individual tyres
      let finalAmount = 0;
      const createdTyreIds: string[] = [];

      for (const item of data.items) {
        const subtotal = item.quantity * item.unitPrice;
        const total = subtotal + item.tax - item.discount;
        finalAmount += total;

        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            tyreModelId: item.tyreModelId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tax: item.tax,
            discount: item.discount,
            subtotal,
            total,
          },
        });

        // 4. Create one Tyre record per physical tyre
        for (let i = 0; i < item.quantity; i++) {
          const internalId = `${prefix}-${String(nextSeq).padStart(6, "0")}`;
          nextSeq++;

          const tyre = await tx.tyre.create({
            data: {
              internalId,
              tyreModelId: item.tyreModelId,
              purchaseItemId: purchaseItem.id,
              purchaseId: purchase.id,
              vendorId: data.vendorId,
              purchaseDate: new Date(data.purchaseDate),
              unitPrice: item.unitPrice,
              status: "AVAILABLE",
            },
          });
          createdTyreIds.push(tyre.id);

          // 5. Record lifecycle event
          await tx.tyreLifecycleEvent.create({
            data: {
              tyreId: tyre.id,
              type: "PURCHASED",
              description: `Purchased from vendor (bill ${data.billNumber.trim()})`,
              occurredAt: new Date(data.purchaseDate),
              metadata: JSON.stringify({
                billNumber: data.billNumber.trim(),
                vendorId: data.vendorId,
                unitPrice: item.unitPrice,
              }),
            },
          });
        }
      }

      // 6. Update purchase final amount
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { finalAmount },
      });

      // 7. Update tyre ID sequence
      await tx.applicationSettings.update({
        where: { id: settings.id },
        data: { tyreIdNextSeq: nextSeq },
      });

      return { purchase, createdTyreIds, finalAmount };
    });

    // 8. Audit log (outside transaction — must never break the operation)
    await logActivity({
      action: "CREATE",
      entityType: "Purchase",
      entityId: result.purchase.id,
      description: `Purchase created — bill ${data.billNumber.trim()} for ${result.createdTyreIds.length} tyres`,
      newValue: JSON.stringify({ billNumber: data.billNumber.trim(), finalAmount: result.finalAmount }),
      purchaseId: result.purchase.id,
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    return { ok: true, id: result.purchase.id };
  } catch (error) {
    console.error("createPurchase failed:", error);
    return { ok: false, errors: { _form: "Failed to create purchase. The transaction was rolled back — no tyres were added." } };
  }
}

export async function deletePurchase(id: string) {
  try {
    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            tyres: { include: { installations: { select: { id: true } } } },
          },
        },
      },
    });
    if (!purchase) return { ok: false, errors: { _form: "Purchase not found." } };

    const tyres = purchase.items.flatMap((i) => i.tyres);
    const hasHistory = tyres.some(
      (t) => t.installations.length > 0 || t.status !== "AVAILABLE"
    );
    if (hasHistory) {
      return {
        ok: false,
        errors: {
          _form:
            "This purchase contains tyres that have been installed or used and cannot be permanently deleted.",
        },
      };
    }

    // Transactional delete: remove the tyres (lifecycle events cascade),
    // then the purchase (its items cascade). Nothing is left partially updated.
    await db.$transaction(async (tx) => {
      for (const t of tyres) {
        await tx.tyre.delete({ where: { id: t.id } });
      }
      await tx.purchase.delete({ where: { id } });
    });

    await logActivity({
      action: "DELETE",
      entityType: "Purchase",
      entityId: id,
      description: `Purchase bill ${purchase.billNumber} deleted (${tyres.length} tyres removed from inventory)`,
      previousValue: purchase.billNumber,
    });

    revalidatePath("/purchases");
    revalidatePath("/inventory");
    return { ok: true, deletedTyres: tyres.length };
  } catch (error) {
    console.error("deletePurchase failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this purchase. Please try again." } };
  }
}

export async function setPurchaseStatus(id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
  try {
    const purchase = await db.purchase.update({
      where: { id },
      data: { status },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Purchase",
      entityId: purchase.id,
      description: `Purchase bill ${purchase.billNumber} marked ${status.toLowerCase()}`,
      previousValue: status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      newValue: status,
      purchaseId: purchase.id,
    });

    revalidatePath("/purchases");
    return { ok: true };
  } catch (error) {
    console.error("setPurchaseStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update purchase status." } };
  }
}