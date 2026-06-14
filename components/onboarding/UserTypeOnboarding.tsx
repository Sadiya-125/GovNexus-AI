"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Store, Phone, Loader2 } from "lucide-react";

interface OnboardingProps {
  onComplete?: () => void;
}

export default function UserTypeOnboarding({ onComplete }: OnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "details">("type");
  const [userType, setUserType] = useState<"retailer" | "supplier" | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTypeSelection = (type: "retailer" | "supplier") => {
    setUserType(type);
    if (type === "supplier") {
      setStep("details");
    } else {
      // For retailers, save directly
      handleSaveProfile(type);
    }
  };

  const handleSaveProfile = async (type?: "retailer" | "supplier") => {
    setLoading(true);
    setError("");

    const finalUserType = type || userType;

    try {
      const payload: any = {
        userType: finalUserType,
      };

      if (finalUserType === "supplier") {
        if (!phoneNumber.trim()) {
          setError("Phone number is required for suppliers");
          setLoading(false);
          return;
        }
        payload.phoneNumber = phoneNumber;
        payload.companyName = companyName || undefined;
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      // Redirect based on user type
      if (onComplete) {
        onComplete();
      } else {
        router.push(finalUserType === "supplier" ? "/supplier-orders" : "/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (step === "type") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Welcome to SmartInventory
            </h1>
            <p className="text-xl text-gray-600">
              Let's get started. What best describes you?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Retailer Card */}
            <button
              onClick={() => handleTypeSelection("retailer")}
              disabled={loading}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100 hover:border-purple-600 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <Store className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                I'm a Retailer
              </h2>
              <p className="text-gray-600 mb-4">
                Manage inventory, track products, predict demand with ML, and send orders to suppliers.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Inventory management
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  ML-powered demand forecasting
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                  Create supplier orders
                </li>
              </ul>
            </button>

            {/* Supplier Card */}
            <button
              onClick={() => handleTypeSelection("supplier")}
              disabled={loading}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100 hover:border-green-600 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                <Building2 className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                I'm a Supplier
              </h2>
              <p className="text-gray-600 mb-4">
                Receive orders from retailers, manage incoming requests, and accept or reject orders.
              </p>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Receive retailer orders
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Accept or reject requests
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                  Track order history
                </li>
              </ul>
            </button>
          </div>

          {loading && (
            <div className="text-center mt-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto" />
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Supplier details form
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6 mx-auto">
            <Building2 className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Supplier Information
          </h2>
          <p className="text-gray-600 mb-8 text-center">
            We need your contact information to connect you with retailers
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveProfile();
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                This phone number will be used to match you with supplier records in the retailer's database
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Company Name (Optional)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ABC Supplies Inc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("type")}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !phoneNumber.trim()}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
