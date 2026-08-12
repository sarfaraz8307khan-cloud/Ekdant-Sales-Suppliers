import { db } from "@/lib/db";
import { ExpenditureClient } from "./expenditure-client";

export const dynamic = "force-dynamic";

export default async function ExpenditurePage() {
  const [expenditures, vehicles, vendors] = await Promise.all([
    db.expenditure.findMany({
      orderBy: { date: "desc" },
      include: {
        vehicle: { select: { id: true, registrationNo: true } },
        vendor: { select: { id: true, name: true } },
      },
    }),
    db.vehicle.findMany({
      where: { status: "ACTIVE" },
      orderBy: { registrationNo: "asc" },
      select: { id: true, registrationNo: true },
    }),
    db.vendor.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serialized = expenditures.map((e) => ({
    ...e,
    quantity: e.quantity.toString(),
    unitCost: e.unitCost.toString(),
    tax: e.tax.toString(),
    discount: e.discount.toString(),
    total: e.total.toString(),
    date: e.date.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <ExpenditureClient
      initialExpenditures={serialized}
      vehicles={vehicles}
      vendors={vendors}
    />
  );
}