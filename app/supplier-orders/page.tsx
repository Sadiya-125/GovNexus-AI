"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import Sidebar from "@/components/sidebar";
import {
  Package,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Phone,
  TrendingUp,
  Filter,
  AlertCircle,
} from "lucide-react";

interface SupplierOrder {
  id: string;
  productName: string;
  requestedQty: number;
  predictedDemand?: number | null;
  category?: string | null;
  status: "pending" | "accepted" | "rejected";
  notes?: string | null;
  createdAt: string;
  supplierAvailableQty?: number | null;
  supplier: {
    id: string;
    name: string;
    contactNumber: string;
  };
  product?: {
    id: string;
    name: string;
  } | null;
}

export default function SupplierOrdersPage() {
  const user = useUser({ or: "redirect" });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [viewType, setViewType] = useState<"retailer" | "supplier">("retailer");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchOrders();
    }
  }, [userProfile, viewType]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();

      if (response.ok) {
        // Check if user is a first-time user
        if (data.firstTimeUser) {
          router.push("/select-role");
          return;
        }
        setUserProfile(data);
        setViewType(data.userType || "retailer");
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Fetching orders for viewType:", viewType);
      const response = await fetch(`/api/supplier-orders?viewType=${viewType}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    status: "accepted" | "rejected",
    notes?: string
  ) => {
    setActionLoading(orderId);
    setError("");

    try {
      const response = await fetch("/api/supplier-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status, notes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update order");
      }

      // Refresh orders
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      accepted: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${
          styles[status as keyof typeof styles]
        }`}
      >
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar currentPath="/supplier-orders" />
        <main className="ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading Orders...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/supplier-orders" />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {viewType === "supplier"
                  ? "Incoming Requests"
                  : "Procurement Requests"}
              </h1>
              <p className="text-sm text-gray-500">
                {viewType === "supplier"
                  ? "Manage requests from agencies"
                  : "Track procurement requests to partners"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {userProfile?.userType === "supplier" &&
                userProfile?.phoneNumber && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      {userProfile.phoneNumber}
                    </span>
                  </div>
                )}

              <button
                onClick={fetchOrders}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50"
              >
                Refresh Orders
              </button>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Type Toggle */}
            {userProfile?.userType === "retailer" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  View As
                </label>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewType("retailer")}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      viewType === "retailer"
                        ? "bg-white text-purple-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Requests
                  </button>
                  <button
                    onClick={() => setViewType("supplier")}
                    className={`px-4 py-2 rounded-md font-medium transition-all ${
                      viewType === "supplier"
                        ? "bg-white text-green-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    As Partner
                  </button>
                </div>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading Orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No requests found
              </h3>
              <p className="text-gray-600">
                {viewType === "supplier"
                  ? "You haven't received any requests yet"
                  : "You haven't created any procurement requests yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {order.productName}
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Partner Organization</p>
                            <p className="font-medium">{order.supplier.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                          <Package className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Requested Quantity</p>
                            <p className="font-medium">
                              {order.requestedQty} units
                            </p>
                          </div>
                        </div>

                        {viewType === "supplier" && order.supplierAvailableQty !== null && order.supplierAvailableQty !== undefined && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Package className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Your Available Supply</p>
                              <p className={`font-medium ${
                                order.supplierAvailableQty >= order.requestedQty
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}>
                                {order.supplierAvailableQty} units
                              </p>
                            </div>
                          </div>
                        )}

                        {order.predictedDemand && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">
                                Forecasted Need
                              </p>
                              <p className="font-medium">
                                {order.predictedDemand.toFixed(0)} units
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="font-medium">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {order.category && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <div>
                              <p className="text-xs text-gray-500">Category</p>
                              <p className="font-medium">{order.category}</p>
                            </div>
                          </div>
                        )}

                        {viewType === "retailer" && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Contact</p>
                              <p className="font-medium">
                                {order.supplier.contactNumber}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {order.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Notes:</span>{" "}
                            {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Insufficient Supply Warning */}
                      {viewType === "supplier" &&
                       order.status === "pending" &&
                       order.supplierAvailableQty !== null &&
                       order.supplierAvailableQty !== undefined &&
                       order.supplierAvailableQty < order.requestedQty && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-red-900">Insufficient Supply</p>
                            <p className="text-sm text-red-700">
                              You only have {order.supplierAvailableQty} units available, but {order.requestedQty} units are requested.
                              Please add more supply before accepting this request.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Resource Not Found Warning */}
                      {viewType === "supplier" &&
                       order.status === "pending" &&
                       order.supplierAvailableQty === null && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-yellow-900">Resource Not Found</p>
                            <p className="text-sm text-yellow-700">
                              You don't have "{order.productName}" in your resource registry. Please add it to your resources before accepting this request.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons (Supplier View Only) */}
                  {viewType === "supplier" && order.status === "pending" && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleUpdateStatus(order.id, "accepted")}
                        disabled={actionLoading === order.id}
                        className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Accept Request
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, "rejected")}
                        disabled={actionLoading === order.id}
                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-5 h-5" />
                            Reject Request
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
