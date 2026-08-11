import { PrismaClient, Side, PositionType } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({ url: path.join(process.cwd(), "dev.db") });
const db = new PrismaClient({ adapter });

type Pos = { positionId: string; displayName: string; shortCode: string; side: Side; sequence: number; positionType: PositionType };
type AxleDef = { axleNumber: number; name: string; sequence: number; positions: Pos[] };

const P = (positionId: string, displayName: string, shortCode: string, side: Side, sequence: number, positionType: PositionType): Pos => ({ positionId, displayName, shortCode, side, sequence, positionType });

async function ensureAndSyncConfig(name: string, description: string, declaredAxles: number, declaredTyres: number, axles: AxleDef[]) {
  let vt = await db.vehicleType.findUnique({ where: { name } });
  if (!vt) {
    vt = await db.vehicleType.create({ data: { name, description, axleCount: declaredAxles, tyreCount: declaredTyres } });
  } else {
    vt = await db.vehicleType.update({ where: { id: vt.id }, data: { description, axleCount: declaredAxles, tyreCount: declaredTyres, status: "ACTIVE" } });
  }

  const existingAxles = await db.axle.findMany({ where: { vehicleTypeId: vt.id } });
  const existingPositions = await db.tyrePosition.findMany({ where: { vehicleTypeId: vt.id } });
  await db.axle.updateMany({ where: { vehicleTypeId: vt.id }, data: { status: "INACTIVE" } });
  await db.tyrePosition.updateMany({ where: { vehicleTypeId: vt.id }, data: { status: "INACTIVE" } });

  for (const a of axles) {
    let axle = existingAxles.find((x) => x.axleNumber === a.axleNumber);
    if (!axle) {
      axle = await db.axle.create({ data: { vehicleTypeId: vt.id, axleNumber: a.axleNumber, name: a.name, sequence: a.sequence } });
    } else {
      axle = await db.axle.update({ where: { id: axle.id }, data: { name: a.name, sequence: a.sequence, status: "ACTIVE" } });
    }
    for (const p of a.positions) {
      const pos = existingPositions.find((x) => x.axleId === axle!.id && x.positionId === p.positionId);
      if (!pos) {
        await db.tyrePosition.create({ data: { vehicleTypeId: vt.id, axleId: axle!.id, ...p } });
      } else {
        await db.tyrePosition.update({ where: { id: pos.id }, data: { ...p, status: "ACTIVE" } });
      }
    }
  }
  const posCount = axles.reduce((s, a) => s + a.positions.length, 0);
  console.log(`✔ Synced "${name}" → ${declaredAxles} axles declared, ${posCount} positions (tyreCount=${declaredTyres})`);
}

