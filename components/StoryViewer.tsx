"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CREATORS } from "@/lib/catalog";
import { getManualStoryIndex } from "@/lib/stories";
import type { Story, StoryDirection } from "@/lib/stories";
import type { MediaObjectTag, SocialMediaAsset } from "@/lib/types";
import { attachVideoPlayback, selectVideoPlaybackSource, supportsInjectedHls } from "@/lib/video-playback";
import Avatar from "./Avatar";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "./Icons";
import SocialObjectTagSheet from "./SocialObjectTagSheet";

export const STORY_IMAGE_DURATION_MS = 5_000;

type StoryViewerProps = { readonly stories: readonly Story[]; readonly initialIndex: number; readonly onClose: () => void; readonly onSeen?: (storyId: string) => void };
type SwipeStart = { readonly x: number; readonly y: number };
type AutoAdvanceInput = { readonly paused: boolean; readonly mediaErrored: boolean; readonly reducedMotion: boolean };

export function getStoryPlaybackDurationMs(asset: SocialMediaAsset): number {
  return asset.durationMs && asset.durationMs > 0 ? asset.durationMs : STORY_IMAGE_DURATION_MS;
}

export function shouldAutoAdvanceStory(input: AutoAdvanceInput): boolean {
  return !input.paused && !input.mediaErrored && !input.reducedMotion;
}

function primaryStoryAsset(story: Story): SocialMediaAsset {
  const firstAsset = story.assets[0];
  if (firstAsset) return firstAsset;
  return { id: `asset-${story.id}`, order: 0, kind: "image", url: story.image, dimensions: { width: 1080, height: 1920 }, poster: null, durationMs: null, manifest: null, objectTags: [] };
}

function useNativeHlsSupport(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const video = document.createElement("video");
    setSupported(Boolean(video.canPlayType("application/vnd.apple.mpegurl") || video.canPlayType("application/x-mpegURL")));
  }, []);

  return supported;
}

function useInjectedHlsSupport(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(supportsInjectedHls());
  }, []);

  return supported;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

