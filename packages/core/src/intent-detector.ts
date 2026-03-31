import type { UserIntent, DetectedIntent, SupportedLanguage } from "@ai-receptionist/types";

// Intent patterns per language
const INTENT_PATTERNS: Record<UserIntent, Record<SupportedLanguage, readonly string[]>> = {
  book_appointment: {
    en: ["book", "appointment", "schedule", "reserve", "sign up", "come in", "visit", "available", "slot", "opening"],
    lv: ["pierakstīties", "pieraksts", "vizīte", "rezervēt", "laiks", "brīvs", "atnākt", "ierasties"],
    ru: ["записаться", "запись", "визит", "забронировать", "время", "свободно", "прийти", "записать"],
  },
  ask_pricing: {
    en: ["price", "cost", "how much", "fee", "charge", "rate", "expensive", "affordable", "pay", "payment"],
    lv: ["cena", "maksā", "cik", "samaksa", "maksa", "dārgi", "apmaksa", "tarifs"],
    ru: ["цена", "стоимость", "сколько", "оплата", "стоит", "дорого", "тариф", "расценки"],
  },
  ask_services: {
    en: ["service", "offer", "treatment", "procedure", "do you do", "what can", "options", "available"],
    lv: ["pakalpojums", "piedāvā", "procedūra", "ārstēšana", "iespējas", "pieejams"],
    ru: ["услуга", "предлагаете", "процедура", "лечение", "возможности", "доступно", "делаете"],
  },
  ask_hours: {
    en: ["hours", "open", "close", "when", "schedule", "working", "business hours", "available"],
    lv: ["darba laiks", "atvērts", "slēgts", "kad", "strādā"],
    ru: ["время работы", "открыт", "закрыт", "когда", "работаете", "график"],
  },
  ask_location: {
    en: ["where", "location", "address", "directions", "find you", "map", "parking"],
    lv: ["kur", "adrese", "atrašanās", "vieta", "kā nokļūt", "karte", "stāvvieta"],
    ru: ["где", "адрес", "расположение", "место", "как добраться", "карта", "парковка"],
  },
  ask_question: {
    en: ["what", "how", "why", "tell me", "explain", "information", "about", "details"],
    lv: ["kas", "kā", "kāpēc", "pastāstiet", "informācija", "par", "detaļas"],
    ru: ["что", "как", "почему", "расскажите", "информация", "про", "подробности"],
  },
  complaint: {
    en: ["complaint", "unhappy", "terrible", "worst", "angry", "frustrated", "disgusted", "sue", "lawyer", "refund"],
    lv: ["sūdzība", "neapmierināts", "briesmīgi", "dusmīgs", "atgriešana"],
    ru: ["жалоба", "недоволен", "ужасно", "злой", "возврат", "разочарован"],
  },
  urgent_medical: {
    en: ["emergency", "urgent", "bleeding", "pain", "swelling", "allergic", "reaction", "can't breathe", "hospital"],
    lv: ["neatliekams", "steidzami", "asiņo", "sāpes", "pietūkums", "alerģiska", "reakcija", "slimnīca"],
    ru: ["срочно", "неотложно", "кровотечение", "боль", "отёк", "аллергическая", "реакция", "больница"],
  },
  speak_to_human: {
    en: ["human", "real person", "speak to someone", "manager", "operator", "representative", "agent", "talk to"],
    lv: ["cilvēks", "operators", "menedžeris", "runāt ar", "pārstāvis"],
    ru: ["человек", "оператор", "менеджер", "поговорить с", "представитель", "живой"],
  },
  cancel_appointment: {
    en: ["cancel", "cancellation", "don't want", "remove"],
    lv: ["atcelt", "atcelšana", "nevēlos"],
    ru: ["отменить", "отмена", "не хочу"],
  },
  reschedule: {
    en: ["reschedule", "change", "move", "different time", "another date"],
    lv: ["pārcelt", "mainīt", "cits laiks", "cita diena"],
    ru: ["перенести", "изменить", "другое время", "другой день"],
  },
  follow_up: {
    en: ["follow up", "status", "update", "checking in", "called before"],
    lv: ["sekot", "statuss", "jaunumi", "zvanīju iepriekš"],
    ru: ["узнать", "статус", "обновление", "звонил раньше"],
  },
  general_inquiry: {
    en: ["hello", "hi", "hey", "good morning", "good afternoon"],
    lv: ["sveiki", "labdien", "čau", "labrīt"],
    ru: ["здравствуйте", "привет", "добрый день", "доброе утро"],
  },
  unknown: { en: [], lv: [], ru: [] },
};

export class IntentDetector {
  detect(message: string, language: SupportedLanguage): DetectedIntent {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);

    let bestIntent: UserIntent = "unknown";
    let bestScore = 0;

    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      const langPatterns = patterns[language] || patterns.en || [];
      let score = 0;

      for (const pattern of langPatterns) {
        if (pattern.includes(" ")) {
          // Multi-word pattern — check as substring
          if (lowerMessage.includes(pattern)) {
            score += 2;
          }
        } else {
          // Single word — check in word list
          if (words.includes(pattern)) {
            score += 1;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent as UserIntent;
      }
    }

    // Normalize confidence: more matches = higher confidence, cap at 1.0
    const confidence = Math.min(bestScore / 3, 1.0);

    return {
      intent: bestIntent,
      confidence: bestScore > 0 ? Math.max(confidence, 0.3) : 0,
      entities: this.extractEntities(lowerMessage),
    };
  }

  private extractEntities(message: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // Phone number extraction (Latvian format: +371 XXXXXXXX)
    const phoneMatch = message.match(/\+?3?7?1?\s?\d{2}\s?\d{3}\s?\d{3}/);
    if (phoneMatch) {
      entities.phone = phoneMatch[0].replace(/\s/g, "");
    }

    // Email extraction
    const emailMatch = message.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    if (emailMatch) {
      entities.email = emailMatch[0];
    }

    // Date extraction (simple patterns)
    const datePatterns = [
      /(?:today|šodien|сегодня)/i,
      /(?:tomorrow|rīt|завтра)/i,
      /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:pirmdiena|otrdiena|trešdiena|ceturtdiena|piektdiena|sestdiena|svētdiena)/i,
      /(?:понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)/i,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.date = match[0];
        break;
      }
    }

    // Time extraction
    const timeMatch = message.match(/\d{1,2}[:.]\d{2}|\d{1,2}\s*(?:am|pm|AM|PM)/);
    if (timeMatch) {
      entities.time = timeMatch[0];
    }

    return entities;
  }
}
