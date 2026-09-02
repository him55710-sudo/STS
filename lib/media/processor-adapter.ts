import type { MediaAssetRecord, MediaUploadMimeType } from "./types";

export type MediaDimensions = {
  readonly width: number;
  readonly height: number;
};

export type MediaVariantStorageMetadata = {
  readonly url: string;
  readonly storagePath: string;
  readonly mimeType: string;
  readonly bytes: number;
};

export type OriginalVariantMetadata = MediaVariantStorageMetadata & {
  readonly kind: "original";
  readonly mimeType: MediaUploadMimeType;
  readonly dimensions: MediaDimensions;
  readonly durationMs: number | null;
};

export type PosterVariantMetadata = MediaVariantStorageMetadata & {
  readonly kind: "poster";
  readonly mimeType: "image/jpeg" | "image/png" | "image/webp";
  readonly dimensions: MediaDimensions;
};

export type HlsVariantMetadata = {
  readonly width: number;
  readonly height: number;
  readonly bandwidth: number;
  readonly playlistUrl: string;
};

export type HlsManifestMetadata = {
  readonly kind: "hls";
  readonly url: string;
  readonly variants: readonly HlsVariantMetadata[];
};

export type ModerationRiskDecision =
  | {
      readonly kind: "approved";
      readonly riskScore: number;
      readonly labels: readonly string[];
      readonly sampledFramesMs: readonly number[];
    }
  | {
      readonly kind: "review";
      readonly riskScore: number;
      readonly labels: readonly string[];
      readonly sampledFramesMs: readonly number[];
      readonly reason: string;
    }
  | {
      readonly kind: "blocked";
      readonly riskScore: number;
      readonly labels: readonly string[];
      readonly sampledFramesMs: readonly number[];
      readonly reason: string;
    };

export type MediaProcessingOutput = {
  readonly original: OriginalVariantMetadata;
  readonly poster: PosterVariantMetadata | null;
  readonly hls: HlsManifestMetadata | null;
  readonly moderation: ModerationRiskDecision;
};

export interface MediaProcessorAdapter {
  process(asset: MediaAssetRecord): Promise<MediaProcessingOutput>;
}

export type MediaProcessorFactoryOptions = {
  readonly processor: MediaProcessorAdapter | null | undefined;
};

export class MediaProcessorConfigurationError extends Error {
  readonly name = "MediaProcessorConfigurationError";

  constructor() {
    super("A real media processor must be configured before media processing can start");
  }
}

export function createMediaProcessorAdapter(options: MediaProcessorFactoryOptions): MediaProcessorAdapter {
  const processor = options.processor;
  if (!processor) throw new MediaProcessorConfigurationError();

  return {
    process: (asset) => processor.process(asset),
  };
}

export function createDeterministicMediaProcessorAdapter(output: MediaProcessingOutput): MediaProcessorAdapter {
  return {
    async process(): Promise<MediaProcessingOutput> {
      return output;
    },
  };
}
