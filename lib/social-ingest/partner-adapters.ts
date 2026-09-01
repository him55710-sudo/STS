import { type ContentKind, type MediaAssetKind, type SocialSourceKind } from "../types";
import { socialSourceError } from "./errors";
import { readSocialSourceRows } from "./input";
import type {
  SocialSourceAdapter,
  SocialSourceError,
  SocialSourceInput,
  SocialSourcePage,
  SocialSourceRecordItem,
  SocialSourceRowResult,
} from "./types";

type PartnerAdapterOptions = {
  readonly provider: string;
  readonly input: SocialSourceInput;
  readonly now?: Date;
};

type PartnerSource = Extract<SocialSourceKind, "licensed_editorial" | "brand_feed">;

type PartnerRecordResult =
  | { readonly kind: "accepted"; readonly record: SocialSourceRecordItem }
  | { readonly kind: "quarantine"; readonly errors: readonly SocialSourceError[] };

type PartnerRecordContext = {
  readonly source: PartnerSource;
  readonly provider: string;
  readonly rowNumber: number;
  readonly now: Date;
};

type PartnerErrorInput = {
  readonly rowNumber: number;
  readonly code: SocialSourceError["code"];
  readonly field: string;
  readonly message: string;
};

export function createLicensedEditorialAdapter(options: PartnerAdapterOptions): SocialSourceAdapter {
  return createPartnerAdapter("licensed_editorial", options);
}

export function createBrandFeedAdapter(options: PartnerAdapterOptions): SocialSourceAdapter {
  return createPartnerAdapter("brand_feed", options);
}

function createPartnerAdapter(source: PartnerSource, options: PartnerAdapterOptions): SocialSourceAdapter {
  return {
    source,
    provider: readText(options.provider) ?? source,
    fetchPage: async () => buildPartnerPage(source, options),
  };
}

function buildPartnerPage(source: PartnerSource, options: PartnerAdapterOptions): SocialSourcePage {
  const provider = readText(options.provider) ?? source;
  const input = readSocialSourceRows(options.input);
  if (input.kind === "error") {
    return { source, provider, records: [], rowResults: [{ kind: "quarantine", rowNumber: input.error.rowNumber, error: input.error }], errors: [input.error] };
  }
  const rows: SocialSourceRecordItem[] = [];
  const rowResults: SocialSourceRowResult[] = [];
  const errors: SocialSourceError[] = [];
  input.rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const normalized = normalizePartnerRecord(row, {
      source,
      provider,
      rowNumber,
      now: options.now ?? new Date(),
    });
    if (normalized.kind === "accepted") {
      rows.push(normalized.record);
      rowResults.push({ kind: "accepted", rowNumber, record: normalized.record });
    } else {
      errors.push(...normalized.errors);
      const [firstError] = normalized.errors;
      if (firstError) rowResults.push({ kind: "quarantine", rowNumber, error: firstError });
    }
  });
  return { source, provider, records: rows, rowResults, errors };
}

