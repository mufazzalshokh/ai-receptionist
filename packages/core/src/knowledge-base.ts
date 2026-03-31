import type {
  KnowledgeBase,
  ServiceCategory,
  FAQEntry,
  SupportedLanguage,
} from "@ai-receptionist/types";

interface ServiceInput {
  readonly category: string;
  readonly nameEn: string;
  readonly nameLv?: string;
  readonly nameRu?: string;
  readonly descEn?: string;
  readonly descLv?: string;
  readonly descRu?: string;
  readonly priceFrom?: number;
  readonly priceTo?: number;
  readonly currency?: string;
  readonly duration?: number;
}

interface FAQInput {
  readonly category: string;
  readonly questionEn: string;
  readonly questionLv?: string;
  readonly questionRu?: string;
  readonly answerEn: string;
  readonly answerLv?: string;
  readonly answerRu?: string;
  readonly keywords?: readonly string[];
}

export class KnowledgeBaseManager {
  buildFromData(
    businessId: string,
    services: readonly ServiceInput[],
    faqs: readonly FAQInput[],
    policies?: Record<string, Record<SupportedLanguage, string>>
  ): KnowledgeBase {
    const serviceCategories = this.groupServices(services);
    const faqEntries = this.buildFAQs(faqs);

    return {
      businessId,
      services: serviceCategories,
      faqs: faqEntries,
      policies: policies ?? {},
    };
  }

  private groupServices(services: readonly ServiceInput[]): ServiceCategory[] {
    const categoryMap = new Map<string, ServiceInput[]>();

    for (const service of services) {
      const existing = categoryMap.get(service.category) ?? [];
      categoryMap.set(service.category, [...existing, service]);
    }

    return Array.from(categoryMap.entries()).map(([category, items]) => ({
      id: this.slugify(category),
      name: {
        en: category,
        lv: category, // Will be overridden by business config
        ru: category,
      },
      services: items.map((item, index) => ({
        id: `${this.slugify(category)}-${index}`,
        name: {
          en: item.nameEn,
          lv: item.nameLv ?? item.nameEn,
          ru: item.nameRu ?? item.nameEn,
        },
        description: {
          en: item.descEn ?? "",
          lv: item.descLv ?? item.descEn ?? "",
          ru: item.descRu ?? item.descEn ?? "",
        },
        priceFrom: item.priceFrom,
        priceTo: item.priceTo,
        currency: item.currency ?? "EUR",
        duration: item.duration,
        category: this.slugify(category),
      })),
    }));
  }

  private buildFAQs(faqs: readonly FAQInput[]): FAQEntry[] {
    return faqs.map((faq, index) => ({
      id: `faq-${index}`,
      question: {
        en: faq.questionEn,
        lv: faq.questionLv ?? faq.questionEn,
        ru: faq.questionRu ?? faq.questionEn,
      },
      answer: {
        en: faq.answerEn,
        lv: faq.answerLv ?? faq.answerEn,
        ru: faq.answerRu ?? faq.answerEn,
      },
      category: faq.category,
      keywords: [...(faq.keywords ?? [])],
    }));
  }

  searchServices(
    knowledgeBase: KnowledgeBase,
    query: string,
    language: SupportedLanguage
  ): string[] {
    const lowerQuery = query.toLowerCase();
    const results: string[] = [];

    for (const category of knowledgeBase.services) {
      for (const service of category.services) {
        const name = (service.name[language] || service.name.en).toLowerCase();
        const desc = (
          service.description[language] || service.description.en
        ).toLowerCase();

        if (name.includes(lowerQuery) || desc.includes(lowerQuery)) {
          const price =
            service.priceFrom && service.priceTo
              ? `€${service.priceFrom}-€${service.priceTo}`
              : service.priceFrom
                ? `from €${service.priceFrom}`
                : "price on consultation";

          results.push(`${service.name[language] || service.name.en}: ${price}`);
        }
      }
    }

    return results;
  }

  searchFAQs(
    knowledgeBase: KnowledgeBase,
    query: string,
    language: SupportedLanguage
  ): FAQEntry[] {
    const lowerQuery = query.toLowerCase();

    return knowledgeBase.faqs.filter((faq) => {
      const question = (
        faq.question[language] || faq.question.en
      ).toLowerCase();
      const answer = (faq.answer[language] || faq.answer.en).toLowerCase();
      const keywordMatch = faq.keywords.some((kw) =>
        lowerQuery.includes(kw.toLowerCase())
      );

      return (
        question.includes(lowerQuery) ||
        lowerQuery.includes(question) ||
        answer.includes(lowerQuery) ||
        keywordMatch
      );
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
}
