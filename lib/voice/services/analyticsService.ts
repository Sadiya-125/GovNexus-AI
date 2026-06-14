import { prisma } from "@/lib/prisma";
import { ResourceAnalyticsData, VoiceError } from "../types";

export class AnalyticsService {
  /**
   * Get comprehensive resource analytics (supports multiple users)
   */
  async getResourceAnalytics(userIds: string[]): Promise<ResourceAnalyticsData> {
    try {
      const totalResources = await prisma.product.count({
        where: { userId: { in: userIds } },
      });

      // Get total repository value
      const valueResult = await prisma.product.aggregate({
        where: { userId: { in: userIds } },
        _sum: { unitCost: true },
      });

      const totalValue = Number(valueResult._sum.unitCost) || 0;

      // Get most utilized resources
      const mostUtilized = await prisma.order.groupBy({
        by: ["productId"],
        where: { userId: { in: userIds } },
        _count: true,
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      });

      const mostUtilizedWithNames = await Promise.all(
        mostUtilized.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          return {
            name: product?.name || "Unknown",
            utilization: item._count,
          };
        })
      );

      // Get low stock resources
      const lowStockCount = Math.max(1, Math.ceil(totalResources * 0.1));

      return {
        totalResources,
        totalValue,
        lowStockCount,
        mostUtilized: mostUtilizedWithNames,
        forecastedDemand: {}, // Placeholder for ML forecasting
      };
    } catch (error) {
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to get analytics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get resource utilization by category (supports multiple users)
   */
  async getUtilizationByCategory(userIds: string[]): Promise<Record<string, number>> {
    try {
      const results = await prisma.order.groupBy({
        by: ["productId"],
        where: { userId: { in: userIds } },
        _count: true,
      });

      const categoryUtilization: Record<string, number> = {};

      for (const result of results) {
        const product = await prisma.product.findUnique({
          where: { id: result.productId },
        });

        if (product) {
          const category = product.category || "Uncategorized";
          categoryUtilization[category] =
            (categoryUtilization[category] || 0) + result._count;
        }
      }

      return categoryUtilization;
    } catch (error) {
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to get category utilization: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get distribution value by category (supports multiple users)
   */
  async getDistributionByCategory(userIds: string[]): Promise<Record<string, number>> {
    try {
      const products = await prisma.product.findMany({
        where: { userId: { in: userIds } },
        include: {
          orders: true,
        },
      });

      const distributionByCategory: Record<string, number> = {};

      for (const product of products) {
        const category = product.category || "Uncategorized";
        const totalSales = product.orders.reduce((sum, order) => {
          return sum + Number(order.sales);
        }, 0);

        distributionByCategory[category] =
          (distributionByCategory[category] || 0) + totalSales;
      }

      return distributionByCategory;
    } catch (error) {
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to get distribution by category: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get top performing resources (supports multiple users)
   */
  async getTopPerformingResources(
    userIds: string[],
    limit: number = 5
  ): Promise<
    Array<{
      name: string;
      totalDistribution: number;
      totalValue: number;
      utilizationCount: number;
    }>
  > {
    try {
      const topResources = await prisma.order.groupBy({
        by: ["productId"],
        where: { userId: { in: userIds } },
        _sum: { sales: true, profit: true },
        _count: true,
        orderBy: { _sum: { profit: "desc" } },
        take: limit,
      });

      const results = await Promise.all(
        topResources.map(async (item) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });

          return {
            name: product?.name || "Unknown",
            totalDistribution: Number(item._sum.sales) || 0,
            totalValue: Number(item._sum.profit) || 0,
            utilizationCount: item._count,
          };
        })
      );

      return results;
    } catch (error) {
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to get top resources: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Forecast demand for a resource
   */
  async forecastDemand(
    userId: string,
    productId: string,
    periodMonths: number = 3
  ): Promise<{
    resourceName: string;
    currentDemand: number;
    forecastedDemand: number;
    trend: "increasing" | "decreasing" | "stable";
  }> {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.userId !== userId) {
        throw new VoiceError(
          "RESOURCE_NOT_FOUND",
          "Resource not found in your repository"
        );
      }

      // Get recent orders
      const now = new Date();
      const periodStart = new Date(now.getTime() - periodMonths * 30 * 24 * 60 * 60 * 1000);

      const recentOrders = await prisma.order.findMany({
        where: {
          userId,
          productId,
          orderDate: {
            gte: periodStart,
          },
        },
        orderBy: { orderDate: "asc" },
      });

      // Calculate current average demand
      const currentDemand =
        recentOrders.length > 0
          ? recentOrders.reduce((sum, o) => sum + o.orderQty, 0) /
            recentOrders.length
          : 0;

      // Simple trend calculation
      let trend: "increasing" | "decreasing" | "stable" = "stable";
      if (recentOrders.length > 1) {
        const firstHalf = recentOrders.slice(0, Math.floor(recentOrders.length / 2));
        const secondHalf = recentOrders.slice(Math.floor(recentOrders.length / 2));

        const firstAvg =
          firstHalf.length > 0
            ? firstHalf.reduce((sum, o) => sum + o.orderQty, 0) / firstHalf.length
            : 0;
        const secondAvg =
          secondHalf.length > 0
            ? secondHalf.reduce((sum, o) => sum + o.orderQty, 0) / secondHalf.length
            : 0;

        if (secondAvg > firstAvg * 1.1) trend = "increasing";
        else if (secondAvg < firstAvg * 0.9) trend = "decreasing";
      }

      // Simple forecast (moving average with trend)
      const trendMultiplier = {
        increasing: 1.15,
        decreasing: 0.85,
        stable: 1.0,
      }[trend];

      const forecastedDemand = Math.ceil(currentDemand * trendMultiplier);

      return {
        resourceName: product.name,
        currentDemand: Math.round(currentDemand),
        forecastedDemand,
        trend,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to forecast demand: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get optimization recommendations (supports multiple users)
   */
  async getOptimizationRecommendations(
    userIds: string[]
  ): Promise<
    Array<{
      resourceName: string;
      recommendation: string;
      priority: "high" | "medium" | "low";
    }>
  > {
    try {
      const recommendations: Array<{
        resourceName: string;
        recommendation: string;
        priority: "high" | "medium" | "low";
      }> = [];

      const products = await prisma.product.findMany({
        where: { userId: { in: userIds } },
        include: {
          orders: {
            orderBy: { orderDate: "desc" },
            take: 10,
          },
        },
      });

      for (const product of products) {
        if (product.orders.length === 0) {
          recommendations.push({
            resourceName: product.name,
            recommendation: `No orders recorded for ${product.name}. Consider removing if no longer needed.`,
            priority: "low",
          });
          continue;
        }

        // Check for declining utilization
        const recentOrders = product.orders.slice(0, 5);
        const olderOrders = product.orders.slice(5, 10);

        if (recentOrders.length > 0 && olderOrders.length > 0) {
          const recentAvg =
            recentOrders.reduce((sum, o) => sum + o.orderQty, 0) /
            recentOrders.length;
          const olderAvg =
            olderOrders.reduce((sum, o) => sum + o.orderQty, 0) /
            olderOrders.length;

          if (recentAvg < olderAvg * 0.5) {
            recommendations.push({
              resourceName: product.name,
              recommendation: `Utilization of ${product.name} has declined significantly. Review procurement strategy.`,
              priority: "medium",
            });
          } else if (recentAvg > olderAvg * 1.5) {
            recommendations.push({
              resourceName: product.name,
              recommendation: `Demand for ${product.name} is increasing rapidly. Consider increasing stock levels.`,
              priority: "high",
            });
          }
        }

        // Check acquisition vs distribution cost
        if (Number(product.price) < Number(product.unitCost) * 1.2) {
          recommendations.push({
            resourceName: product.name,
            recommendation: `Distribution cost for ${product.name} is low. Review pricing strategy.`,
            priority: "low",
          });
        }
      }

      return recommendations;
    } catch (error) {
      throw new VoiceError(
        "ANALYTICS_ERROR",
        `Failed to get recommendations: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const analyticsService = new AnalyticsService();
