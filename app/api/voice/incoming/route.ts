import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Handle incoming voice calls from Twilio
 * POST /api/voice/incoming
 *
 * New Phone-First Flow (No Pre-Registration Required):
 * 1. Create session (NO user validation)
 * 2. Ask for language selection (1-6)
 * 3. Redirect to language selection handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const callSid = body.get("CallSid") as string;
    const from = body.get("From") as string;

    if (!callSid) {
      console.error("[Voice] Missing CallSid");
      const response = new VoiceResponse();
      response.say("Invalid call parameters");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    console.log(`[Voice] Incoming call: ${callSid} from ${from}`);

    // Verify Redis connection before creating session
    let session;
    try {
      session = await sessionManager.createSession("en");
      console.log(`[Voice] Session created successfully: ${session.sessionId}`);
    } catch (redisError) {
      console.error(
        "[Voice] Failed to create session - Redis error:",
        redisError,
      );
      const response = new VoiceResponse();
      response.say(
        "I'm experiencing technical difficulties. Please try calling again in a few moments.",
      );
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
        status: 500,
      });
    }

    // Create TwiML response - Ask for language selection
    const response = new VoiceResponse();

    const gather = response.gather({
      numDigits: 1,
      method: "POST",
      action: `/api/voice/select-language?sessionId=${session.sessionId}`,
      timeout: 15, // Increased timeout for better UX
      finishOnKey: "#", // Allow user to press # to finish selection
    });

    gather.say(
      "Welcome to GovNexus AI. Please select your language. Press 1 for English, 2 for Hindi, 3 for Telugu, 4 for Tamil, 5 for Kannada, or 6 for Marathi.",
    );

    // Fallback - if no digits pressed within timeout
    response.say(
      "If you did not select a language, the call will end. Goodbye.",
    );
    response.hangup();

    console.log(
      `[Voice] Sending TwiML response for session: ${session.sessionId}`,
    );

    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error(
      "[Voice] Incoming call error:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("[Voice] Full error:", error);

    const response = new VoiceResponse();
    response.say(
      "An error occurred while connecting your call. Please try again later.",
    );
    response.hangup();

    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 500,
    });
  }
}