function normalizePartnerRecord(row: Readonly<Record<string, unknown>>, context: PartnerRecordContext): PartnerRecordResult {
  const errors: SocialSourceError[] = [];
  const rowNumber = context.rowNumber;
  const externalId = readText(row.externalId);
  if (!externalId) errors.push(error({ rowNumber, code: "missing_external_id", field: "externalId", message: "stable external ID is required" }));
  const canonicalUrl = readHttpsUrl(row.canonicalUrl);
  if (!readText(row.canonicalUrl)) errors.push(error({ rowNumber, code: "missing_canonical_url", field: "canonicalUrl", message: "canonical source URL is required" }));
  if (readText(row.canonicalUrl) && !canonicalUrl) errors.push(error({ rowNumber, code: "invalid_canonical_url", field: "canonicalUrl", message: "canonical source URL must be HTTPS" }));
  const mediaUrl = readHttpsUrl(row.mediaUrl);
  if (!readText(row.mediaUrl)) errors.push(error({ rowNumber, code: "missing_media_url", field: "mediaUrl", message: "hosted media URL is required" }));
  if (readText(row.mediaUrl) && !mediaUrl) errors.push(error({ rowNumber, code: "invalid_media_url", field: "mediaUrl", message: "hosted media URL must be HTTPS" }));
  const contentKind = readContentKind(row.contentKind);
  if (!contentKind) errors.push(error({ rowNumber, code: "invalid_content_kind", field: "contentKind", message: "content kind is unsupported" }));
  const mediaKind = readMediaKind(row.mediaKind);
  if (!mediaKind || mediaKind === "embed") errors.push(error({ rowNumber, code: "invalid_media_kind", field: "mediaKind", message: "hosted partner media must be image or video" }));
  const licenseEvidence = readText(row.licenseEvidence);
  if (!licenseEvidence) errors.push(error({ rowNumber, code: "missing_license_evidence", field: "licenseEvidence", message: "license evidence is required" }));
  const territory = readTerritory(row.territory);
  if (territory.length === 0) errors.push(error({ rowNumber, code: "missing_territory", field: "territory", message: "license territory is required" }));
  const expiresAt = readText(row.expiresAt);
  if (isExpired(expiresAt, context.now)) errors.push(error({ rowNumber, code: "expired_license", field: "expiresAt", message: "license is expired" }));
  if (readBoolean(row.takedown)) errors.push(error({ rowNumber, code: "takedown_requested", field: "takedown", message: "source row is under takedown" }));
  if (!readBoolean(row.canRedistribute)) errors.push(error({ rowNumber, code: "redistribution_disallowed", field: "canRedistribute", message: "hosted editorial media requires redistribution rights" }));
  if (errors.length > 0 || !externalId || !canonicalUrl || !mediaUrl || !contentKind || !mediaKind || mediaKind === "embed" || !licenseEvidence) return { kind: "quarantine", errors };
  const canUseForCommerceMatching = readBoolean(row.canUseForCommerceMatching);
  return {
    kind: "accepted",
    record: {
      providerId: `${context.source}:${context.provider}:${externalId}`,
      title: readText(row.title),
      contentKind,
      sourceRecord: {
        kind: context.source,
        provider: context.provider,
        identity: `${context.source}:${context.provider}:${externalId}`,
        canonicalUrl,
        externalId,
      },
      rights: {
        kind: "licensed",
        status: "approved",
        canDisplay: true,
        canUseForCommerceMatching,
        canRedistribute: true,
        evidence: licenseEvidence,
        expiresAt,
      },
      rightsTerritory: territory,
      takedown: false,
      embed: null,
      localMediaAssets: [{ kind: mediaKind, url: mediaUrl }],
      commerceMatchJobs: [],
    },
  };
}

function error(input: PartnerErrorInput): SocialSourceError {
  return socialSourceError(input);
}

function readText(value: unknown): string | null {
  const cleaned = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return cleaned || null;
}

function readHttpsUrl(value: unknown): string | null {
  const text = readText(value);
  if (!text || !URL.canParse(text)) return null;
  const url = new URL(text);
  return url.protocol === "https:" ? url.toString() : null;
}

function readContentKind(value: unknown): ContentKind | null {
  switch (value) {
    case "photo":
    case "carousel":
    case "reel":
    case "video":
    case "story":
    case "lookbook":
      return value;
    default:
      return null;
  }
}

function readMediaKind(value: unknown): MediaAssetKind | null {
  switch (value) {
    case "image":
    case "video":
    case "embed":
      return value;
    default:
      return null;
  }
}

function readBoolean(value: unknown): boolean {
  return value === true || (typeof value === "string" && value.trim().toLowerCase() === "true");
}

function readTerritory(value: unknown): readonly string[] {
  const text = readText(value);
  if (!text) return [];
  return text.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
}

function isExpired(value: string | null, now: Date): boolean {
  if (!value) return false;
  const expiry = Date.parse(value);
  return Number.isFinite(expiry) && expiry <= now.getTime();
}
