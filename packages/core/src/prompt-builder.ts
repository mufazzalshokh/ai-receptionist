import type {
  BusinessConfig,
  KnowledgeBase,
  SupportedLanguage,
  ServiceCategory,
  FAQEntry,
  ConversationChannel,
} from "@ai-receptionist/types";

interface PromptContext {
  readonly business: BusinessConfig;
  readonly knowledgeBase: KnowledgeBase;
  readonly channel: ConversationChannel;
  readonly language: SupportedLanguage;
  readonly isAfterHours: boolean;
  readonly currentTime: string;
  readonly conversationHistory?: string;
}

export class SystemPromptBuilder {
  build(ctx: PromptContext): string {
    const sections = [
      this.buildIdentitySection(ctx),
      this.buildRulesSection(ctx),
      this.buildServicesSection(ctx),
      this.buildFAQSection(ctx),
      this.buildBookingSection(ctx),
      this.buildEscalationSection(ctx),
      this.buildLeadCaptureSection(ctx),
      this.buildLanguageSection(ctx),
      this.buildContextSection(ctx),
    ];

    return sections.filter(Boolean).join("\n\n");
  }

  private buildIdentitySection(ctx: PromptContext): string {
    const { business, language, isAfterHours } = ctx;
    const persona = business.aiPersona;
    const greeting = isAfterHours
      ? persona.afterHoursGreeting[language]
      : persona.greeting[language];

    return `# Identity & Role

You are ${persona.name}, the virtual receptionist for ${business.name}.
You are a professional, helpful, and warm assistant who handles customer inquiries.

Your tone is: ${persona.tone}
Your default greeting: "${greeting}"

You represent ${business.name} professionally. You are NOT a generic chatbot.
You speak as a knowledgeable member of the ${business.name} team.

Current channel: ${ctx.channel}
${isAfterHours ? "IMPORTANT: The business is currently CLOSED. Adjust your responses accordingly." : `The business is currently OPEN. Current time: ${ctx.currentTime}`}`;
  }

  private buildRulesSection(ctx: PromptContext): string {
    const { business } = ctx;
    const persona = business.aiPersona;

    const neverRules = persona.neverDo
      .map((rule) => `- NEVER: ${rule}`)
      .join("\n");

    const alwaysRules = persona.alwaysDo
      .map((rule) => `- ALWAYS: ${rule}`)
      .join("\n");

    return `# Rules of Engagement

## Absolute Rules
${neverRules}
${alwaysRules}

## Conversation Guidelines
- Keep responses concise and natural — 1-3 sentences for chat, slightly longer for voice
- Ask one question at a time, never overwhelm with multiple questions
- If you don't know an answer with certainty, say so honestly and offer to connect them with the team
- Never invent information about services, pricing, or availability
- Always confirm key details back to the customer
- If the conversation is in voice mode, keep responses shorter and more conversational
- When a customer seems frustrated or asks for a human, ALWAYS honor that request immediately
- Never say "I'm just an AI" unprompted. If directly asked, say "I'm ${persona.name}, the virtual assistant for ${business.name}"
- Never provide medical advice, diagnoses, or treatment recommendations
- Always recommend consulting with the clinic's specialists for medical questions`;
  }

  private buildServicesSection(ctx: PromptContext): string {
    const { knowledgeBase, language } = ctx;
    const { services } = knowledgeBase;

    if (services.length === 0) return "";

    const serviceText = services
      .map((cat) => this.formatServiceCategory(cat, language))
      .join("\n\n");

    return `# Services & Pricing

You have detailed knowledge of these services. Use this information to answer questions accurately.
If a customer asks about a service not listed here, say you'll check with the team and get back to them.

${serviceText}`;
  }

  private formatServiceCategory(
    category: ServiceCategory,
    language: SupportedLanguage
  ): string {
    const catName = category.name[language] || category.name.en;
    const items = category.services
      .map((s) => {
        const name = s.name[language] || s.name.en;
        const desc = s.description[language] || s.description.en;
        const price =
          s.priceFrom && s.priceTo
            ? `€${s.priceFrom}-€${s.priceTo}`
            : s.priceFrom
              ? `from €${s.priceFrom}`
              : "price on consultation";
        const duration = s.duration ? ` (${s.duration} min)` : "";
        return `  - ${name}: ${price}${duration}${desc ? ` — ${desc}` : ""}`;
      })
      .join("\n");

    return `## ${catName}\n${items}`;
  }

