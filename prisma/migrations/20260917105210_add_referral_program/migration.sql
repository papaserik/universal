-- CreateTable
CREATE TABLE "Referral" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inviterId" INTEGER NOT NULL,
    "invitedId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "firstOrderId" INTEGER,
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedAt" DATETIME,
    "totalEarned" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "Referral_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Referral_invitedId_fkey" FOREIGN KEY ("invitedId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "refCode" TEXT,
    "referredById" INTEGER,
    "pendingReferralPoints" INTEGER NOT NULL DEFAULT 0,
    "savedAddress" TEXT NOT NULL DEFAULT '{}',
    "savedPhone" TEXT,
    "savedName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "avatar", "createdAt", "email", "id", "name", "password", "role", "savedAddress", "savedName", "savedPhone") SELECT "active", "avatar", "createdAt", "email", "id", "name", "password", "role", "savedAddress", "savedName", "savedPhone" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_refCode_key" ON "User"("refCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Referral_invitedId_key" ON "Referral"("invitedId");

-- CreateIndex
CREATE INDEX "Referral_inviterId_status_idx" ON "Referral"("inviterId", "status");
