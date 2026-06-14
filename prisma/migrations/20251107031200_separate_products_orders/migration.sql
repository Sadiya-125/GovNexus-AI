/*
  Warnings:

  - You are about to drop the column `channel` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `costOfSales` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `manufacturer` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `orderDate` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `orderQty` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productCategory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `productSubCategory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `profit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `promotionName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sales` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,4)`.
  - You are about to alter the column `unitCost` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,4)`.
  - Made the column `unitCost` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Product_manufacturer_idx";

-- DropIndex
DROP INDEX "public"."Product_productCategory_idx";

-- DropIndex
DROP INDEX "public"."Product_sku_key";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "channel",
DROP COLUMN "city",
DROP COLUMN "costOfSales",
DROP COLUMN "country",
DROP COLUMN "lowStockAt",
DROP COLUMN "manufacturer",
DROP COLUMN "orderDate",
DROP COLUMN "orderId",
DROP COLUMN "orderQty",
DROP COLUMN "productCategory",
DROP COLUMN "productSubCategory",
DROP COLUMN "profit",
DROP COLUMN "promotionName",
DROP COLUMN "quantity",
DROP COLUMN "region",
DROP COLUMN "sales",
DROP COLUMN "sku",
ADD COLUMN     "category" TEXT,
ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "unitCost" SET NOT NULL,
ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(10,4);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "unitCost" DECIMAL(10,4) NOT NULL,
    "price" DECIMAL(10,4) NOT NULL,
    "orderQty" INTEGER NOT NULL,
    "costOfSales" DECIMAL(12,4) NOT NULL,
    "sales" DECIMAL(12,4) NOT NULL,
    "profit" DECIMAL(12,4) NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_orderDate_idx" ON "public"."Order"("userId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_productId_idx" ON "public"."Order"("productId");

-- CreateIndex
CREATE INDEX "Order_year_idx" ON "public"."Order"("year");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "public"."Product"("category");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
