import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";
import { sarvamClient } from "@/lib/voice/sarvam";
import { voiceAgent } from "@/lib/voice/agent";
import { VoiceError } from "@/lib/voice/types";

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Process voice input from Twilio
 * POST /api/voice/process
 *
 * Handles:
 * 1. Speech-to-text conversion using Sarvam
 * 2. AI agent processing with voice context
 * 3. Tool execution
 * 4. Text-to-speech response in user's language
 * 5. Loop for continued interaction
 */
export async function POST(request: NextRequest) {
  const response = new VoiceResponse();

  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      console.error("[Voice] Missing sessionId in process");
      response.say("Session error. Call ended.");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Get session
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      console.error(`[Voice] Session not found: ${sessionId}`);
      response.say("Session expired. Please call again.");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Validate user lookup is complete
    if (!session.userLookupComplete || session.userIds.length === 0) {
      console.error(
        `[Voice] User lookup incomplete for session: ${sessionId}`
      );
      response.say("Authentication error. Please call again.");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const body = await request.formData();
    const speechResult = body.get("SpeechResult") as string | null;
    const confidence = parseFloat((body.get("Confidence") as string) || "0");

    console.log(
      `[Voice] Received input for session ${sessionId}: "${speechResult}" (confidence: ${confidence})`
    );

    // Handle no speech detected or low confidence
    if (!speechResult || speechResult.trim() === "" || confidence < 0.3) {
      console.warn(
        `[Voice] Low confidence or no speech: "${speechResult}" (${confidence})`
      );

      const noSpeechMessages: Record<string, string> = {
        en: "I didn't catch that. Could you please repeat?",
        hi: "मुझे यह समझ नहीं आया। कृपया दोहराएं।",
        te: "నేను దీన్ని సంభవించలేదు. దయచేసి పునరావృत్తి చేయండి.",
        ta: "நான் அதைப் புரிந்துகொள்ளவில்லை. மீண்டும் சொல்லுங்கள்.",
        kn: "ನಾನು ಅದನ್ನು ಅರ್ಥ ಮಾಡಿಕೊಳ್ಳಿಲ್ಲ. ದಯವಿಟ್ಟು ಪುನರಾವೃತ್ತಿ ಮಾಡಿ.",
        mr: "मला ते समजले नाही. कृपया पुन्हा सांगा.",
      };

      response.say(
        noSpeechMessages[session.language] ||
          noSpeechMessages["en"]
      );

      const gather = response.gather({
        numDigits: 0,
        method: "POST",
        action: `/api/voice/process?sessionId=${sessionId}`,
        timeout: 10,
        speechTimeout: "auto",
        language: getLanguageCode(session.language),
      });

      gather.say(
        session.language === "en"
          ? "Please speak now."
          : "अब बोलिए।"
      );

      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    try {
      // Add user message to conversation history
      await sessionManager.addMessage(
        sessionId,
        "user",
        speechResult,
        session.language
      );

      // Get userIds for processing (use selectedUserId if set, otherwise use all)
      const userIds = session.selectedUserId
        ? [session.selectedUserId]
        : session.userIds;

      console.log(
        `[Voice] Processing user input for users: ${userIds.join(", ")}`
      );

      // Process with AI agent
      const agentResponse = await voiceAgent.processUserInput(
        userIds,
        sessionId,
        speechResult,
        session.language,
        session.conversationHistory
      );

      console.log(`[Voice] Agent response: ${agentResponse.text}`);

      // Add assistant response to history
      await sessionManager.addMessage(
        sessionId,
        "assistant",
        agentResponse.text,
        session.language
      );

      // Convert response to speech
      console.log(
        `[Voice] Converting response to speech in language: ${session.language}`
      );

      const ttsResponse = await sarvamClient.textToSpeech({
        text: agentResponse.text,
        language: session.language,
      });

      // Say the response text (Twilio will handle the speech)
      response.say(agentResponse.text, {
        voice: "alice",
      });

      // Gather next input
      const gather = response.gather({
        numDigits: 0,
        method: "POST",
        action: `/api/voice/process?sessionId=${sessionId}`,
        timeout: 12,
        speechTimeout: "auto",
        language: getLanguageCode(session.language),
        hints: "show, tell, create, get, list, help",
      });

      const promptMessages: Record<string, string> = {
        en: "What would you like to do next?",
        hi: "अगले में आप क्या करना चाहते हैं?",
        te: "తరువాత మీరు ఏమి చేయాలనుకుంటున్నారు?",
        ta: "அடுத்ததாக நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
        kn: "ಮುಂದೆ ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
        mr: "पुढे आप काय करू इच्छिता?",
      };

      gather.say(
        promptMessages[session.language] || promptMessages["en"]
      );

      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    } catch (agentError) {
      console.error("[Voice] Agent processing error:", agentError);

      const errorMessages: Record<string, string> = {
        en: "I encountered an error processing your request. Please try again.",
        hi: "आपके अनुरोध को संसाधित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।",
        te: "మీ అభ్యర్థనను సంసాధించడంలో ఉపసంహరణ ఆ. దయచేసి ఇటీవల ప్రయత్నించండి.",
        ta: "உங்கள் கோரிக்கையைச் செயல்படுத்தும் போது பிழை ஏற்பட்டது. மீண்டும் முயற்சி செய்யவும்.",
        kn: "ನಿಮ್ಮ ವಿನಂತಿ ಸಂಸ್ಕರಿಸುವಲ್ಲಿ ದೋಷ ಎದುರಾದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        mr: "आपल्या विनंतीला प्रक्रिया करताना त्रुटी आली. कृपया पुन्हा प्रयास करा.",
      };

      response.say(
        errorMessages[session.language] ||
          errorMessages["en"]
      );

      const gather = response.gather({
        numDigits: 0,
        method: "POST",
        action: `/api/voice/process?sessionId=${sessionId}`,
        timeout: 10,
        speechTimeout: "auto",
        language: getLanguageCode(session.language),
      });

      gather.say(
        session.language === "en" ? "Please try again." : "कृपया दोबारा कोशिश करें।"
      );

      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }
  } catch (error) {
    console.error("[Voice] Process route error:", error);

    const errorMsg =
      error instanceof VoiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "An error occurred";

    response.say("An error occurred. Goodbye.");
    response.hangup();

    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
      status: 500,
    });
  }
}

/**
 * Map voice system language code to Twilio Gather language code
 */
function getLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    kn: "kn-IN",
    mr: "mr-IN",
  };
  return languageMap[language] || "en-IN";
}
