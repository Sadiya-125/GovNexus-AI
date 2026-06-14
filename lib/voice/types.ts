// Voice Session Types
export interface VoiceSession {
  sessionId: string;
  userIds: string[];                    // Array of user IDs for multi-user support
  selectedUserId?: string;              // Currently active user (for multi-user scenarios)
  companyNames: string[];               // Array of company names for each user
  phoneNumber?: string;                 // Optional - collected during call
  phoneCollected: boolean;              // Track phone collection state
  userLookupComplete: boolean;          // Track user lookup completion
  language: SupportedLanguage;
  activeIntent: Intent | null;
  pendingAction: PendingAction | null;
  pendingEntity: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

// Supported Languages
export type SupportedLanguage = "en" | "te" | "hi" | "ta" | "kn" | "mr";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  te: "Telugu",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  mr: "Marathi",
};

// Intent Types
export type Intent =
  | "create_resource"
  | "get_resource"
  | "update_resource"
  | "delete_resource"
  | "list_resources"
  | "create_requisition"
  | "get_requisition"
  | "list_requisitions"
  | "low_stock_resources"
  | "resource_value"
  | "analytics"
  | "forecast_demand"
  | "optimization_recommendations"
  | "procurement_status"
  | "vendor_info"
  | "help"
  | "cancel";

// Pending Action Type
export type PendingAction =
  | "confirm_create_resource"
  | "confirm_delete_resource"
  | "confirm_requisition"
  | "awaiting_resource_name"
  | "awaiting_quantity"
  | "awaiting_cost"
  | "awaiting_category";

// Conversation Message
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  language: SupportedLanguage;
}

// Twilio Request Types
export interface TwilioIncomingRequest {
  From: string;
  To: string;
  CallSid: string;
  AccountSid: string;
  Direction: string;
}

export interface TwilioProcessRequest {
  CallSid: string;
  SessionId: string;
  SpeechResult: string;
  Confidence: number;
}

// Sarvam AI Types
export interface SpeechToTextRequest {
  audio: Buffer | string;
  language?: SupportedLanguage;
  sampleRate?: number;
}

export interface SpeechToTextResponse {
  transcript: string;
  language: SupportedLanguage;
  confidence: number;
}

export interface TextToSpeechRequest {
  text: string;
  language: SupportedLanguage;
  voiceId?: string;
}

export interface TextToSpeechResponse {
  audio: Buffer;
  audioUrl?: string;
}

export interface LanguageDetectionResponse {
  detectedLanguage: SupportedLanguage;
  confidence: number;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}

// Tool Types
export interface ToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Resource Types (Voice Context)
// Note: quantity is not stored in Product schema, calculated from orders
export interface ResourceVoiceData {
  id: string;
  name: string;
  category: string;
  acquisitionCost: number;
  distributionCost: number;
  createdAt: Date;
}

// Requisition Types (Voice Context)
export interface RequisitionVoiceData {
  id: string;
  resourceId: string;
  resourceName: string;
  quantity: number;
  distributionValue: number;
  valueDelivered: number;
  requisitionDate: Date;
}

// Analytics Response Types
export interface ResourceAnalyticsData {
  totalResources: number;
  totalValue: number;
  lowStockCount: number;
  mostUtilized: Array<{
    name: string;
    utilization: number;
  }>;
  forecastedDemand: Record<string, number>;
}

// AI Response Types
export interface AIAgentResponse {
  text: string;
  toolCalls: ToolCall[];
  intent: Intent;
  requiresUserInput: boolean;
}

// Error Types
export class VoiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

// User Profile Type (from Supabase)
export interface UserProfile {
  id: string;
  userId: string;
  companyName: string;
  phoneNumber: string;
  userType: "agency" | "vendor";
  createdAt: Date;
  updatedAt: Date;
}

// Phone Number Collection Result Type
export interface PhoneNumberCollectionResult {
  phoneNumber: string;
  source: "dtmf" | "speech";
  confidence: number;
}

// User Lookup Result Type
export interface UserLookupResult {
  users: Array<{
    userId: string;
    companyName: string;
    userType: string;
  }>;
  count: number;
}
