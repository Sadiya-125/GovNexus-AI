import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";
import { SupportedLanguage } from "@/lib/voice/types";

const VoiceResponse = twilio.twiml.VoiceResponse;

// Language code mapping from digit selection
const LANGUAGE_MAP: Record<string, SupportedLanguage> = {
  "1": "en",
  "2": "hi",
  "3": "te",
  "4": "ta",
  "5": "kn",
  "6": "mr",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
  kn: "Kannada",
  mr: "Marathi",
};

/**
 * Handle language selection from user input
 * POST /api/voice/select-language?sessionId=<sessionId>
 *
 * Receives digit input (1-6) from user:
 * 1 = English
 * 2 = Hindi
 * 3 = Telugu
 * 4 = Tamil
 * 5 = Kannada
 * 6 = Marathi
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      console.error("[Voice] Missing sessionId in language selection");
      const response = new VoiceResponse();
      response.say("Session error. Call ended.");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const body = await request.formData();
    const digits = body.get("Digits") as string;

    // Get session
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      console.error(`[Voice] Session not found: ${sessionId}`);
      const response = new VoiceResponse();
      response.say("Session expired. Please call again.");
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Validate language selection
    const selectedLanguage = LANGUAGE_MAP[digits];
    if (!selectedLanguage) {
      console.warn(
        `[Voice] Invalid language selection: ${digits} for session: ${sessionId}`
      );
      const response = new VoiceResponse();
      response.say(
        "Invalid selection. Please call again and press 1 to 6 to select your language."
      );
      response.hangup();
      return new NextResponse(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Update session with selected language
    session.language = selectedLanguage;
    await sessionManager.updateSession(session);

    console.log(
      `[Voice] User selected language: ${LANGUAGE_NAMES[selectedLanguage]} (${selectedLanguage}) for session: ${sessionId}`
    );

    // Create response asking for phone number
    const phonePrompts: Record<SupportedLanguage, string> = {
      en: "Please enter or speak your 10 digit phone number.",
      hi: "कृपया अपना 10 अंकों का फ़ोन नंबर दर्ज करें या बोलें।",
      te: "దయచేసి మీ 10 అంకెల ఫోన్ నంబర్ను నమోదు చేయండి లేదా మాట్లాడండి.",
      ta: "உங்கள் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும் அல்லது பேசவும்.",
      kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ 10 ಅಂಕೆಗಳ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಅಥವಾ ಮಾತನಾಡಿ.",
      mr: "कृपया तुमचा 10 अंकांचा फोन नंबर एंटर करा किंवा बोला.",
    };

    const speakPrompts: Record<SupportedLanguage, string> = {
      en: "Please speak or enter the number now.",
      hi: "अब नंबर बोलें या दर्ज करें।",
      te: "దయచేసి ఇప్పుడు నంబర్‌ను మాట్లాడండి లేదా నమోదు చేయండి.",
      ta: "இப்போது எண்ணை பேசவும் அல்லது உள్ளிடவும்.",
      kn: "ದಯವಿಟ್ಟು ಸಂಖ್ಯೆಯನ್ನು ಮಾತನಾಡಿ ಅಥವಾ ನಮೂದಿಸಿ.",
      mr: "कृपया आता नंबर बोला किंवा एंटर करा.",
    };

    const response = new VoiceResponse();
    response.say(phonePrompts[selectedLanguage] || phonePrompts.en);

    // Gather phone number via DTMF or speech
    // Use numDigits: 0 and finishOnKey: "#" to allow flexible input
    const gather = response.gather({
      input: ["dtmf", "speech"],
      numDigits: 0,  // Allow any number of digits
      method: "POST",
      action: `/api/voice/collect-phone?sessionId=${sessionId}&attempt=1`,
      timeout: 45,  // Extended timeout for user input
      speechTimeout: "auto",
      finishOnKey: "#",  // User presses # when done
      language: getLanguageCode(selectedLanguage),
      hints: "zero, one, two, three, four, five, six, seven, eight, nine",
    });

    gather.say(speakPrompts[selectedLanguage] || speakPrompts.en);

    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Voice] Language selection error:", error);

    const response = new VoiceResponse();
    response.say(
      "An error occurred while processing your language selection. Please try again."
    );
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
function getLanguageCode(language: SupportedLanguage): string {
  const languageMap: Record<SupportedLanguage, string> = {
    en: "en-IN",
    hi: "hi-IN",
    te: "te-IN",
    ta: "ta-IN",
    kn: "kn-IN",
    mr: "mr-IN",
  };
  return languageMap[language] || "en-IN";
}
