import type { BusinessConfig, KnowledgeBase } from "@ai-receptionist/types";

import { vividermConfig, vividermKnowledgeBase } from "./businesses/vividerm";

export { vividermConfig, vividermKnowledgeBase };
export { aestheticsClinicIndustry } from "./industries/aesthetics-clinic";

// --- Business Config Registry ---

const businessConfigs: Record<string, BusinessConfig> = {
  vividerm: vividermConfig,
};

const knowledgeBases: Record<string, KnowledgeBase> = {
  vividerm: vividermKnowledgeBase,
};

export function getBusinessConfig(businessId: string): BusinessConfig {
  const config = businessConfigs[businessId];
  if (!config) throw new Error(`Unknown business: ${businessId}`);
  return config;
}

export function getKnowledgeBase(businessId: string): KnowledgeBase {
  const kb = knowledgeBases[businessId];
  if (!kb) throw new Error(`Unknown knowledge base: ${businessId}`);
  return kb;
}

/**
 * Look up the external booking system ID for a service by name.
 * Matches against service names in all supported languages (case-insensitive).
 */
export function findServiceExternalId(
  businessId: string,
  serviceName: string
): string | null {
  const kb = knowledgeBases[businessId];
  if (!kb) return null;

  const lower = serviceName.toLowerCase();
  for (const category of kb.services) {
    for (const service of category.services) {
      const names = Object.values(service.name).map((n) => n.toLowerCase());
      if (names.some((n) => lower.includes(n) || n.includes(lower))) {
        return service.externalId ?? null;
      }
    }
  }
  return null;
}
