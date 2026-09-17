-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MarketplaceIntegration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "direction" TEXT NOT NULL DEFAULT 'both',
    "strategy" TEXT NOT NULL DEFAULT 'merge',
    "config" TEXT NOT NULL DEFAULT '{}',
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "syncOrders" BOOLEAN NOT NULL DEFAULT true,
    "syncStock" BOOLEAN NOT NULL DEFAULT true,
    "syncPrice" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" TEXT NOT NULL DEFAULT 'manual',
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_MarketplaceIntegration" ("config", "createdAt", "direction", "enabled", "id", "lastSyncAt", "lastSyncStatus", "name", "slug", "strategy", "updatedAt") SELECT "config", "createdAt", "direction", "enabled", "id", "lastSyncAt", "lastSyncStatus", "name", "slug", "strategy", "updatedAt" FROM "MarketplaceIntegration";
DROP TABLE "MarketplaceIntegration";
ALTER TABLE "new_MarketplaceIntegration" RENAME TO "MarketplaceIntegration";
CREATE UNIQUE INDEX "MarketplaceIntegration_slug_key" ON "MarketplaceIntegration"("slug");
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'own',
    "externalId" TEXT,
    "externalNumber" TEXT,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "commissionAmount" REAL NOT NULL DEFAULT 0,
    "netProfit" REAL NOT NULL DEFAULT 0,
    "userId" INTEGER,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "subtotal" REAL NOT NULL,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "payment" TEXT NOT NULL DEFAULT 'cod',
    "delivery" TEXT NOT NULL DEFAULT 'flat',
    "comment" TEXT,
    "ip" TEXT,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "pointsDiscount" REAL NOT NULL DEFAULT 0,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "recipientAddress" TEXT,
    "giftMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "comment", "createdAt", "delivery", "deliveryFee", "email", "giftMessage", "id", "ip", "isGift", "name", "number", "payment", "phone", "pointsDiscount", "pointsEarned", "pointsUsed", "recipientAddress", "recipientName", "recipientPhone", "status", "subtotal", "total", "updatedAt", "userId") SELECT "address", "comment", "createdAt", "delivery", "deliveryFee", "email", "giftMessage", "id", "ip", "isGift", "name", "number", "payment", "phone", "pointsDiscount", "pointsEarned", "pointsUsed", "recipientAddress", "recipientName", "recipientPhone", "status", "subtotal", "total", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