export default function StoryViewer({ stories, initialIndex, onClose, onSeen }: StoryViewerProps) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, Math.min(initialIndex, stories.length - 1)));
  const [progress, setProgress] = useState(0);
  const [pressedPaused, setPressedPaused] = useState(false);
  const [visibilityPaused, setVisibilityPaused] = useState(false);
  const [mediaErrored, setMediaErrored] = useState(false);
  const [selectedObject, setSelectedObject] = useState<MediaObjectTag | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef(0);
  const swipeStartRef = useRef<SwipeStart | null>(null);
  const swipedRef = useRef(false);
  const canPlayNativeHls = useNativeHlsSupport();
  const injectedHlsSupported = useInjectedHlsSupport();
  const reducedMotion = usePrefersReducedMotion();
  const activeStory = stories[activeIndex];
  const activeAsset = useMemo(() => activeStory ? primaryStoryAsset(activeStory) : null, [activeStory]);
  const paused = pressedPaused || visibilityPaused || reducedMotion;

  const moveStory = useCallback((direction: StoryDirection) => {
    setProgress(0);
    progressRef.current = 0;
    setMediaErrored(false);
    setActiveIndex((currentIndex) => getManualStoryIndex({ currentIndex, direction, storyCount: stories.length }));
  }, [stories.length]);

  const moveNext = useCallback(() => {
    if (activeIndex >= stories.length - 1) { onClose(); return; }
    moveStory("next");
  }, [activeIndex, moveStory, onClose, stories.length]);

  useEffect(() => {
    if (activeStory) onSeen?.(activeStory.id);
  }, [activeStory, onSeen]);

  useEffect(() => {
    setSelectedObject(null);
  }, [activeStory?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          moveStory("previous"); break;
        case "ArrowRight":
          moveNext(); break;
        case " ":
        case "Spacebar":
          event.preventDefault(); setPressedPaused((current) => !current); break;
        case "Escape":
          onClose(); break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveNext, moveStory, onClose]);

  useEffect(() => {
    const onVisibilityChange = () => setVisibilityPaused(document.visibilityState !== "visible");
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!activeAsset || !shouldAutoAdvanceStory({ paused, mediaErrored, reducedMotion })) return;
    const durationMs = getStoryPlaybackDurationMs(activeAsset);
    const startedAt = Date.now() - progressRef.current * durationMs;
    const timer = window.setInterval(() => {
      const nextProgress = Math.min(1, (Date.now() - startedAt) / durationMs);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (nextProgress >= 1) { window.clearInterval(timer); moveNext(); }
    }, 80);
    return () => window.clearInterval(timer);
  }, [activeAsset, mediaErrored, moveNext, paused, reducedMotion]);

  const playbackSource = useMemo(
    () => activeAsset ? selectVideoPlaybackSource({ asset: activeAsset, canPlayNativeHls, injectedHlsSupported }) : null,
    [activeAsset, canPlayNativeHls, injectedHlsSupported],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playbackSource === null || playbackSource.kind === "poster") return;
    return attachVideoPlayback(video, playbackSource) ?? undefined;
  }, [playbackSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || activeAsset?.kind !== "video") return;
    if (paused || mediaErrored) {
      video.pause();
      return;
    }
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") return;
        setMediaErrored(true);
      });
    }
  }, [activeAsset, mediaErrored, paused]);

  if (!activeStory || !activeAsset) return null;

  const creator = CREATORS.find((candidate) => candidate.id === activeStory.creatorId);
  const atFirstStory = activeIndex === 0;
  const storyCreator = activeStory.creator ?? creator;
  if (!storyCreator) return null;
  const videoRenderable = activeAsset.kind === "video" && playbackSource?.kind !== "poster";
  const fallbackImage = activeAsset.kind === "video" ? activeAsset.poster?.url ?? activeStory.image : activeAsset.url;
  const disclosure = activeStory.disclosure.label ?? (activeStory.disclosure.kind === "none" ? "Demo fixture" : activeStory.disclosure.kind);
  const attribution = `${activeStory.sourceRecord.provider} · ${activeStory.sourceRecord.identity}`;
  const rights = activeStory.rights.evidence ?? `${activeStory.rights.kind} · ${activeStory.rights.status}`;
  const objectTags = activeAsset.objectTags;

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    setPressedPaused(true);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    setPressedPaused(false);
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) <= 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    swipedRef.current = true;
    if (deltaX > 0) { moveStory("previous"); return; }
    moveNext();
  };

  const handleTap = (direction: StoryDirection) => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (direction === "next") { moveNext(); return; }
    moveStory("previous");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 px-3 py-4" role="dialog" aria-modal="true" aria-label="스토리 보기">
      <section
        className="relative flex h-full max-h-[780px] w-full max-w-[430px] touch-pan-y overflow-hidden rounded-(--radius-sheet) bg-ink text-white shadow-[0_16px_48px_rgba(17,18,20,0.38)]"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        data-story-id={activeStory.id}
        data-testid="story-viewer"
        onPointerDown={handlePointerDown}
        onPointerCancel={() => setPressedPaused(false)}
        onPointerUp={handlePointerUp}
      >
        {videoRenderable ? (
          <video
            ref={videoRef}
            key={`${activeStory.id}-${playbackSource?.kind}`}
            poster={activeAsset.poster?.url ?? activeStory.image}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            onEnded={() => {
              if (!reducedMotion) moveNext();
            }}
            onError={() => setMediaErrored(true)}
          />
        ) : (
          <Image
            key={activeStory.id}
            src={fallbackImage}
            alt={`${storyCreator.name}의 스토리: ${activeStory.title}`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 430px"
            className="object-cover"
            onError={() => setMediaErrored(true)}
          />
        )}
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3">
          {stories.map((story, index) => {
            const width = index < activeIndex ? 100 : index === activeIndex ? Math.round(progress * 100) : 0;
            return (
              <span key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  className={`block h-full bg-white ${reducedMotion ? "" : "transition-[width] duration-75 ease-linear"}`}
                  data-testid={index === activeIndex ? "story-progress-active" : undefined}
                  style={{ width: `${width}%` }}
                />
              </span>
            );
          })}
        </div>
        <div className="absolute inset-x-0 top-0 z-[5] h-40 bg-linear-to-b from-black/60 to-transparent" />
        <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-2.5 px-4 pt-7">
          <Avatar creator={storyCreator} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{storyCreator.handle}</p>
            <p className="mt-0.5 text-[11px] text-white/70">{activeStory.postedLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="스토리 닫기" className="press flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm">
            <XIcon size={18} />
          </button>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/75 via-black/20 to-transparent px-5 pb-6 pt-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">{activeStory.category}</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight">{activeStory.title}</h2>
          <p className="mt-1 text-[14px] text-white/85">{activeStory.subtitle}</p>
          <p className="mt-4 inline-flex rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm">
            상품 태그 {activeStory.productCount}개
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {objectTags.map((object) => (
              <button
                key={object.id}
                type="button"
                onClick={() => setSelectedObject(object)}
                className="press rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm"
              >
                {object.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-white/65">
            {disclosure} · {attribution} · {rights}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/65">
            {mediaErrored ? "미디어를 불러오지 못했어요. 다음 스토리로 넘어갈 수 있어요." : reducedMotion ? "움직임 줄이기 설정으로 자동 진행을 멈췄어요. 좌우 탭과 키보드로 이동해요." : "길게 누르면 일시정지, 좌우 탭과 스와이프로 이동해요."}
          </p>
        </div>

        <button type="button" onClick={() => handleTap("previous")} aria-label="이전 스토리" disabled={atFirstStory} className="absolute inset-y-0 left-0 z-20 w-[36%] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80 disabled:cursor-default">
          <span className="sr-only">이전 스토리</span>
          {!atFirstStory && <span className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:opacity-100"><ChevronLeftIcon size={18} /></span>}
        </button>
        <button type="button" onClick={() => handleTap("next")} aria-label="다음 스토리" className="absolute inset-y-0 right-0 z-20 w-[64%] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80">
          <span className="sr-only">다음 스토리</span>
          <span className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:opacity-100"><ChevronRightIcon size={18} /></span>
        </button>
      </section>
      {selectedObject && (
        <SocialObjectTagSheet
          surfaceId={activeStory.id}
          object={selectedObject}
          disclosure={disclosure}
          attribution={attribution}
          rights={rights}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </div>
  );
}
