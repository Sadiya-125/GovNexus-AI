import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import {
  VoiceSession,
  ConversationMessage,
  SupportedLanguage,
  VoiceError,
} from "./types";

class SessionManager {
  private redis: Redis;
  private sessionTTL: number;

  constructor() {
    // Initialize Redis client - Upstash Redis with REST API
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      throw new Error(
        "Upstash Redis configuration missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
      );
    }

    // Initialize Redis with Upstash REST API credentials
    this.redis = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });

    this.sessionTTL =
      parseInt(process.env.REDIS_SESSION_TTL || "3600", 10) || 3600;
  }

  /**
   * Create a new voice session (phone-first auth)
   * Initial session with only language selected - user and phone collected later
   */
  async createSession(
    language: SupportedLanguage
  ): Promise<VoiceSession> {
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

      const session: VoiceSession = {
        sessionId,
        userIds: [],                  // Empty initially
        selectedUserId: undefined,
        companyNames: [],
        phoneNumber: undefined,       // Not collected yet
        phoneCollected: false,
        userLookupComplete: false,
        language,
        activeIntent: null,
        pendingAction: null,
        pendingEntity: {},
        conversationHistory: [],
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };

      await this.redis.setex(
        `voice-session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to create session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get session by session ID
   */
  async getSession(sessionId: string): Promise<VoiceSession | null> {
    try {
      const data = await this.redis.get(`voice-session:${sessionId}`);
      if (!data) return null;

      // Handle both string and object responses from Upstash Redis
      let session: VoiceSession;
      if (typeof data === "string") {
        session = JSON.parse(data) as VoiceSession;
      } else if (typeof data === "object" && data !== null) {
        session = data as VoiceSession;
      } else {
        return null;
      }

      session.createdAt = new Date(session.createdAt);
      session.updatedAt = new Date(session.updatedAt);
      session.expiresAt = new Date(session.expiresAt);

      // Refresh expiry - store as JSON string
      await this.redis.setex(
        `voice-session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to retrieve session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get session by phone number
   */
  async getSessionByPhone(phoneNumber: string): Promise<VoiceSession | null> {
    try {
      const sessionId = await this.redis.get(
        `voice-session-phone:${phoneNumber}`
      );
      if (!sessionId) return null;

      return this.getSession(sessionId as string);
    } catch (error) {
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to retrieve session by phone: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update session
   */
  async updateSession(session: VoiceSession): Promise<VoiceSession> {
    try {
      session.updatedAt = new Date();

      await this.redis.setex(
        `voice-session:${session.sessionId}`,
        this.sessionTTL,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to update session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add message to conversation history
   */
  async addMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    language: SupportedLanguage
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new VoiceError("SESSION_ERROR", "Session not found");
      }

      const message: ConversationMessage = {
        role,
        content,
        timestamp: new Date(),
        language,
      };

      session.conversationHistory.push(message);

      // Keep only last 20 messages to save space
      if (session.conversationHistory.length > 20) {
        session.conversationHistory = session.conversationHistory.slice(-20);
      }

      await this.updateSession(session);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to add message: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new VoiceError("SESSION_ERROR", "Session not found");
      }

      return session.conversationHistory;
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to retrieve conversation history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update pending action
   */
  async setPendingAction(
    sessionId: string,
    action: string | null,
    entity: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new VoiceError("SESSION_ERROR", "Session not found");
      }

      session.pendingAction = action as any;
      session.pendingEntity = entity;

      await this.updateSession(session);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to set pending action: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set phone number after collection and confirmation
   */
  async setPhoneNumber(sessionId: string, phoneNumber: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new VoiceError("SESSION_ERROR", "Session not found");
      }

      session.phoneNumber = phoneNumber;
      session.phoneCollected = true;

      await this.updateSession(session);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to set phone number: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Set user IDs after lookup, optionally auto-select if single user
   */
  async setUserIds(
    sessionId: string,
    userIds: string[],
    companyNames: string[]
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new VoiceError("SESSION_ERROR", "Session not found");
      }

      session.userIds = userIds;
      session.companyNames = companyNames;
      session.userLookupComplete = true;

      // If only one user, auto-select
      if (userIds.length === 1) {
        session.selectedUserId = userIds[0];
      }

      await this.updateSession(session);
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to set user IDs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return;

      await this.redis.del(`voice-session:${sessionId}`);
      await this.redis.del(`voice-session-phone:${session.phoneNumber}`);
    } catch (error) {
      throw new VoiceError(
        "SESSION_ERROR",
        `Failed to delete session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Normalize phone number to consistent format
   * Handles: 10 digit numbers, numbers with leading 0, and with country code
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phoneNumber.replace(/[^\d+]/g, "");

    // Remove leading 0 if present (old landline format)
    if (normalized.startsWith("0") && !normalized.startsWith("+")) {
      normalized = normalized.substring(1);
    }

    // If already has country code (91 or +91), ensure + prefix
    if (normalized.startsWith("91") && !normalized.startsWith("+")) {
      normalized = "+" + normalized;
    }

    // If no + prefix and length is 10, assume India and add country code
    if (!normalized.startsWith("+") && normalized.length === 10) {
      normalized = "+91" + normalized;
    }

    // If no + prefix, add it
    if (!normalized.startsWith("+")) {
      normalized = "+" + normalized;
    }

    return normalized;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export class for testing
export default SessionManager;
