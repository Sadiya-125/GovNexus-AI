import Sidebar from "@/components/sidebar";
import { createOrder } from "@/lib/actions/orders";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AddOrderPage() {
  const user = await getCurrentUser();

  // Fetch all products for the dropdown
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/add-order" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Create Requisition
              </h1>
              <p className="text-sm text-gray-500">
                Create a new requisition for a resource
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form className="space-y-6" action={createOrder}>
              <div>
                <label
                  htmlFor="productId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Resource *
                </label>
                <select
                  id="productId"
                  name="productId"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                >
                  <option value="">Select a resource</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${Number(product.price).toFixed(4)}
                    </option>
                  ))}
                </select>
                {products.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">
                    No resources available. Please register resources first.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="orderDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Requisition Date *
                </label>
                <input
                  type="datetime-local"
                  id="orderDate"
                  name="orderDate"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="orderQty"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Requested Quantity *
                </label>
                <input
                  type="number"
                  id="orderQty"
                  name="orderQty"
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-transparent"
                  placeholder="1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of units requested
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Acquisition Cost and Distribution Cost will be taken from the selected resource. Allocation Cost, Distribution Value, Value Delivered, and Year will be calculated automatically.
                </p>
              </div>

              <div className="flex gap-5 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  disabled={products.length === 0}
                >
                  Submit Requisition
                </button>
                <Link
                  href="/orders"
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
