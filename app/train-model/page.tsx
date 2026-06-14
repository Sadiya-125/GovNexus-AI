"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { Brain, Loader2, CheckCircle, XCircle, Settings } from "lucide-react";

export default function TrainModelPage() {
  const [isTraining, setIsTraining] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<
    "idle" | "training" | "success" | "error"
  >("idle");
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  // Training configuration
  const [useCheckpoint, setUseCheckpoint] = useState(false);
  const [epochs, setEpochs] = useState(100);
  const [modelType, setModelType] = useState("random_forest");

  // Rotating log display
  useEffect(() => {
    if (logs.length > 0 && isTraining) {
      const interval = setInterval(() => {
        setCurrentLogIndex((prev) => (prev + 1) % Math.min(logs.length, 5));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [logs, isTraining]);

  const handleTrain = async () => {
    setIsTraining(true);
    setStatus("training");
    setLogs([]);
    setCurrentLogIndex(0);

    try {
      const response = await fetch("http://localhost:5000/train", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          useCheckpoint,
          epochs,
          modelType,
        }),
      });

      if (!response.ok) {
        throw new Error("Training failed");
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
      console.error("Training error:", error);
      setLogs((prev) => [
        ...prev,
        "Error: Failed to connect to Flask backend. Make sure it's running on http://localhost:5000",
      ]);
      setStatus("error");
    } finally {
      setIsTraining(false);
    }
  };

  const getVisibleLogs = () => {
    if (logs.length <= 5) return logs;
    const start = Math.max(0, logs.length - 5);
    return logs.slice(start);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath="/train-model" />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Train ML Model
              </h1>
              <p className="text-sm text-gray-500">
                Train your machine learning model using order data
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl">
          {/* Info Card */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
            <div className="flex items-start">
              <Brain className="w-5 h-5 text-purple-600 mt-0.5 mr-3 shrink-0" />
              <div>
                <h3 className="text-md font-semibold text-purple-900 mb-2">
                  How it Works
                </h3>
                <p className="text-sm text-purple-800">
                  This feature trains a machine learning model to predict profit
                  and optimize inventory. Configure your training options below,
                  then click "Start Training". Make sure your Flask backend is
                  running on{" "}
                  <code className="bg-purple-100 px-1 rounded">
                    http://localhost:5000
                  </code>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                Training Configuration
              </h3>
            </div>

            <div className="space-y-6">
              {/* Model Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Type
                </label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  disabled={isTraining}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="random_forest">
                    Random Forest (Recommended)
                  </option>
                  <option value="gradient_boosting">Gradient Boosting</option>
                  <option value="linear_regression">Linear Regression</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {modelType === "random_forest" &&
                    "Best for complex patterns and feature interactions"}
                  {modelType === "gradient_boosting" &&
                    "High accuracy but slower training"}
                  {modelType === "linear_regression" &&
                    "Fast training for simple linear relationships"}
                </p>
              </div>

              {/* Epochs Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Epochs: {epochs}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  disabled={isTraining}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50 (Fast)</span>
                  <span>250 (Balanced)</span>
                  <span>500 (Thorough)</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  More epochs = better accuracy but longer training time
                </p>
              </div>

              {/* Checkpoint Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Use Checkpoint Model
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Resume training from the last saved checkpoint instead of
                    starting fresh
                  </p>
                </div>
                <button
                  onClick={() => setUseCheckpoint(!useCheckpoint)}
                  disabled={isTraining}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useCheckpoint ? "bg-purple-600" : "bg-gray-200"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useCheckpoint ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Training Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                {status === "idle" && (
                  <Brain className="w-10 h-10 text-purple-600" />
                )}
                {status === "training" && (
                  <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                )}
                {status === "success" && (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                )}
                {status === "error" && (
                  <XCircle className="w-10 h-10 text-red-600" />
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {status === "idle" && "Ready to Train"}
                {status === "training" && "Training in Progress..."}
                {status === "success" && "Training Complete!"}
                {status === "error" && "Training Failed"}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {status === "idle" &&
                  "Click the button below to start training your model"}
                {status === "training" &&
                  "Please wait while the model is being trained"}
                {status === "success" &&
                  "Your model has been successfully trained"}
                {status === "error" &&
                  "An error occurred during training. Check the logs below."}
              </p>

              <button
                onClick={handleTrain}
                disabled={isTraining}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  isTraining
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isTraining ? (
                  <span className="flex items-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Training...
                  </span>
                ) : (
                  "Start Training"
                )}
              </button>
            </div>

            {/* Training Logs */}
            {logs.length > 0 && (
              <div className="mt-8 border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Training Logs
                </h3>
                <div className="bg-gray-900 rounded-lg p-6 min-h-[200px] relative overflow-hidden">
                  <div className="space-y-2">
                    {getVisibleLogs().map((log, index) => {
                      const opacity =
                        index === currentLogIndex % getVisibleLogs().length
                          ? 1
                          : 0.5;
                      const scale =
                        index === currentLogIndex % getVisibleLogs().length
                          ? 1
                          : 0.95;

                      return (
                        <div
                          key={index}
                          className="transition-all duration-500 ease-in-out font-mono text-sm"
                          style={{
                            opacity,
                            transform: `scale(${scale})`,
                            color:
                              log.includes("Error") ||
                              log.includes("error") ||
                              log.includes("failed")
                                ? "#ef4444"
                                : log.includes("Success") ||
                                  log.includes("complete") ||
                                  log.includes("finished")
                                ? "#10b981"
                                : "#a78bfa",
                          }}
                        >
                          <span className="text-gray-500 mr-2">
                            [{new Date().toLocaleTimeString()}]
                          </span>
                          {log}
                        </div>
                      );
                    })}
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full opacity-10 blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500 rounded-full opacity-10 blur-3xl animate-pulse delay-75" />
                </div>

                {/* Full log history */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-purple-600 hover:text-purple-700">
                    View all logs ({logs.length})
                  </summary>
                  <div className="mt-4 bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="font-mono text-xs text-gray-700 mb-1"
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
