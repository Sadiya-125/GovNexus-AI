"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Send,
  Phone,
  Save,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  Mail,
  MessageCircle,
  Bot,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrendsVisualization {
  chart_data: Array<{
    date: string;
    timestamp: string;
    value: number;
  }>;
  labels: string[];
  values: number[];
  average: number;
}

interface OptimizationData {
  recommendations: Array<{
    product_name: string;
    category: string;
    current_avg_demand: number;
    predicted_demand: number;
    demand_trend: string;
    reorder_point: number;
    optimal_order_qty: number;
    safety_stock: number;
    risk_level: string;
    trends_visualization?: TrendsVisualization | null;
  }>;
  summary: {
    total_products: number;
    high_risk_products: number;
    medium_risk_products: number;
    low_risk_products: number;
    total_recommended_stock: number;
  };
}

export default function OptimizePage() {
  const router = useRouter();
  const [data, setData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);

  // Supplier contact management state
  const [supplierContacts, setSupplierContacts] = useState<{
    [key: string]: string;
  }>({});
  const [applyToCategory, setApplyToCategory] = useState<{
    [key: string]: boolean;
  }>({});
  const [savingSupplier, setSavingSupplier] = useState<{
    [key: string]: boolean;
  }>({});
  const [sendingNotification, setSendingNotification] = useState<{
    [key: string]: boolean;
  }>({});

  // Alert dialog state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    state: string | null;
    location: string | null;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Report sending state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportEmail, setReportEmail] = useState("");
  const [reportWhatsApp, setReportWhatsApp] = useState("");
  const [sendingReport, setSendingReport] = useState(false);

  // Helper function to show alert
  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  useEffect(() => {
    getLocation();
    loadSavedSuppliers();
  }, []);

  // Capture user's geolocation
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get state and location name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            );
            const data = await response.json();

            const state = data.address?.state || null;
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              null;

            setUserLocation({
              latitude,
              longitude,
              state,
              location: city,
            });

            // Now fetch optimization data with location
            fetchOptimizationData(state, city);
          } catch (err) {
            console.error("Reverse geocoding error:", err);
            setUserLocation({
              latitude,
              longitude,
              state: null,
              location: null,
            });
            // Fetch without location data
            fetchOptimizationData();
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError(error.message);
          // Fetch without location data
          fetchOptimizationData();
        },
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      // Fetch without location data
      fetchOptimizationData();
    }
  };

  const loadSavedSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers/load");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.suppliers) {
          setSupplierContacts(result.suppliers);
        }
      }
    } catch (err) {
      console.error("Failed to load saved suppliers:", err);
    }
  };

  const fetchOptimizationData = async (
    state?: string | null,
    location?: string | null,
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Build URL with location parameters if available
      let url = "http://localhost:5000/optimize";
      const params = new URLSearchParams();

      if (state) params.append("user_state", state);
      if (location) params.append("user_location", location);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch optimization data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Optimization fetch error:", err);
      setError(
        "Failed to load optimization data. Make sure the Flask backend is running on http://localhost:5000",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-green-100 text-green-800 border-green-200",
    };
    return colors[riskLevel as keyof typeof colors] || colors.low;
  };

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === "high") return <AlertTriangle className="w-4 h-4" />;
    if (riskLevel === "medium") return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "increasing")
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === "decreasing")
      return (
        <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
      );
    return <span className="w-4 h-4 inline-block" />;
  };

  const handleCreateAgent = async () => {
    if (!data || !data.recommendations || data.recommendations.length === 0) {
      showAlert("No Data", "Please wait for optimization data to load first");
      return;
    }

    try {
      setCreatingAgent(true);

      // Create the optimization object to store
      const optimizationObject = {
        summary: data.summary,
        location: userLocation
          ? {
              state: userLocation.state,
              city: userLocation.location,
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }
          : null,
        generatedAt: new Date().toISOString(),
      };

      // Insert into Supabase companions table
      const { data: companion, error } = await supabase
        .from("companions")
        .insert([
          {
            name: "Inventory Optimizer",
            subject: "Inventory",
            topic: JSON.stringify(optimizationObject),
            style: "formal",
            voice: "male",
            duration: 5,
            author: "user_32p3CicanZoN3HU7NB3pWALDO6C",
            projectId: null,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (companion && companion.id) {
        // Redirect to companions page
        window.location.href = `https://inventory-management-ai.vercel.app/companions/${companion.id}`;
      } else {
        throw new Error("Failed to create companion");
      }
    } catch (err: any) {
      console.error("Create agent error:", err);
      showAlert(
        "Error",
        err.message || "Failed to create agent. Please try again.",
      );
    } finally {
      setCreatingAgent(false);
    }
  };

  const handleGenerateAndSendReport = async (method: "email" | "whatsapp") => {
    if (method === "email" && (!reportEmail || !reportEmail.includes("@"))) {
      showAlert("Invalid Email", "Please enter a valid email address");
      return;
    }

    if (method === "whatsapp" && !reportWhatsApp) {
      showAlert(
        "Invalid Phone",
        "Please enter a WhatsApp number with country code",
      );
      return;
    }

    if (!data || !data.recommendations || data.recommendations.length === 0) {
      showAlert("No Data", "Please wait for optimization data to load first");
      return;
    }

    try {
      setSendingReport(true);

      // Use existing data - get top 5 products for the report
      const top5Products = data.recommendations.slice(0, 5);

      // Create a simple HTML report from existing data
      const reportHtml = generateReportHTML(top5Products, data.summary);

      // Send the report directly without calling the backend report generator
      if (method === "email") {
        const emailResponse = await fetch(
          "http://localhost:5000/reports/send-email",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to_email: reportEmail,
              report_type: "optimization",
              report_html: reportHtml,
              user_state: userLocation?.state,
              user_location: userLocation?.location,
            }),
          },
        );

        const emailResult = await emailResponse.json();

        if (emailResult.success) {
          showAlert(
            "Report Sent Successfully",
            `Optimization report has been sent to ${reportEmail}`,
          );
          setShowReportModal(false);
          setReportEmail("");
        } else {
          throw new Error(emailResult.error || "Failed to send email");
        }
      } else {
        // WhatsApp method - send notification
        const whatsappResponse = await fetch(
          "http://localhost:5000/reports/send-whatsapp",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to_number: reportWhatsApp,
              report_type: "optimization",
              user_state: userLocation?.state,
              user_location: userLocation?.location,
            }),
          },
        );

        const whatsappResult = await whatsappResponse.json();

        if (whatsappResult.success) {
          showAlert(
            "Notification Sent Successfully",
            `Report notification has been sent to ${reportWhatsApp} via WhatsApp`,
          );
          setShowReportModal(false);
          setReportWhatsApp("");
        } else {
          throw new Error(whatsappResult.error || "Failed to send WhatsApp");
        }
      }
    } catch (err: any) {
      console.error("Report error:", err);
      showAlert(
        "Error",
        err.message ||
          "Failed to send report. Make sure the backend is running.",
      );
    } finally {
      setSendingReport(false);
    }
  };

  const generateReportHTML = (products: any[], summary: any) => {
    const now = new Date().toLocaleString();
    const location = userLocation
      ? `${userLocation.location}, ${userLocation.state}`
      : "Unknown";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Resource Optimization Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
          .header { background-color: #8b5cf6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .summary { background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .product-card { background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .risk-high { color: #dc2626; font-weight: bold; }
          .risk-medium { color: #f59e0b; font-weight: bold; }
          .risk-low { color: #10b981; font-weight: bold; }
          .metric { display: inline-block; margin: 10px 20px 10px 0; }
          .metric-label { font-size: 12px; color: #666; display: block; }
          .metric-value { font-size: 18px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resource Optimization Report</h1>
          <p>Generated: ${now}</p>
          <p>Location: ${location}</p>
        </div>

        <div class="summary">
          <h2>Summary</h2>
          <div class="metric">
            <span class="metric-label">Total Resources</span>
            <span class="metric-value">${summary.total_products}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Critical Shortage Risk</span>
            <span class="metric-value risk-high">${
              summary.high_risk_products
            }</span>
          </div>
          <div class="metric">
            <span class="metric-label">Moderate Shortage Risk</span>
            <span class="metric-value risk-medium">${
              summary.medium_risk_products
            }</span>
          </div>
          <div class="metric">
            <span class="metric-label">Adequate Supply</span>
            <span class="metric-value risk-low">${
              summary.low_risk_products
            }</span>
          </div>
        </div>

        <h2>Top 5 Priority Resources</h2>
        ${products
          .map(
            (product, index) => `
          <div class="product-card">
            <h3>${index + 1}. ${product.product_name}</h3>
            <p><strong>Category:</strong> ${product.category}</p>
            <p><strong>Risk Level:</strong> <span class="risk-${
              product.risk_level
            }">${product.risk_level.toUpperCase()}</span></p>
            <p><strong>Demand Trend:</strong> ${product.demand_trend}</p>

            <table>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Current Utilization</td>
                <td>${Math.round(product.current_avg_demand)}</td>
              </tr>
              <tr>
                <td>Forecasted Need</td>
                <td>${Math.round(product.predicted_demand)}</td>
              </tr>
              <tr>
                <td>Recommended Procurement Quantity</td>
                <td><strong>${Math.round(
                  product.optimal_order_qty,
                )}</strong></td>
              </tr>
              <tr>
                <td>Replenishment Threshold</td>
                <td>${Math.round(product.reorder_point)}</td>
              </tr>
              <tr>
                <td>Emergency Reserve</td>
                <td>${Math.round(product.safety_stock)}</td>
              </tr>
            </table>
          </div>
        `,
          )
          .join("")}

        <div style="margin-top: 30px; padding: 20px; background-color: white; border-radius: 8px; text-align: center; color: #666;">
          <p>Generated with GovNexus AI</p>
          <p>Powered by AI-driven demand forecasting for public resource management</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleContactChange = (productName: string, value: string) => {
    setSupplierContacts((prev) => ({ ...prev, [productName]: value }));
  };

  const handleCategoryToggle = (productName: string, category: string) => {
    const isTogglingOn = !applyToCategory[productName];
    setApplyToCategory((prev) => ({
      ...prev,
      [productName]: isTogglingOn,
    }));

    // If toggling on and there's a saved category contact, use it
    if (isTogglingOn && supplierContacts[`category:${category}`]) {
      setSupplierContacts((prev) => ({
        ...prev,
        [productName]: supplierContacts[`category:${category}`],
      }));
    }
  };

  // Get the contact for a product (either product-specific or category-wide)
  const getContactForProduct = (productName: string, category: string) => {
    // Check if there's a product-specific contact
    if (supplierContacts[productName]) {
      return supplierContacts[productName];
    }
    // Otherwise check for category-wide contact
    if (supplierContacts[`category:${category}`]) {
      return supplierContacts[`category:${category}`];
    }
    return "";
  };

  const handleSaveSupplier = async (item: any) => {
    const contactNumber = supplierContacts[item.product_name];
    if (!contactNumber || contactNumber.trim() === "") {
      showAlert("Missing Contact Number", "Please enter a contact number");
      return;
    }

    setSavingSupplier((prev) => ({ ...prev, [item.product_name]: true }));

    try {
      const response = await fetch("/api/suppliers/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactNumber,
          productName: item.product_name,
          category: item.category,
          applyToCategory: applyToCategory[item.product_name] || false,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showAlert("Update Confirmed", "Supplier Contact Saved Successfully!");
      } else {
        showAlert(
          "Error",
          `Failed to save: ${result.error || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error("Save supplier error:", err);
      showAlert("Error", "Failed to save supplier contact");
    } finally {
      setSavingSupplier((prev) => ({ ...prev, [item.product_name]: false }));
    }
  };

  const handleSendNotification = async (item: any) => {
    const contactNumber = supplierContacts[item.product_name];
    if (!contactNumber || contactNumber.trim() === "") {
      showAlert(
        "Missing Contact Number",
        "Please enter a contact number first",
      );
      return;
    }

    setSendingNotification((prev) => ({ ...prev, [item.product_name]: true }));

    try {
      // First, get the supplier ID
      const suppliersResponse = await fetch("/api/suppliers/load");
      const suppliersData = await suppliersResponse.json();
      console.log("Suppliers data:", suppliersData);

      // Find supplier by contact number and product/category
      let supplierId: string | null = null;
      if (suppliersData.success && suppliersData.supplierDetails) {
        // Look for category-wide supplier first
        const categoryKey = `category:${item.category}`;
        const productKey = item.product_name;

        // Check if category-wide supplier exists and matches contact number
        if (
          suppliersData.supplierDetails[categoryKey] &&
          suppliersData.supplierDetails[categoryKey].contactNumber ===
            contactNumber
        ) {
          supplierId = suppliersData.supplierDetails[categoryKey].id;
          console.log("Found category-wide supplier:", supplierId);
        }
        // Otherwise check for product-specific supplier
        else if (
          suppliersData.supplierDetails[productKey] &&
          suppliersData.supplierDetails[productKey].contactNumber ===
            contactNumber
        ) {
          supplierId = suppliersData.supplierDetails[productKey].id;
          console.log("Found product-specific supplier:", supplierId);
        }
      }

      if (!supplierId) {
        showAlert(
          "Error",
          "Please save the supplier contact first before sending notification",
        );
        setSendingNotification((prev) => ({
          ...prev,
          [item.product_name]: false,
        }));
        return;
      }

      const endpoint = applyToCategory[item.product_name]
        ? "http://localhost:5000/supplier/notify-bulk"
        : "http://localhost:5000/supplier/notify";

      const isBulk = applyToCategory[item.product_name];
      const productsToOrder = isBulk
        ? data?.recommendations
            .filter((r) => r.category === item.category)
            .map((r) => ({
              product_name: r.product_name,
              predicted_demand: r.predicted_demand,
              optimal_qty: r.optimal_order_qty,
            })) || []
        : [
            {
              product_name: item.product_name,
              predicted_demand: item.predicted_demand,
              optimal_qty: item.optimal_order_qty,
            },
          ];

      const body = isBulk
        ? {
            to_number: contactNumber,
            category: item.category,
            products_list: productsToOrder,
          }
        : {
            to_number: contactNumber,
            product_name: item.product_name,
            category: item.category,
            predicted_demand: item.predicted_demand,
            optimal_qty: item.optimal_order_qty,
          };

      // Send WhatsApp notification
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        // Create supplier order records for each product
        let ordersCreated = 0;
        let ordersFailed = 0;

        for (const product of productsToOrder) {
          console.log(
            "Creating order for product:",
            product,
            "with supplierId:",
            supplierId,
          );
          try {
            const orderResponse = await fetch("/api/supplier-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                supplierId,
                productName: product.product_name,
                requestedQty: Math.round(product.optimal_qty),
                predictedDemand: product.predicted_demand,
                category: item.category,
                notes: `WhatsApp notification sent. SID: ${
                  result.message_sid || result.message_sids?.[0]
                }`,
              }),
            });

            const orderResult = await orderResponse.json();

            if (orderResponse.ok && orderResult.success) {
              console.log("✅ Order created successfully:", orderResult.order);
              ordersCreated++;
            } else {
              console.error("❌ Failed to create order:", orderResult.error);
              ordersFailed++;
            }
          } catch (orderErr) {
            console.error("❌ Error creating supplier order:", orderErr);
            ordersFailed++;
          }
        }

        // Use message_sids for bulk, message_sid for single
        const messageSids = result.message_sids || [result.message_sid];
        const sidsText = messageSids.join(", ");

        const orderStatusText =
          ordersFailed > 0
            ? `\n\n⚠️ Orders: ${ordersCreated} created, ${ordersFailed} failed. Check console for details.`
            : `\n\n✅ ${ordersCreated} order(s) created successfully!`;

        showAlert(
          "Success",
          `WhatsApp Notification Sent Successfully!\n\nMessage SID(s): ${sidsText}${orderStatusText}`,
        );
      } else {
        showAlert(
          "Error",
          `Failed to send notification: ${result.error || "Unknown error"}`,
        );
      }
    } catch (err) {
      console.error("Send notification error:", err);
      showAlert(
        "Error",
        "Failed to send WhatsApp notification. Make sure the backend is running.",
      );
    } finally {
      setSendingNotification((prev) => ({
        ...prev,
        [item.product_name]: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar currentPath="/optimize" />
        <main className="ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">
                Calculating Optimization Recommendations...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar currentPath="/optimize" />
        <main className="ml-64 p-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold mb-2">
                Failed to Load Data
              </p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() =>
                  fetchOptimizationData(
                    userLocation?.state,
                    userLocation?.location,
                  )
                }
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
      <Sidebar currentPath="/optimize" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Resource Optimization & Supply Planning
              </h1>
              <p className="text-sm text-gray-500">
                AI-powered demand forecasting for disaster preparedness and
                resource allocation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateAgent}
                disabled={creatingAgent || !data}
                className="flex items-center px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAgent ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Create Agent
                  </>
                )}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Send Report
              </button>
              <button
                onClick={() =>
                  fetchOptimizationData(
                    userLocation?.state,
                    userLocation?.location,
                  )
                }
                className="flex items-center px-4 py-2 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Resources</span>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.summary.total_products}
            </p>
            <p className="text-xs text-gray-500 mt-1">Under analysis</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Critical Shortage Risk
              </span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              {data.summary.high_risk_products}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Immediate action needed
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Moderate Shortage Risk
              </span>
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {data.summary.medium_risk_products}
            </p>
            <p className="text-xs text-gray-500 mt-1">Monitor closely</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Adequate Supply</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {data.summary.low_risk_products}
            </p>
            <p className="text-xs text-gray-500 mt-1">Optimal levels</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <TrendingUp className="w-6 h-6 text-purple-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-purple-900 mb-2">
                How Optimization Works
              </h3>
              <p className="text-sm text-purple-800 mb-2">
                Our ML model analyzes historical order patterns, seasonal
                trends, and demand variability to provide:
              </p>
              <ul className="text-sm text-purple-800 list-disc list-inside space-y-1">
                <li>
                  <strong>Forecasted Need:</strong> Predicted resource need for
                  upcoming period
                </li>
                <li>
                  <strong>Replenishment Threshold:</strong> Supply level that
                  triggers new procurement
                </li>
                <li>
                  <strong>Recommended Procurement Quantity:</strong> Suggested
                  order size to optimize allocation
                </li>
                <li>
                  <strong>Emergency Reserve:</strong> Buffer supply to prevent
                  shortages
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Metrics Explanation */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Understanding the Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Replenishment Threshold
              </h4>
              <p className="text-sm text-gray-600">
                The supply level at which you should initiate procurement.
                Calculated based on lead time need and emergency reserve to
                prevent shortages.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Recommended Procurement Quantity
              </h4>
              <p className="text-sm text-gray-600">
                The most efficient order size that optimizes allocation costs
                and supply availability. Based on forecasted need and resource
                utilization.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Emergency Reserve
              </h4>
              <p className="text-sm text-gray-600">
                Extra supply held as insurance against demand variability and
                supply uncertainty. Higher for resources with volatile need
                patterns.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Risk Level
              </h4>
              <p className="text-sm text-gray-600">
                Assessment of shortage risk based on need variability, trend
                direction, and current supply levels. High risk requires
                immediate attention.
              </p>
            </div>
          </div>
        </div>

        {/* Recommendations Cards */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Optimization Recommendations
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Showing {(currentPage - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(
                    currentPage * itemsPerPage,
                    data.recommendations.length,
                  )}{" "}
                  of {data.recommendations.length} products
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of{" "}
                  {Math.ceil(data.recommendations.length / itemsPerPage)}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        Math.ceil(data.recommendations.length / itemsPerPage),
                        prev + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(data.recommendations.length / itemsPerPage)
                  }
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {data.recommendations
            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
            .map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {item.product_name}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRiskBadge(
                            item.risk_level,
                          )}`}
                        >
                          {getRiskIcon(item.risk_level)}
                          <span className="ml-1 capitalize">
                            {item.risk_level}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(item.demand_trend)}
                      <span
                        className={`text-sm font-medium ${
                          item.demand_trend === "increasing"
                            ? "text-green-600"
                            : item.demand_trend === "decreasing"
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {item.demand_trend.charAt(0).toUpperCase() +
                          item.demand_trend.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">
                        Current Utilization
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(item.current_avg_demand)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600 mb-1">
                        Forecasted Need
                      </p>
                      <p className="text-lg font-semibold text-purple-900">
                        {Math.round(item.predicted_demand)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">
                        Replenishment Threshold
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(item.reorder_point)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">
                        Emergency Reserve
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(item.safety_stock)}
                      </p>
                    </div>
                  </div>

                  {/* Recommended Procurement Quantity - Highlighted */}
                  <div className="bg-gradient-to-r from-purple-50 to-purple-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 font-medium mb-1">
                          Recommended Procurement Quantity
                        </p>
                        <p className="text-xs text-gray-600">
                          Recommended allocation size based on AI forecast
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-purple-600">
                        {Math.round(item.optimal_order_qty)}
                      </p>
                    </div>
                  </div>

                  {/* Google Trends Visualization */}
                  {item.trends_visualization &&
                    item.trends_visualization.chart_data &&
                    item.trends_visualization.chart_data.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                          <h5 className="text-sm font-semibold text-blue-900">
                            Google Trends - Search Interest Over Time
                          </h5>
                        </div>

                        {/* Simple Bar Chart Visualization */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                            <span>Past 12 months search trends</span>
                            <span className="text-blue-600 font-medium">
                              Avg:{" "}
                              {Math.round(item.trends_visualization.average)}
                            </span>
                          </div>

                          {/* Bar chart container */}
                          <div className="space-y-1">
                            {item.trends_visualization.chart_data
                              .slice(-12)
                              .map((dataPoint, idx) => {
                                const maxValue = Math.max(
                                  ...item.trends_visualization!.values,
                                );
                                const percentage =
                                  (dataPoint.value / maxValue) * 100;
                                const isAboveAverage =
                                  dataPoint.value >
                                  item.trends_visualization!.average;

                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2"
                                  >
                                    <div className="text-xs text-gray-600 w-16 truncate">
                                      {dataPoint.date}
                                    </div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          isAboveAverage
                                            ? "bg-gradient-to-r from-green-400 to-green-600"
                                            : "bg-gradient-to-r from-blue-400 to-blue-600"
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      >
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                          {dataPoint.value}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs text-blue-800">
                              <strong>Insight:</strong> Search interest trend
                              helps predict seasonal demand patterns.
                              {item.trends_visualization.values
                                .slice(-3)
                                .every((v, i, arr) => i === 0 || v > arr[i - 1])
                                ? " ⬆️ Recent upward trend detected - consider increasing stock levels."
                                : item.trends_visualization.values
                                      .slice(-3)
                                      .every(
                                        (v, i, arr) =>
                                          i === 0 || v < arr[i - 1],
                                      )
                                  ? " ⬇️ Recent downward trend detected - monitor inventory carefully."
                                  : " ➡️ Stable search interest - maintain current inventory levels."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Partner Contact Management */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="w-4 h-4 text-gray-600" />
                      <h5 className="text-sm font-semibold text-gray-900">
                        Partner Contact & Notification
                      </h5>
                    </div>

                    <div className="space-y-3">
                      {/* Contact Number Input */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Partner WhatsApp Number (with country code)
                        </label>
                        <input
                          type="text"
                          placeholder="+1234567890"
                          value={
                            supplierContacts[item.product_name] ||
                            supplierContacts[`category:${item.category}`] ||
                            ""
                          }
                          onChange={(e) =>
                            handleContactChange(
                              item.product_name,
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      {/* Apply to Category Checkbox */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${index}`}
                          checked={applyToCategory[item.product_name] || false}
                          onChange={() =>
                            handleCategoryToggle(
                              item.product_name,
                              item.category,
                            )
                          }
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label
                          htmlFor={`category-${index}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          Apply to all resources in{" "}
                          <strong>{item.category}</strong> category
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveSupplier(item)}
                          disabled={savingSupplier[item.product_name]}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingSupplier[item.product_name] ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save Partner
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleSendNotification(item)}
                          disabled={sendingNotification[item.product_name]}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingNotification[item.product_name] ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send WhatsApp
                            </>
                          )}
                        </button>
                      </div>

                      {applyToCategory[item.product_name] && (
                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                          <p className="text-sm text-purple-800">
                            This Notification will be sent to the Supplier for{" "}
                            <strong>All Products</strong> in the{" "}
                            <strong>{item.category}</strong> Category with Bulk
                            Order Details.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Send Optimization Report
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={sendingReport}
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Choose how you would like to receive your detailed optimization
                report
              </p>

              {/* Email Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send via Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={reportEmail}
                    onChange={(e) => setReportEmail(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sendingReport}
                  />
                  <button
                    onClick={() => handleGenerateAndSendReport("email")}
                    disabled={sendingReport || !reportEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>

              {/* WhatsApp Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send via WhatsApp
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="+1234567890"
                    value={reportWhatsApp}
                    onChange={(e) => setReportWhatsApp(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={sendingReport}
                  />
                  <button
                    onClick={() => handleGenerateAndSendReport("whatsapp")}
                    disabled={sendingReport || !reportWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Include country code (e.g., +1 for US, +91 for India)
                </p>
              </div>

              {userLocation && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    Report will include data for:{" "}
                    <strong>
                      {userLocation.location}, {userLocation.state}
                    </strong>
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
              <button
                onClick={() => setShowReportModal(false)}
                disabled={sendingReport}
                className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
