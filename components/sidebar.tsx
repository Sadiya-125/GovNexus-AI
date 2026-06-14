import { UserButton } from "@stackframe/stack";
import {
  BarChart3,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Brain,
  LineChart,
  TrendingUp,
  Sparkles,
  Bot,
  Truck,
} from "lucide-react";
import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Resources", href: "/inventory", icon: Package },
  { name: "Requisitions", href: "/orders", icon: ShoppingCart },
  { name: "Procurement Requests", href: "/supplier-orders", icon: Truck },
  { name: "Resource Assistant", href: "/chatbot", icon: Bot },
  { name: "Train Model", href: "/train-model", icon: Brain },
  { name: "Advanced Analytics", href: "/advanced-ml", icon: Sparkles },
  { name: "Analytics & Insights", href: "/eda", icon: LineChart },
  { name: "Resource Optimization", href: "/optimize", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({
  currentPath = "/dashboard",
}: {
  currentPath: string;
}) {
  return (
    <div className="fixed left-0 top-0 bg-gray-900 text-white w-64 min-h-screen p-6 z-10">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Link href="/" className="flex items-center space-x-2">
            <BarChart3 className="w-7 h-7" />
            <span className="text-lg font-semibold">GovNexus AI</span>
          </Link>
        </div>
      </div>

      <nav className="space-y-1">
        <div className="text-sm font-semibold text-gray-400 uppercase">
          Resources
        </div>
        {navigation.map((item, key) => {
          const IconComponent = item.icon;
          const isActive = currentPath === item.href;
          return (
            <Link
              href={item.href}
              key={key}
              className={`flex items-center space-x-3 py-2 px-3 rounded-lg ${
                isActive
                  ? "bg-purple-100 text-gray-800"
                  : "hover:bg-gray-800 text-gray-300"
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-6 borter-t border-gray-700">
        <div className="flex items-center justify-between">
          <UserButton showUserInfo />
        </div>
      </div>
    </div>
  );
}
