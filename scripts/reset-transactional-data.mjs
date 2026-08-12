#!/usr/bin/env node
/**
 * EKDANT — Transactional Data Reset
 *
 * Removes ALL test/demo BUSINESS records so the app is ready for real
 * manual data entry. Preserves the application structure:
 *
 *   KEPT:   User, PasswordReset (table), ApplicationSettings,
 *           VehicleType, Axle, TyrePosition, TyreModel,
 *           TyreModelVehicleType, RemovalReason
 *   WIPED:  Tyre, Installation, TyreLifecycleEvent, OdometerReading,
 *           ActivityLog, Expenditure, PurchaseItem, Purchase,
 *           Driver, Vendor, InventoryAdjustment
 *
 * Also resets the auto tyre-ID sequence (TYR-000001) so the first real
 * tyres start from a clean numbering.
 *
 * Safety: prints the row counts it is about to delete and requires an
 * explicit `--yes` flag before touching anything.
 *
 * Usage:  node scripts/reset-transactional-data.mjs --yes
 */
import Database from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.DB_PATH || join(root, "dev.db");

const wantConfirm = !process.argv.includes("--yes");
if (wantConfirm) {
  console.error("Refusing to run without confirmation. Pass --yes to execute.");
  console.error("  node scripts/reset-transactional-data.mjs --yes");
  process.exit(1);
}

const db = new Database(dbPath);

// Tables wiped (transactional business data), in FK-safe order.
const WIPE = [
  "TyreLifecycleEvent",
  "Installation",
  "OdometerReading",
  "ActivityLog",
  "Expenditure",
  "PurchaseItem",
  "Purchase",
  "Tyre",
  "Driver",
  "Vendor",
  "InventoryAdjustment",
  "Vehicle",
  "PasswordReset",
];

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c;

console.log("Will delete these transactional records:");
let total = 0;
for (const t of WIPE) {
  const c = count(t);
  total += c;
  console.log(`  ${t.padEnd(22)} ${c}`);
}
console.log(`  ${"TOTAL".padEnd(22)} ${total}`);
console.log("KEPT: User, ApplicationSettings, VehicleType, Axle, TyrePosition, TyreModel, TyreModelVehicleType, RemovalReason");
console.log("NOTE: Vehicle is transactional — test vehicles are removed too.");
console.log("");

const reset = db.transaction(() => {
  db.pragma("foreign_keys = OFF");
  try {
    for (const t of WIPE) db.prepare(`DELETE FROM "${t}"`).run();
    // Restart the auto tyre-ID sequence for real data entry.
    db.prepare('UPDATE "ApplicationSettings" SET "tyreIdNextSeq" = 1').run();
  } finally {
    db.pragma("foreign_keys = ON");
  }
});
reset();

console.log("Reset complete. Remaining counts:");
for (const t of ["Vehicle", "Tyre", "Installation", "Driver", "Vendor", "Purchase", "Expenditure", "ActivityLog", "TyreLifecycleEvent"]) {
  console.log(`  ${t.padEnd(15)} ${count(t)}`);
}
console.log(`  tyreIdNextSeq = ${db.prepare('SELECT "tyreIdNextSeq" s FROM "ApplicationSettings" LIMIT 1').get().s}`);
db.close();
