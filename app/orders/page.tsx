import Pagination from "@/components/pagination";
import Sidebar from "@/components/sidebar";
import { deleteOrder } from "@/lib/actions/orders";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  const userId = user.id;

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 10;

  const where = {
    userId,
    ...(q
      ? {
          product: {
            name: { contains: q, mode: "insensitive" as const },
          },
        }
      : {}),
  };

  const [totalCount, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { orderDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/orders" />
      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Requisitions</h1>
              <p className="text-sm text-gray-500">
                Track and manage resource requisitions
              </p>
            </div>
            <Link
              href="/add-order"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              + Create Requisition
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="flex gap-2" action="/orders" method="GET">
              <input
                name="q"
                placeholder="Search by resource name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
              />
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Search
              </button>
            </form>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Requisition Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Allocated Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Allocation Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Distribution Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value Delivered
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Year
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((order, key) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {new Date(order.orderDate).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="font-medium">{order.product.name}</div>
                      {order.product.category && (
                        <div className="text-xs text-gray-500">
                          {order.product.category}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      {order.orderQty}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      ${Number(order.costOfSales).toFixed(4)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      ${Number(order.sales).toFixed(4)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={
                          Number(order.profit) >= 0
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        ${Number(order.profit).toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {order.year}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <form
                        action={async (formData: FormData) => {
                          "use server";
                          await deleteOrder(formData);
                        }}
                      >
                        <input type="hidden" name="id" value={order.id} />
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No requisitions found</p>
                <Link
                  href="/add-order"
                  className="text-purple-600 hover:text-purple-700 mt-2 inline-block"
                >
                  Create your first requisition
                </Link>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseUrl="/orders"
                searchParams={{
                  q,
                  pageSize: String(pageSize),
                }}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
