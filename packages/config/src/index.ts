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
