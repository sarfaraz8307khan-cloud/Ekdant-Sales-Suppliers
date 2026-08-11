import { db } from "@/lib/db";
import { VendorsClient } from "./vendors-client";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const vendors = await db.vendor.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { purchases: true, tyres: true },
      },
    },
  });

  return <VendorsClient initialVendors={vendors} />;
}