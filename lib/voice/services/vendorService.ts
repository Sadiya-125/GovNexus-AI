import { prisma } from "@/lib/prisma";
import { VoiceError } from "../types";

export class VendorService {
  /**
   * Get all vendors for a user (supports multiple users)
   */
  async getVendors(userIds: string[]): Promise<
    Array<{
      id: string;
      name: string;
      contactNumber: string;
      category?: string;
    }>
  > {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { userId: { in: userIds } },
        distinct: ["supplierName", "contactNumber"],
      });

      return suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.supplierName || "Unnamed Vendor",
        contactNumber: supplier.contactNumber,
        category: supplier.category || undefined,
      }));
    } catch (error) {
      throw new VoiceError(
        "VENDOR_ERROR",
        `Failed to retrieve vendors: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get vendor details
   */
  async getVendorDetails(userId: string, vendorId: string) {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: vendorId },
      });

      if (!supplier || supplier.userId !== userId) {
        throw new VoiceError(
          "VENDOR_NOT_FOUND",
          "Vendor not found in your records"
        );
      }

      return {
        id: supplier.id,
        name: supplier.supplierName || "Unnamed Vendor",
        contactNumber: supplier.contactNumber,
        category: supplier.category,
        notes: supplier.notes,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "VENDOR_ERROR",
        `Failed to retrieve vendor details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add a new vendor
   */
  async addVendor(
    userId: string,
    name: string,
    contactNumber: string,
    category?: string,
    notes?: string
  ) {
    try {
      const supplier = await prisma.supplier.create({
        data: {
          userId,
          supplierName: name,
          contactNumber,
          category: category || null,
          notes: notes || null,
        },
      });

      return {
        id: supplier.id,
        name: supplier.supplierName || "Unnamed Vendor",
        contactNumber: supplier.contactNumber,
      };
    } catch (error) {
      throw new VoiceError(
        "VENDOR_ERROR",
        `Failed to add vendor: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get procurement requests for a vendor (supports multiple users)
   */
  async getProcurementRequests(userIds: string[]) {
    try {
      const supplierOrders = await prisma.supplierOrder.findMany({
        where: {
          retailerUserId: { in: userIds },
        },
        include: {
          product: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return supplierOrders.map((order) => ({
        id: order.id,
        resourceName: order.product?.name || order.productName,
        quantity: order.requestedQty,
        status: order.status,
        createdAt: order.createdAt,
      }));
    } catch (error) {
      throw new VoiceError(
        "VENDOR_ERROR",
        `Failed to retrieve procurement requests: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update procurement request status
   */
  async updateProcurementStatus(
    userId: string,
    procurementId: string,
    status: "pending" | "approved" | "rejected" | "completed"
  ) {
    try {
      const order = await prisma.supplierOrder.findUnique({
        where: { id: procurementId },
      });

      if (!order) {
        throw new VoiceError(
          "PROCUREMENT_NOT_FOUND",
          "Procurement request not found"
        );
      }

      // Verify user has permission to update
      if (order.retailerUserId !== userId) {
        throw new VoiceError(
          "UNAUTHORIZED",
          "You do not have permission to update this request"
        );
      }

      const updated = await prisma.supplierOrder.update({
        where: { id: procurementId },
        data: { status },
      });

      return {
        id: updated.id,
        status: updated.status,
        message: `Procurement request status updated to ${status}`,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "VENDOR_ERROR",
        `Failed to update procurement status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const vendorService = new VendorService();
