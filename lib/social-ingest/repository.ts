import type { SocialSourcePage, SocialSourceRecordItem } from "./types";

export type SocialSourceUpsertResult = {
  readonly inserted: number;
  readonly updated: number;
  readonly total: number;
};

export type InMemorySocialSourceRepository = {
  readonly upsertPage: (page: SocialSourcePage) => SocialSourceUpsertResult;
  readonly listPublicDisplayable: () => readonly SocialSourceRecordItem[];
};

export function createInMemorySocialSourceRepository(): InMemorySocialSourceRepository {
  const records = new Map<string, SocialSourceRecordItem>();
  return {
    upsertPage(page) {
      let inserted = 0;
      let updated = 0;
      page.records.forEach((record) => {
        if (records.has(record.providerId)) {
          updated += 1;
        } else {
          inserted += 1;
        }
        records.set(record.providerId, record);
      });
      return { inserted, updated, total: records.size };
    },
    listPublicDisplayable() {
      return [...records.values()].filter(isPublicDisplayable);
    },
  };
}

function isPublicDisplayable(record: SocialSourceRecordItem): boolean {
  return record.rights.canDisplay
    && record.rights.status === "approved"
    && !record.takedown
    && !isExpired(record.rights.expiresAt);
}

function isExpired(value: string | null): boolean {
  if (!value) return false;
  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}
