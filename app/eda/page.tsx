"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface EDAData {
  summary: {
    total_orders: number;
    total_sales: number;
    total_profit: number;
    avg_order_value: number;
    avg_profit_margin: number;
    date_range: {
      start: string;
      end: string;
    };
  };
  sales_by_category: Array<{
    category: string;
    total_sales: number;
    total_profit: number;
    order_count: number;
  }>;
  monthly_trends: Array<{
    month: string;
    sales: number;
    profit: number;
    orders: number;
  }>;
  top_products: Array<{
    product_name: string;
    category: string;
    total_sales: number;
    total_profit: number;
    order_count: number;
    avg_profit_margin: number;
  }>;
}

const COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
];

export default function EDAPage() {
  const [data, setData] = useState<EDAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEDAData();
  }, []);

  const fetchEDAData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("http://localhost:5000/eda");

      if (!response.ok) {
        throw new Error("Failed to fetch EDA data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("EDA fetch error:", err);
      setError(
        "Failed to load analysis data. Make sure the Flask backend is running on http://localhost:5000"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar currentPath="/eda" />
        <main className="ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading Analysis Data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar currentPath="/eda" />
        <main className="ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold mb-2">
                Failed to Load Data
              </p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchEDAData}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/eda" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Resource Analytics & Insights
              </h1>
              <p className="text-sm text-gray-500">
                Comprehensive insights from resource distribution data
              </p>
            </div>
            <button
              onClick={fetchEDAData}
              className="px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Requisitions</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.summary.total_orders.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(data.summary.date_range.start).toLocaleDateString()} -{" "}
              {new Date(data.summary.date_range.end).toLocaleDateString()}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Distribution Value</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.summary.total_sales)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {formatCurrency(data.summary.avg_order_value)} per requisition
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Value Delivered</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.summary.total_profit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Utilization Rate: {formatPercent(data.summary.avg_profit_margin)}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Distribution Value</span>
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(data.summary.avg_order_value)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Per requisition</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trends */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Trends
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'Orders') {
                      return [Number(value).toLocaleString(), name];
                    }
                    return [formatCurrency(Number(value)), name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Distribution Value"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Value Delivered"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Requisitions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution by Category - Pie Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Distribution by Category
            </h3>
            <div className="flex items-start gap-4">
              <ResponsiveContainer width="60%" height={350}>
                <PieChart>
                  <Pie
                    data={data.sales_by_category}
                    dataKey="total_sales"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry: any) => {
                      const percentNum = (entry.total_sales / data.sales_by_category.reduce((sum, item) => sum + item.total_sales, 0)) * 100;
                      return percentNum > 5 ? `${percentNum.toFixed(1)}%` : '';
                    }}
                    labelLine={true}
                  >
                    {data.sales_by_category.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      formatCurrency(Number(value)),
                      props.payload.category
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {data.sales_by_category.map((entry, index) => {
                    const percent = ((entry.total_sales / data.sales_by_category.reduce((sum, item) => sum + item.total_sales, 0)) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-700 flex-1 min-w-0 truncate" title={entry.category}>
                          {entry.category}
                        </span>
                        <span className="text-gray-500 text-xs whitespace-nowrap">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Resource Category Performance - Bar Chart */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resource Category Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.sales_by_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="total_sales" fill="#8b5cf6" name="Distribution Value" />
                <Bar dataKey="total_profit" fill="#10b981" name="Value Delivered" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Requisitions by Category */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Requisitions by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.sales_by_category}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="order_count" fill="#3b82f6" name="Requisition Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Utilized Resources Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Most Utilized Resources
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distribution Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value Delivered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requisitions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.top_products.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.total_sales)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {formatCurrency(product.total_profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {product.order_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.avg_profit_margin > 30
                            ? "bg-green-100 text-green-800"
                            : product.avg_profit_margin > 15
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formatPercent(product.avg_profit_margin)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
