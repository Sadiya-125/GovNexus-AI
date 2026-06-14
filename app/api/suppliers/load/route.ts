import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { stackServerApp } from "@/stack/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all suppliers for this user
    const suppliers = await prisma.supplier.findMany({
      where: {
        userId: user.id,
      },
      include: {
        product: true, // Include product details if linked to specific product
      },
    });

    // Format the response as a map for easy lookup
    // Format: { "productName": "contactNumber", "category:CategoryName": "contactNumber" }
    const supplierMap: { [key: string]: string } = {};

    // Also create a detailed map with supplier IDs for order creation
    const supplierDetails: { [key: string]: { id: string; contactNumber: string; name?: string } } = {};

    for (const supplier of suppliers) {
      if (supplier.productId && supplier.product) {
        // Product-specific supplier
        supplierMap[supplier.product.name] = supplier.contactNumber;
        supplierDetails[supplier.product.name] = {
          id: supplier.id,
          contactNumber: supplier.contactNumber,
          name: supplier.supplierName || supplier.name || undefined,
        };
      } else if (supplier.category) {
        // Category-wide supplier
        supplierMap[`category:${supplier.category}`] = supplier.contactNumber;
        supplierDetails[`category:${supplier.category}`] = {
          id: supplier.id,
          contactNumber: supplier.contactNumber,
          name: supplier.supplierName || supplier.name || undefined,
        };
      }
    }

    return NextResponse.json({
      success: true,
      suppliers: supplierMap,
      supplierDetails: supplierDetails,
    });
  } catch (error) {
    console.error("Load suppliers error:", error);
    return NextResponse.json(
      { error: "Failed to load supplier contacts" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
