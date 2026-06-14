"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CategoryData {
  category: string;
  orders: number;
  revenue: number;
}

export default function CategoryChart({ data }: { data: CategoryData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Requisitions by Category
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis yAxisId="left" orientation="left" stroke="#8b5cf6" />
          <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="orders" fill="#8b5cf6" name="Requisitions" />
          <Bar
            yAxisId="right"
            dataKey="revenue"
            fill="#10b981"
            name="Distribution Value"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
