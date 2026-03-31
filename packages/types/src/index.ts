// ============================================
// AI Receptionist — Shared Types
// ============================================

// --- Business Configuration ---

export type SupportedLanguage = "en" | "lv" | "ru";

export interface BusinessHours {
  readonly day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  readonly open: string; // HH:mm
  readonly close: string; // HH:mm
  readonly isOpen: boolean;
}

export interface BusinessContact {
  readonly phone: string;
  readonly email?: string;
  readonly whatsapp?: string;
  readonly address: string;
  readonly city: string;
  readonly country: string;
  readonly mapUrl?: string;
}

export interface BusinessConfig {
  readonly id: string;
  readonly name: string;
  readonly industry: IndustryType;
  readonly languages: readonly SupportedLanguage[];
  readonly defaultLanguage: SupportedLanguage;
  readonly contact: BusinessContact;
  readonly hours: readonly BusinessHours[];
  readonly timezone: string;
  readonly bookingSystem?: BookingSystemConfig;
  readonly escalation: EscalationConfig;
  readonly aiPersona: AIPersonaConfig;
}

// --- Industry Types ---

export type IndustryType =
  | "aesthetics_clinic"
  | "dental_office"
  | "medical_clinic"
  | "law_firm"
  | "real_estate"
  | "salon_spa"
  | "home_services"
  | "fitness_studio"
  | "restaurant"
  | "contractor"
  | "ecommerce"
  | "agency"
  | "consultant";

// --- AI Persona ---

export type ToneProfile = "formal" | "professional_warm" | "friendly" | "clinical";

export interface AIPersonaConfig {
  readonly name: string;
  readonly tone: ToneProfile;
  readonly greeting: Record<SupportedLanguage, string>;
  readonly afterHoursGreeting: Record<SupportedLanguage, string>;
  readonly closingMessage: Record<SupportedLanguage, string>;
  readonly neverDo: readonly string[];
  readonly alwaysDo: readonly string[];
}

// --- Conversation ---

export type ConversationChannel = "voice" | "chat" | "sms" | "whatsapp";

export type ConversationStatus =
  | "active"
  | "waiting_for_user"
  | "escalated"
  | "completed"
  | "abandoned";

export type MessageRole = "assistant" | "user" | "system";

export interface ConversationMessage {
  readonly id: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly language: SupportedLanguage;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

export interface Conversation {
  readonly id: string;
  readonly businessId: string;
  readonly channel: ConversationChannel;
  readonly status: ConversationStatus;
  readonly language: SupportedLanguage;
  readonly messages: readonly ConversationMessage[];
  readonly lead?: LeadData;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// --- Intent Detection ---

export type UserIntent =
  | "book_appointment"
  | "ask_question"
  | "ask_pricing"
  | "ask_services"
  | "ask_hours"
  | "ask_location"
  | "complaint"
  | "urgent_medical"
  | "speak_to_human"
  | "cancel_appointment"
  | "reschedule"
  | "follow_up"
  | "general_inquiry"
  | "unknown";

export interface DetectedIntent {
  readonly intent: UserIntent;
  readonly confidence: number; // 0-1
  readonly entities: Record<string, string>;
}

// --- Lead Capture ---

export type LeadScore = "hot" | "warm" | "cold";

export type LeadStatus = "new" | "contacted" | "qualified" | "booked" | "lost";

export interface LeadData {
  readonly name?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly source: ConversationChannel;
  readonly score: LeadScore;
  readonly status: LeadStatus;
  readonly interests: readonly string[];
  readonly timeline?: string;
  readonly notes: string;
  readonly qualificationAnswers: Record<string, string>;
}

// --- Booking ---

export type BookingMode = "direct" | "request" | "callback";

export interface BookingSystemConfig {
  readonly provider: "alteg" | "google_calendar" | "calendly" | "acuity" | "custom_webhook";
  readonly mode: BookingMode;
  readonly apiKey?: string;
  readonly calendarId?: string;
  readonly webhookUrl?: string;
}

export interface BookingSlot {
  readonly datetime: Date;
  readonly duration: number; // minutes
  readonly specialist?: string;
  readonly available: boolean;
}

export interface BookingRequest {
  readonly conversationId: string;
  readonly service: string;
  readonly preferredDate?: string;
  readonly preferredTime?: string;
  readonly specialist?: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly customerEmail?: string;
  readonly notes?: string;
}

// --- Escalation ---

export type EscalationReason =
  | "urgent_medical"
  | "angry_customer"
  | "human_requested"
  | "complex_question"
  | "high_value_lead"
  | "complaint";

export type EscalationMethod = "sms" | "email" | "slack" | "phone_transfer" | "webhook";

export interface EscalationConfig {
  readonly methods: readonly EscalationMethod[];
  readonly contacts: readonly EscalationContact[];
  readonly urgentKeywords: Record<SupportedLanguage, readonly string[]>;
}

export interface EscalationContact {
  readonly name: string;
  readonly role: string;
  readonly phone?: string;
  readonly email?: string;
  readonly slackChannel?: string;
  readonly onCall: boolean;
}

// --- FAQ ---

export interface FAQEntry {
  readonly id: string;
  readonly question: Record<SupportedLanguage, string>;
  readonly answer: Record<SupportedLanguage, string>;
  readonly category: string;
  readonly keywords: readonly string[];
}

// --- Service Catalog ---

export interface ServiceCategory {
  readonly id: string;
  readonly name: Record<SupportedLanguage, string>;
  readonly services: readonly ServiceItem[];
}

export interface ServiceItem {
  readonly id: string;
  readonly name: Record<SupportedLanguage, string>;
  readonly description: Record<SupportedLanguage, string>;
  readonly priceFrom?: number;
  readonly priceTo?: number;
  readonly currency: string;
  readonly duration?: number; // minutes
  readonly category: string;
}

// --- Knowledge Base ---

export interface KnowledgeBase {
  readonly businessId: string;
  readonly services: readonly ServiceCategory[];
  readonly faqs: readonly FAQEntry[];
  readonly policies: Record<string, Record<SupportedLanguage, string>>;
}

// --- Analytics ---

export interface ConversationAnalytics {
  readonly totalConversations: number;
  readonly leadsCaptured: number;
  readonly appointmentsBooked: number;
  readonly escalations: number;
  readonly averageResponseTime: number; // ms
  readonly satisfactionScore?: number;
  readonly topIntents: readonly { intent: UserIntent; count: number }[];
  readonly byChannel: Record<ConversationChannel, number>;
  readonly byLanguage: Record<SupportedLanguage, number>;
}

// --- API Responses ---

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly metadata?: {
    readonly total?: number;
    readonly page?: number;
    readonly limit?: number;
  };
}

// --- Widget Configuration ---

export interface WidgetConfig {
  readonly businessId: string;
  readonly position: "bottom-right" | "bottom-left";
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly greeting: string;
  readonly placeholder: string;
  readonly showBranding: boolean;
  readonly avatarUrl?: string;
  readonly language: SupportedLanguage;
  readonly availableLanguages: readonly SupportedLanguage[];
}
