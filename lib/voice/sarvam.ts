import {
  SpeechToTextRequest,
  SpeechToTextResponse,
  TextToSpeechRequest,
  TextToSpeechResponse,
  LanguageDetectionResponse,
  TranslationRequest,
  TranslationResponse,
  SupportedLanguage,
  VoiceError,
} from "./types";

class SarvamClient {
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || "";
    this.apiEndpoint = process.env.SARVAM_API_ENDPOINT || "https://api.sarvam.ai";

    if (!this.apiKey) {
      throw new Error("SARVAM_API_KEY is not configured");
    }
  }

  /**
   * Convert speech to text using Sarvam AI
   */
  async speechToText(
    request: SpeechToTextRequest
  ): Promise<SpeechToTextResponse> {
    try {
      const formData = new FormData();

      // Handle both Buffer and base64 string
      if (typeof request.audio === "string") {
        const audioBuffer = Buffer.from(request.audio, "base64");
        const blob = new Blob([audioBuffer], { type: "audio/wav" });
        formData.append("file", blob, "audio.wav");
      } else {
        const blob = new Blob([request.audio], { type: "audio/wav" });
        formData.append("file", blob, "audio.wav");
      }

      if (request.language) {
        formData.append("language_code", this.mapLanguageCode(request.language));
      }

      if (request.sampleRate) {
        formData.append("sample_rate", request.sampleRate.toString());
      }

      const response = await fetch(`${this.apiEndpoint}/speech-to-text`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new VoiceError(
          "STT_ERROR",
          `Sarvam STT failed: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      return {
        transcript: data.transcript || "",
        language: request.language || "en",
        confidence: data.confidence || 0.9,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "STT_ERROR",
        `Failed to process speech: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert text to speech using Sarvam AI
   */
  async textToSpeech(
    request: TextToSpeechRequest
  ): Promise<TextToSpeechResponse> {
    try {
      const response = await fetch(`${this.apiEndpoint}/text-to-speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: request.text,
          language_code: this.mapLanguageCode(request.language),
          voice_id: request.voiceId || this.getDefaultVoice(request.language),
          audio_format: "wav",
        }),
      });

      if (!response.ok) {
        throw new VoiceError(
          "TTS_ERROR",
          `Sarvam TTS failed: ${response.statusText}`,
          response.status
        );
      }

      const audioBuffer = await response.arrayBuffer();

      return {
        audio: Buffer.from(audioBuffer),
        audioUrl: undefined,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      throw new VoiceError(
        "TTS_ERROR",
        `Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect language from text
   */
  async detectLanguage(text: string): Promise<LanguageDetectionResponse> {
    try {
      const response = await fetch(`${this.apiEndpoint}/detect-language`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new VoiceError(
          "DETECT_ERROR",
          `Language detection failed: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();
      const detectedLanguage = this.mapToSupportedLanguage(
        data.language_code || "en"
      );

      return {
        detectedLanguage,
        confidence: data.confidence || 0.9,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      // Return English as fallback
      return {
        detectedLanguage: "en",
        confidence: 0.5,
      };
    }
  }

  /**
   * Translate text between languages
   */
  async translate(
    request: TranslationRequest
  ): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${this.apiEndpoint}/translate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: request.text,
          source_language_code: this.mapLanguageCode(request.sourceLanguage),
          target_language_code: this.mapLanguageCode(request.targetLanguage),
        }),
      });

      if (!response.ok) {
        throw new VoiceError(
          "TRANSLATE_ERROR",
          `Translation failed: ${response.statusText}`,
          response.status
        );
      }

      const data = await response.json();

      return {
        translatedText: data.translated_text || request.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
      };
    } catch (error) {
      if (error instanceof VoiceError) throw error;
      // Return original text as fallback
      return {
        translatedText: request.text,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
      };
    }
  }

  /**
   * Map SupportedLanguage enum to Sarvam API language codes
   */
  private mapLanguageCode(language: SupportedLanguage): string {
    const languageMap: Record<SupportedLanguage, string> = {
      en: "en-IN",
      te: "te-IN",
      hi: "hi-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      mr: "mr-IN",
    };

    return languageMap[language] || "en-IN";
  }

  /**
   * Map Sarvam language code to SupportedLanguage enum
   */
  private mapToSupportedLanguage(languageCode: string): SupportedLanguage {
    const codeMap: Record<string, SupportedLanguage> = {
      "en-IN": "en",
      "te-IN": "te",
      "hi-IN": "hi",
      "ta-IN": "ta",
      "kn-IN": "kn",
      "mr-IN": "mr",
      en: "en",
      te: "te",
      hi: "hi",
      ta: "ta",
      kn: "kn",
      mr: "mr",
    };

    return codeMap[languageCode] || "en";
  }

  /**
   * Get default voice ID for language
   */
  private getDefaultVoice(language: SupportedLanguage): string {
    const voiceMap: Record<SupportedLanguage, string> = {
      en: "meera",
      te: "teluguVoice",
      hi: "hindiVoice",
      ta: "tamilVoice",
      kn: "kannadaVoice",
      mr: "marathiVoice",
    };

    return voiceMap[language] || "meera";
  }
}

// Export singleton instance
export const sarvamClient = new SarvamClient();

// Export class for testing
export default SarvamClient;
