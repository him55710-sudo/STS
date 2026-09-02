import type { SocialMediaAsset } from "./types";

export type VideoPlaybackSource =
  | { readonly kind: "native"; readonly src: string }
  | { readonly kind: "injected-hls"; readonly manifestUrl: string; readonly fallbackSrc: string }
  | { readonly kind: "poster"; readonly posterUrl: string; readonly reason: "image_asset" | "missing_video_source" };

export type VideoPlaybackSourceInput = {
  readonly asset: SocialMediaAsset;
  readonly canPlayNativeHls: boolean;
  readonly injectedHlsSupported: boolean;
};

export type InjectedHlsInstance = {
  readonly loadSource: (source: string) => void;
  readonly attachMedia: (video: HTMLVideoElement) => void;
  readonly destroy: () => void;
};

export type InjectedHlsConstructor = {
  readonly isSupported: () => boolean;
  new(): InjectedHlsInstance;
};

declare global {
  var Hls: InjectedHlsConstructor | undefined;
}

export function selectVideoPlaybackSource(input: VideoPlaybackSourceInput): VideoPlaybackSource {
  if (input.asset.kind !== "video") {
    return { kind: "poster", posterUrl: input.asset.url, reason: "image_asset" };
  }

  if (input.canPlayNativeHls && input.asset.manifest?.kind === "hls") {
    return { kind: "native", src: input.asset.manifest.url };
  }

  if (input.injectedHlsSupported && input.asset.manifest?.kind === "hls") {
    return { kind: "injected-hls", manifestUrl: input.asset.manifest.url, fallbackSrc: input.asset.url };
  }

  if (input.asset.url.trim().length > 0) return { kind: "native", src: input.asset.url };

  return { kind: "poster", posterUrl: input.asset.poster?.url ?? "", reason: "missing_video_source" };
}

export function supportsInjectedHls(): boolean {
  return globalThis.Hls?.isSupported() ?? false;
}

export function attachVideoPlayback(video: HTMLVideoElement, source: VideoPlaybackSource): (() => void) | null {
  switch (source.kind) {
    case "native":
      video.src = source.src;
      return null;
    case "injected-hls": {
      const HlsConstructor = globalThis.Hls;
      if (!HlsConstructor?.isSupported()) {
        video.src = source.fallbackSrc;
        return null;
      }
      const hls = new HlsConstructor();
      hls.loadSource(source.manifestUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    case "poster":
      video.removeAttribute("src");
      return null;
    default:
      return assertNever(source);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled video playback source: ${JSON.stringify(value)}`);
}
