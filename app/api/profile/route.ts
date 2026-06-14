import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    // Get user profile - don't create one automatically
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Return a special response indicating first-time user
      return NextResponse.json({
        firstTimeUser: true,
        userId
      }, { status: 200 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/profile - Create or update user profile
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const userId = user.id;

    const data = await request.json();
    let { userType, phoneNumber, companyName } = data;

    // Trim phone number to remove any whitespace
    if (phoneNumber) {
      phoneNumber = phoneNumber.trim();
    }

    // Validate userType
    if (userType && !["retailer", "supplier"].includes(userType)) {
      return NextResponse.json(
        { error: "Invalid user type. Must be 'retailer' or 'supplier'" },
        { status: 400 }
      );
    }

    // Upsert profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(userType && { userType }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(companyName !== undefined && { companyName }),
      },
      create: {
        userId,
        userType: userType || "retailer",
        phoneNumber,
        companyName,
      },
    });

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
