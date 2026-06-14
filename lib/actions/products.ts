"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { prisma } from "../prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  unitCost: z.coerce.number().nonnegative("Unit cost must be non-negative"),
  price: z.coerce.number().nonnegative("Price must be non-negative"),
});

export async function deleteProduct(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id") || "");

  await prisma.product.deleteMany({
    where: { id: id, userId: user.id },
  });
}

export async function createProduct(formData: FormData) {
  const user = await getCurrentUser();

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    unitCost: formData.get("unitCost"),
    price: formData.get("price"),
  });

  if (!parsed.success) {
    throw new Error("Validation failed");
  }

  try {
    await prisma.product.create({
      data: { ...parsed.data, userId: user.id },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    throw new Error(
      `Failed to create product: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}
