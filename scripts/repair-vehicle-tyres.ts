/**
 * Idempotent repair: allocates company-fitted initial tyres to every vehicle
 * that is missing them. Safe to run repeatedly — never creates duplicates,
 * never touches purchased inventory, never disturbs replacement history.
 *
 *   npx tsx scripts/repair-vehicle-tyres.ts
 */
import { db } from "../src/lib/db";
import { ensureVehicleTyres } from "../src/lib/vehicle-tyres";

async function main() {
  const vehicles = await db.vehicle.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, registrationNo: true },
  });

  let repaired = 0;
  let tyresCreated = 0;
  const details: string[] = [];

  for (const vehicle of vehicles) {
    const stats = await ensureVehicleTyres(vehicle.id);
    if (stats.created > 0) {
      repaired += 1;
      tyresCreated += stats.created;
      details.push(
        `${vehicle.registrationNo}: +${stats.created} (${stats.created}/${stats.total} positions)`
      );
    }
  }

  console.log(
    `Repaired ${repaired} vehicle(s), created ${tyresCreated} company-fitted initial tyre(s).`
  );
  for (const line of details) console.log(`  ${line}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
