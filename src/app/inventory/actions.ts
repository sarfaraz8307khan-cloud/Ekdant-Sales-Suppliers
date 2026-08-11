"use server";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { TyreStatus } from "@/lib/types";

/**
 * Valid lifecycle transitions for manual status changes in inventory.
 * Installations/removals are handled by their own transactional workflows.
 */
const VALID_TRANSITIONS: Record<TyreStatus, TyreStatus[]> = {
  AVAILABLE: ["RESERVED", "DAMAGED", "SCRAPPED"],
  RESERVED: ["AVAILABLE"],
  // INSTALLED tyres may only leave this state through the removal/replacement
  // workflow (Phase 6). Blocking manual changes here prevents invalid states.
  INSTALLED: [],
  REMOVED: ["AVAILABLE", "WORN_OUT", "DAMAGED", "SCRAPPED"],
  // Worn/damaged tyres may be scrapped; damaged tyres may also be re-checked
  // back into service (repairable damage), but a worn tyre cannot return.
  WORN_OUT: ["SCRAPPED"],
  DAMAGED: ["AVAILABLE", "SCRAPPED"],
  SCRAPPED: [],
};

export async function setTyreStatus(
  tyreId: string,
  newStatus: TyreStatus,
  notes?: string
) {
  try {
    const tyre = await db.tyre.findUnique({
      where: { id: tyreId },
      include: {
        tyreModel: { select: { brand: true, name: true } },
      },
    });
    if (!tyre) {
      return { ok: false, errors: { _form: "Tyre not found." } };
    }

    const allowed = VALID_TRANSITIONS[tyre.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        ok: false,
        errors: {
          _form: `Tyre ${tyre.internalId} cannot be changed from ${tyre.status} to ${newStatus}.`,
        },
      };
    }

    await db.tyre.update({
      where: { id: tyreId },
      data: { status: newStatus },
    });

    await db.tyreLifecycleEvent.create({
      data: {
        tyreId,
        type: "STATUS_CHANGED",
        description: `Status changed from ${tyre.status} to ${newStatus}`,
        metadata: JSON.stringify({
          from: tyre.status,
          to: newStatus,
          notes: notes?.trim() || null,
        }),
      },
    });

    await logActivity({
      action: "STATUS_CHANGE",
      entityType: "Tyre",
      entityId: tyreId,
      description: `Tyre ${tyre.internalId} status changed from ${tyre.status} to ${newStatus}`,
      previousValue: tyre.status,
      newValue: newStatus,
      tyreId,
    });

    revalidatePath("/inventory");
    revalidatePath("/tyres");
    return { ok: true };
  } catch (error) {
    console.error("setTyreStatus failed:", error);
    return { ok: false, errors: { _form: "Failed to update tyre status." } };
  }
}