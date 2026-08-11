import { db } from "@/lib/db";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [purchases, tyreModels, vehicles, tyres, settings] = await Promise.all([
    db.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        vendor: { select: { id: true, name: true } },
        items: {
          include: {
            tyreModel: { select: { id: true, brand: true, name: true, size: true } },
          },
        },
      },
    }),
    db.tyreModel.findMany({
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            tyres: true,
          },
        },
      },
    }),
    db.vehicle.findMany({
      orderBy: { registrationNo: "asc" },
      include: {
        vehicleType: {
          select: {
            id: true,
            name: true,
            tyrePositions: {
              where: { status: "ACTIVE" },
              orderBy: { sequence: "asc" },
              select: {
                id: true,
                displayName: true,
                shortCode: true,
                side: true,
                positionType: true,
              },
            },
          },
        },
        currentTyres: {
          where: { status: "INSTALLED" },
          select: {
            id: true,
            internalId: true,
            tyreModel: { select: { id: true, brand: true, name: true, size: true } },
            currentPositionId: true,
            installations: {
              where: { isCurrent: true },
              take: 1,
              orderBy: { installedAt: "desc" },
              select: {
                id: true,
                installedAt: true,
                odometer: true,
              },
            },
          },
        },
        installations: {
          where: { isCurrent: false },
          select: { id: true },
        },
      },
    }),
    db.tyre.findMany({
      orderBy: { internalId: "asc" },
      include: {
        tyreModel: { select: { id: true, brand: true, name: true, size: true } },
        vendor: { select: { id: true, name: true } },
        purchase: { select: { id: true, billNumber: true, purchaseDate: true } },
        installations: {
          orderBy: { installedAt: "asc" },
          select: {
            id: true,
            installedAt: true,
            odometer: true,
            removedAt: true,
            removalOdometer: true,
            vehicle: { select: { id: true, registrationNo: true } },
            position: { select: { id: true, displayName: true } },
            removalReason: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.applicationSettings.findFirst(),
  ]);

  const serializedPurchases = purchases.map((p) => ({
    ...p,
    tax: p.tax.toString(),
    discount: p.discount.toString(),
    finalAmount: p.finalAmount.toString(),
    items: p.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
      tax: i.tax.toString(),
      discount: i.discount.toString(),
      subtotal: i.subtotal.toString(),
      total: i.total.toString(),
    })),
  }));

  const serializedTyres = tyres.map((t) => ({
    ...t,
    unitPrice: t.unitPrice ? t.unitPrice.toString() : null,
  }));

  return (
    <ReportsClient
      purchases={serializedPurchases}
      tyreModels={tyreModels}
      vehicles={vehicles}
      tyres={serializedTyres}
      businessName={settings?.businessName ?? "Ekdant Sales & Suppliers"}
      logoPath={settings?.logoPath ?? null}
    />
  );
}