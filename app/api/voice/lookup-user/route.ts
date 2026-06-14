import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";
import { prisma } from "@/lib/prisma";
import { getLanguageCode } from "@/lib/voice/utils";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");

  const response = new VoiceResponse();

  if (!sessionId) {
    response.say("Session error.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const session = await sessionManager.getSession(sessionId);
  if (!session || !session.phoneNumber) {
    response.say("Session error.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const userProfiles = await prisma.userProfile.findMany({
    where: { phoneNumber: session.phoneNumber },
  });

  console.log(`[Voice] Found ${userProfiles.length} user(s) for phone: ${session.phoneNumber}`);

  if (userProfiles.length === 0) {
    response.say("Your phone number is not registered. Please register through the platform and call again.");
    response.hangup();
  } else if (userProfiles.length === 1) {
    await sessionManager.setUserIds(sessionId, [userProfiles[0].userId], [userProfiles[0].companyName || "Organization"]);
    response.say(`Welcome ${userProfiles[0].companyName}. How may I assist you today?`);
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
    const userIds = userProfiles.map(u => u.userId);
    const companyNames = userProfiles.map(u => u.companyName || "Organization");
    await sessionManager.setUserIds(sessionId, userIds, companyNames);
    let selectionPrompt = "We found multiple accounts for this number. ";
    for (let i = 0; i < userProfiles.length; i++) {
      selectionPrompt += `Press ${i + 1} for ${userProfiles[i].companyName || ("Organization " + (i + 1))}. `;
    }
    const gather = response.gather({
      numDigits: 1,
      method: "POST",
      action: `/api/voice/select-user?sessionId=${sessionId}`,
      timeout: 15,
    });
    gather.say(selectionPrompt);
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
