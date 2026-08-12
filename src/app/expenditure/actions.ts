"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type ActionResult = { ok: true } | { ok: false; errors: Record<string, string> };

function calculateTotal(quantity: number, unitCost: number, tax: number, discount: number): number {
  return Math.max(0, quantity * unitCost + tax - discount);
}

export type ExpenditureInput = {
  id?: string;
  date: string;
  category: string;
  description?: string;
  vehicleId?: string;
  vendorId?: string;
  quantity: number;
  unitCost: number;
  tax: number;
  discount: number;
  notes?: string;
};

export async function saveExpenditure(input: ExpenditureInput): Promise<ActionResult> {
  const errors: Record<string, string> = {};
  if (!input.date) errors.date = "Date is required";
  if (!input.category?.trim()) errors.category = "Category is required";
  if (!input.quantity || input.quantity <= 0 || isNaN(input.quantity)) errors.quantity = "Quantity must be greater than 0";
  if (input.unitCost === undefined || input.unitCost === null || input.unitCost < 0 || isNaN(input.unitCost)) errors.unitCost = "Unit cost cannot be negative";
  if (input.tax === undefined || input.tax === null || isNaN(input.tax)) errors.tax = "Tax must be a number";
  if (input.discount === undefined || input.discount === null || isNaN(input.discount)) errors.discount = "Discount must be a number";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const date = new Date(input.date);
  if (isNaN(date.getTime())) return { ok: false, errors: { date: "Invalid date" } };

  const quantity = Number(input.quantity);
  const unitCost = Number(input.unitCost);
  const tax = Number(input.tax);
  const discount = Number(input.discount);
  const total = calculateTotal(quantity, unitCost, tax, discount);

  try {
    if (input.id) {
      const existing = await db.expenditure.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, errors: { _form: "Expenditure record not found." } };

      await db.expenditure.update({
        where: { id: input.id },
        data: {
          date, category: input.category.trim(), description: input.description?.trim() || null,
          vehicleId: input.vehicleId || null, vendorId: input.vendorId || null,
          quantity, unitCost, tax, discount, total,
          notes: input.notes?.trim() || null,
        },
      });

      await logActivity({
        action: "UPDATE", entityType: "Expenditure", entityId: input.id,
        description: `Expenditure updated (${input.category.trim()}) — total ₹${total.toLocaleString("en-IN")}`,
        newValue: JSON.stringify({ total, category: input.category.trim() }),
      });
    } else {
      const created = await db.expenditure.create({
        data: {
          date, category: input.category.trim(), description: input.description?.trim() || null,
          vehicleId: input.vehicleId || null, vendorId: input.vendorId || null,
          quantity, unitCost, tax, discount, total,
          notes: input.notes?.trim() || null,
        },
      });

      await logActivity({
        action: "CREATE", entityType: "Expenditure", entityId: created.id,
        description: `Expenditure added (${input.category.trim()}) — total ₹${total.toLocaleString("en-IN")}`,
        newValue: JSON.stringify({ total, category: input.category.trim() }),
      });
    }

    revalidatePath("/expenditure");
    revalidatePath("/");
    revalidatePath("/reports");
    return { ok: true };
  } catch (error) {
    console.error("saveExpenditure failed:", error);
    return { ok: false, errors: { _form: "Unable to save the expenditure record. Please try again." } };
  }
}

export async function deleteExpenditure(id: string): Promise<ActionResult> {
  try {
    const existing = await db.expenditure.findUnique({ where: { id } });
    if (!existing) return { ok: false, errors: { _form: "Expenditure record not found." } };

    await db.expenditure.delete({ where: { id } });

    await logActivity({
      action: "DELETE", entityType: "Expenditure", entityId: id,
      description: `Expenditure deleted (${existing.category})`,
      previousValue: JSON.stringify({ total: existing.total.toString() }),
    });

    revalidatePath("/expenditure");
    revalidatePath("/");
    revalidatePath("/reports");
    return { ok: true };
  } catch (error) {
    console.error("deleteExpenditure failed:", error);
    return { ok: false, errors: { _form: "Unable to delete this record. Please try again." } };
  }
}