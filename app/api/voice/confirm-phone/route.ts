import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");
  const phoneNumber = searchParams.get("phone");

  const body = await request.formData();
  const digits = body.get("Digits") as string;

  const response = new VoiceResponse();

  if (!sessionId || !phoneNumber) {
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

  if (digits === "1") {
    await sessionManager.setPhoneNumber(sessionId, phoneNumber);
    console.log(`[Voice] Phone confirmed: ${phoneNumber}`);
    response.say("Thank you. Looking up your account.");
    response.redirect(`/api/voice/lookup-user?sessionId=${sessionId}`);
  } else {
    response.say("Let's try again.");
    response.redirect(`/api/voice/collect-phone?sessionId=${sessionId}&attempt=1`);
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
