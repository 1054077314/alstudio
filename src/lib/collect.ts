import { prisma } from "./prisma";
import { createFeedbackWithAnalysis } from "./feedback";

export interface RawCollectedFeedback {
  rawContent: string;
  originalUrl?: string;
  authorName?: string;
  authorId?: string;
  publishedAt?: string;
  authorMeta?: string;
}

// A Collector turns a DataSource into raw feedback items. Implement real scrapers
// per platform and register them in `collectors`. MVP ships without live scrapers
// (manual entry is the supported path), but the pipeline is wired end-to-end.
export interface Collector {
  platform: string;
  collect(source: { id: string; platform: string; url: string | null }): Promise<RawCollectedFeedback[]>;
}

// Example / template collector (does not perform network calls).
const manualCollector: Collector = {
  platform: "manual",
  async collect() {
    return [];
  },
};

export const collectors: Record<string, Collector> = {
  manual: manualCollector,
};

export interface CollectionResult {
  sourceId: string;
  platform: string;
  fetched: number;
  imported: number;
}

export async function runCollection(): Promise<CollectionResult[]> {
  const sources = await prisma.dataSource.findMany({
    where: { crawlStatus: { in: ["active", "manual"] } },
  });
  const results: CollectionResult[] = [];
  for (const src of sources) {
    const collector = collectors[src.platform] ?? collectors["manual"];
    let items: RawCollectedFeedback[] = [];
    try {
      items = await collector.collect(src);
    } catch {
      items = [];
    }
    let imported = 0;
    for (const it of items) {
      await createFeedbackWithAnalysis({
        airportId: src.id, // NOTE: real collectors must resolve airport via domain/alias
        rawContent: it.rawContent,
        sourcePlatform: src.platform,
        dataSourceId: src.id,
        originalUrl: it.originalUrl,
        authorName: it.authorName,
        authorId: it.authorId,
        authorMeta: it.authorMeta,
        publishedAt: it.publishedAt,
      });
      imported++;
    }
    await prisma.dataSource.update({
      where: { id: src.id },
      data: { lastCrawledAt: new Date(), crawlStatus: src.crawlStatus === "manual" ? "manual" : "active" },
    });
    results.push({ sourceId: src.id, platform: src.platform, fetched: items.length, imported });
  }
  return results;
}
