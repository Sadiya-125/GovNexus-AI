import Sidebar from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrendingUp, Package, ShoppingCart, DollarSign } from "lucide-react";
import SalesChart from "@/components/dashboard/sales-chart";
import CategoryChart from "@/components/dashboard/category-chart";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user.id;

  // Check if user has a profile set up
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
  });

  // If no profile exists, redirect to role selection
  if (!userProfile) {
    redirect("/select-role");
  }

  const [totalProducts, totalOrders, allOrders] = await Promise.all([
    prisma.product.count({ where: { userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { orderDate: "desc" },
    }),
  ]);

  const totalSales = allOrders.reduce(
    (sum, order) => sum + Number(order.sales),
    0
  );
  const totalProfit = allOrders.reduce(
    (sum, order) => sum + Number(order.profit),
    0
  );

  // Calculate monthly sales and profit trends - last 12 months for better data visualization
  const now = new Date();
  const salesData = [];
  for (let i = 11; i >= 0; i--) {
    const month = new Date(now);
    month.setMonth(month.getMonth() - i);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const monthOrders = allOrders.filter((order: any) => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });

    const monthSales = monthOrders.reduce(
      (sum: number, order: any) => sum + Number(order.sales),
      0
    );
    const monthProfit = monthOrders.reduce(
      (sum: number, order: any) => sum + Number(order.profit),
      0
    );

    salesData.push({
      month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      sales: Number(monthSales.toFixed(2)),
      profit: Number(monthProfit.toFixed(2)),
    });
  }

  // Calculate orders by category
  const categoryMap = new Map<
    string,
    { orders: number; revenue: number }
  >();
  allOrders.forEach((order: any) => {
    const category = order.product.category || "Uncategorized";
    const existing = categoryMap.get(category) || { orders: 0, revenue: 0 };
    categoryMap.set(category, {
      orders: existing.orders + 1,
      revenue: existing.revenue + Number(order.sales),
    });
  });

  const categoryData = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      orders: data.orders,
      revenue: Number(data.revenue.toFixed(2)),
    })
  );

  const recentOrders = allOrders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/dashboard" />
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Welcome back! Here is an overview of your resource management operations.
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Resources</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalProducts}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requisitions</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalOrders}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Distribution Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${Number(totalSales).toFixed(2)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Value Delivered</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ${Number(totalProfit).toFixed(2)}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SalesChart data={salesData} />
          {categoryData.length > 0 && <CategoryChart data={categoryData} />}
        </div>

        {/* Recent Requisitions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Requisitions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Distribution Value
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Value Delivered
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order: any, key: number) => (
                  <tr key={key}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {order.product.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {order.orderQty}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${Number(order.sales).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          Number(order.profit) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        ${Number(order.profit).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No requisitions yet
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
