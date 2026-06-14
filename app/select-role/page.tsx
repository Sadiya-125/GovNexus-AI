"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { Store, Truck, Loader2, ArrowRight } from "lucide-react";

export default function SelectRolePage() {
  const user = useUser({ or: "redirect" });
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<
    "retailer" | "supplier" | null
  >(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [error, setError] = useState("");

  // Check if user already has a profile on component mount
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        // If user already has a profile, redirect them based on their role
        if (!data.firstTimeUser && data.userType) {
          if (data.userType === "retailer") {
            router.push("/dashboard");
          } else if (data.userType === "supplier") {
            router.push("/supplier-orders");
          }
        } else {
          // User is a first-time user, show the role selection form
          setCheckingProfile(false);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        // On error, show the form to allow user to continue
        setCheckingProfile(false);
      }
    };

    if (user) {
      checkExistingProfile();
    }
  }, [user, router]);

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (!phoneNumber) {
      setError("Phone number is required for WhatsApp notifications");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: selectedRole,
          phoneNumber: phoneNumber.trim(),
          companyName: companyName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Redirect based on role
      if (selectedRole === "retailer") {
        router.push("/dashboard");
      } else {
        router.push("/supplier-orders");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  // Show loading screen while checking for existing profile
  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Checking Your Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Inventory Management
          </h1>
          <p className="text-lg text-gray-600">
            Let's get started by setting up your account
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Choose Your Role
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Retailer Card */}
            <button
              onClick={() => setSelectedRole("retailer")}
              disabled={loading}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedRole === "retailer"
                  ? "border-purple-600 bg-purple-50 shadow-lg scale-105"
                  : "border-gray-200 hover:border-purple-300 hover:shadow-md"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    selectedRole === "retailer"
                      ? "bg-purple-600"
                      : "bg-purple-100"
                  }`}
                >
                  <Store
                    className={`w-8 h-8 ${
                      selectedRole === "retailer"
                        ? "text-white"
                        : "text-purple-600"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Retailer
                </h3>
                <p className="text-sm text-gray-600">
                  Manage inventory, track orders, and analyze sales data
                </p>
              </div>
            </button>

            {/* Supplier Card */}
            <button
              onClick={() => setSelectedRole("supplier")}
              disabled={loading}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedRole === "supplier"
                  ? "border-green-600 bg-green-50 shadow-lg scale-105"
                  : "border-gray-200 hover:border-green-300 hover:shadow-md"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    selectedRole === "supplier"
                      ? "bg-green-600"
                      : "bg-green-100"
                  }`}
                >
                  <Truck
                    className={`w-8 h-8 ${
                      selectedRole === "supplier"
                        ? "text-white"
                        : "text-green-600"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Supplier
                </h3>
                <p className="text-sm text-gray-600">
                  Receive and manage orders from retailers
                </p>
              </div>
            </button>
          </div>

          {/* Additional Details */}
          {selectedRole && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Additional Information
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Required){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    disabled={loading}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 ${
                      selectedRole === "retailer"
                        ? "focus:ring-purple-600"
                        : "focus:ring-green-600"
                    } focus:border-transparent outline-none disabled:bg-gray-100`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedRole === "retailer"
                      ? "Required for receiving WhatsApp notifications about order status"
                      : "Required for receiving and managing supplier orders"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Include country code (e.g., +1 for USA)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    disabled={loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedRole}
              className={`w-full px-6 py-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                selectedRole === "retailer"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : selectedRole === "supplier"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-300 cursor-not-allowed"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          You can change your role settings later in your profile
        </p>
      </div>
    </div>
  );
}
