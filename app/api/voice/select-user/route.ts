import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";
import { getLanguageCode } from "@/lib/voice/utils";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");

  const body = await request.formData();
  const digits = body.get("Digits") as string;

  const response = new VoiceResponse();

  if (!sessionId) {
    response.say("Session error.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const session = await sessionManager.getSession(sessionId);
  if (!session) {
    response.say("Session expired.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userIndex = parseInt(digits) - 1;

  if (userIndex >= 0 && userIndex < session.userIds.length) {
    session.selectedUserId = session.userIds[userIndex];
    await sessionManager.updateSession(session);
    response.say(`Welcome ${session.companyNames[userIndex]}. How may I assist you today?`);
    const gather = response.gather({
      numDigits: 0,
      method: "POST",
      action: `/api/voice/process?sessionId=${sessionId}`,
      timeout: 12,
      speechTimeout: "auto",
      language: getLanguageCode(session.language) as any,
    });
    gather.say("Please tell me what you need.");
  } else {
    response.say("Invalid selection. Please try again.");
    response.redirect(`/api/voice/lookup-user?sessionId=${sessionId}`);
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
