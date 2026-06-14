"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { prisma } from "../prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const OrderSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  orderDate: z.string().min(1, "Order date is required"),
  orderQty: z.coerce.number().int().min(1, "Order quantity must be at least 1"),
});

export async function deleteOrder(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id") || "");

  await prisma.order.deleteMany({
    where: { id: id, userId: user.id },
  });

  revalidatePath("/orders");
}

export async function createOrder(formData: FormData) {
  const user = await getCurrentUser();

  const parsed = OrderSchema.safeParse({
    productId: formData.get("productId"),
    orderDate: formData.get("orderDate"),
    orderQty: formData.get("orderQty"),
  });

  if (!parsed.success) {
    throw new Error("Validation failed: " + parsed.error.message);
  }

  try {
    const { productId, orderDate, orderQty } = parsed.data;

    // Fetch product to get unitCost and price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { unitCost: true, price: true },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const unitCost = Number(product.unitCost);
    const price = Number(product.price);

    // Calculate derived fields
    const costOfSales = unitCost * orderQty;
    const sales = price * orderQty;
    const profit = sales - costOfSales;
    const orderDateObj = new Date(orderDate);
    const year = orderDateObj.getFullYear();

    await prisma.order.create({
      data: {
        userId: user.id,
        productId,
        orderDate: orderDateObj,
        orderQty,
        costOfSales,
        sales,
        profit,
        year,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    throw new Error(
      `Failed to create order: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  revalidatePath("/orders");
  redirect("/orders");
}
