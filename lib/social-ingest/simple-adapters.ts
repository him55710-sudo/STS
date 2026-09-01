import type { SocialSourceAdapter, SocialSourcePage, SocialSourceRecordItem } from "./types";

type UserUploadInput = {
  readonly uploadId: string;
  readonly ownerId: string;
  readonly mediaUrl: string;
};

type DemoSeedInput = {
  readonly seedId: string;
  readonly mediaUrl: string;
  readonly title: string;
};

export function createUserUploadAdapter(options: {
  readonly provider: string;
  readonly uploads: readonly UserUploadInput[];
}): SocialSourceAdapter {
  return {
    source: "user_upload",
    provider: options.provider,
    fetchPage: async () => page("user_upload", options.provider, options.uploads.map((upload) => userRecord(options.provider, upload))),
  };
}

export function createDemoSeedAdapter(options: {
  readonly provider: string;
  readonly seeds: readonly DemoSeedInput[];
}): SocialSourceAdapter {
  return {
    source: "demo_seed",
    provider: options.provider,
    fetchPage: async () => page("demo_seed", options.provider, options.seeds.map((seed) => demoRecord(options.provider, seed))),
  };
}

function page(source: "user_upload" | "demo_seed", provider: string, records: readonly SocialSourceRecordItem[]): SocialSourcePage {
  return {
    source,
    provider,
    records,
    rowResults: records.map((record, index) => ({ kind: "accepted", rowNumber: index + 1, record })),
    errors: [],
  };
}

function userRecord(provider: string, upload: UserUploadInput): SocialSourceRecordItem {
  return {
    providerId: `user_upload:${provider}:${upload.uploadId}`,
    title: null,
    contentKind: "photo",
    sourceRecord: {
      kind: "user_upload",
      provider,
      identity: `user_upload:${upload.ownerId}:${upload.uploadId}`,
      canonicalUrl: null,
      externalId: upload.uploadId,
      parentIdentity: upload.ownerId,
    },
    rights: {
      kind: "user_owned",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: false,
      canRedistribute: false,
      evidence: "user_upload_attestation",
      expiresAt: null,
    },
    rightsTerritory: [],
    takedown: false,
    embed: null,
    localMediaAssets: [{ kind: "image", url: upload.mediaUrl }],
    commerceMatchJobs: [],
  };
}

function demoRecord(provider: string, seed: DemoSeedInput): SocialSourceRecordItem {
  return {
    providerId: `demo_seed:${provider}:${seed.seedId}`,
    title: seed.title,
    contentKind: "photo",
    sourceRecord: {
      kind: "demo_seed",
      provider,
      identity: `demo_seed:${provider}:${seed.seedId}`,
      canonicalUrl: null,
      externalId: seed.seedId,
    },
    rights: {
      kind: "demo",
      status: "approved",
      canDisplay: true,
      canUseForCommerceMatching: false,
      canRedistribute: false,
      evidence: "STS demo seed; not production rights evidence.",
      expiresAt: null,
    },
    rightsTerritory: [],
    takedown: false,
    embed: null,
    localMediaAssets: [{ kind: "image", url: seed.mediaUrl }],
    commerceMatchJobs: [],
  };
}
