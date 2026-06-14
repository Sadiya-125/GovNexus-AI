import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AIAgentResponse,
  ToolCall,
  SupportedLanguage,
  ConversationMessage,
  VoiceError,
} from "./types";
import { TOOL_DEFINITIONS, executeTool } from "./tools/definitions";
import { sessionManager } from "./session";

class VoiceAgent {
  private gemini: GoogleGenerativeAI | null = null;

  constructor() {
    // Defer initialization to runtime
  }

  private getGemini(): GoogleGenerativeAI {
    if (!this.gemini) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
    return this.gemini;
  }

  /**
   * Process user input and generate response with function calling (supports multiple users)
   */
  async processUserInput(
    userIds: string[],
    sessionId: string,
    userMessage: string,
    language: SupportedLanguage,
    conversationHistory: ConversationMessage[],
  ): Promise<AIAgentResponse> {
    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(language);

      // Build messages for API
      const messages = this.buildMessages(
        systemPrompt,
        userMessage,
        conversationHistory,
        language,
      );

      // Call Gemini with function calling
      const model = this.getGemini().getGenerativeModel({
        model: "gemini-2.5-flash",
        tools: [{ functionDeclarations: TOOL_DEFINITIONS as any }],
        systemInstruction: systemPrompt,
      });

      // Filter out system message and map remaining messages
      const contents = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

      const response = await model.generateContent({
        contents: contents,
      });

      let assistantText = "";
      const toolCalls: ToolCall[] = [];
      let intent = "help";

      // Process response
      if (response && response.response) {
        const parts = response.response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if ("text" in part && part.text) {
            assistantText = part.text;
          }
          if ("functionCall" in part && part.functionCall) {
            const fc = part.functionCall;
            toolCalls.push({
              toolName: fc.name,
              arguments: (fc.args || {}) as Record<string, unknown>,
            });
            intent = this.mapToolToIntent(fc.name);
          }
        }
      }

      // Execute tool calls
      let toolResults: Record<string, any> = {};
      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const result = await executeTool(userIds, toolCall);
          toolResults[toolCall.toolName] = result;

