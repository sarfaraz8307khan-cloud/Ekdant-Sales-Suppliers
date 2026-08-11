import { db } from "@/lib/db";
import { PurchasesClient } from "./purchases-client";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const [purchases, vendors, tyreModels] = await Promise.all([
    db.purchase.findMany({
      orderBy: { purchaseDate: "desc" },
      include: {
        vendor: { select: { id: true, name: true } },
        items: {
          include: {
            tyreModel: { select: { id: true, brand: true, name: true, size: true } },
          },
        },
        _count: { select: { tyres: true } },
      },
    }),
    db.vendor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.tyreModel.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ brand: "asc" }, { name: "asc" }],
      select: { id: true, brand: true, name: true, size: true },
    }),
  ]);

  const serialized = purchases.map((p) => ({
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

  return (
    <PurchasesClient
      initialPurchases={serialized}
      vendors={vendors}
      tyreModels={tyreModels}
    />
  );
}