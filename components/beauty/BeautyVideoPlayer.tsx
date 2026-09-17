"use client";

import Image from "next/image";
import type { BeautyLook, BeautyRegion } from "@/lib/beauty/types";
import type { BeautyVideoController } from "@/hooks/useBeautyVideoController";
import { BeautyRegionOverlay } from "./BeautyRegionOverlay";

export type BeautyVideoPlayerProps = {
  readonly look: BeautyLook;
  readonly controller: BeautyVideoController;
  readonly processRevealed: boolean;
  readonly onRevealProcess: () => void;
  readonly onSelectRegion?: (region: BeautyRegion) => void;
};

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M8 5.6v12.8L18 12 8 5.6Z" />
    </svg>
  );
}

function PauseMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
    </svg>
  );
}

export function BeautyVideoPlayer({
  look,
  controller,
  processRevealed,
  onRevealProcess,
  onSelectRegion,
}: BeautyVideoPlayerProps) {
  const { status, activeStep, videoHandlers } = controller;
  const hasSource = look.videoSrc.trim().length > 0;
  const isVideoFile = look.videoSrc.endsWith(".mp4") || look.videoSrc.endsWith(".webm");

  const playbackReady =
    status !== "loading" &&
    status !== "media-unavailable" &&
    status !== "segment-unavailable";

  const handlePrimaryAction = () => {
    if (!processRevealed) {
      onRevealProcess();
      return;
    }
    controller.togglePlayback();
  };

  const actionLabel = !processRevealed
    ? "메이크업 과정 타임라인 보기"
    : controller.isPlaying
      ? "영상 일시정지"
      : playbackReady
        ? "영상 재생"
        : "영상 재생 정보 준비 중";

  const showStepProgress =
    activeStep !== null &&
    (status === "step-playing" || status === "paused" || status === "step-complete");

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-beauty-veil text-white select-none">
      {/* Background Media (Video or Fallback Poster Image) */}
      {isVideoFile ? (
        <video
          ref={controller.videoRef}
          width={390}
          height={844}
          poster={look.posterSrc}
          muted
          playsInline
          preload="metadata"
          aria-label={`${look.creatorName}의 메이크업 영상`}
          className="h-full w-full object-cover"
          onLoadedMetadata={videoHandlers.onLoadedMetadata}
          onTimeUpdate={videoHandlers.onTimeUpdate}
          onPlay={videoHandlers.onPlay}
          onPause={videoHandlers.onPause}
          onError={videoHandlers.onError}
          onEnded={videoHandlers.onEnded}
        >
          {hasSource && <source src={look.videoSrc} type="video/mp4" />}
          이 브라우저에서는 영상을 재생할 수 없습니다.
        </video>
      ) : (
        <div className="relative h-full w-full">
          <Image
            src={look.posterSrc}
            alt={`${look.creatorName}의 메이크업 룩`}
            fill
            priority
            sizes="390px"
            className="object-cover"
          />
        </div>
      )}

      {/* Interactive Facial Region Overlay (PDF 13p 1번, 2번: 부위 터치) */}
      <BeautyRegionOverlay
        step={activeStep}
        allSteps={look.steps}
        visible={true}
        onSelectRegion={(region) => {
          if (!processRevealed) onRevealProcess();
          if (onSelectRegion) onSelectRegion(region);
        }}
      />

      {/* Default Bottom Creator Bio Info before step is selected */}
      {activeStep === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/90 via-black/40 to-transparent px-4 pb-6 pt-24">
          <div className="flex items-center gap-2.5">
            {look.avatar !== null ? (
              <Image
                src={look.avatar}
                alt={`${look.creatorName} 프로필`}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-white/40 object-cover shadow"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white tracking-wide">{look.creatorHandle}</p>
              <p className="truncate text-[11px] text-white/70">{look.creatorName} · K-Beauty Creator</p>
            </div>
          </div>
          <p className="mt-2.5 line-clamp-2 max-w-[95%] text-xs leading-relaxed text-white/90 font-medium">
            {look.caption}
          </p>
        </div>
      )}

      {/* Primary Clickable Backdrop (Reveal or Play/Pause) */}
      <button
        type="button"
        aria-label={actionLabel}
        onClick={handlePrimaryAction}
        className="absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="sr-only">{actionLabel}</span>
        {processRevealed && (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100">
            {controller.isPlaying ? <PauseMark /> : <PlayMark />}
          </span>
        )}
      </button>

      {/* Reveal Hint on Initial Load (PDF 13p 1번) */}
      {!processRevealed && (
        <div className="pointer-events-none absolute inset-x-5 bottom-28 z-30 flex flex-col items-center text-center">
          <span className="rounded-full bg-black/75 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur-md border border-white/20 animate-pulse">
            👆 얼굴의 입술·볼·눈을 터치해 사용 과정을 확인하세요
          </span>
        </div>
      )}

      {/* Step Progress Bar on Top */}
      {showStepProgress && (
        <div className="absolute inset-x-0 top-0 z-30 h-1 bg-white/20">
          <div
            className="h-full bg-beauty transition-all duration-100 ease-linear shadow-[0_0_8px_#FF2D78]"
            style={{ width: `${Math.round(controller.progress * 100)}%` }}
          />
        </div>
      )}
    </section>
  );
}
