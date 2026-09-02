"use client";

import { useEffect, useState } from "react";
import type { MediaFrame } from "./mixed-feed-logic";

export function MediaBox({ frame, caption }: { readonly frame: MediaFrame; readonly caption: string }) {
  return (
    <div
      className="grid w-full place-items-center overflow-hidden bg-surface-2"
      style={{ aspectRatio: frame.aspectRatio }}
    >
      <MediaFrameView frame={frame} caption={caption} />
    </div>
  );
}
function MediaFrameView({ frame, caption }: { readonly frame: MediaFrame; readonly caption: string }) {
  const [playable, setPlayable] = useState(true);

  useEffect(() => {
    setPlayable(true);
  }, [mediaKey(frame)]);

  switch (frame.kind) {
    case "image":
      return <img src={frame.src} alt={caption} className="h-full w-full object-cover" loading="lazy" />;
    case "video":
      return playable ? (
        <video
          src={frame.src}
          poster={frame.poster}
          aria-label={caption}
          className="h-full w-full object-cover"
          controls
          muted
          playsInline
          preload="metadata"
          onError={() => setPlayable(false)}
        />
      ) : (
        <PosterFallback poster={frame.poster} caption={caption} label="동영상 미리보기만 표시 중" />
      );
    case "embed":
      return (
        <iframe
          src={frame.src}
          title={caption}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    case "fallback":
      return <FallbackCopy label={frame.label} />;
    default:
      return assertNever(frame);
  }
}

function PosterFallback({
  poster,
  caption,
  label,
}: {
  readonly poster: string;
  readonly caption: string;
  readonly label: string;
}) {
  return (
    <div className="relative h-full w-full">
      <img src={poster} alt={caption} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-x-4 bottom-4 rounded-(--radius-btn) bg-ink/72 px-3 py-2 text-center text-[12px] font-semibold text-white backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

function FallbackCopy({ label }: { readonly label: string }) {
  return <p className="px-6 text-center text-[13px] font-medium text-ink-2">{label}</p>;
}

function mediaKey(frame: MediaFrame): string {
  switch (frame.kind) {
    case "image":
    case "embed":
      return `${frame.kind}:${frame.src}`;
    case "video":
      return `video:${frame.src}:${frame.poster}`;
    case "fallback":
      return `fallback:${frame.label}:${frame.aspectRatio}`;
    default:
      return assertNever(frame);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled media frame variant: ${JSON.stringify(value)}`);
}
