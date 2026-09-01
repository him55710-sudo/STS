"use client";

import type { BeautyLook } from "@/lib/beauty/types";
import type { BeautyVideoController } from "@/hooks/useBeautyVideoController";
import { BeautyRegionOverlay } from "./BeautyRegionOverlay";

export type BeautyVideoPlayerProps = {
  readonly look: BeautyLook;
  readonly controller: BeautyVideoController;
  readonly processRevealed: boolean;
  readonly onRevealProcess: () => void;
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
}: BeautyVideoPlayerProps) {
  const { status, activeStep, videoHandlers } = controller;
  const hasSource = look.videoSrc.trim().length > 0;
  const playbackReady = status !== "loading"
    && status !== "media-unavailable"
    && status !== "segment-unavailable";
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
  const showStepProgress = activeStep !== null
    && (status === "step-playing" || status === "paused" || status === "step-complete");

  return (
    <section className="relative h-full min-h-0 overflow-hidden bg-beauty-veil text-white">
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

      <BeautyRegionOverlay
        step={activeStep}
        visible={processRevealed && activeStep !== null}
      />

      {activeStep === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-ink/85 via-ink/25 to-transparent px-4 pb-5 pt-24">
          <div className="flex items-center gap-2.5">
            {look.avatar !== null ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={look.avatar}
                alt={`${look.creatorName} 프로필`}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full border border-white/30 object-cover"
              />
            ) : (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-ink/35 text-white/75"
                role="img"
                aria-label="크리에이터 프로필 이미지 준비 중"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20c.5-4 3-6 6.5-6s6 2 6.5 6" />
                </svg>
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-white">{look.creatorHandle}</p>
              <p className="truncate text-[10px] text-white/65">{look.creatorName}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 max-w-[92%] text-[12px] leading-relaxed text-white/90">
            {look.caption}
          </p>
        </div>
      )}

      <button
        type="button"
        aria-label={actionLabel}
        disabled={processRevealed && !playbackReady}
        onClick={handlePrimaryAction}
        className="absolute inset-0 z-20 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white disabled:cursor-not-allowed"
      >
        <span className="sr-only">{actionLabel}</span>
        {processRevealed && playbackReady && (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/35 text-white opacity-0 backdrop-blur-sm transition-opacity duration-[240ms] hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none">
            {controller.isPlaying ? <PauseMark /> : <PlayMark />}
          </span>
        )}
      </button>

      {!processRevealed && (
        <p className="pointer-events-none absolute inset-x-5 bottom-28 z-30 text-center text-[12px] font-semibold text-white/85">
          화면을 눌러 큐레이션된 과정 구조를 확인하세요
        </p>
      )}

      {showStepProgress && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-30 rounded-(--radius-btn) bg-ink/45 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[11px] font-semibold">
              STEP {activeStep.order ?? "—"} · {activeStep.region.toUpperCase()}
            </p>
            <span className="shrink-0 text-[10px] text-white/75">
              {Math.round(controller.progress * 100)}%
            </span>
          </div>
          <p className="mt-1 truncate text-[12px] text-white/85">{activeStep.label}</p>
          <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-white/25">
            <span
              className="block h-full origin-left bg-beauty"
              style={{ transform: `scaleX(${controller.progress})` }}
            />
          </span>
        </div>
      )}

      {controller.unavailableMessage !== null && (
        <div
          className="pointer-events-none absolute inset-x-5 top-1/2 z-40 -translate-y-1/2 rounded-(--radius-card) border border-white/15 bg-beauty-veil/85 px-4 py-4 text-center backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <p className="text-[13px] font-semibold">재생 정보 준비 중</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/70">
            {controller.unavailableMessage}
          </p>
          {status === "media-unavailable" && hasSource && (
            <button
              type="button"
              onClick={controller.reset}
              className="pointer-events-auto mt-3 min-h-11 rounded-(--radius-btn) border border-white/25 px-4 text-[12px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-white"
              aria-label="영상 다시 불러오기"
            >
              다시 불러오기
            </button>
          )}
        </div>
      )}
    </section>
  );
}
