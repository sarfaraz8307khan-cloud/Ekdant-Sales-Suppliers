import { PrismaClient, Side, PositionType } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: path.join(process.cwd(), "dev.db"),
});

const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Settings ──────────────────────────────────────────────
  const settings = await db.applicationSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "Ekdant Sales & Suppliers",
      currency: "INR",
      dateFormat: "dd MMM yyyy",
      tyreIdPrefix: "TYR",
      tyreIdNextSeq: 1,
    },
  });

  // ── Removal reasons ───────────────────────────────────────
  const removalReasons = [
    { name: "Worn Out", description: "Tread worn beyond legal/safe limit" },
    { name: "Damage", description: "Puncture, cut, bulge or structural damage" },
    { name: "Burst", description: "Sudden tyre burst" },
    { name: "Retread", description: "Sent for retreading" },
    { name: "Scrap", description: "End of life — scrapped" },
  ];
  for (const r of removalReasons) {
    await db.removalReason.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  // ── Vehicle types with dynamic configurations ─────────────
  const configs = [
    {
      name: "12-Tyre Truck",
      description: "Standard 6x4 truck with 12 tyres",
      axleCount: 3,
      tyreCount: 12,
      axles: [
        { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
          { positionId: "L1", displayName: "Front Left", shortCode: "FL", side: "LEFT", sequence: 1, positionType: "STEERING" },
          { positionId: "R1", displayName: "Front Right", shortCode: "FR", side: "RIGHT", sequence: 2, positionType: "STEERING" },
        ]},
        { axleNumber: 2, name: "Drive Axle 1", sequence: 2, positions: [
          { positionId: "L2", displayName: "Drive 1 Left", shortCode: "D1L", side: "LEFT", sequence: 3, positionType: "DRIVE" },
          { positionId: "R2", displayName: "Drive 1 Right", shortCode: "D1R", side: "RIGHT", sequence: 4, positionType: "DRIVE" },
          { positionId: "L2I", displayName: "Drive 1 Left Inner", shortCode: "D1LI", side: "LEFT", sequence: 5, positionType: "DRIVE" },
          { positionId: "R2I", displayName: "Drive 1 Right Inner", shortCode: "D1RI", side: "RIGHT", sequence: 6, positionType: "DRIVE" },
        ]},
        { axleNumber: 3, name: "Drive Axle 2", sequence: 3, positions: [
          { positionId: "L3", displayName: "Drive 2 Left", shortCode: "D2L", side: "LEFT", sequence: 7, positionType: "DRIVE" },
          { positionId: "R3", displayName: "Drive 2 Right", shortCode: "D2R", side: "RIGHT", sequence: 8, positionType: "DRIVE" },
          { positionId: "L3I", displayName: "Drive 2 Left Inner", shortCode: "D2LI", side: "LEFT", sequence: 9, positionType: "DRIVE" },
          { positionId: "R3I", displayName: "Drive 2 Right Inner", shortCode: "D2RI", side: "RIGHT", sequence: 10, positionType: "DRIVE" },
        ]},
      ],
    },
    {
      name: "13-Tyre Truck",
      description: "6x4 truck with 13 tyres (single front + dual drive)",
      axleCount: 3,
      tyreCount: 13,
      axles: [
        { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
          { positionId: "L1", displayName: "Front Left", shortCode: "FL", side: "LEFT", sequence: 1, positionType: "STEERING" },
          { positionId: "R1", displayName: "Front Right", shortCode: "FR", side: "RIGHT", sequence: 2, positionType: "STEERING" },
        ]},
        { axleNumber: 2, name: "Drive Axle 1", sequence: 2, positions: [
          { positionId: "L2", displayName: "Drive 1 Left", shortCode: "D1L", side: "LEFT", sequence: 3, positionType: "DRIVE" },
          { positionId: "R2", displayName: "Drive 1 Right", shortCode: "D1R", side: "RIGHT", sequence: 4, positionType: "DRIVE" },
          { positionId: "L2I", displayName: "Drive 1 Left Inner", shortCode: "D1LI", side: "LEFT", sequence: 5, positionType: "DRIVE" },
          { positionId: "R2I", displayName: "Drive 1 Right Inner", shortCode: "D1RI", side: "RIGHT", sequence: 6, positionType: "DRIVE" },
        ]},
        { axleNumber: 3, name: "Drive Axle 2", sequence: 3, positions: [
          { positionId: "L3", displayName: "Drive 2 Left", shortCode: "D2L", side: "LEFT", sequence: 7, positionType: "DRIVE" },
          { positionId: "R3", displayName: "Drive 2 Right", shortCode: "D2R", side: "RIGHT", sequence: 8, positionType: "DRIVE" },
          { positionId: "L3I", displayName: "Drive 2 Left Inner", shortCode: "D2LI", side: "LEFT", sequence: 9, positionType: "DRIVE" },
          { positionId: "R3I", displayName: "Drive 2 Right Inner", shortCode: "D2RI", side: "RIGHT", sequence: 10, positionType: "DRIVE" },
          { positionId: "L3X", displayName: "Drive 2 Left Extra", shortCode: "D2LX", side: "LEFT", sequence: 11, positionType: "DRIVE" },
          { positionId: "R3X", displayName: "Drive 2 Right Extra", shortCode: "D2RX", side: "RIGHT", sequence: 12, positionType: "DRIVE" },
        ]},
      ],
    },
    {
      name: "14-Tyre Truck",
      description: "8x4 truck with 14 tyres",
      axleCount: 4,
      tyreCount: 14,
      axles: [
        { axleNumber: 1, name: "Front Axle", sequence: 1, positions: [
          { positionId: "L1", displayName: "Front Left", shortCode: "FL", side: "LEFT", sequence: 1, positionType: "STEERING" },
          { positionId: "R1", displayName: "Front Right", shortCode: "FR", side: "RIGHT", sequence: 2, positionType: "STEERING" },
        ]},
        { axleNumber: 2, name: "Steering Axle 2", sequence: 2, positions: [
          { positionId: "L2", displayName: "Steer 2 Left", shortCode: "S2L", side: "LEFT", sequence: 3, positionType: "STEERING" },
          { positionId: "R2", displayName: "Steer 2 Right", shortCode: "S2R", side: "RIGHT", sequence: 4, positionType: "STEERING" },
        ]},
        { axleNumber: 3, name: "Drive Axle 1", sequence: 3, positions: [
          { positionId: "L3", displayName: "Drive 1 Left", shortCode: "D1L", side: "LEFT", sequence: 5, positionType: "DRIVE" },
          { positionId: "R3", displayName: "Drive 1 Right", shortCode: "D1R", side: "RIGHT", sequence: 6, positionType: "DRIVE" },
          { positionId: "L3I", displayName: "Drive 1 Left Inner", shortCode: "D1LI", side: "LEFT", sequence: 7, positionType: "DRIVE" },
          { positionId: "R3I", displayName: "Drive 1 Right Inner", shortCode: "D1RI", side: "RIGHT", sequence: 8, positionType: "DRIVE" },
        ]},
        { axleNumber: 4, name: "Drive Axle 2", sequence: 4, positions: [
          { positionId: "L4", displayName: "Drive 2 Left", shortCode: "D2L", side: "LEFT", sequence: 9, positionType: "DRIVE" },
          { positionId: "R4", displayName: "Drive 2 Right", shortCode: "D2R", side: "RIGHT", sequence: 10, positionType: "DRIVE" },
          { positionId: "L4I", displayName: "Drive 2 Left Inner", shortCode: "D2LI", side: "LEFT", sequence: 11, positionType: "DRIVE" },
          { positionId: "R4I", displayName: "Drive 2 Right Inner", shortCode: "D2RI", side: "RIGHT", sequence: 12, positionType: "DRIVE" },
        ]},
      ],
    },
    {
      name: "16-Tyre Trailer",
      description: "Trailer with 16 tyres",
      axleCount: 4,
      tyreCount: 16,
      axles: [
        { axleNumber: 1, name: "Trailer Axle 1", sequence: 1, positions: [
          { positionId: "L1", displayName: "Trailer 1 Left", shortCode: "T1L", side: "LEFT", sequence: 1, positionType: "TRAILER" },
          { positionId: "R1", displayName: "Trailer 1 Right", shortCode: "T1R", side: "RIGHT", sequence: 2, positionType: "TRAILER" },
          { positionId: "L1I", displayName: "Trailer 1 Left Inner", shortCode: "T1LI", side: "LEFT", sequence: 3, positionType: "TRAILER" },
          { positionId: "R1I", displayName: "Trailer 1 Right Inner", shortCode: "T1RI", side: "RIGHT", sequence: 4, positionType: "TRAILER" },
        ]},
        { axleNumber: 2, name: "Trailer Axle 2", sequence: 2, positions: [
          { positionId: "L2", displayName: "Trailer 2 Left", shortCode: "T2L", side: "LEFT", sequence: 5, positionType: "TRAILER" },
          { positionId: "R2", displayName: "Trailer 2 Right", shortCode: "T2R", side: "RIGHT", sequence: 6, positionType: "TRAILER" },
          { positionId: "L2I", displayName: "Trailer 2 Left Inner", shortCode: "T2LI", side: "LEFT", sequence: 7, positionType: "TRAILER" },
          { positionId: "R2I", displayName: "Trailer 2 Right Inner", shortCode: "T2RI", side: "RIGHT", sequence: 8, positionType: "TRAILER" },
        ]},
        { axleNumber: 3, name: "Trailer Axle 3", sequence: 3, positions: [
          { positionId: "L3", displayName: "Trailer 3 Left", shortCode: "T3L", side: "LEFT", sequence: 9, positionType: "TRAILER" },
          { positionId: "R3", displayName: "Trailer 3 Right", shortCode: "T3R", side: "RIGHT", sequence: 10, positionType: "TRAILER" },
          { positionId: "L3I", displayName: "Trailer 3 Left Inner", shortCode: "T3LI", side: "LEFT", sequence: 11, positionType: "TRAILER" },
          { positionId: "R3I", displayName: "Trailer 3 Right Inner", shortCode: "T3RI", side: "RIGHT", sequence: 12, positionType: "TRAILER" },
        ]},
        { axleNumber: 4, name: "Trailer Axle 4", sequence: 4, positions: [
          { positionId: "L4", displayName: "Trailer 4 Left", shortCode: "T4L", side: "LEFT", sequence: 13, positionType: "TRAILER" },
          { positionId: "R4", displayName: "Trailer 4 Right", shortCode: "T4R", side: "RIGHT", sequence: 14, positionType: "TRAILER" },
          { positionId: "L4I", displayName: "Trailer 4 Left Inner", shortCode: "T4LI", side: "LEFT", sequence: 15, positionType: "TRAILER" },
          { positionId: "R4I", displayName: "Trailer 4 Right Inner", shortCode: "T4RI", side: "RIGHT", sequence: 16, positionType: "TRAILER" },
        ]},
      ],
    },
  ];

  const vehicleTypeIds: Record<string, string> = {};
  for (const cfg of configs) {
    const existing = await db.vehicleType.findUnique({ where: { name: cfg.name } });
    if (existing) {
      vehicleTypeIds[cfg.name] = existing.id;
      continue;
    }
    const vt = await db.vehicleType.create({
      data: {
        name: cfg.name,
        description: cfg.description,
        axleCount: cfg.axleCount,
        tyreCount: cfg.tyreCount,
      },
    });
    vehicleTypeIds[cfg.name] = vt.id;

    for (const a of cfg.axles) {
      const axle = await db.axle.create({
        data: {
          vehicleTypeId: vt.id,
          axleNumber: a.axleNumber,
          name: a.name,
          sequence: a.sequence,
        },
      });
      for (const p of a.positions) {
        await db.tyrePosition.create({
          data: {
            vehicleTypeId: vt.id,
            axleId: axle.id,
            positionId: p.positionId,
            displayName: p.displayName,
            shortCode: p.shortCode,
            side: p.side as Side,
            sequence: p.sequence,
            positionType: p.positionType as PositionType,
          },
        });
      }
    }
  }

  // ── Tyre models ───────────────────────────────────────────
  const tyreModels = [
    { brand: "MRF", name: "Muscle Drive", size: "12.00 R20", minStockLevel: 4, compatible: ["12-Tyre Truck", "13-Tyre Truck", "14-Tyre Truck"] },
    { brand: "MRF", name: "Steer Master", size: "10.00 R20", minStockLevel: 3, compatible: ["12-Tyre Truck", "13-Tyre Truck", "14-Tyre Truck"] },
    { brand: "CEAT", name: "Drive Plus", size: "12.00 R20", minStockLevel: 4, compatible: ["12-Tyre Truck", "13-Tyre Truck", "14-Tyre Truck"] },
    { brand: "Apollo", name: "EnduRace", size: "12.00 R20", minStockLevel: 3, compatible: ["12-Tyre Truck", "13-Tyre Truck", "14-Tyre Truck"] },
    { brand: "JK Tyre", name: "Trailer King", size: "10.00 R20", minStockLevel: 4, compatible: ["16-Tyre Trailer"] },
  ];

  const tyreModelIds: Record<string, string> = {};
  for (const m of tyreModels) {
    const existing = await db.tyreModel.findUnique({
      where: { brand_name_size: { brand: m.brand, name: m.name, size: m.size } },
    });
    if (existing) {
      tyreModelIds[`${m.brand}|${m.name}`] = existing.id;
      continue;
    }
    const model = await db.tyreModel.create({
      data: {
        brand: m.brand,
        name: m.name,
        size: m.size,
        minStockLevel: m.minStockLevel,
        compatibleVehicleTypes: {
          create: m.compatible.map((vtName) => ({
            vehicleType: { connect: { id: vehicleTypeIds[vtName] } },
          })),
        },
      },
    });
    tyreModelIds[`${m.brand}|${m.name}`] = model.id;
  }

  // ── Vendors ───────────────────────────────────────────────
  const vendors = [
    { name: "ABC Tyres", contactPerson: "Ramesh Kumar", phone: "9876543210", email: "sales@abctyres.in", address: "Mumbai, MH", gstNumber: "27ABCDE1234F1Z5" },
    { name: "Shree Balaji Tyres", contactPerson: "Suresh Patil", phone: "9876501234", email: "balaji.tyres@gmail.com", address: "Pune, MH", gstNumber: "27XYZAB5678G1Z2" },
    { name: "Highway Tyre House", contactPerson: "Amit Shah", phone: "9822012345", email: "highwaytyre@yahoo.com", address: "Nagpur, MH", gstNumber: "27LMNOP9012H1Z3" },
  ];
  const vendorIds: Record<string, string> = {};
  for (const v of vendors) {
    const existing = await db.vendor.findFirst({ where: { name: v.name } });
    if (existing) {
      vendorIds[v.name] = existing.id;
      continue;
    }
    const vendor = await db.vendor.create({ data: v });
    vendorIds[v.name] = vendor.id;
  }

  // ── Drivers ───────────────────────────────────────────────
  const drivers = [
    { name: "Rajesh Kumar", phone: "9988776655", licenceNo: "MH12-2020-12345", address: "Nashik, MH" },
    { name: "Suresh Yadav", phone: "9988771122", licenceNo: "MH14-2019-54321", address: "Aurangabad, MH" },
    { name: "Vikram Singh", phone: "9988001122", licenceNo: "MH12-2021-98765", address: "Pune, MH" },
    { name: "Mahesh Patil", phone: "9988112233", licenceNo: "MH15-2018-45678", address: "Kolhapur, MH" },
  ];
  const driverIds: Record<string, string> = {};
  for (const d of drivers) {
    const existing = await db.driver.findFirst({ where: { name: d.name } });
    if (existing) {
      driverIds[d.name] = existing.id;
      continue;
    }
    const driver = await db.driver.create({ data: d });
    driverIds[d.name] = driver.id;
  }

  // ── Vehicles ──────────────────────────────────────────────
  const vehicles = [
    { registrationNo: "MH-12-AB-1234", vehicleType: "12-Tyre Truck", driver: "Rajesh Kumar", odometer: 125450 },
    { registrationNo: "MH-14-CD-5678", vehicleType: "13-Tyre Truck", driver: "Suresh Yadav", odometer: 98720 },
    { registrationNo: "MH-12-EF-9012", vehicleType: "14-Tyre Truck", driver: "Vikram Singh", odometer: 152300 },
    { registrationNo: "MH-15-GH-3456", vehicleType: "16-Tyre Trailer", driver: "Mahesh Patil", odometer: 65400 },
  ];
  const vehicleIds: Record<string, string> = {};
  for (const v of vehicles) {
    const existing = await db.vehicle.findUnique({ where: { registrationNo: v.registrationNo } });
    if (existing) {
      vehicleIds[v.registrationNo] = existing.id;
      continue;
    }
    const vehicle = await db.vehicle.create({
      data: {
        registrationNo: v.registrationNo,
        vehicleTypeId: vehicleTypeIds[v.vehicleType],
        driverId: driverIds[v.driver],
        currentOdometer: v.odometer,
      },
    });
    vehicleIds[v.registrationNo] = vehicle.id;
  }

  // ── Purchases & tyres ─────────────────────────────────────
  const purchases = [
    {
      vendor: "ABC Tyres",
      billNumber: "INV-2026-001",
      purchaseDate: new Date("2026-01-10"),
      tax: 18000,
      discount: 0,
      items: [
        { modelKey: "MRF|Muscle Drive", quantity: 8, unitPrice: 18500 },
        { modelKey: "MRF|Steer Master", quantity: 4, unitPrice: 14500 },
      ],
    },
    {
      vendor: "Shree Balaji Tyres",
      billNumber: "INV-2026-002",
      purchaseDate: new Date("2026-02-15"),
      tax: 12000,
      discount: 2000,
      items: [
        { modelKey: "CEAT|Drive Plus", quantity: 6, unitPrice: 17500 },
      ],
    },
    {
      vendor: "Highway Tyre House",
      billNumber: "INV-2026-003",
      purchaseDate: new Date("2026-03-20"),
      tax: 15000,
      discount: 0,
      items: [
        { modelKey: "Apollo|EnduRace", quantity: 6, unitPrice: 19000 },
        { modelKey: "JK Tyre|Trailer King", quantity: 8, unitPrice: 15500 },
      ],
    },
  ];

  // Start from the persisted sequence so re-running the seed never
  // collides with tyres already created by purchases. Also scan the
  // highest existing tyre ID so the sequence self-heals even if the
  // settings row was never updated (e.g. older seed runs).
  const existingTyres = await db.tyre.findMany({
    select: { internalId: true },
  });
  let maxExistingSeq = 0;
  for (const t of existingTyres) {
    const match = t.internalId.match(/(\d+)$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxExistingSeq) maxExistingSeq = seq;
    }
  }
  let tyreSeq = Math.max(settings.tyreIdNextSeq, maxExistingSeq + 1);
  const tyreIds: string[] = [];

  for (const p of purchases) {
    const existing = await db.purchase.findUnique({
      where: { billNumber_vendorId: { billNumber: p.billNumber, vendorId: vendorIds[p.vendor] } },
    });
    if (existing) continue;

    const itemData = p.items.map((i) => {
      const subtotal = i.quantity * i.unitPrice;
      const total = subtotal + p.tax - p.discount;
      return {
        tyreModelId: tyreModelIds[i.modelKey],
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        tax: p.tax,
        discount: p.discount,
        subtotal,
        total,
      };
    });

    const finalAmount = itemData.reduce((s, i) => s + i.total, 0);

    const purchase = await db.purchase.create({
      data: {
        billNumber: p.billNumber,
        vendorId: vendorIds[p.vendor],
        purchaseDate: p.purchaseDate,
        tax: p.tax,
        discount: p.discount,
        finalAmount,
        items: { create: itemData },
      },
      include: { items: true },
    });

    for (const item of purchase.items) {
      const model = await db.tyreModel.findUnique({ where: { id: item.tyreModelId } });
      if (!model) continue;
      for (let n = 0; n < item.quantity; n++) {
        const internalId = `TYR-${String(tyreSeq).padStart(6, "0")}`;
        tyreSeq++;
        const tyre = await db.tyre.create({
          data: {
            internalId,
            tyreModelId: item.tyreModelId,
            purchaseItemId: item.id,
            purchaseId: purchase.id,
            vendorId: vendorIds[p.vendor],
            purchaseDate: p.purchaseDate,
            unitPrice: item.unitPrice,
            status: "AVAILABLE",
          },
        });
        tyreIds.push(tyre.id);
        await db.tyreLifecycleEvent.create({
          data: {
            tyreId: tyre.id,
            type: "PURCHASED",
            description: `Purchased from ${p.vendor} (Bill ${p.billNumber})`,
            occurredAt: p.purchaseDate,
          },
        });
      }
    }

    await db.activityLog.create({
      data: {
        action: "PURCHASE_CREATED",
        entityType: "Purchase",
        entityId: purchase.id,
        description: `Purchase created — Bill ${p.billNumber} from ${p.vendor}`,
        purchaseId: purchase.id,
      },
    });
  }

  // Persist the next tyre ID sequence so future purchases continue
  // from where the seed left off instead of colliding with TYR-000001.
  await db.applicationSettings.update({
    where: { id: settings.id },
    data: { tyreIdNextSeq: tyreSeq },
  });

  // ── Installations ─────────────────────────────────────────
  // Install tyres on vehicles from the first purchase
  const availableTyres = await db.tyre.findMany({
    where: { status: "AVAILABLE" },
    orderBy: { internalId: "asc" },
    include: { tyreModel: true },
  });

  const installPlan: {
    vehicleReg: string;
    positionId: string;
    tyreInternalId: string;
    installedAt: Date;
    odometer: number;
    driver: string;
  }[] = [
    // MH-12-AB-1234 (12-Tyre Truck)
    { vehicleReg: "MH-12-AB-1234", positionId: "L1", tyreInternalId: "TYR-000001", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "R1", tyreInternalId: "TYR-000002", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "L2", tyreInternalId: "TYR-000003", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "R2", tyreInternalId: "TYR-000004", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "L2I", tyreInternalId: "TYR-000005", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "R2I", tyreInternalId: "TYR-000006", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "L3", tyreInternalId: "TYR-000007", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "R3", tyreInternalId: "TYR-000008", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "L3I", tyreInternalId: "TYR-000009", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "R3I", tyreInternalId: "TYR-000010", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "LL1", tyreInternalId: "TYR-000011", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
    { vehicleReg: "MH-12-AB-1234", positionId: "LR1", tyreInternalId: "TYR-000012", installedAt: new Date("2026-01-15"), odometer: 110000, driver: "Rajesh Kumar" },
  ];

  for (const plan of installPlan) {
    const tyre = availableTyres.find((t) => t.internalId === plan.tyreInternalId);
    if (!tyre) continue;
    const vehicle = await db.vehicle.findUnique({ where: { registrationNo: plan.vehicleReg } });
    if (!vehicle) continue;
    const position = await db.tyrePosition.findFirst({
      where: { vehicleTypeId: vehicle.vehicleTypeId, positionId: plan.positionId },
    });
    if (!position) continue;

    const installation = await db.installation.create({
      data: {
        tyreId: tyre.id,
        vehicleId: vehicle.id,
        positionId: position.id,
        driverId: driverIds[plan.driver],
        installedAt: plan.installedAt,
        odometer: plan.odometer,
        isCurrent: true,
      },
    });

    await db.tyre.update({
      where: { id: tyre.id },
      data: {
        status: "INSTALLED",
        currentVehicleId: vehicle.id,
        currentPositionId: position.id,
        currentInstallationId: installation.id,
      },
    });

    await db.tyreLifecycleEvent.create({
      data: {
        tyreId: tyre.id,
        type: "INSTALLED",
        description: `Installed on ${plan.vehicleReg} at ${position.displayName}`,
        occurredAt: plan.installedAt,
        installationId: installation.id,
      },
    });

    await db.activityLog.create({
      data: {
        action: "TYRE_INSTALLED",
        entityType: "Tyre",
        entityId: tyre.id,
        description: `${tyre.internalId} installed on ${plan.vehicleReg} at ${position.displayName}`,
        tyreId: tyre.id,
        vehicleId: vehicle.id,
      },
    });
  }

  // ── Historical replacement (removal + reinstall) ──────────
  // Replace TYR-000001 on MH-12-AB-1234 L1 with TYR-000013
  const oldTyre = await db.tyre.findUnique({ where: { internalId: "TYR-000001" } });
  const newTyre = availableTyres.find((t) => t.internalId === "TYR-000013");
  const vehicle = await db.vehicle.findUnique({ where: { registrationNo: "MH-12-AB-1234" } });
  const position = vehicle
    ? await db.tyrePosition.findFirst({ where: { vehicleTypeId: vehicle.vehicleTypeId, positionId: "L1" } })
    : null;

  if (oldTyre && newTyre && vehicle && position) {
    const currentInstallation = await db.installation.findFirst({
      where: { tyreId: oldTyre.id, isCurrent: true },
    });

    if (currentInstallation) {
      const wornOutReason = await db.removalReason.findUnique({ where: { name: "Worn Out" } });

      // Close old installation
      await db.installation.update({
        where: { id: currentInstallation.id },
        data: {
          isCurrent: false,
          removedAt: new Date("2026-06-20"),
          removalOdometer: 125450,
          removalReasonId: wornOutReason?.id,
          removalNotes: "Tread worn beyond limit",
        },
      });

      // Update old tyre
      await db.tyre.update({
        where: { id: oldTyre.id },
        data: {
          status: "WORN_OUT",
          currentVehicleId: null,
          currentPositionId: null,
          currentInstallationId: null,
        },
      });

      await db.tyreLifecycleEvent.create({
        data: {
          tyreId: oldTyre.id,
          type: "REMOVED",
          description: `Removed from ${vehicle.registrationNo} at ${position.displayName} — Worn Out`,
          occurredAt: new Date("2026-06-20"),
          installationId: currentInstallation.id,
        },
      });

      // Create new installation
      const newInstallation = await db.installation.create({
        data: {
          tyreId: newTyre.id,
          vehicleId: vehicle.id,
          positionId: position.id,
          driverId: driverIds["Rajesh Kumar"],
          installedAt: new Date("2026-06-20"),
          odometer: 125450,
          isCurrent: true,
        },
      });

      await db.tyre.update({
        where: { id: newTyre.id },
        data: {
          status: "INSTALLED",
          currentVehicleId: vehicle.id,
          currentPositionId: position.id,
          currentInstallationId: newInstallation.id,
        },
      });

      await db.tyreLifecycleEvent.create({
        data: {
          tyreId: newTyre.id,
          type: "INSTALLED",
          description: `Installed on ${vehicle.registrationNo} at ${position.displayName} (replacement)`,
          occurredAt: new Date("2026-06-20"),
          installationId: newInstallation.id,
        },
      });

      await db.activityLog.create({
        data: {
          action: "TYRE_REPLACED",
          entityType: "Tyre",
          entityId: newTyre.id,
          description: `${oldTyre.internalId} replaced by ${newTyre.internalId} on ${vehicle.registrationNo} at ${position.displayName}`,
          tyreId: newTyre.id,
          vehicleId: vehicle.id,
        },
      });
    }
  }

  console.log("✅ Seed complete!");
  console.log(`   Vehicle types: ${Object.keys(vehicleTypeIds).length}`);
  console.log(`   Tyre models: ${Object.keys(tyreModelIds).length}`);
  console.log(`   Vendors: ${Object.keys(vendorIds).length}`);
  console.log(`   Drivers: ${Object.keys(driverIds).length}`);
  console.log(`   Vehicles: ${Object.keys(vehicleIds).length}`);
  console.log(`   Tyres created: ${tyreSeq - 1}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });