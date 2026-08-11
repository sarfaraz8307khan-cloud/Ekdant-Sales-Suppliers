-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tyre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalId" TEXT NOT NULL,
    "serialNo" TEXT,
    "tyreModelId" TEXT NOT NULL,
    "purchaseItemId" TEXT,
    "purchaseId" TEXT,
    "vendorId" TEXT,
    "purchaseDate" DATETIME,
    "unitPrice" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "currentVehicleId" TEXT,
    "currentPositionId" TEXT,
    "currentInstallationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tyre_tyreModelId_fkey" FOREIGN KEY ("tyreModelId") REFERENCES "TyreModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tyre_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "PurchaseItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tyre_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tyre_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tyre_currentVehicleId_fkey" FOREIGN KEY ("currentVehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tyre_currentPositionId_fkey" FOREIGN KEY ("currentPositionId") REFERENCES "TyrePosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tyre" ("createdAt", "currentInstallationId", "currentPositionId", "currentVehicleId", "id", "internalId", "purchaseDate", "purchaseId", "purchaseItemId", "serialNo", "status", "tyreModelId", "unitPrice", "updatedAt", "vendorId") SELECT "createdAt", "currentInstallationId", "currentPositionId", "currentVehicleId", "id", "internalId", "purchaseDate", "purchaseId", "purchaseItemId", "serialNo", "status", "tyreModelId", "unitPrice", "updatedAt", "vendorId" FROM "Tyre";
DROP TABLE "Tyre";
ALTER TABLE "new_Tyre" RENAME TO "Tyre";
CREATE UNIQUE INDEX "Tyre_internalId_key" ON "Tyre"("internalId");
CREATE INDEX "Tyre_status_idx" ON "Tyre"("status");
CREATE INDEX "Tyre_tyreModelId_idx" ON "Tyre"("tyreModelId");
CREATE INDEX "Tyre_currentVehicleId_idx" ON "Tyre"("currentVehicleId");
CREATE INDEX "Tyre_currentPositionId_idx" ON "Tyre"("currentPositionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
