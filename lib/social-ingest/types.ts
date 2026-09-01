import type { ContentKind, MediaAssetKind, SocialRights, SocialSourceKind, SocialSourceRecord } from "../types";

export type SocialSourceInput = {
  readonly rows?: readonly unknown[];
  readonly json?: string;
  readonly csv?: string;
};

export type SocialSourceErrorCode =
  | "malformed_json"
  | "malformed_csv"
  | "malformed_row"
  | "missing_external_id"
  | "missing_canonical_url"
  | "invalid_canonical_url"
  | "missing_media_url"
  | "invalid_media_url"
  | "invalid_content_kind"
  | "invalid_media_kind"
  | "missing_license_evidence"
  | "missing_territory"
  | "expired_license"
  | "takedown_requested"
  | "redistribution_disallowed"
  | "private_or_unsupported_url"
  | "oembed_failed";

export type SocialSourceError = {
  readonly kind: "quarantine";
  readonly rowNumber: number;
  readonly code: SocialSourceErrorCode;
  readonly field: string | null;
  readonly message: string;
};

export type SocialHostedMedia = {
  readonly kind: MediaAssetKind;
  readonly url: string;
};

export type SocialEmbed = {
  readonly html: string;
  readonly providerName: string;
  readonly providerUrl: string;
  readonly width: number | null;
  readonly height: number | null;
};

export type SocialSourceRecordItem = {
  readonly providerId: string;
  readonly title: string | null;
  readonly contentKind: ContentKind;
  readonly sourceRecord: SocialSourceRecord;
  readonly rights: SocialRights;
  readonly rightsTerritory: readonly string[];
  readonly takedown: boolean;
  readonly embed: SocialEmbed | null;
  readonly localMediaAssets: readonly SocialHostedMedia[];
  readonly commerceMatchJobs: readonly never[];
};

export type SocialSourceRowResult =
  | { readonly kind: "accepted"; readonly rowNumber: number; readonly record: SocialSourceRecordItem }
  | { readonly kind: "quarantine"; readonly rowNumber: number; readonly error: SocialSourceError };

export type SocialSourcePage = {
  readonly source: SocialSourceKind;
  readonly provider: string;
  readonly records: readonly SocialSourceRecordItem[];
  readonly rowResults: readonly SocialSourceRowResult[];
  readonly errors: readonly SocialSourceError[];
};

export interface SocialSourceAdapter {
  readonly source: SocialSourceKind;
  readonly provider: string;
  fetchPage(): Promise<SocialSourcePage>;
}

export type SocialOEmbedResponse = {
  readonly html: string;
  readonly provider_name: string;
  readonly provider_url: string;
  readonly type: string;
  readonly version: string;
  readonly width?: number;
  readonly height?: number;
  readonly title?: string;
  readonly author_name?: string;
  readonly author_url?: string;
  readonly thumbnail_url?: string;
};

export type SocialOEmbedRequest = (url: URL) => Promise<SocialOEmbedResponse>;
