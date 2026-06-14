-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "costOfSales" DECIMAL(12,2),
ADD COLUMN     "country" TEXT,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "orderDate" TIMESTAMP(3),
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "orderQty" INTEGER,
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productSubCategory" TEXT,
ADD COLUMN     "profit" DECIMAL(12,2),
ADD COLUMN     "promotionName" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "sales" DECIMAL(12,2),
ADD COLUMN     "unitCost" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Product_productCategory_idx" ON "public"."Product"("productCategory");

-- CreateIndex
CREATE INDEX "Product_manufacturer_idx" ON "public"."Product"("manufacturer");
