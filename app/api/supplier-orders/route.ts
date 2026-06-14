import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/supplier-orders - Get supplier orders
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const { searchParams } = new URL(request.url);
    const viewType = searchParams.get("viewType") || "retailer"; // "retailer" or "supplier"

    let orders;

    if (viewType === "supplier") {
      // Get orders for suppliers connected to this user's phone number
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!profile?.phoneNumber) {
        return NextResponse.json(
          { error: "Supplier phone number not set" },
          { status: 400 }
        );
      }

      // Find suppliers with this phone number
      const suppliers = await prisma.supplier.findMany({
        where: {
          contactNumber: profile.phoneNumber,
        },
      });
      console.log("Suppliers found:", suppliers);
      const supplierIds = suppliers.map((s) => s.id);
      // Get orders for these suppliers
      orders = await prisma.supplierOrder.findMany({
        where: {
          supplierId: { in: supplierIds },
        },
        include: {
          supplier: {
            include: {
              product: true,
            },
          },
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // For supplier view, fetch their available product quantities
      const supplierProducts = await prisma.product.findMany({
        where: { userId },
        select: { name: true, quantity: true },
      });

      // Map orders with available quantity info
      orders = orders.map((order: any) => {
        const matchingProduct = supplierProducts.find(
          (p) => p.name === order.productName
        );
        return {
          ...order,
          supplierAvailableQty: matchingProduct?.quantity ?? null,
        };
      });
    } else {
      // Get orders created by this retailer
      orders = await prisma.supplierOrder.findMany({
        where: {
          retailerUserId: userId,
        },
        include: {
          supplier: true,
          product: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    // Map supplierName to name for consistency
    const mappedOrders = orders.map((order: any) => ({
      ...order,
      supplier: {
        ...order.supplier,
        name:
          order.supplier.supplierName ||
          order.supplier.name ||
          "Unknown Supplier",
      },
    }));

    return NextResponse.json({ success: true, orders: mappedOrders });
  } catch (error: any) {
    console.error("Get supplier orders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/supplier-orders - Create supplier order
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const data = await request.json();
    console.log("Create supplier order data:", data);
    const {
      supplierId,
      productId,
      productName,
      requestedQty,
      predictedDemand,
      category,
      notes,
    } = data;

    if (!supplierId || !productName || !requestedQty) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: supplierId, productName, requestedQty",
        },
        { status: 400 }
      );
    }

    // Create supplier order
    const order = await prisma.supplierOrder.create({
      data: {
        retailerUserId: userId,
        supplierId,
        productId,
        productName,
        requestedQty: parseInt(requestedQty),
        predictedDemand: predictedDemand ? parseFloat(predictedDemand) : null,
        category,
        notes,
        status: "pending",
      },
      include: {
        supplier: true,
        product: true,
      },
    });
    console.log("Supplier order created:", order);

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Create supplier order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/supplier-orders - Update supplier order status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const data = await request.json();
    const { orderId, status, notes } = data;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, status" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be: pending, accepted, or rejected" },
        { status: 400 }
      );
    }

    // Get the order first to verify permissions
    const order = await prisma.supplierOrder.findUnique({
      where: { id: orderId },
      include: { supplier: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log("Order to update:", order);

    // Check if user is authorized (either the retailer who created it or the supplier)
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const isRetailer = order.retailerUserId === userId;
    const isSupplier = profile?.phoneNumber === order.supplier.contactNumber;

    if (!isRetailer && !isSupplier) {
      return NextResponse.json(
        { error: "Not authorized to update this order" },
        { status: 403 }
      );
    }

    // If supplier is accepting the order, check if they have enough product quantity
    if (isSupplier && status === "accepted") {
      // Find the supplier's product that matches the order's product name
      const supplierProducts = await prisma.product.findMany({
        where: {
          userId: userId, // Supplier's user ID
          name: order.productName,
        },
      });

      if (supplierProducts.length === 0) {
        return NextResponse.json(
          {
            error: `You don't have a product named "${order.productName}" in your inventory. Please add it first.`,
          },
          { status: 400 }
        );
      }

      const supplierProduct = supplierProducts[0];
      const availableQuantity = supplierProduct.quantity || 0;

      if (availableQuantity < order.requestedQty) {
        return NextResponse.json(
          {
            error: `Insufficient quantity. You have ${availableQuantity} units of "${order.productName}", but ${order.requestedQty} units are requested.`,
          },
          { status: 400 }
        );
      }

      // Reduce the product quantity when accepting
      await prisma.product.update({
        where: { id: supplierProduct.id },
        data: {
          quantity: availableQuantity - order.requestedQty,
        },
      });

      console.log(
        `✅ Reduced ${order.requestedQty} units from product "${order.productName}". New quantity: ${availableQuantity - order.requestedQty}`
      );
    }

    // Update order
    const updatedOrder = await prisma.supplierOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...(notes && { notes }),
      },
      include: {
        supplier: true,
        product: true,
      },
    });

    // If supplier is updating status (accepting/rejecting), send WhatsApp notification to retailer
    if (isSupplier && (status === "accepted" || status === "rejected")) {
      console.log(`🔔 Supplier ${userId} is ${status === "accepted" ? "accepting" : "rejecting"} order ${orderId}`);

      try {
        // Get retailer's phone number
        const retailerProfile = await prisma.userProfile.findUnique({
          where: { userId: order.retailerUserId },
        });
        console.log("📱 Retailer profile for notification:", {
          userId: order.retailerUserId,
          hasProfile: !!retailerProfile,
          phoneNumber: retailerProfile?.phoneNumber || "NOT SET",
          userType: retailerProfile?.userType
        });

        if (retailerProfile?.phoneNumber) {
          // Send notification to Flask backend
          const flaskUrl =
            process.env.FLASK_BACKEND_URL || "http://127.0.0.1:5000";

          const notificationPayload = {
            to_number: retailerProfile.phoneNumber,
            product_name: order.productName,
            status: status,
            requested_qty: order.requestedQty,
            supplier_name: order.supplier.supplierName || "Supplier",
          };

          console.log("📤 Sending notification to Flask:", {
            url: `${flaskUrl}/retailer/notify`,
            payload: notificationPayload
          });

          const notifyResponse = await fetch(`${flaskUrl}/retailer/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(notificationPayload),
          });

          const notifyResult = await notifyResponse.json();
          console.log("📥 Flask response:", notifyResult);

          if (notifyResult.success) {
            console.log(
              `✅ Retailer notified via WhatsApp: ${notifyResult.message_sid}`
            );
          } else {
            console.error(
              "❌ Failed to send retailer notification:",
              notifyResult.error
            );
          }
        } else {
          console.log(
            "⚠️ Retailer phone number not available - skipping WhatsApp notification. Retailer needs to add phone number in profile settings."
          );
        }
      } catch (notifyError) {
        console.error("❌ Error sending retailer notification:", notifyError);
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Update supplier order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
