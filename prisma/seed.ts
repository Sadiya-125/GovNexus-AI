//npx tsx prisma/seed.ts  # Run the seed script

import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Generate 100 Products
  const products = await Promise.all(
    Array.from({ length: 100 }).map(async () => {
      return prisma.product.create({
        data: {
          userId: "a80ec3f2-9099-4e60-8e7a-91f78e90ca9e", // Fixed userId for seeding
          name: faker.commerce.productName(),
          category: faker.commerce.department(),
          unitCost: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
          price: parseFloat(faker.commerce.price({ min: 100, max: 1000 })),
        },
      });
    }),
  );

  console.log(`✅ Inserted ${products.length} Products`);

  // Generate 500 Orders with good distribution - batch to avoid connection pool exhaustion
  const orderBatches = products.flatMap((product) =>
    Array.from({ length: 5 }).map(async (_, index) => {
      // Distribute orders evenly across months from 2023-2025 for better chart data
      const monthOffset = (index * 12) % 36; // Spread across ~3 years
      const year = 2023 + Math.floor(monthOffset / 12);
      const month = monthOffset % 12;

      // Create a date in the middle of each month for better distribution
      const orderDate = new Date(
        year,
        month,
        Math.min(15, 28), // Day between 15-28 to avoid month-end issues
        faker.number.int({ min: 0, max: 23 }),
        faker.number.int({ min: 0, max: 59 }),
        faker.number.int({ min: 0, max: 59 }),
      );

      const orderQty = faker.number.int({ min: 5, max: 100 });
      const unitCost = Number(product.unitCost);
      const price = Number(product.price);
      const costOfSales = unitCost * orderQty;
      const sales = price * orderQty;
      const profit = sales - costOfSales;

      return prisma.order.create({
        data: {
          userId: product.userId,
          productId: product.id,
          orderDate,
          orderQty,
          costOfSales,
          sales,
          profit,
          year: year,
        },
      });
    }),
  );

  // Create orders in batches of 20 to avoid connection pool exhaustion
  let totalOrders = 0;
  for (let i = 0; i < orderBatches.length; i += 20) {
    const batch = orderBatches.slice(i, i + 20);
    const result = await Promise.all(batch);
    totalOrders += result.length;
  }

  console.log(`✅ Inserted ${totalOrders} orders`);
  console.log("🌟 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
