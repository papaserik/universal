-- CreateTable
CREATE TABLE "Banner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "imageUrl" TEXT,
    "bgColor" TEXT NOT NULL DEFAULT '#0f172a',
    "textColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textPosition" TEXT NOT NULL DEFAULT 'left',
    "overlay" INTEGER NOT NULL DEFAULT 40,
    "layout" TEXT NOT NULL DEFAULT 'hero',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
