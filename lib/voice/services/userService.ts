import { prisma } from "@/lib/prisma";
import { UserProfile, VoiceError, SupportedLanguage } from "../types";
import { sessionManager } from "../session";

export class UserService {
  /**
   * Get user by phone number
   */
  async getUserByPhone(phoneNumber: string): Promise<UserProfile | null> {
    try {
      // Normalize phone number
      const normalizedPhone = sessionManager.normalizePhoneNumber(phoneNumber);

      // Search for user with phone number
      const user = await prisma.userProfile.findFirst({
        where: { phoneNumber: normalizedPhone },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        userId: user.userId,
        companyName: user.companyName || "",
        phoneNumber: user.phoneNumber || "",
        userType: user.userType === "retailer" ? "agency" : "vendor",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      throw new VoiceError(
        "USER_ERROR",
        `Failed to retrieve user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        userId: user.userId,
        companyName: user.companyName || "",
        phoneNumber: user.phoneNumber || "",
        userType: user.userType === "retailer" ? "agency" : "vendor",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      throw new VoiceError(
        "USER_ERROR",
        `Failed to retrieve user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create user profile
   */
  async createUserProfile(
    userId: string,
    phoneNumber: string,
    companyName: string,
    userType: "agency" | "vendor"
  ): Promise<UserProfile> {
    try {
      const normalizedPhone = sessionManager.normalizePhoneNumber(phoneNumber);

      const profile = await prisma.userProfile.create({
        data: {
          userId,
          phoneNumber: normalizedPhone,
          companyName,
          userType: userType === "agency" ? "retailer" : "supplier",
        },
      });

      return {
        id: profile.id,
        userId: profile.userId,
        companyName: profile.companyName || "",
        phoneNumber: profile.phoneNumber || "",
        userType: profile.userType === "retailer" ? "agency" : "vendor",
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    } catch (error) {
      throw new VoiceError(
        "USER_ERROR",
        `Failed to create user profile: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get or create user by phone
   */
  async getOrCreateUserByPhone(
    phoneNumber: string,
    companyName?: string,
    userType: "agency" | "vendor" = "agency"
  ): Promise<UserProfile | null> {
    try {
      let user = await this.getUserByPhone(phoneNumber);

      if (!user && companyName) {
        // Generate a temporary user ID
        const tempUserId = `phone-${sessionManager.normalizePhoneNumber(phoneNumber)}`;

        user = await this.createUserProfile(
          tempUserId,
          phoneNumber,
          companyName,
          userType
        );
      }

      return user;
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "USER_ERROR",
        `Failed to get or create user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get user's preferred language
   * Note: Language is determined from company name or session detection
   */
  async getUserLanguage(
    userId: string,
    defaultLanguage: SupportedLanguage = "en"
  ): Promise<SupportedLanguage> {
    try {
      // Language preference is stored in session, not in UserProfile
      // This method returns the default language
      return defaultLanguage;
    } catch (error) {
      return defaultLanguage;
    }
  }

  /**
   * Update user language preference
   * Note: Language is typically managed at session level
   */
  async updateUserLanguage(
    userId: string,
    language: SupportedLanguage
  ): Promise<void> {
    try {
      // Language preference updates are handled at session level
      // This is a placeholder for future implementation if needed
      console.log(`Language preference for user ${userId} set to ${language}`);
    } catch (error) {
      throw new VoiceError(
        "USER_ERROR",
        `Failed to update language preference: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export const userService = new UserService();
