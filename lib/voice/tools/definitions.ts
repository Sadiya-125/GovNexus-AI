import { ToolCall, ToolResult } from "../types";
import { resourceService } from "../services/resourceService";
import { requisitionService } from "../services/requisitionService";
import { analyticsService } from "../services/analyticsService";
import { userService } from "../services/userService";

/**
 * Tool Definitions for AI Agent Function Calling
 */

export const TOOL_DEFINITIONS = [
  {
    name: "create_resource",
    description:
      "Create a new resource in the repository with name, category, acquisition cost, and distribution cost",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the resource",
        },
        category: {
          type: "string",
          description: "Category of the resource",
        },
        acquisitionCost: {
          type: "number",
          description: "Cost to acquire the resource",
        },
        distributionCost: {
          type: "number",
          description: "Cost to distribute the resource",
        },
        quantity: {
          type: "number",
          description: "Initial quantity available",
        },
      },
      required: ["name", "category", "acquisitionCost", "distributionCost"],
    },
  },
  {
    name: "get_resource",
    description: "Get details of a specific resource by name or ID",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "ID of the resource",
        },
        resourceName: {
          type: "string",
          description: "Name of the resource",
        },
      },
      anyOf: [
        { required: ["resourceId"] },
        { required: ["resourceName"] },
      ],
    },
  },
  {
    name: "update_resource",
    description: "Update resource details",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "ID of the resource to update",
        },
        name: {
          type: "string",
          description: "New name",
        },
        category: {
          type: "string",
          description: "New category",
        },
        acquisitionCost: {
          type: "number",
          description: "New acquisition cost",
        },
        distributionCost: {
          type: "number",
          description: "New distribution cost",
        },
        quantity: {
          type: "number",
          description: "New quantity",
        },
      },
      required: ["resourceId"],
    },
  },
  {
    name: "delete_resource",
    description: "Delete a resource from the repository",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "ID of the resource to delete",
        },
      },
      required: ["resourceId"],
    },
  },
  {
    name: "list_resources",
    description: "List all resources in the repository",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of resources to return",
        },
      },
    },
  },
  {
    name: "create_requisition",
    description: "Create a new requisition for a resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "ID of the resource",
        },
        quantity: {
          type: "number",
          description: "Quantity requested",
        },
        distributionValue: {
          type: "number",
          description: "Total distribution value",
        },
      },
      required: ["resourceId", "quantity", "distributionValue"],
    },
  },
  {
    name: "get_requisition",
    description: "Get details of a specific requisition",
    inputSchema: {
      type: "object",
      properties: {
        requisitionId: {
          type: "string",
          description: "ID of the requisition",
        },
      },
      required: ["requisitionId"],
    },
  },
  {
    name: "list_requisitions",
    description: "List recent requisitions",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of requisitions to return",
        },
      },
    },
  },
  {
    name: "update_requisition",
    description: "Update requisition quantity",
    inputSchema: {
      type: "object",
      properties: {
        requisitionId: {
          type: "string",
          description: "ID of the requisition",
        },
        quantity: {
          type: "number",
          description: "New quantity",
        },
      },
      required: ["requisitionId", "quantity"],
    },
  },
  {
    name: "delete_requisition",
    description: "Delete a requisition",
    inputSchema: {
      type: "object",
      properties: {
        requisitionId: {
          type: "string",
          description: "ID of the requisition",
        },
      },
      required: ["requisitionId"],
    },
  },
  {
    name: "low_stock_resources",
    description: "Get resources with low stock",
    inputSchema: {
      type: "object",
      properties: {
        threshold: {
          type: "number",
          description: "Stock threshold level",
        },
      },
    },
  },
  {
    name: "resource_repository_value",
    description: "Get total value of the resource repository",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "resource_analytics",
    description: "Get comprehensive resource analytics",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "forecast_demand",
    description: "Forecast demand for a specific resource",
    inputSchema: {
      type: "object",
      properties: {
        resourceId: {
          type: "string",
          description: "ID of the resource",
        },
        periodMonths: {
          type: "number",
          description: "Number of months to forecast",
        },
      },
      required: ["resourceId"],
    },
  },
  {
    name: "optimization_recommendations",
    description: "Get AI-powered optimization recommendations",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_top_resources",
    description: "Get top performing resources",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of top resources to return",
        },
      },
    },
  },
];

