import Database from "better-sqlite3";
const db = new Database("dev.db");

const vehicles = db
  .prepare("SELECT id FROM Vehicle WHERE registrationNo LIKE 'TEST-%'")
  .all();
if (vehicles.length === 0) {
  console.log("No TEST-* vehicles found.");
  process.exit(0);
}

const ids = vehicles.map((v) => v.id);
const placeholders = ids.map(() => "?").join(",");

const tx = db.transaction(() => {
  const tyreIds = db
    .prepare(`SELECT id FROM Tyre WHERE currentVehicleId IN (${placeholders})`)
    .all(...ids)
    .map((t) => t.id);
  const tyrePh = tyreIds.map(() => "?").join(",") || "''";

  db.prepare(`DELETE FROM TyreLifecycleEvent WHERE tyreId IN (${tyrePh})`).run(...tyreIds);
  db.prepare(`DELETE FROM Installation WHERE vehicleId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM Tyre WHERE currentVehicleId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM OdometerReading WHERE vehicleId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM ActivityLog WHERE vehicleId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM ActivityLog WHERE entityType='Vehicle' AND entityId IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM Vehicle WHERE id IN (${placeholders})`).run(...ids);
});
tx();

console.log(`Removed ${ids.length} TEST vehicle(s) and their records.`);
