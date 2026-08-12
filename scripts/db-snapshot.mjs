import Database from "better-sqlite3";
const db = new Database("dev.db");

console.log(
  "AVAILABLE by model:",
  db.prepare("SELECT tyreModelId, COUNT(*) c FROM Tyre WHERE status='AVAILABLE' GROUP BY tyreModelId").all()
);
console.log(
  "AVAILABLE total:",
  db.prepare("SELECT COUNT(*) c FROM Tyre WHERE status='AVAILABLE'").get().c
);
console.log(
  "Current installs:",
  db.prepare("SELECT COUNT(*) c FROM Installation WHERE isCurrent=1").get().c
);
console.log(
  "Vehicles:",
  db.prepare("SELECT registrationNo, currentOdometer FROM Vehicle ORDER BY registrationNo").all()
);
console.log(
  "Removed tyres:",
  db.prepare("SELECT internalId, status FROM Tyre WHERE status='REMOVED' OR status='WORN_OUT' ORDER BY internalId").all()
);
console.log(
  "TEST vehicle(s):",
  db
    .prepare(
      `SELECT v.id, v.registrationNo, v.currentOdometer, v.vehicleTypeId,
        (SELECT COUNT(*) FROM Installation i WHERE i.vehicleId=v.id AND i.isCurrent=1) as curInstalls
       FROM Vehicle v WHERE v.registrationNo LIKE 'TEST-%'`
    )
    .all()
);