/**
 * Execute tool call (supports multiple users)
 */
export async function executeTool(
  userIds: string[],
  toolCall: ToolCall
): Promise<ToolResult> {
  try {
    const { toolName, arguments: args } = toolCall;
    // For write operations, use first userId
    const userId = userIds[0];

    switch (toolName) {
      case "create_resource":
        const resource = await resourceService.createResource(
          userId,
          args.name as string,
          args.category as string,
          args.acquisitionCost as number,
          args.distributionCost as number,
          args.quantity as number || 0
        );
        return {
          success: true,
          data: resource,
        };

      case "get_resource":
        let resourceData;
        if (args.resourceId) {
          resourceData = await resourceService.getResource(
            userId,
            args.resourceId as string
          );
        } else {
          resourceData = await resourceService.getResourceByName(
            userId,
            args.resourceName as string
          );
        }
        return {
          success: true,
          data: resourceData,
        };

      case "update_resource":
        const updated = await resourceService.updateResource(
          userId,
          args.resourceId as string,
          {
            name: args.name as string,
            category: args.category as string,
            acquisitionCost: args.acquisitionCost as number,
            distributionCost: args.distributionCost as number,
            quantity: args.quantity as number,
          }
        );
        return {
          success: true,
          data: updated,
        };

      case "delete_resource":
        await resourceService.deleteResource(
          userId,
          args.resourceId as string
        );
        return {
          success: true,
          data: { message: "Resource deleted successfully" },
        };

      case "list_resources":
        const resources = await resourceService.listResources(
          userIds,
          args.limit as number || 20
        );
        return {
          success: true,
          data: resources,
        };

      case "create_requisition":
        const requisition = await requisitionService.createRequisition(
          userId,
          args.resourceId as string,
          args.quantity as number,
          args.distributionValue as number,
          (args.acquisitionCost as number) || 0
        );
        return {
          success: true,
          data: requisition,
        };

      case "get_requisition":
        const reqData = await requisitionService.getRequisition(
          userId,
          args.requisitionId as string
        );
        return {
          success: true,
          data: reqData,
        };

      case "list_requisitions":
        const requisitions = await requisitionService.listRequisitions(
          userIds,
          args.limit as number || 10
        );
        return {
          success: true,
          data: requisitions,
        };

      case "update_requisition":
        const updatedReq = await requisitionService.updateRequisition(
          userId,
          args.requisitionId as string,
          args.quantity as number
        );
        return {
          success: true,
          data: updatedReq,
        };

      case "delete_requisition":
        await requisitionService.deleteRequisition(
          userId,
          args.requisitionId as string
        );
        return {
          success: true,
          data: { message: "Requisition deleted successfully" },
        };

      case "low_stock_resources":
        const lowStock = await resourceService.getLowStockResources(
          userIds,
          args.threshold as number || 10
        );
        return {
          success: true,
          data: lowStock,
        };

      case "resource_repository_value":
        const value = await resourceService.getRepositoryValue(userIds);
        return {
          success: true,
          data: { totalValue: value },
        };

      case "resource_analytics":
        const analytics = await analyticsService.getResourceAnalytics(userIds);
        return {
          success: true,
          data: analytics,
        };

      case "forecast_demand":
        const forecast = await analyticsService.forecastDemand(
          userId,
          args.resourceId as string,
          args.periodMonths as number || 3
        );
        return {
          success: true,
          data: forecast,
        };

      case "optimization_recommendations":
        const recommendations =
          await analyticsService.getOptimizationRecommendations(userIds);
        return {
          success: true,
          data: recommendations,
        };

      case "get_top_resources":
        const topResources = await analyticsService.getTopPerformingResources(
          userIds,
          args.limit as number || 5
        );
        return {
          success: true,
          data: topResources,
        };

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