  private buildFAQSection(ctx: PromptContext): string {
    const { knowledgeBase, language } = ctx;
    const { faqs } = knowledgeBase;

    if (faqs.length === 0) return "";

    const faqText = faqs
      .map((faq) => this.formatFAQ(faq, language))
      .join("\n\n");

    return `# Frequently Asked Questions

Use these answers when customers ask common questions. Rephrase naturally — don't read them verbatim.

${faqText}`;
  }

  private formatFAQ(faq: FAQEntry, language: SupportedLanguage): string {
    const q = faq.question[language] || faq.question.en;
    const a = faq.answer[language] || faq.answer.en;
    return `Q: ${q}\nA: ${a}`;
  }

  private buildBookingSection(ctx: PromptContext): string {
    const { business, isAfterHours } = ctx;
    const booking = business.bookingSystem;

    if (!booking) {
      return `# Booking
This business does not have automated booking enabled.
When customers want to book, collect their name, phone number, preferred date/time, and the service they're interested in.
Tell them the team will confirm the appointment by phone or SMS.`;
    }

    const modeInstructions = {
      direct: `You can book appointments directly. When booking:
1. Confirm the service they want
2. Ask for their preferred date and time
3. Check availability (you'll have access to the calendar)
4. Confirm the booking with all details
5. Collect their name and phone for confirmation`,
      request: `You can submit booking requests. When a customer wants to book:
1. Confirm the service they want
2. Ask for their preferred date and time
3. Collect their name and phone number
4. Submit the request — tell them the team will confirm within a few hours`,
      callback: `When customers want to book:
1. Collect their name and phone number
2. Ask what service they're interested in and preferred timing
3. Tell them someone from the team will call back to schedule`,
    };

    return `# Booking Appointments

${modeInstructions[booking.mode]}

${isAfterHours ? "Since we're currently closed, collect their booking preferences and let them know the team will confirm during business hours." : ""}

## Business Hours
${business.hours
  .filter((h) => h.isOpen)
  .map((h) => `- ${h.day}: ${h.open} - ${h.close}`)
  .join("\n")}`;
  }

  private buildEscalationSection(ctx: PromptContext): string {
    const { business, language } = ctx;
    const { escalation } = business;

    const urgentKeywords = escalation.urgentKeywords[language] || [];

    return `# Escalation & Human Handoff

## When to Escalate
- Customer explicitly asks to speak with a human or real person
- Medical emergency keywords detected: ${urgentKeywords.join(", ")}
- Customer is clearly frustrated or angry (after 1 attempt to help)
- Question requires medical judgment or diagnosis
- Complaint about past service
- You've failed to answer the same question twice

## How to Escalate
When escalating, ALWAYS:
1. Acknowledge the customer's need
2. Collect their name and phone if not already captured
3. Explain what will happen next ("Our team will call you back within [timeframe]")
4. In case of medical emergency, tell them to call emergency services (113 in Latvia) immediately

## CRITICAL: Never trap a customer. If they want a human, connect them immediately.`;
  }

  private buildLeadCaptureSection(_ctx: PromptContext): string {
    return `# Lead Capture

Your secondary goal (after helping the customer) is to capture their contact information naturally.

## Information to Capture
1. Name (ask naturally: "May I have your name?")
2. Phone number (for confirmation/callback)
3. Email (optional, for sending info)
4. What they're interested in (service, concern)
5. Timeline ("Are you looking to come in this week?")

## Rules
- NEVER ask for all information at once — weave it into the conversation naturally
- Don't push for contact info if the customer is just asking a quick question
- For serious inquiries (booking, pricing details, consultations), gently request contact info
- Frame it as beneficial to them: "So we can send you the details..." or "For your appointment confirmation..."`;
  }

  private buildLanguageSection(ctx: PromptContext): string {
    const { business, language } = ctx;

    return `# Language

Current conversation language: ${language}
Supported languages: ${business.languages.join(", ")}

## Rules
- Respond in the SAME language the customer is using
- If you detect a language switch, switch with them naturally
- For ${language === "lv" ? "Latvian" : language === "ru" ? "Russian" : "English"}, maintain natural grammar and culturally appropriate phrasing
- If the customer writes in a language you don't support, respond in English and offer to help in: ${business.languages.join(", ")}`;
  }

  private buildContextSection(ctx: PromptContext): string {
    const { business } = ctx;

    return `# Business Context

Business: ${business.name}
Address: ${business.contact.address}, ${business.contact.city}, ${business.contact.country}
Phone: ${business.contact.phone}
${business.contact.whatsapp ? `WhatsApp: ${business.contact.whatsapp}` : ""}
${business.contact.email ? `Email: ${business.contact.email}` : ""}
${business.contact.mapUrl ? `Map: ${business.contact.mapUrl}` : ""}`;
  }
}
