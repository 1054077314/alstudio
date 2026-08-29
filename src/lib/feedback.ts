import { prisma } from "./prisma";
import { analyzeFeedback } from "./ai";
import { timeWeight } from "./scoring";
import { DEFAULT_TIME_DECAY } from "./constants";

interface CreateFeedbackInput {
  airportId: string;
  rawContent: string;
  sourcePlatform?: string;
  dataSourceId?: string;
  originalUrl?: string;
  authorName?: string;
  authorId?: string;
  authorMeta?: string;
  publishedAt?: string;
}

function deriveUserCredibility(authorMeta?: string): number {
  if (!authorMeta) return 0.7;
  try {
    const m = JSON.parse(authorMeta);
    if (m.isOfficial || m.isOwner || m.isAgent) return 0; // excluded from scoring entirely
    if (m.onlyPromotes) return 0.2;
    if (m.isNewAccount) return 0.6;
    return 1.0;
  } catch {
    return 0.7;
  }
}

export async function computeAndStoreAnalysis(feedbackId: string) {
  const fb = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { dataSource: true },
  });
  if (!fb) return null;

  const result = await analyzeFeedback({ content: fb.rawContent, airportName: undefined });
  const age = (Date.now() - (fb.publishedAt ?? fb.crawledAt).getTime()) / 86400000;
  const sourceCred = fb.sourceCredibility ?? fb.dataSource?.credibilityWeight ?? 0.7;
  const userCred = fb.userCredibility ?? deriveUserCredibility(fb.authorMeta ?? undefined);
  const contentQual = fb.contentQuality ?? result.informationQuality ?? 0.5;
  const tw = timeWeight(age, DEFAULT_TIME_DECAY);
  const promoFactor = result.promotionProbability > 0.5 ? 0.1 : 1;
  const computedWeight = sourceCred * userCred * contentQual * tw * promoFactor;

  const promoStatus = result.promotionProbability > 0.7 ? "promotion" : fb.status === "official" ? "official" : "analyzed";

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: {
      analyzedAt: new Date(),
      sentiment: result.sentiment,
      aiStability: result.aiStability,
      aiSpeed: result.aiSpeed,
      aiCustomerService: result.aiCustomerService,
      aiValue: result.aiValue,
      aiNodeQuality: result.aiNodeQuality,
      aiUnlock: result.aiUnlock,
      usageDuration: result.usageDuration,
      regionTags: JSON.stringify(result.regionTags),
      serviceTags: JSON.stringify(result.serviceTags),
      priceTags: JSON.stringify(result.priceTags),
      unlockTags: JSON.stringify(result.unlockTags),
      riskTags: JSON.stringify(result.riskTags),
      promotionProbability: result.promotionProbability,
      informationQuality: result.informationQuality,
      aiSummary: result.aiSummary,
      aiRaw: JSON.stringify(result.aiRaw),
      sourceCredibility: sourceCred,
      userCredibility: userCred,
      contentQuality: contentQual,
      timeWeight: tw,
      promotionFactor,
      computedWeight,
      status: promoStatus,
    },
  });
  return updated;
}

export async function createFeedbackWithAnalysis(input: CreateFeedbackInput) {
  const sourcePlatform = input.sourcePlatform ?? (input.dataSourceId ? "unknown" : "unknown");
  const fb = await prisma.feedback.create({
    data: {
      airportId: input.airportId,
      dataSourceId: input.dataSourceId ?? null,
      sourcePlatform,
      originalUrl: input.originalUrl ?? null,
      authorName: input.authorName ?? null,
      authorId: input.authorId ?? null,
      authorMeta: input.authorMeta ?? null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      rawContent: input.rawContent,
      processedContent: input.rawContent.trim(),
      status: "pending",
    },
  });
  return computeAndStoreAnalysis(fb.id);
}
