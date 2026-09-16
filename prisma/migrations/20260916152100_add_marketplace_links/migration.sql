-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "oldPrice" REAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 0.5,
    "images" TEXT NOT NULL DEFAULT '[]',
    "categoryId" INTEGER,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "seoKeywords" TEXT,
    "marketplace" TEXT,
    "marketplaceUrl" TEXT,
    "marketplaceLinks" TEXT NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("categoryId", "createdAt", "description", "id", "images", "marketplace", "marketplaceUrl", "name", "oldPrice", "price", "published", "seoDesc", "seoKeywords", "seoTitle", "sku", "slug", "sort", "stock", "updatedAt", "weight") SELECT "categoryId", "createdAt", "description", "id", "images", "marketplace", "marketplaceUrl", "name", "oldPrice", "price", "published", "seoDesc", "seoKeywords", "seoTitle", "sku", "slug", "sort", "stock", "updatedAt", "weight" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_categoryId_published_idx" ON "Product"("categoryId", "published");
CREATE INDEX "Product_price_idx" ON "Product"("price");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
