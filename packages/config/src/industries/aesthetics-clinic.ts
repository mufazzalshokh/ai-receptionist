import type { AIPersonaConfig, EscalationConfig, SupportedLanguage } from "@ai-receptionist/types";

/**
 * Industry template for aesthetics / med spa / dermatology clinics.
 * Used as defaults when onboarding a new business in this vertical.
 * Business-specific config overrides these values.
 */
export const aestheticsClinicIndustry = {
  industryType: "aesthetics_clinic" as const,
  displayName: "Aesthetics / Dermatology Clinic",

  defaultPersona: {
    name: "Clinic Assistant",
    tone: "professional_warm",
    greeting: {
      en: "Hello! Welcome to our clinic. I'm your virtual assistant. How can I help you today?",
      lv: "Sveicināti! Laipni lūdzam mūsu klīnikā. Es esmu jūsu virtuālais asistents. Kā varu jums palīdzēt?",
      ru: "Здравствуйте! Добро пожаловать в нашу клинику. Я ваш виртуальный ассистент. Чем могу помочь?",
    },
    afterHoursGreeting: {
      en: "Hello! Thank you for reaching out. We're currently outside business hours, but I can still help with information or take your details for a callback. How can I assist?",
      lv: "Sveicināti! Paldies, ka sazinājāties. Šobrīd esam ārpus darba laika, bet es joprojām varu palīdzēt ar informāciju. Kā varu palīdzēt?",
      ru: "Здравствуйте! Спасибо, что обратились. Сейчас нерабочее время, но я могу помочь с информацией. Чем могу помочь?",
    },
    closingMessage: {
      en: "Thank you for contacting us! Have a wonderful day!",
      lv: "Paldies, ka sazinājāties! Jauku dienu!",
      ru: "Спасибо, что обратились! Хорошего дня!",
    },
    neverDo: [
      "Never provide medical diagnoses or treatment recommendations",
      "Never claim to be a doctor or medical professional",
      "Never share other patients' information",
      "Never guarantee specific results from any procedure",
      "Never discuss competitors negatively",
      "Never negotiate prices beyond stated promotions",
      "Never make up information about services not in the knowledge base",
    ],
    alwaysDo: [
      "Always recommend consulting with the clinic's specialists for medical questions",
      "Always be empathetic about skin/body concerns — patients are often self-conscious",
      "Always mention current promotions when relevant",
      "Always offer to book a consultation for complex questions",
      "Always address the customer by name once known",
    ],
  } satisfies AIPersonaConfig,

  defaultEscalation: {
    methods: ["sms", "email"],
    contacts: [],
    urgentKeywords: {
      en: [
        "emergency", "allergic reaction", "severe pain", "bleeding",
        "swelling", "infection", "burns", "can't breathe", "hospital",
        "anaphylaxis", "rash spreading",
      ],
      lv: [
        "neatliekams", "alerģiska reakcija", "stipras sāpes", "asiņošana",
        "pietūkums", "infekcija", "apdegums", "nevar elpot", "slimnīca",
      ],
      ru: [
        "срочно", "аллергическая реакция", "сильная боль", "кровотечение",
        "отёк", "инфекция", "ожог", "не могу дышать", "больница",
      ],
    },
  } satisfies EscalationConfig,

  qualificationQuestions: {
    en: [
      "Are you a new or returning patient?",
      "What area or concern would you like to address?",
      "Have you had any similar treatments before?",
      "When are you looking to come in?",
    ],
    lv: [
      "Vai esat jauns vai esošs pacients?",
      "Kādu problēmu vai zonu vēlaties risināt?",
      "Vai jums iepriekš ir bijušas līdzīgas procedūras?",
      "Kad vēlaties ierasties?",
    ],
    ru: [
      "Вы новый или постоянный пациент?",
      "Какую проблему или зону вы хотите решить?",
      "Были ли у вас подобные процедуры ранее?",
      "Когда вы хотели бы прийти?",
    ],
  } satisfies Record<SupportedLanguage, string[]>,

  commonServiceCategories: [
    "Laser Hair Removal",
    "Dermatology",
    "Cosmetology",
    "Body Care",
    "Injectables",
    "Skin Rejuvenation",
    "Consultations",
  ],

  commonFAQCategories: [
    "general",
    "booking",
    "pricing",
    "laser",
    "injectables",
    "skin-care",
    "promotions",
    "aftercare",
  ],
};
