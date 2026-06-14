"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import {
  Brain,
  Loader2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Layers,
  GitCompare,
  Sparkles,
  Network,
} from "lucide-react";

type TabType = "compare" | "ensemble" | "transfer" | "deep-learning";

export default function AdvancedMLPage() {
  const [activeTab, setActiveTab] = useState<TabType>("compare");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  // Model comparison state
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "random_forest",
    "gradient_boosting",
    "linear_regression",
  ]);

  // Ensemble state
  const [ensembleModels, setEnsembleModels] = useState<string[]>([
    "random_forest",
    "gradient_boosting",
    "ridge",
  ]);

  // Transfer learning state
  const [useBestModel, setUseBestModel] = useState(true);
  const [baseModel, setBaseModel] = useState("profit_prediction_model.pkl");
  const [freezeLayers, setFreezeLayers] = useState(2);
  const [tlEpochs, setTlEpochs] = useState(100);

  // Deep learning state
  const [dlModelType, setDlModelType] = useState("mlp");
  const [dlEpochs, setDlEpochs] = useState(100);

  const handleStreamingRequest = async (url: string, body: any) => {
    setIsProcessing(true);
    setStatus("processing");
    setLogs([]);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          lines.forEach((line) => {
            if (line.startsWith("data: ")) {
              const logMessage = line.substring(6);
              setLogs((prev) => [...prev, logMessage]);
            }
          });
        }
      }

      setStatus("success");
    } catch (error) {
      console.error("Error:", error);
      setLogs((prev) => [
        ...prev,
        "Error: Failed to connect to Flask backend. Make sure it's running on http://localhost:5000",
      ]);
      setStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompareModels = async () => {
    await handleStreamingRequest("http://localhost:5000/models/compare", {
      models: selectedModels,
    });
  };

  const handleTrainEnsemble = async () => {
    await handleStreamingRequest("http://localhost:5000/models/ensemble", {
      models: ensembleModels,
    });
  };

  const handleTransferLearning = async () => {
    await handleStreamingRequest("http://localhost:5000/models/transfer-learning", {
      use_best_model: useBestModel,
      base_model: useBestModel ? undefined : baseModel,
      epochs: tlEpochs,
      freeze_layers: freezeLayers,
    });
  };

  const handleDeepLearning = async () => {
    await handleStreamingRequest("http://localhost:5000/models/deep-learning", {
      model_type: dlModelType,
      epochs: dlEpochs,
    });
  };

  const availableModels = [
    { value: "random_forest", label: "Random Forest" },
    { value: "gradient_boosting", label: "Gradient Boosting" },
    { value: "linear_regression", label: "Linear Regression" },
    { value: "ridge", label: "Ridge Regression" },
    { value: "lasso", label: "Lasso Regression" },
    { value: "decision_tree", label: "Decision Tree" },
    { value: "svr", label: "Support Vector Regression" },
    { value: "knn", label: "K-Nearest Neighbors" },
    { value: "mlp", label: "Multi-Layer Perceptron" },
  ];

  const toggleModel = (modelValue: string, stateArray: string[], setState: any) => {
    if (stateArray.includes(modelValue)) {
      setState(stateArray.filter((m) => m !== modelValue));
    } else {
      setState([...stateArray, modelValue]);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "compare":
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <GitCompare className="w-6 h-6 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Model Comparison
                  </h3>
                  <p className="text-sm text-blue-800">
                    Compare multiple ML models side-by-side to find the best performer for your
                    data. Metrics include R² score, RMSE, MAE, and cross-validation scores.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Models to Compare
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableModels.map((model) => (
                  <label
                    key={model.value}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedModels.includes(model.value)
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model.value)}
                      onChange={() => toggleModel(model.value, selectedModels, setSelectedModels)}
                      disabled={isProcessing}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {model.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Selected: {selectedModels.length} model(s)
              </p>
            </div>

            <button
              onClick={handleCompareModels}
              disabled={isProcessing || selectedModels.length < 2}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isProcessing || selectedModels.length < 2
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Comparing Models...
                </span>
              ) : (
                "Start Comparison"
              )}
            </button>
          </div>
        );

      case "ensemble":
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <Layers className="w-6 h-6 text-green-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900 mb-2">
                    Ensemble Learning
                  </h3>
                  <p className="text-sm text-green-800">
                    Combine multiple models to create a more robust prediction system. Ensemble
                    models often outperform individual models by leveraging their collective
                    strengths.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Models for Ensemble
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableModels.map((model) => (
                  <label
                    key={model.value}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      ensembleModels.includes(model.value)
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ensembleModels.includes(model.value)}
                      onChange={() => toggleModel(model.value, ensembleModels, setEnsembleModels)}
                      disabled={isProcessing}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {model.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Selected: {ensembleModels.length} model(s)
              </p>
            </div>

            <button
              onClick={handleTrainEnsemble}
              disabled={isProcessing || ensembleModels.length < 2}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isProcessing || ensembleModels.length < 2
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Training Ensemble...
                </span>
              ) : (
                "Train Ensemble Model"
              )}
            </button>
          </div>
        );

      case "transfer":
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start">
                <Network className="w-6 h-6 text-orange-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-orange-900 mb-2">
                    Transfer Learning
                  </h3>
                  <p className="text-sm text-orange-800">
                    Leverage pre-trained models to accelerate training and improve performance.
                    Transfer learning reuses knowledge from existing models, making it ideal for
                    smaller datasets.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Auto-select Best Model
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Automatically use the best performing model as base
                  </p>
                </div>
                <button
                  onClick={() => setUseBestModel(!useBestModel)}
                  disabled={isProcessing}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useBestModel ? "bg-orange-600" : "bg-gray-200"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useBestModel ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {!useBestModel && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Model
                  </label>
                  <input
                    type="text"
                    value={baseModel}
                    onChange={(e) => setBaseModel(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="profit_prediction_model.pkl"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Name of the base model file (must be trained first)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Freeze Layers: {freezeLayers}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={freezeLayers}
                  onChange={(e) => setFreezeLayers(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of base model layers to freeze (higher = more transfer)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Epochs: {tlEpochs}
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={tlEpochs}
                  onChange={(e) => setTlEpochs(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            <button
              onClick={handleTransferLearning}
              disabled={isProcessing}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isProcessing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Training Transfer Model...
                </span>
              ) : (
                "Start Transfer Learning"
              )}
            </button>
          </div>
        );

      case "deep-learning":
        return (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <div className="flex items-start">
                <Brain className="w-6 h-6 text-indigo-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                    Deep Learning Models
                  </h3>
                  <p className="text-sm text-indigo-800">
                    Train advanced neural network architectures like LSTM, GRU, or MLP. Deep
                    learning models can capture complex patterns but require more data and
                    computational resources.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Architecture
                </label>
                <select
                  value={dlModelType}
                  onChange={(e) => setDlModelType(e.target.value)}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="mlp">Multi-Layer Perceptron (MLP)</option>
                  <option value="lstm">LSTM - Long Short-Term Memory</option>
                  <option value="gru">GRU - Gated Recurrent Unit</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {dlModelType === "mlp" && "Best for general regression tasks"}
                  {dlModelType === "lstm" && "Excellent for time-series and sequential data"}
                  {dlModelType === "gru" && "Similar to LSTM but faster to train"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Epochs: {dlEpochs}
                </label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={dlEpochs}
                  onChange={(e) => setDlEpochs(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50 (Fast)</span>
                  <span>175 (Balanced)</span>
                  <span>300 (Thorough)</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Note: Deep learning requires TensorFlow to be installed in your Python
                environment. Install with: <code className="bg-yellow-100 px-1 rounded">pip
                install tensorflow</code>
              </p>
            </div>

            <button
              onClick={handleDeepLearning}
              disabled={isProcessing}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isProcessing
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Training Deep Learning Model...
                </span>
              ) : (
                "Train Deep Learning Model"
              )}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/advanced-ml" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Advanced ML Techniques
          </h1>
          <p className="text-sm text-gray-500">
            Explore cutting-edge machine learning approaches
          </p>
        </div>

        <div className="max-w-5xl">
          {/* Tabs */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="grid grid-cols-4 gap-0">
              <button
                onClick={() => setActiveTab("compare")}
                className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "compare"
                    ? "border-purple-600 text-purple-600 bg-purple-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <GitCompare className="w-5 h-5 mx-auto mb-1" />
                Compare Models
              </button>
              <button
                onClick={() => setActiveTab("ensemble")}
                className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "ensemble"
                    ? "border-green-600 text-green-600 bg-green-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Layers className="w-5 h-5 mx-auto mb-1" />
                Ensemble
              </button>
              <button
                onClick={() => setActiveTab("transfer")}
                className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "transfer"
                    ? "border-orange-600 text-orange-600 bg-orange-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Network className="w-5 h-5 mx-auto mb-1" />
                Transfer Learning
              </button>
              <button
                onClick={() => setActiveTab("deep-learning")}
                className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "deep-learning"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Brain className="w-5 h-5 mx-auto mb-1" />
                Deep Learning
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            {renderTabContent()}
          </div>

          {/* Training Logs */}
          {logs.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Processing Logs</h3>
                <div className="flex items-center">
                  {status === "processing" && (
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin mr-2" />
                  )}
                  {status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  )}
                  {status === "error" && (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-600">
                    {status === "processing" && "In Progress"}
                    {status === "success" && "Complete"}
                    {status === "error" && "Failed"}
                  </span>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="font-mono text-sm"
                      style={{
                        color: log.includes("Error") || log.includes("❌")
                          ? "#ef4444"
                          : log.includes("✅") || log.includes("✓")
                          ? "#10b981"
                          : log.includes("⚠️")
                          ? "#f59e0b"
                          : "#a78bfa",
                      }}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
