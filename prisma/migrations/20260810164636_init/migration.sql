-- CreateTable
CREATE TABLE "ApplicationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessName" TEXT NOT NULL DEFAULT 'Ekdant Sales & Suppliers',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dateFormat" TEXT NOT NULL DEFAULT 'dd MMM yyyy',
    "tyreIdPrefix" TEXT NOT NULL DEFAULT 'TYR',
    "tyreIdNextSeq" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "axleCount" INTEGER NOT NULL,
    "tyreCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Axle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleTypeId" TEXT NOT NULL,
    "axleNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Axle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TyrePosition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleTypeId" TEXT NOT NULL,
    "axleId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "positionType" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TyrePosition_axleId_fkey" FOREIGN KEY ("axleId") REFERENCES "Axle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TyrePosition_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNo" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "currentOdometer" INTEGER NOT NULL DEFAULT 0,
    "driverId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "photoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "licenceNo" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TyreModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "description" TEXT,
    "minStockLevel" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TyreModelVehicleType" (
    "tyreModelId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,

    PRIMARY KEY ("tyreModelId", "vehicleTypeId"),
    CONSTRAINT "TyreModelVehicleType_tyreModelId_fkey" FOREIGN KEY ("tyreModelId") REFERENCES "TyreModel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TyreModelVehicleType_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billNumber" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL NOT NULL,
    "billPhotoPath" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Purchase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "tyreModelId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "subtotal" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_tyreModelId_fkey" FOREIGN KEY ("tyreModelId") REFERENCES "TyreModel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tyre" (
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
    CONSTRAINT "Tyre_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Installation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tyreId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "driverId" TEXT,
    "installedAt" DATETIME NOT NULL,
    "odometer" INTEGER NOT NULL,
    "notes" TEXT,
    "photoPath" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "removedAt" DATETIME,
    "removalOdometer" INTEGER,
    "removalReasonId" TEXT,
    "removalNotes" TEXT,
    "removalPhotoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Installation_tyreId_fkey" FOREIGN KEY ("tyreId") REFERENCES "Tyre" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Installation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Installation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "TyrePosition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Installation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Installation_removalReasonId_fkey" FOREIGN KEY ("removalReasonId") REFERENCES "RemovalReason" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RemovalReason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TyreLifecycleEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tyreId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "installationId" TEXT,
    CONSTRAINT "TyreLifecycleEvent_tyreId_fkey" FOREIGN KEY ("tyreId") REFERENCES "Tyre" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TyreLifecycleEvent_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "Installation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OdometerReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "reading" INTEGER NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "OdometerReading_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tyreId" TEXT,
    "vehicleId" TEXT,
    "purchaseId" TEXT,
    CONSTRAINT "ActivityLog_tyreId_fkey" FOREIGN KEY ("tyreId") REFERENCES "Tyre" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleType_name_key" ON "VehicleType"("name");

-- CreateIndex
CREATE INDEX "Axle_vehicleTypeId_idx" ON "Axle"("vehicleTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Axle_vehicleTypeId_axleNumber_key" ON "Axle"("vehicleTypeId", "axleNumber");

-- CreateIndex
CREATE INDEX "TyrePosition_vehicleTypeId_idx" ON "TyrePosition"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "TyrePosition_axleId_idx" ON "TyrePosition"("axleId");

-- CreateIndex
CREATE UNIQUE INDEX "TyrePosition_vehicleTypeId_positionId_key" ON "TyrePosition"("vehicleTypeId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNo_key" ON "Vehicle"("registrationNo");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleTypeId_idx" ON "Vehicle"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "TyreModel_status_idx" ON "TyreModel"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TyreModel_brand_name_size_key" ON "TyreModel"("brand", "name", "size");

-- CreateIndex
CREATE INDEX "Purchase_vendorId_idx" ON "Purchase"("vendorId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_billNumber_vendorId_key" ON "Purchase"("billNumber", "vendorId");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseItem_tyreModelId_idx" ON "PurchaseItem"("tyreModelId");

-- CreateIndex
CREATE UNIQUE INDEX "Tyre_internalId_key" ON "Tyre"("internalId");

-- CreateIndex
CREATE INDEX "Tyre_status_idx" ON "Tyre"("status");

-- CreateIndex
CREATE INDEX "Tyre_tyreModelId_idx" ON "Tyre"("tyreModelId");

-- CreateIndex
CREATE INDEX "Tyre_currentVehicleId_idx" ON "Tyre"("currentVehicleId");

-- CreateIndex
CREATE INDEX "Tyre_currentPositionId_idx" ON "Tyre"("currentPositionId");

-- CreateIndex
CREATE INDEX "Installation_tyreId_idx" ON "Installation"("tyreId");

-- CreateIndex
CREATE INDEX "Installation_vehicleId_idx" ON "Installation"("vehicleId");

-- CreateIndex
CREATE INDEX "Installation_positionId_idx" ON "Installation"("positionId");

-- CreateIndex
CREATE INDEX "Installation_isCurrent_idx" ON "Installation"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "RemovalReason_name_key" ON "RemovalReason"("name");

-- CreateIndex
CREATE INDEX "TyreLifecycleEvent_tyreId_idx" ON "TyreLifecycleEvent"("tyreId");

-- CreateIndex
CREATE INDEX "TyreLifecycleEvent_occurredAt_idx" ON "TyreLifecycleEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "OdometerReading_vehicleId_idx" ON "OdometerReading"("vehicleId");

-- CreateIndex
CREATE INDEX "OdometerReading_recordedAt_idx" ON "OdometerReading"("recordedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_idx" ON "ActivityLog"("entityType");

-- CreateIndex
CREATE INDEX "ActivityLog_entityId_idx" ON "ActivityLog"("entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