          if (result.success) {
            assistantText += `\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
          } else {
            assistantText += `\n\nError: ${result.error}`;
          }
        }
      }

      // Add messages to session history
      await sessionManager.addMessage(sessionId, "user", userMessage, language);
      await sessionManager.addMessage(
        sessionId,
        "assistant",
        assistantText,
        language,
      );

      return {
        text: assistantText,
        toolCalls,
        intent: intent as any,
        requiresUserInput:
          toolCalls.length === 0 && !assistantText.includes("?"),
      };
    } catch (error) {
      throw new VoiceError(
        "AGENT_ERROR",
        `Failed to process input: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build system prompt based on language
   */
  private buildSystemPrompt(language: SupportedLanguage): string {
    const prompts: Record<SupportedLanguage, string> = {
      en: `You are an AI Resource Management Assistant for government and NGO organizations. You help users manage resources, track requisitions, analyze distribution data, and get optimization recommendations.

You MUST:
1. Use the provided tools to execute user requests
2. Provide clear, conversational responses
3. Confirm actions before executing destructive operations (delete)
4. Ask clarifying questions if user input is ambiguous
5. Provide summaries of actions taken
6. Be helpful and professional

Resource Terminology:
- Resources = Items/supplies being managed
- Requisitions = Requests for resources
- Vendors/Partners = Organizations supplying resources
- Distribution Value = Total value of distributed resources
- Value Delivered = Net value after costs

Respond naturally and conversationally. Always explain what you're doing.`,

      te: `మీరు ప్రభుత్వ మరియు NGO సంస్థల కోసం AI వనరుల నిర్వహణ సహాయకర్త. మీరు వినియోగదారులను వనరులను నిర్వహించడానికి, అభ్యర్థనలను ట్రాక్ చేయడానికి, పంపిణీ డేటాను విశ్లేషించడానికి మరియు ఆప్టిమైజేషన్ సిఫారసుల కోసం సహాయం చేస్తారు.

మీరు తప్పనిసరిగా చేయాలి:
1. వినియోగదారు అభ్యర్థనలను అమలు చేయడానికి అందించిన సরఞ్జామలను ఉపయోగించండి
2. స్పష్టమైన, సంభాషణ ప్రతిస్పందనలను అందించండి
3. విధ్వంసక కార్యకలాపాలకు ముందు చర్యలను నిర్ధారించండి
4. వినియోగదారు ఇన్‌పుట్ అస్పష్టంగా ఉంటే స్పష్టీకరణ ప్రశ్నలను అడగండి
5. నిర్వహించిన చర్యల సారాంశాలను అందించండి
6. సహాయకరమైన మరియు వృత్తిపరమైనవారు`,

      hi: `आप सरकारी और एनजीओ संगठनों के लिए एक एआई संसाधन प्रबंधन सहायक हैं। आप उपयोगकर्ताओं को संसाधन प्रबंधित करने, अनुरोधों को ट्रैक करने, वितरण डेटा का विश्लेषण करने और अनुकूलन सिफारिशें प्राप्त करने में सहायता करते हैं।

आपको अवश्य करना चाहिए:
1. उपयोगकर्ता अनुरोधों को निष्पादित करने के लिए प्रदान किए गए उपकरणों का उपयोग करें
2. स्पष्ट, संवादात्मक प्रतिक्रिया प्रदान करें
3. विनाशकारी संचालन से पहले कार्यों की पुष्टि करें
4. यदि उपयोगकर्ता इनपुट अस्पष्ट है तो स्पष्टीकरण प्रश्न पूछें
5. किए गए कार्यों का सारांश प्रदान करें
6. सहायक और व्यावसायिक हों`,

      ta: `நீங்கள் அரசாங்க மற்றும் NGO நிறுவனங்களுக்கான AI வளங்கள் மேலாண்மை உதவியாளர். பயனர்களுக்கு வளங்களை நிர்வகிக்க, கோரிக்கைகளை ट్रैक் செய்ய, விநியோகத் தரவை பகுப்பாய்வு செய்ய மற்றும் தேர்வுமுறை பரிந்துரைகளைப் பெற உதவ வேண்டும்.

நீங்கள் தவிர்க்க முடியாமல் செய்ய வேண்டியவை:
1. பயனர் கோரிக்கைகளை செயல்படுத்த வழங்கப்பட்ட கருவிகளைப் பயன்படுத்தவும்
2. தெளிவான, உரையாடல் பதிலளிக்கவும்
3. அழிக்கும் செயல்பாடுகளுக்கு முன் நடவடிக்கைகளை உறுதிப்படுத்தவும்
4. பயனர் உள்ளீடு தெளிவற்றதாக இருந்தால் தெளிவுபடுத்தும் கேள்விகளைக் கேட்கவும்
5. நिर்வहned செயல்களின் சारাংশத்தை வழங்கவும்
6. உதவிகரமாக மற்றும் व्यावसायिக வாக்கு`,

      kn: `ನೀವು ಸರ್ಕಾರ ಮತ್ತು NGO ಸಂಸ್ಥೆಗಳಿಗೆ AI ಸಂಪನ್ಮೂಲ ನಿರ್ವಹಣೆ ಸಹಾಯಕ. ನೀವು ಬಳಕೆದಾರರಿಗೆ ಸಂಪನ್ಮೂಲಗಳನ್ನು ನಿರ್ವಹಿಸಲು, ನಿವೇದನೆಗಳನ್ನು ಟ್ರ್যಾಕ್ ಮಾಡಲು, ವಿತರಣೆ ಡೇಟಾವನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಮತ್ತು ಸುಧಾರಣೆ ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಲು ಸಹಾಯ ಮಾಡಬೇಕು.

ನೀವು ಮಾಡಬೇಕಾಗಿರುವುದು:
1. ಬಳಕೆದಾರ ವಿನಂತಿಗಳನ್ನು ಪೂರೈಸಲು ಒದಗಿಸಿದ ಸಾಧನಗಳನ್ನು ಬಳಸಿ
2. ಸ್ಪಷ್ಟವಾದ, ಸಂವಾದಾತ್ಮಕ ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ಒದಗಿಸಿ
3. ವಿನಾಶಕಾರಿ ಕಾರ್ಯಾಚರಣೆಗಳಿಗೆ ಮೊದಲು ಕ್ರಿಯೆಗಳನ್ನು ದೃಢೀಕರಿಸಿ
4. ಬಳಕೆದಾರ ಇನ್‌ಪುಟ್ ಅನುಮತಿ ಇಲ್ಲದಿದ್ದರೆ ಸ್ಪಷ್ಟೀಕರಣ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ
5. ಪೂರೈಸಿದ ಕ್ರಿಯೆಗಳ ಸಾರಾಂಶವನ್ನು ಒದಗಿಸಿ
6. ಸಹಾಯಕವಾದ ಮತ್ತು ವೃತ್ತಿಪರ ವಾಗಿರಿ`,

      mr: `तुम सरकार आणि NGO संस्थांसाठी AI संसाधन व्यवस्थापन सहाय्यक आहात. तुम्ही वापरकर्त्यांना संसाधन व्यवस्थापित करण्यात, विनंत्या ट्रॅक करण्यात, वितरण डेटा विश्लेषण करण्यात आणि अनुकूलन सुचना प्राप्त करण्यात मदत करता.

तुम्हाला हे करणे आवश्यक आहे:
1. वापरकर्ता विनंत्या अंमलबजावणी करण्यासाठी दिलेली साधने वापरा
2. स्पष्ट, संवादात्मक प्रतिक्रिया द्या
3. विनाशकारी ऑपरेशनपूर्वी कृतीची पुष्टी करा
4. वापरकर्ता इनपुट अस्पष्ट असल्यास स्पष्टीकरण प्रश्न विचारा
5. केलेल्या कृतीचा सारांश द्या
6. मदतगार आणि व्यावसायिक व्हा`,
    };

    return prompts[language] || prompts.en;
  }

  /**
   * Build messages for OpenAI API
   */
  private buildMessages(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: ConversationMessage[],
    language: SupportedLanguage,
  ) {
    const messages: any[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage,
    });

    return messages;
  }

  /**
   * Map tool name to intent
   */
  private mapToolToIntent(toolName: string): string {
    const intentMap: Record<string, string> = {
      create_resource: "create_resource",
      get_resource: "get_resource",
      update_resource: "update_resource",
      delete_resource: "delete_resource",
      list_resources: "list_resources",
      create_requisition: "create_requisition",
      get_requisition: "get_requisition",
      list_requisitions: "list_requisitions",
      update_requisition: "update_requisition",
      delete_requisition: "delete_requisition",
      low_stock_resources: "low_stock_resources",
      resource_repository_value: "resource_value",
      resource_analytics: "analytics",
      forecast_demand: "forecast_demand",
      optimization_recommendations: "optimization_recommendations",
      get_top_resources: "analytics",
    };

    return intentMap[toolName] || "help";
  }
}

export const voiceAgent = new VoiceAgent();

export default VoiceAgent;
