import { prisma } from "@/lib/prisma";
import { RequisitionVoiceData, VoiceError } from "../types";

export class RequisitionService {
  /**
   * Create a new requisition
   */
  async createRequisition(
    userId: string,
    productId: string,
    quantity: number,
    distributionValue: number,
    acquisitionCost: number
  ): Promise<RequisitionVoiceData> {
    try {
      // Verify product exists and belongs to user
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.userId !== userId) {
        throw new VoiceError(
          "RESOURCE_NOT_FOUND",
          "Resource not found in your repository"
        );
      }

      // Validate quantities
      if (quantity <= 0) {
        throw new VoiceError(
          "INVALID_QUANTITY",
          "Quantity must be greater than zero"
        );
      }

      if (distributionValue <= 0 || acquisitionCost < 0) {
        throw new VoiceError(
          "INVALID_COST",
          "Costs must be valid positive numbers"
        );
      }

      const valueDelivered = distributionValue - acquisitionCost * quantity;

      const requisition = await prisma.order.create({
        data: {
          userId,
          productId,
          orderQty: quantity,
          sales: distributionValue,
          costOfSales: acquisitionCost * quantity,
          profit: valueDelivered,
          orderDate: new Date(),
          year: new Date().getFullYear(),
        },
      });

      return this.mapToVoiceData(requisition, product.name);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to create requisition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get requisition by ID
   */
  async getRequisition(
    userId: string,
    requisitionId: string
  ): Promise<RequisitionVoiceData> {
    try {
      const requisition = await prisma.order.findUnique({
        where: { id: requisitionId },
        include: { product: true },
      });

      if (!requisition || requisition.userId !== userId) {
        throw new VoiceError(
          "REQUISITION_NOT_FOUND",
          "Requisition not found in your records"
        );
      }

      return this.mapToVoiceData(requisition, requisition.product.name);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to retrieve requisition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List recent requisitions (supports multiple users)
   */
  async listRequisitions(
    userIds: string[],
    limit: number = 10
  ): Promise<RequisitionVoiceData[]> {
    try {
      const requisitions = await prisma.order.findMany({
        where: { userId: { in: userIds } },
        include: { product: true },
        take: limit,
        orderBy: { orderDate: "desc" },
      });

      return requisitions.map((r) => this.mapToVoiceData(r, r.product.name));
    } catch (error) {
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to list requisitions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get requisition count (supports multiple users)
   */
  async getRequisitionCount(userIds: string[]): Promise<number> {
    try {
      return await prisma.order.count({
        where: { userId: { in: userIds } },
      });
    } catch (error) {
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to count requisitions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get total distribution value (supports multiple users)
   */
  async getTotalDistributionValue(userIds: string[]): Promise<number> {
    try {
      const result = await prisma.order.aggregate({
        where: { userId: { in: userIds } },
        _sum: {
          sales: true,
        },
      });

      return Number(result._sum.sales) || 0;
    } catch (error) {
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to calculate distribution value: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get total value delivered (supports multiple users)
   */
  async getTotalValueDelivered(userIds: string[]): Promise<number> {
    try {
      const result = await prisma.order.aggregate({
        where: { userId: { in: userIds } },
        _sum: {
          profit: true,
        },
      });

      return Number(result._sum.profit) || 0;
    } catch (error) {
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to calculate value delivered: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update requisition quantity
   */
  async updateRequisition(
    userId: string,
    requisitionId: string,
    quantity: number
  ): Promise<RequisitionVoiceData> {
    try {
      const requisition = await prisma.order.findUnique({
        where: { id: requisitionId },
        include: { product: true },
      });

      if (!requisition || requisition.userId !== userId) {
        throw new VoiceError(
          "REQUISITION_NOT_FOUND",
          "Requisition not found in your records"
        );
      }

      if (quantity <= 0) {
        throw new VoiceError(
          "INVALID_QUANTITY",
          "Quantity must be greater than zero"
        );
      }

      // Recalculate costs based on new quantity
      const unitAcquisitionCost =
        Number(requisition.costOfSales) / Number(requisition.orderQty);
      const unitDistributionValue = Number(requisition.sales) / Number(requisition.orderQty);
      const newCostOfSales = unitAcquisitionCost * quantity;
      const newSales = unitDistributionValue * quantity;
      const newProfit = newSales - newCostOfSales;

      const updated = await prisma.order.update({
        where: { id: requisitionId },
        data: {
          orderQty: quantity,
          costOfSales: newCostOfSales,
          sales: newSales,
          profit: newProfit,
        },
        include: { product: true },
      });

      return this.mapToVoiceData(updated, updated.product.name);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to update requisition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete requisition
   */
  async deleteRequisition(userId: string, requisitionId: string): Promise<void> {
    try {
      const requisition = await prisma.order.findUnique({
        where: { id: requisitionId },
      });

      if (!requisition || requisition.userId !== userId) {
        throw new VoiceError(
          "REQUISITION_NOT_FOUND",
          "Requisition not found in your records"
        );
      }

      await prisma.order.delete({
        where: { id: requisitionId },
      });
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "REQUISITION_ERROR",
        `Failed to delete requisition: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Map Prisma Order to VoiceData
   */
  private mapToVoiceData(order: any, resourceName: string): RequisitionVoiceData {
    return {
      id: order.id,
      resourceId: order.productId,
      resourceName,
      quantity: order.orderQty,
      distributionValue: Number(order.sales) || 0,
      valueDelivered: Number(order.profit) || 0,
      requisitionDate: order.orderDate,
    };
  }
}

export const requisitionService = new RequisitionService();
