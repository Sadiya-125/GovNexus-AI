import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { sessionManager } from "@/lib/voice/session";
import { parseSpokenNumber, validatePhoneNumber, formatPhoneForVoice, getLanguageCode } from "@/lib/voice/utils";

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");
  const attempt = parseInt(searchParams.get("attempt") || "1");

  if (!sessionId) {
    const response = new VoiceResponse();
    response.say("Session error.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const session = await sessionManager.getSession(sessionId);
  if (!session) {
    const response = new VoiceResponse();
    response.say("Session expired. Please call again.");
    response.hangup();
    return new NextResponse(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const body = await request.formData();
  const speechResult = body.get("SpeechResult") as string;
  const digits = body.get("Digits") as string;

  const response = new VoiceResponse();
  let phoneNumber: string | null = null;

  // Log raw inputs for debugging
  if (digits) {
    console.log(`[Voice] Raw DTMF input: "${digits}" (${digits.length} digits)`);
    phoneNumber = digits;
  }
  if (speechResult) {
    console.log(`[Voice] Raw speech input: "${speechResult}"`);
    if (!phoneNumber) {
      phoneNumber = parseSpokenNumber(speechResult, session.language);
      console.log(`[Voice] Parsed speech result: ${phoneNumber}`);
    }
  }

  // Remove # if user pressed it to finish
  if (phoneNumber && phoneNumber.endsWith("#")) {
    phoneNumber = phoneNumber.slice(0, -1);
    console.log(`[Voice] Removed trailing #: ${phoneNumber}`);
  }

  // Validate the phone number
  if (phoneNumber && validatePhoneNumber(phoneNumber)) {
    const normalized = sessionManager.normalizePhoneNumber(phoneNumber);
    // Format for readback using only the last 10 digits
    const digitsOnly = phoneNumber.replace(/[^\d]/g, "");
    const lastDigits = digitsOnly.length > 10 ? digitsOnly.substring(digitsOnly.length - 10) : digitsOnly;
    const readback = formatPhoneForVoice(lastDigits, session.language);

    console.log(`[Voice] Valid phone collected: ${phoneNumber} → ${normalized}`);

    const gather = response.gather({
      numDigits: 1,
      method: "POST",
      action: `/api/voice/confirm-phone?sessionId=${sessionId}&phone=${encodeURIComponent(normalized)}`,
      timeout: 10,
      finishOnKey: "#",
    });
    gather.say(`I heard ${readback}. Press 1 to confirm, or 2 to re-enter.`);
  } else if (attempt < 3) {
    // Invalid or incomplete number - ask user to try again
    const digitsCollected = phoneNumber ? phoneNumber.replace(/[^\d]/g, "").length : 0;
    console.log(`[Voice] Invalid phone (${digitsCollected} digits): ${phoneNumber}`);

    const retryMessages: Record<string, string> = {
      en: `I need your 10 digit phone number. Please enter it digit by digit, then press hash when done.`,
      hi: `मुझे आपका 10 अंकों का फोन नंबर चाहिए। कृपया इसे एक-एक अंक दर्ज करें, फिर पूरा होने पर हैश दबाएं।`,
      te: `నాకు మీ 10 అంకెల ఫోన్ నంబర్ కావాలి. దయచేసి దానిని ఒక్క అంకెను నమోదు చేసి, పూర్తయినప్పుడు హ్యాష్ నొక్కండి.`,
      ta: `நான் உங்கள் 10 இலக்க ஃபோன் எண் வேண்டும். தயவுசெய்து ஒரு ஒரு இலக்கம் உள்ளிட்டு, முடிந்ததும் ஹ்যாஷ் அழுத்தவும்.`,
      kn: `ನನಗೆ ನಿಮ್ಮ 10 ಅಂಕೆಗಳ ಫೋನ್ ಸಂಖ್ಯೆ ಬೇಕು. ದಯವಿಟ್ಟು ಅದನ್ನು ಒಂದೊಂದು ಅಂಕೆ ನಮೂದಿಸಿ, ನಂತರ ಹ್ಯಾಶ್ ಒತ್ತಿ.`,
      mr: `मुझे तुमचा 10 अंकांचा फोन नंबर हवा. कृपया त्यास एक-एक अंक दाखल करा, मग हॅश दाबा.`,
    };

    response.say(retryMessages[session.language] || retryMessages.en);

    const gather = response.gather({
      input: "dtmf speech",
      numDigits: 0,  // Allow variable number of digits
      method: "POST",
      action: `/api/voice/collect-phone?sessionId=${sessionId}&attempt=${attempt + 1}`,
      timeout: 45,  // Extended timeout for user input
      speechTimeout: "auto",
      finishOnKey: "#",  // User must press # to submit
      language: getLanguageCode(session.language),
    });
    gather.say("Enter your 10 digit phone number, then press hash.");
  } else {
    const failMessages: Record<string, string> = {
      en: "I'm unable to collect your phone number after multiple attempts. Please try calling again later.",
      hi: "कई प्रयासों के बाद मैं आपका फोन नंबर इकट्ठा करने में असमर्थ हूं। कृपया बाद में फिर से कॉल करें।",
      te: "బహుళ ప్రయత్నాల తర్వాత నేను మీ ఫోన్ నంబర్‌ను సేకరించలేను. దయచేసి తర్వాత మరలా కॉల్ చేయండి.",
      ta: "பல முயற்சிகளுக்குப் பிறகு உங்கள் ஃபோன் எண் சேகரிக்க முடியாது. பின்னர் மீண்டும் அழைக்கவும்.",
      kn: "ಬಹುಸಂಖ್ಯೆಯ ಪ್ರಯತ್ನಗಳ ನಂತರ ನಾನು ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು ಸಂಗ್ರಹಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ತರುವಾಯ ಮರಳಿ ಕರೆ ಮಾಡಿ.",
      mr: "अनेक प्रयत्नांनंतर मी तुमचा फोन नंबर गोळा करू शकत नाही. कृपया नंतर पुन्हा कॉल करा.",
    };

    response.say(failMessages[session.language] || failMessages.en);
    response.hangup();
  }

  return new NextResponse(response.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
