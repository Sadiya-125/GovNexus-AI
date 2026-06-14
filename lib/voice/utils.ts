import { SupportedLanguage } from "./types";

const SPOKEN_DIGIT_MAPS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9",
    oh: "0",
  },
  hi: {
    शून्य: "0", एक: "1", दो: "2", तीन: "3", चार: "4",
    पांच: "5", छह: "6", सात: "7", आठ: "8", नौ: "9",
  },
  te: {
    సున్న: "0", ఒకటి: "1", రెండు: "2", మూడు: "3", నాలుగు: "4",
    ఐదు: "5", ఆరు: "6", ఏడు: "7", ఎight: "8", తొమ్మిది: "9",
  },
  ta: {
    பூஜ்ஜியம்: "0", ஒன்று: "1", இரண்டு: "2", மூன்று: "3", நான்கு: "4",
    ஐந்து: "5", ஆறு: "6", ஏழு: "7", எட்டு: "8", ஒன்பது: "9",
  },
  kn: {
    ಶೂನ್ಯ: "0", ಒಂದು: "1", ಎರಡು: "2", ಮೂರು: "3", ನಾಲ್ಕು: "4",
    ಐದು: "5", ಆರು: "6", ಏಳು: "7", ಎಂಟು: "8", ಒಂಬತ್ತು: "9",
  },
  mr: {
    शून्य: "0", एक: "1", दोन: "2", तीन: "3", चार: "4",
    पाच: "5", सहा: "6", सात: "7", आठ: "8", नऊ: "9",
  },
};

const DIGIT_NAMES: Record<SupportedLanguage, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  hi: ["शून्य", "एक", "दो", "तीन", "चार", "पांच", "छह", "सात", "आठ", "नौ"],
  te: ["సून్న", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "ఐదు", "ఆరు", "ఏడు", "ఎight", "తొమ్మిది"],
  ta: ["பூஜ்ஜியம்", "ஒன்று", "இரண்டு", "மூன்று", "நான்கு", "ஐந்து", "ஆறு", "ஏழு", "எட்டு", "ஒன்பது"],
  kn: ["ಶೂನ್ಯ", "ಒಂದು", "ಎರಡು", "ಮೂರು", "ನಾಲ್ಕು", "ಐದು", "ಆರು", "ಏಳು", "ಎಂಟು", "ಒಂಬತ್ತು"],
  mr: ["शून्य", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ"],
};

export function parseSpokenNumber(spokenText: string, language: SupportedLanguage): string | null {
  if (!spokenText) return null;

  const digitMap = SPOKEN_DIGIT_MAPS[language] || SPOKEN_DIGIT_MAPS.en;
  const lowerText = spokenText.toLowerCase().trim();

  // Split by common delimiters
  const words = lowerText.split(/[\s\-.,।।\s]+/).filter((w) => w.length > 0);

  let result = "";

  for (const word of words) {
    // Try exact match first
    if (digitMap[word]) {
      result += digitMap[word];
      continue;
    }

    // Try removing punctuation
    const cleanWord = word.replace(/[.,।।]/g, "");
    if (cleanWord && digitMap[cleanWord]) {
      result += digitMap[cleanWord];
      continue;
    }

    // For English, try various spellings (e.g., "oh" for 0, "zee" for "z")
    if (language === "en") {
      if (word === "oh" || word === "o") {
        result += "0";
        continue;
      }
      if (word === "zee" || word === "zed") {
        result += "0";
        continue;
      }
    }

    // Skip unknown words but continue processing
    console.log(`[Voice] Unknown digit word in "${language}": "${word}"`);
  }

  // Accept 10 digit results
  if (result.length === 10 && /^\d{10}$/.test(result)) {
    return result;
  }

  // Log partial results for debugging
  if (result.length > 0) {
    console.log(`[Voice] Partial parse result: "${result}" (${result.length} digits, need 10)`);
  }

  return null;
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  let normalized = phoneNumber.replace(/[^\d]/g, "");

  // Handle leading 0 (old landline format) - remove it
  if (normalized.startsWith("0") && normalized.length === 11) {
    normalized = normalized.substring(1);
  }

  // Must be exactly 10 digits
  if (normalized.length !== 10) return false;

  // Must start with 6, 7, 8, or 9 (Indian mobile numbers)
  if (!/^[6-9]/.test(normalized)) return false;

  return true;
}

export function formatPhoneForVoice(phoneNumber: string, language: SupportedLanguage): string {
  const names = DIGIT_NAMES[language] || DIGIT_NAMES.en;
  return phoneNumber.split("").map((digit) => names[parseInt(digit, 10)]).join(" ");
}

export function getLanguageCode(language: SupportedLanguage): string {
  const languageMap: Record<SupportedLanguage, string> = {
    en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN", kn: "kn-IN", mr: "mr-IN",
  };
  return languageMap[language] || "en-IN";
}

export const PHONE_PROMPTS: Record<SupportedLanguage, string> = {
  en: "Please enter or speak your 10 digit phone number.",
  hi: "कृपया अपना 10 अंकों का फोन नंबर दर्ज करें या बोलें।",
  te: "దయచేసి మీ 10 అంకెల ఫోన్ నంబర్ను నమోదు చేయండి లేదా మాట్లాడండి.",
  ta: "உங்கள் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும் அல்லது பேசவும்.",
  kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ 10 ಅಂಕೆಗಳ ಫೋನ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಅಥವಾ ಮಾತನಾಡಿ.",
  mr: "कृपया तुमचा 10 अंकांचा फोन नंबर एंटर करा किंवा बोला.",
};

export const PROCESSING_PROMPTS: Record<SupportedLanguage, string> = {
  en: "Thank you. Looking up your account.",
  hi: "धन्यवाद। आपके खाते की जानकारी देख रहे हैं।",
  te: "ధన్యవादాలు. మీ ఖాతాను వెతుకుస్తున్నాను.",
  ta: "நன்றி. உங்கள் கணக்கைத் தேடுகிறேன்.",
  kn: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ಖಾತೆಯನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇನೆ.",
  mr: "धन्यवाद. तुमचे खाते पाहत आहे.",
};
