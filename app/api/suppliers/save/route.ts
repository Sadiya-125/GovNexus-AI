import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { stackServerApp } from "@/stack/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactNumber, productName, category, applyToCategory } = body;

    // Validate required fields
    if (!contactNumber || contactNumber.trim() === "") {
      return NextResponse.json(
        { error: "Contact number is required" },
        { status: 400 }
      );
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(contactNumber.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use format: +1234567890" },
        { status: 400 }
      );
    }

    if (applyToCategory) {
      // Save for entire category
      if (!category || category.trim() === "") {
        return NextResponse.json(
          { error: "Category is required when applying to category" },
          { status: 400 }
        );
      }

      // Check if supplier already exists for this category
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          userId: user.id,
          category: category,
          productId: null,
        },
      });

      if (existingSupplier) {
        // Update existing category supplier
        await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: {
            contactNumber,
            supplierName: `${category} Supplier`,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Category supplier updated successfully",
          supplierId: existingSupplier.id,
        });
      } else {
        // Create new category supplier
        const supplier = await prisma.supplier.create({
          data: {
            userId: user.id,
            category: category,
            contactNumber,
            supplierName: `${category} Supplier`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Category supplier saved successfully",
          supplierId: supplier.id,
        });
      }
    } else {
      // Save for specific product
      if (!productName || productName.trim() === "") {
        return NextResponse.json(
          { error: "Product name is required" },
          { status: 400 }
        );
      }

      // Find the product by name
      const product = await prisma.product.findFirst({
        where: {
          userId: user.id,
          name: productName,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Check if supplier already exists for this product
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          userId: user.id,
          productId: product.id,
        },
      });

      if (existingSupplier) {
        // Update existing supplier
        await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: {
            contactNumber,
            supplierName: `${productName} Supplier`,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Supplier updated successfully",
          supplierId: existingSupplier.id,
        });
      } else {
        // Create new supplier
        const supplier = await prisma.supplier.create({
          data: {
            userId: user.id,
            productId: product.id,
            category: category,
            contactNumber,
            supplierName: `${productName} Supplier`,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Supplier saved successfully",
          supplierId: supplier.id,
        });
      }
    }
  } catch (error) {
    console.error("Save supplier error:", error);
    return NextResponse.json(
      { error: "Failed to save supplier contact" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
