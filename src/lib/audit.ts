import { db } from "@/lib/db";

export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  previousValue?: string | null;
  newValue?: string | null;
  tyreId?: string;
  vehicleId?: string;
  purchaseId?: string;
}) {
  try {
    await db.activityLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        previousValue: params.previousValue,
        newValue: params.newValue,
        tyreId: params.tyreId,
        vehicleId: params.vehicleId,
        purchaseId: params.purchaseId,
      },
    });
  } catch (error) {
    // Audit logging must never break the primary operation.
    console.error("Failed to write activity log:", error);
  }
}