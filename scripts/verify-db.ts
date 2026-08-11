import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});
const db = new PrismaClient({ adapter });

async function main() {
  const tyres = await db.tyre.count();
  const installed = await db.tyre.count({ where: { status: "INSTALLED" } });
  const available = await db.tyre.count({ where: { status: "AVAILABLE" } });
  const worn = await db.tyre.count({ where: { status: "WORN_OUT" } });
  const installs = await db.installation.count();
  const events = await db.tyreLifecycleEvent.count();
  const purchases = await db.purchase.count();
  const logs = await db.activityLog.count();
  const vehicles = await db.vehicle.count();
  const positions = await db.tyrePosition.count();
  const models = await db.tyreModel.count();
  const vendors = await db.vendor.count();
  const drivers = await db.driver.count();
  const vehicleTypes = await db.vehicleType.count();
  const axles = await db.axle.count();
  const removalReasons = await db.removalReason.count();
  const odometerReadings = await db.odometerReading.count();

  console.log(
    JSON.stringify(
      {
        vehicleTypes,
        axles,
        positions,
        models,
        vendors,
        drivers,
        vehicles,
        tyres,
        installed,
        available,
        worn,
        installs,
        events,
        purchases,
        logs,
        removalReasons,
        odometerReadings,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });