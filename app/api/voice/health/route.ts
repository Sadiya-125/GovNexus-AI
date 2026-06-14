import { NextRequest, NextResponse } from "next/server";
import { sessionManager } from "@/lib/voice/session";

/**
 * Health check endpoint for voice system
 * GET /api/voice/health
 *
 * Tests:
 * - Upstash Redis connection
 * - Session creation capability
 * - Environment variables
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    service: "voice-system",
    status: "checking",
  };

  try {
    // Check environment variables
    checks.env = {
      upstashUrl: process.env.UPSTASH_REDIS_REST_URL ? "✓ Set" : "✗ Missing",
      upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN ? "✓ Set" : "✗ Missing",
      redisSessionTtl: process.env.REDIS_SESSION_TTL || "default (3600s)",
    };

    // Try to create a test session (this will test Redis connection)
    try {
      const testSession = await sessionManager.createSession("en");
      checks.redis = {
        status: "✓ Connected",
        sessionId: testSession.sessionId,
        ttl: process.env.REDIS_SESSION_TTL || 3600,
      };

      // Try to retrieve the session we just created
      const retrievedSession = await sessionManager.getSession(testSession.sessionId);
      if (retrievedSession) {
        checks.redis.retrieval = "✓ Session retrieval works";
      } else {
        checks.redis.retrieval = "✗ Session retrieval failed";
      }
    } catch (redisError: any) {
      checks.redis = {
        status: "✗ Connection failed",
        error: redisError.message || String(redisError),
      };
    }

    // Overall status
    checks.status = checks.redis?.status === "✓ Connected" ? "healthy" : "unhealthy";

    return NextResponse.json(checks, {
      status: checks.status === "healthy" ? 200 : 503,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        service: "voice-system",
        status: "error",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
