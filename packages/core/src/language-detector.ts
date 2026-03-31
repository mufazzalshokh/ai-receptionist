import type { SupportedLanguage } from "@ai-receptionist/types";

// Character patterns unique to each language
const LATVIAN_CHARS = /[āčēģīķļņšūž]/i;
const RUSSIAN_CHARS = /[а-яА-ЯёЁ]/;

// Common words for each language
const LATVIAN_WORDS = [
  "es", "ir", "un", "vai", "lūdzu", "paldies", "sveiki", "labdien",
  "jā", "nē", "man", "kā", "kas", "kur", "kad", "gribu", "vēlos",
  "pierakstīties", "vizīte", "ārsts", "procedūra", "cena", "laiks",
];

const RUSSIAN_WORDS = [
  "я", "и", "или", "да", "нет", "пожалуйста", "спасибо", "здравствуйте",
  "привет", "мне", "как", "что", "где", "когда", "хочу", "записаться",
  "визит", "врач", "процедура", "цена", "время", "можно",
];

const ENGLISH_WORDS = [
  "i", "the", "and", "or", "yes", "no", "please", "thank", "hello",
  "hi", "how", "what", "where", "when", "want", "book", "appointment",
  "visit", "doctor", "procedure", "price", "time", "can",
];

export class LanguageDetector {
  detect(
    text: string,
    supportedLanguages: readonly SupportedLanguage[],
    currentLanguage: SupportedLanguage
  ): SupportedLanguage {
    const normalizedText = text.trim().toLowerCase();

    // Short text: rely on character detection
    if (normalizedText.length < 3) return currentLanguage;

    // Russian detection (Cyrillic is very distinct)
    if (
      supportedLanguages.includes("ru") &&
      RUSSIAN_CHARS.test(normalizedText)
    ) {
      const cyrillicRatio = this.getCyrillicRatio(normalizedText);
      if (cyrillicRatio > 0.3) return "ru";
    }

    // Latvian detection (diacritical marks)
    if (
      supportedLanguages.includes("lv") &&
      LATVIAN_CHARS.test(normalizedText)
    ) {
      return "lv";
    }

    // Word-based detection for texts without special characters
    const scores = this.getLanguageScores(normalizedText, supportedLanguages);

    // If a language scores significantly higher, switch
    const topScore = Math.max(...Object.values(scores));
    if (topScore > 0) {
      const topLanguage = (Object.entries(scores) as [SupportedLanguage, number][])
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      if (topLanguage && scores[topLanguage]! > 1) {
        return topLanguage;
      }
    }

    // Default: keep current language
    return currentLanguage;
  }

  private getCyrillicRatio(text: string): number {
    const chars = text.replace(/\s/g, "");
    if (chars.length === 0) return 0;
    const cyrillicCount = (chars.match(/[а-яА-ЯёЁ]/g) || []).length;
    return cyrillicCount / chars.length;
  }

  private getLanguageScores(
    text: string,
    supported: readonly SupportedLanguage[]
  ): Partial<Record<SupportedLanguage, number>> {
    const words = text.split(/\s+/);
    const scores: Partial<Record<SupportedLanguage, number>> = {};

    for (const lang of supported) {
      scores[lang] = 0;
      const wordList = this.getWordList(lang);

      for (const word of words) {
        if (wordList.includes(word)) {
          scores[lang] = (scores[lang] ?? 0) + 1;
        }
      }
    }

    return scores;
  }

  private getWordList(language: SupportedLanguage): readonly string[] {
    switch (language) {
      case "lv":
        return LATVIAN_WORDS;
      case "ru":
        return RUSSIAN_WORDS;
      case "en":
        return ENGLISH_WORDS;
      default:
        return ENGLISH_WORDS;
    }
  }
}
