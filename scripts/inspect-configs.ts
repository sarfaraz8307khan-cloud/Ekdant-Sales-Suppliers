import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: path.join(process.cwd(), "dev.db") }),
});

async function main() {
  const types = await db.vehicleType.findMany({
    include: {
      axles: {
        orderBy: { sequence: "asc" },
        include: { positions: { orderBy: { sequence: "asc" } } },
      },
    },
  });
  for (const t of types) {
    console.log(
      `\n${t.name} (tyreCount=${t.tyreCount}, pos=${
        t.axles.reduce((s, a) => s + a.positions.length, 0)
      }):`
    );
    for (const a of t.axles) {
      console.log(
        `  Axle ${a.axleNumber} ${a.name}: ${a.positions
          .map((p) => `${p.positionId}[${p.status}]`)
          .join(", ")}`
      );
    }
  }
  console.log("\n-- Duplicate position occupant check --");
  const tyres = await db.tyre.findMany({
    where: { status: "INSTALLED" },
    select: { internalId: true, currentPositionId: true, currentVehicleId: true },
    orderBy: { currentPositionId: "asc" },
  });
  const byPos = new Map<string, string[]>();
  for (const t of tyres) {
    if (!t.currentPositionId) continue;
    const arr = byPos.get(t.currentPositionId) ?? [];
    arr.push(t.internalId);
    byPos.set(t.currentPositionId, arr);
  }
  for (const [pos, list] of byPos) {
    if (list.length > 1) console.log(`  DUP ${pos}: ${list.join(", ")}`);
  }
  console.log("\nVehicles:");
  const vehicles = await db.vehicle.findMany({
    select: { registrationNo: true, vehicleType: { select: { name: true } } },
  });
  for (const v of vehicles) console.log(`  ${v.registrationNo} → ${v.vehicleType.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });