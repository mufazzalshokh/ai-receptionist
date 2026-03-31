import type { LeadData, LeadScore } from "@ai-receptionist/types";

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const NAME_PATTERNS = [
  /(?:my name is|i'm|i am|this is|name's)\s+([A-Za-zÀ-žА-яЁё]+(?:\s+[A-Za-zÀ-žА-яЁё]+)?)/i,
  /(?:mani sauc|es esmu)\s+([A-Za-zÀ-žĀ-ž]+(?:\s+[A-Za-zÀ-žĀ-ž]+)?)/i,
  /(?:меня зовут|я)\s+([А-яЁё]+(?:\s+[А-яЁё]+)?)/i,
];

const PHONE_PATTERN = /\+?3?7?1?\s?\d{2}\s?\d{3}\s?\d{3}|\d{8}/;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const TIMELINE_URGENT = [
  "today", "now", "asap", "urgent", "immediately", "this week",
  "šodien", "tagad", "steidzami", "šonedēļ",
  "сегодня", "сейчас", "срочно", "на этой неделе",
];

const TIMELINE_SOON = [
  "next week", "this month", "soon", "shortly",
  "nākamnedēļ", "šomēnes", "drīz",
  "на следующей неделе", "в этом месяце", "скоро",
];

export class LeadQualifier {
  extractLeadInfo(
    userMessage: string,
    _assistantMessage: string,
    currentLead: Partial<LeadData>
  ): Partial<LeadData> | null {
    const updates: Partial<Mutable<LeadData>> = {};
    let hasUpdates = false;

    // Extract name
    if (!currentLead.name) {
      const name = this.extractName(userMessage);
      if (name) {
        updates.name = name;
        hasUpdates = true;
      }
    }

    // Extract phone
    if (!currentLead.phone) {
      const phone = this.extractPhone(userMessage);
      if (phone) {
        updates.phone = phone;
        hasUpdates = true;
      }
    }

    // Extract email
    if (!currentLead.email) {
      const email = this.extractEmail(userMessage);
      if (email) {
        updates.email = email;
        hasUpdates = true;
      }
    }

    // Extract timeline
    if (!currentLead.timeline) {
      const timeline = this.extractTimeline(userMessage);
      if (timeline) {
        updates.timeline = timeline;
        hasUpdates = true;
      }
    }

    // Calculate lead score based on available info
    if (hasUpdates) {
      const merged = { ...currentLead, ...updates };
      updates.score = this.calculateScore(merged);
    }

    return hasUpdates ? updates : null;
  }

  private extractName(text: string): string | null {
    for (const pattern of NAME_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        // Sanity check: name should be 2-50 chars, no numbers
        if (name.length >= 2 && name.length <= 50 && !/\d/.test(name)) {
          return name;
        }
      }
    }
    return null;
  }

  private extractPhone(text: string): string | null {
    const match = text.match(PHONE_PATTERN);
    if (match) {
      let phone = match[0].replace(/\s/g, "");
      // Normalize Latvian numbers
      if (phone.length === 8 && !phone.startsWith("+")) {
        phone = "+371" + phone;
      }
      return phone;
    }
    return null;
  }

  private extractEmail(text: string): string | null {
    const match = text.match(EMAIL_PATTERN);
    return match ? match[0].toLowerCase() : null;
  }

  private extractTimeline(text: string): string | null {
    const lower = text.toLowerCase();

    for (const word of TIMELINE_URGENT) {
      if (lower.includes(word)) return "urgent";
    }

    for (const word of TIMELINE_SOON) {
      if (lower.includes(word)) return "soon";
    }

    return null;
  }

  private calculateScore(lead: Partial<LeadData>): LeadScore {
    let points = 0;

    if (lead.name) points += 1;
    if (lead.phone) points += 2;
    if (lead.email) points += 1;
    if (lead.timeline === "urgent") points += 3;
    if (lead.timeline === "soon") points += 1;
    if (lead.interests && lead.interests.length > 0) points += 1;

    if (points >= 5) return "hot";
    if (points >= 2) return "warm";
    return "cold";
  }
}
