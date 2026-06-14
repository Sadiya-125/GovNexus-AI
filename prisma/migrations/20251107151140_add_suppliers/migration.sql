-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "category" TEXT,
    "contactNumber" TEXT NOT NULL,
    "supplierName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_userId_productId_idx" ON "public"."Supplier"("userId", "productId");

-- CreateIndex
CREATE INDEX "Supplier_userId_category_idx" ON "public"."Supplier"("userId", "category");

-- CreateIndex
CREATE INDEX "Supplier_createdAt_idx" ON "public"."Supplier"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Supplier" ADD CONSTRAINT "Supplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