async function main() {
  // 12-Tyre Truck: 2 steer + 4 dual + 4 dual + 2 lift = 12
  await ensureAndSyncConfig(
    "12-Tyre Truck", "Standard 6x4 truck with 12 tyres", 4, 12,
    [
      { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
        P("L1", "Front Left", "FL", "LEFT", 1, "STEERING"),
        P("R1", "Front Right", "FR", "RIGHT", 2, "STEERING"),
      ]},
      { axleNumber: 2, name: "Drive Axle 1", sequence: 2, positions: [
        P("L2", "Drive 1 Left", "D1L", "LEFT", 3, "DRIVE"),
        P("R2", "Drive 1 Right", "D1R", "RIGHT", 4, "DRIVE"),
        P("L2I", "Drive 1 Left Inner", "D1LI", "LEFT", 5, "DRIVE"),
        P("R2I", "Drive 1 Right Inner", "D1RI", "RIGHT", 6, "DRIVE"),
      ]},
      { axleNumber: 3, name: "Drive Axle 2", sequence: 3, positions: [
        P("L3", "Drive 2 Left", "D2L", "LEFT", 7, "DRIVE"),
        P("R3", "Drive 2 Right", "D2R", "RIGHT", 8, "DRIVE"),
        P("L3I", "Drive 2 Left Inner", "D2LI", "LEFT", 9, "DRIVE"),
        P("R3I", "Drive 2 Right Inner", "D2RI", "RIGHT", 10, "DRIVE"),
      ]},
      { axleNumber: 4, name: "Lift Axle", sequence: 4, positions: [
        P("LL1", "Lift Left", "LL", "LEFT", 11, "LIFT"),
        P("LR1", "Lift Right", "LR", "RIGHT", 12, "LIFT"),
      ]},
    ]
  );

  // Remove incorrect 13-Tyre Truck (0 vehicles, 0 models — safe)
  const bad13 = await db.vehicleType.findUnique({ where: { name: "13-Tyre Truck" } });
  if (bad13) {
    const vehCount = await db.vehicle.count({ where: { vehicleTypeId: bad13.id } });
    const modelCount = await db.tyreModelVehicleType.count({ where: { vehicleTypeId: bad13.id } });
    if (vehCount === 0 && modelCount === 0) {
      await db.tyrePosition.deleteMany({ where: { vehicleTypeId: bad13.id } });
      await db.axle.deleteMany({ where: { vehicleTypeId: bad13.id } });
      await db.vehicleType.delete({ where: { id: bad13.id } });
      console.log("✔ Removed incorrect 13-Tyre Truck");
    } else {
      await db.vehicleType.update({ where: { id: bad13.id }, data: { status: "INACTIVE" } });
      console.log(`⚠ 13-Tyre Truck has ${vehCount} vehicles / ${modelCount} models — deactivated instead of deleted`);
    }
  }

  // 14-Tyre Truck: 2 + 2 + 4 + 4 + 2 lift = 14
  await ensureAndSyncConfig(
    "14-Tyre Truck", "8x4 truck with 14 tyres", 5, 14,
    [
      { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
        P("L1", "Front Left", "FL", "LEFT", 1, "STEERING"),
        P("R1", "Front Right", "FR", "RIGHT", 2, "STEERING"),
      ]},
      { axleNumber: 2, name: "Steering Axle 2", sequence: 2, positions: [
        P("L2", "Steer 2 Left", "S2L", "LEFT", 3, "STEERING"),
        P("R2", "Steer 2 Right", "S2R", "RIGHT", 4, "STEERING"),
      ]},
      { axleNumber: 3, name: "Drive Axle 1", sequence: 3, positions: [
        P("L3", "Drive 1 Left", "D1L", "LEFT", 5, "DRIVE"),
        P("R3", "Drive 1 Right", "D1R", "RIGHT", 6, "DRIVE"),
        P("L3I", "Drive 1 Left Inner", "D1LI", "LEFT", 7, "DRIVE"),
        P("R3I", "Drive 1 Right Inner", "D1RI", "RIGHT", 8, "DRIVE"),
      ]},
      { axleNumber: 4, name: "Drive Axle 2", sequence: 4, positions: [
        P("L4", "Drive 2 Left", "D2L", "LEFT", 9, "DRIVE"),
        P("R4", "Drive 2 Right", "D2R", "RIGHT", 10, "DRIVE"),
        P("L4I", "Drive 2 Left Inner", "D2LI", "LEFT", 11, "DRIVE"),
        P("R4I", "Drive 2 Right Inner", "D2RI", "RIGHT", 12, "DRIVE"),
      ]},
      { axleNumber: 5, name: "Lift Axle", sequence: 5, positions: [
        P("LL1", "Lift Left", "LL", "LEFT", 13, "LIFT"),
        P("LR1", "Lift Right", "LR", "RIGHT", 14, "LIFT"),
      ]},
    ]
  );

  // Deactivate the stray duplicate "14-Tyre Truck - 1" so it stops appearing,
  // and re-point any vehicles still attached to it to the proper 14-Tyre Truck.
  const dup = await db.vehicleType.findFirst({ where: { name: { startsWith: "14-Tyre Truck -" } } });
  if (dup) {
    const proper14 = await db.vehicleType.findUnique({ where: { name: "14-Tyre Truck" } });
    if (proper14) {
      const repointed = await db.vehicle.updateMany({
        where: { vehicleTypeId: dup.id },
        data: { vehicleTypeId: proper14.id },
      });
      if (repointed.count > 0) {
        console.log(`✔ Re-pointed ${repointed.count} vehicle(s) from "${dup.name}" → "14-Tyre Truck"`);
      }
    }
    await db.vehicleType.update({ where: { id: dup.id }, data: { status: "INACTIVE" } });
    console.log(`✔ Deactivated duplicate "${dup.name}"`);
  }

  // Repair duplicate position occupants from the earlier seed bug where
  // TYR-000011/TYR-000012 were installed at L1/R1 instead of LL1/LR1.
  const twelve = await db.vehicleType.findUnique({ where: { name: "12-Tyre Truck" } });
  if (twelve) {
    const ll1 = await db.tyrePosition.findFirst({ where: { vehicleTypeId: twelve.id, positionId: "LL1" } });
    const lr1 = await db.tyrePosition.findFirst({ where: { vehicleTypeId: twelve.id, positionId: "LR1" } });
    const relocations: { tyreId: string; targetPos: typeof ll1; label: string }[] = [];
    const t11 = await db.tyre.findUnique({ where: { internalId: "TYR-000011" } });
    const t12 = await db.tyre.findUnique({ where: { internalId: "TYR-000012" } });
    if (t11 && t11.currentPositionId && ll1) relocations.push({ tyreId: t11.id, targetPos: ll1, label: `${t11.internalId} → ${ll1.displayName}` });
    if (t12 && t12.currentPositionId && lr1) relocations.push({ tyreId: t12.id, targetPos: lr1, label: `${t12.internalId} → ${lr1.displayName}` });

    for (const r of relocations) {
      if (!r.targetPos) continue;
      const occupant = await db.tyre.count({ where: { currentPositionId: r.targetPos.id, status: "INSTALLED" } });
      if (occupant > 0) {
        console.log(`⚠ ${r.label} — target already occupied, skipped`);
        continue;
      }
      const currentInst = await db.installation.findFirst({ where: { tyreId: r.tyreId, isCurrent: true } });
      await db.$transaction(async (tx) => {
        if (currentInst) {
          await tx.installation.update({ where: { id: currentInst.id }, data: { positionId: r.targetPos!.id } });
        }
        await tx.tyre.update({ where: { id: r.tyreId }, data: { currentPositionId: r.targetPos!.id } });
      });
      console.log(`✔ ${r.label}`);
    }
  }

  // 16-Tyre Trailer — verify counts
  const t16 = await db.vehicleType.findUnique({ where: { name: "16-Tyre Trailer" } });
  if (t16) {
    const posCount = await db.tyrePosition.count({ where: { vehicleTypeId: t16.id, status: "ACTIVE" } });
    await db.vehicleType.update({ where: { id: t16.id }, data: { tyreCount: 16, axleCount: 4, status: "ACTIVE" } });
    console.log(`✔ Verified 16-Tyre Trailer (${posCount} active positions)`);
  }

  // 18-Tyre Bulker: 2 steer + 4 + 4 + 4 (tri-drive) + 2 lift + 2 super = 18
  await ensureAndSyncConfig(
    "18-Tyre Bulker", "Bulker with 18 tyres (tri-drive + lift + super single)", 6, 18,
    [
      { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
        P("L1", "Front Left", "FL", "LEFT", 1, "STEERING"),
        P("R1", "Front Right", "FR", "RIGHT", 2, "STEERING"),
      ]},
      { axleNumber: 2, name: "Drive Axle 1", sequence: 2, positions: [
        P("L2", "Drive 1 Left", "D1L", "LEFT", 3, "DRIVE"),
        P("R2", "Drive 1 Right", "D1R", "RIGHT", 4, "DRIVE"),
        P("L2I", "Drive 1 Left Inner", "D1LI", "LEFT", 5, "DRIVE"),
        P("R2I", "Drive 1 Right Inner", "D1RI", "RIGHT", 6, "DRIVE"),
      ]},
      { axleNumber: 3, name: "Drive Axle 2", sequence: 3, positions: [
        P("L3", "Drive 2 Left", "D2L", "LEFT", 7, "DRIVE"),
        P("R3", "Drive 2 Right", "D2R", "RIGHT", 8, "DRIVE"),
        P("L3I", "Drive 2 Left Inner", "D2LI", "LEFT", 9, "DRIVE"),
        P("R3I", "Drive 2 Right Inner", "D2RI", "RIGHT", 10, "DRIVE"),
      ]},
      { axleNumber: 4, name: "Drive Axle 3", sequence: 4, positions: [
        P("L4", "Drive 3 Left", "D3L", "LEFT", 11, "DRIVE"),
        P("R4", "Drive 3 Right", "D3R", "RIGHT", 12, "DRIVE"),
        P("L4I", "Drive 3 Left Inner", "D3LI", "LEFT", 13, "DRIVE"),
        P("R4I", "Drive 3 Right Inner", "D3RI", "RIGHT", 14, "DRIVE"),
      ]},
      { axleNumber: 5, name: "Lift Axle", sequence: 5, positions: [
        P("LL1", "Lift Left", "LL", "LEFT", 15, "LIFT"),
        P("LR1", "Lift Right", "LR", "RIGHT", 16, "LIFT"),
      ]},
      { axleNumber: 6, name: "Super Single Axle", sequence: 6, positions: [
        P("SL1", "Super Single Left", "SSL", "LEFT", 17, "DRIVE"),
        P("SR1", "Super Single Right", "SSR", "RIGHT", 18, "DRIVE"),
      ]},
    ]
  );

  console.log("\n✅ Configuration repair complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });