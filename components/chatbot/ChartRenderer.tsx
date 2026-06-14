"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie";
  data: any;
}

interface ChartRendererProps {
  chartData: ChartData;
}

const COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
];

export default function ChartRenderer({ chartData }: ChartRendererProps) {
  const { type, data } = chartData;

  console.log("🎨 ChartRenderer received:", {
    type,
    data,
    dataLength: data?.length,
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : []
  });

  // Handle Chart.js format {labels: [], datasets: []} - convert to Recharts format
  let processedData = data;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    console.log("📊 Detected object format, converting to Recharts format...");

    // Format 1: {labels: [], datasets: [{label, data}]} - Chart.js format with multiple datasets
    if (data.labels && Array.isArray(data.labels) && data.datasets && Array.isArray(data.datasets)) {
      processedData = data.labels.map((label: string, index: number) => {
        const point: any = { label };

        // Add data from each dataset
        data.datasets.forEach((dataset: any) => {
          const datasetLabel = dataset.label || 'value';
          point[datasetLabel] = dataset.data[index];
        });

        // For simple single-dataset charts, also add 'value' field
        if (data.datasets.length === 1) {
          point.value = data.datasets[0].data[index];
        }

        return point;
      });

      console.log("✅ Converted Chart.js datasets format to Recharts format:", processedData);
    }
    // Format 2: {labels: [], values: []} - Simple format with single data array
    else if (data.labels && Array.isArray(data.labels) && data.values && Array.isArray(data.values)) {
      processedData = data.labels.map((label: string, index: number) => ({
        label,
        value: data.values[index]
      }));

      console.log("✅ Converted simple values format to Recharts format:", processedData);
    }
    // Format 3: {labels: [], data: []} - Another simple format variant
    else if (data.labels && Array.isArray(data.labels) && data.data && Array.isArray(data.data)) {
      processedData = data.labels.map((label: string, index: number) => ({
        label,
        value: data.data[index]
      }));

      console.log("✅ Converted simple data format to Recharts format:", processedData);
    }
    else {
      console.warn("⚠️ Unknown data format:", data);
      return (
        <div className="my-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ Chart data format not recognized. Expected one of:
            <br />• Array format: [{`{label, value}`}, ...]
            <br />• Chart.js format: {`{labels: [], datasets: []}`}
            <br />• Simple format: {`{labels: [], values: []}`}
          </p>
        </div>
      );
    }
  }

  // Ensure data is valid and is an array
  if (!processedData || !Array.isArray(processedData) || processedData.length === 0) {
    console.warn("⚠️ Chart data is invalid or empty:", { processedData, isArray: Array.isArray(processedData) });
    return (
      <div className="my-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          ⚠️ Chart data is empty or invalid. Please try rephrasing your query.
        </p>
      </div>
    );
  }

  console.log("✅ Rendering chart of type:", type, "with data:", processedData);

  // Detect dataset keys (excluding 'label')
  const dataKeys = processedData.length > 0
    ? Object.keys(processedData[0]).filter(key => key !== 'label')
    : ['value'];

  console.log("📈 Data keys for chart:", dataKeys);

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        // For pie charts, use 'value' field or first dataset
        const pieDataKey = dataKeys.includes('value') ? 'value' : dataKeys[0];
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={processedData}
                dataKey={pieDataKey}
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.label}: ${entry[pieDataKey]}`}
                labelLine={true}
              >
                {processedData.map((_: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-gray-200 shadow-sm">
      {renderChart()}
    </div>
  );
}
