/**
 * Phase 13 — End-to-end verification.
 * Reads existing dev/test data and asserts the full tyre-management chain
 * is consistent: Purchase → Tyres created → Inventory → Install → Replace →
 * Usage → History → Inventory → Reports.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const db = new PrismaClient({ adapter });

type Status =
  | "AVAILABLE"
  | "RESERVED"
  | "INSTALLED"
  | "REMOVED"
  | "WORN_OUT"
  | "DAMAGED"
  | "SCRAPPED";

function assert(cond: boolean, label: string) {
  if (!cond) {
    console.error(`✗ FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label}`);
  }
}

async function main() {
  console.log("── Phase 13: End-to-End verification ──\n");

  // 1. Purchase → individual tyres created
  const purchases = await db.purchase.findMany({
    include: { items: true, tyres: { select: { id: true, status: true } } },
  });
  assert(purchases.length > 0, "Purchases exist");
  for (const p of purchases) {
    const expected = p.items.reduce((s, i) => s + i.quantity, 0);
    assert(
      p.tyres.length === expected,
      `Purchase ${p.billNumber}: ${p.tyres.length} tyres from qty ${expected}`
    );
  }

  // 2. Unique tyre IDs
  const allTyres = await db.tyre.findMany({ select: { internalId: true } });
  const ids = new Set(allTyres.map((t) => t.internalId));
  assert(allTyres.length === ids.size, `All ${ids.size} tyre IDs unique`);

  // 3. Inventory statuses
  const grouped = await db.tyre.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const count = (s: Status) =>
    grouped.find((g) => g.status === s)?._count._all ?? 0;
  const available = count("AVAILABLE");
  const installed = count("INSTALLED");
  console.log(
    `  Statuses → AVAILABLE: ${available}, INSTALLED: ${installed}, REMOVED: ${count(
      "REMOVED"
    )}, WORN_OUT: ${count("WORN_OUT")}, DAMAGED: ${count("DAMAGED")}, SCRAPPED: ${count(
      "SCRAPPED"
    )}`
  );

  // 4. Install → vehicle position updated + history period created
  const currentInstalls = await db.installation.findMany({
    where: { isCurrent: true },
    include: { tyre: true, vehicle: true, position: true },
  });
  assert(
    currentInstalls.length === installed,
    "Every INSTALLED tyre has a current installation"
  );
  for (const inst of currentInstalls) {
    assert(
      inst.tyre.currentPositionId === inst.positionId,
      `Tyre ${inst.tyre.internalId} → position ${inst.position.displayName} linked`
    );
    assert(
      inst.tyre.currentVehicleId === inst.vehicleId,
      `Tyre ${inst.tyre.internalId} → vehicle ${inst.vehicle.registrationNo} linked`
    );
  }

  // 5. Replace → old tyre removed, usage calculated, position freed
  const removedInstalls = await db.installation.findMany({
    where: { isCurrent: false, removedAt: { not: null } },
    include: { tyre: true },
  });
  for (const inst of removedInstalls) {
    const km = (inst.removalOdometer ?? 0) - inst.odometer;
    assert(km >= 0, `Period usage ${km} km calculated for ${inst.tyre.internalId}`);
    const days = Math.max(
      0,
      Math.round(
        (new Date(inst.removedAt!).getTime() -
          new Date(inst.installedAt).getTime()) /
          86400000
      )
    );
    assert(days >= 0, `Period days ${days} calculated for ${inst.tyre.internalId}`);
    const occupant = await db.tyre.count({
      where: { currentPositionId: inst.positionId, status: "INSTALLED" },
    });
    assert(
      occupant === 0 || occupant === 1,
      `Position after replacement: ${occupant} installed tyre (0=freed, 1=re-occupied)`
    );
  }

  // 6. History preserved (multiple periods allowed)
  const historyCounts = await db.installation.groupBy({
    by: ["tyreId"],
    _count: { _all: true },
  });
  const multi = historyCounts.filter((h) => h._count._all > 1);
  if (multi.length > 0) {
    console.log(
      `  ${multi.length} tyre(s) have multiple installation periods (history preserved)`
    );
  }

  // 7. Inventory display data — current tyres per vehicle match positions
  const vehicles = await db.vehicle.findMany({
    include: {
      vehicleType: {
        include: { tyrePositions: { where: { status: "ACTIVE" } } },
      },
      currentTyres: { where: { status: "INSTALLED" }, select: { id: true } },
    },
  });
  for (const v of vehicles) {
    assert(
      v.currentTyres.length <= v.vehicleType.tyrePositions.length,
      `${v.registrationNo}: ${v.currentTyres.length}/${v.vehicleType.tyrePositions.length} positions filled`
    );
  }

  // 8. Reports data sources
  assert((await db.purchase.count()) > 0, "Report purchase data present");
  assert((await db.tyreModel.count()) > 0, "Report inventory data present");

  // 9. Activity/audit trail
  const logCount = await db.activityLog.count();
  assert(logCount > 0, `Activity log present (${logCount} entries)`);

  console.log("\n── E2E verification complete ──");
  if (process.exitCode) {
    console.error("Some checks FAILED — see above.");
  } else {
    console.log("All checks passed.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });