/**
 * EKDANT — Seed client-demo fleet
 *
 * Adds the 4 MRF tyre models and 8 vehicles (each with its company-fitted
 * factory tyres) requested for the client demo. Idempotent — safe to run
 * repeatedly: models/vehicles are upserted by their unique keys and
 * factory tyres are only ever filled for missing positions.
 *
 *   npx tsx scripts/seed-fleet.ts
 */
import { db } from "../src/lib/db";
import { ensureVehicleTyres } from "../src/lib/vehicle-tyres";

const MODELS: { brand: string; name: string; size: string }[] = [
  { brand: "MRF", name: "295R20", size: "S3C8" },
  { brand: "MRF", name: "295R20", size: "S1M4" },
  { brand: "MRF", name: "10R20", size: "S3C8" },
  { brand: "MRF", name: "10R20", size: "S1M4" },
];

const VEHICLES: { reg: string; typeName: string; location: string }[] = [
  { reg: "MH12UM5343", typeName: "14-Tyre Truck", location: "Ekdant Yard" },
  { reg: "MH12VT5343", typeName: "14-Tyre Truck", location: "Ekdant Yard" },
  { reg: "MH12WJ5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
  { reg: "MH12WX5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
  { reg: "MH12YB5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
  { reg: "MH12YQ5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
  { reg: "MH12YL5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
  { reg: "MH12ZQ5343", typeName: "16-Tyre Trailer", location: "Ekdant Yard" },
];

async function main() {
  const types = await db.vehicleType.findMany();
  const typeByName = new Map(types.map((t) => [t.name, t]));
  if (types.length === 0) {
    console.error("No vehicle types configured — run migrations/seed first.");
    process.exit(1);
  }

  // 1. Tyre models — upsert by unique (brand, name, size), link to every
  //    vehicle type so they are selectable for replacement on all vehicles.
  let modelsCreated = 0;
  for (const m of MODELS) {
    let model = await db.tyreModel.findUnique({
      where: { brand_name_size: { brand: m.brand, name: m.name, size: m.size } },
    });
    if (!model) {
      model = await db.tyreModel.create({
        data: {
          ...m,
          compatibleVehicleTypes: { create: types.map((t) => ({ vehicleTypeId: t.id })) },
        },
      });
      modelsCreated += 1;
      console.log(`  + model ${m.brand} ${m.name} ${m.size}`);
    }
    for (const t of types) {
      const link = await db.tyreModelVehicleType.findUnique({
        where: { tyreModelId_vehicleTypeId: { tyreModelId: model.id, vehicleTypeId: t.id } },
      });
      if (!link) {
        await db.tyreModelVehicleType.create({
          data: { tyreModelId: model.id, vehicleTypeId: t.id },
        });
        console.log(`    ~ linked ${m.name} ${m.size} to ${t.name}`);
      }
    }
  }

  // 2. Vehicles — upsert by registration number, then fill factory tyres.
  let vehiclesCreated = 0;
  let tyresCreated = 0;
  for (const v of VEHICLES) {
    const type = typeByName.get(v.typeName);
    if (!type) {
      console.error(`  !! Missing vehicle type "${v.typeName}" — skipped ${v.reg}`);
      continue;
    }
    let vehicle = await db.vehicle.findUnique({ where: { registrationNo: v.reg } });
    if (!vehicle) {
      vehicle = await db.vehicle.create({
        data: {
          registrationNo: v.reg,
          vehicleTypeId: type.id,
          currentOdometer: 0,
          vehicleDate: new Date(),
          location: v.location,
        },
      });
      vehiclesCreated += 1;
      console.log(`  + vehicle ${v.reg} (${type.name})`);
    }
    const stats = await ensureVehicleTyres(vehicle.id);
    tyresCreated += stats.created;
    if (stats.created > 0) {
      console.log(`    ~ allocated ${stats.created} factory-fitted tyres (${stats.total} positions)`);
    }
  }

  console.log(
    `\nDone: ${modelsCreated} model(s) created, ${vehiclesCreated} vehicle(s) created, ${tyresCreated} factory tyre(s) allocated.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
