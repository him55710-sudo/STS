"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CREATORS } from "@/lib/catalog";
import { compact } from "@/lib/format";
import type { Creator, MediaObjectTag } from "@/lib/types";
import { attachVideoPlayback, selectVideoPlaybackSource, supportsInjectedHls } from "@/lib/video-playback";
import Avatar from "@/components/Avatar";
import { ArrowUpRightIcon, BagIcon, ChevronLeftIcon, HeartIcon } from "@/components/Icons";
import SocialObjectTagSheet from "@/components/SocialObjectTagSheet";
import { getExactReelPurchaseTarget, REELS, type ReelItem } from "./reel-data";

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

function ReelCard({ reel }: { readonly reel: ReelItem }) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  const [selectedObject, setSelectedObject] = useState<MediaObjectTag | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const canPlayNativeHls = useNativeHlsSupport();
  const injectedHlsSupported = useInjectedHlsSupport();
  const creator = CREATORS.find((candidate) => candidate.id === reel.creatorId) ?? fallbackCreatorForReel(reel);
  const purchaseTarget = getExactReelPurchaseTarget(reel);
  const posterUrl = reel.media.poster?.url ?? "/media/fallback-poster.svg";
  const playbackSource = useMemo(
    () => selectVideoPlaybackSource({ asset: reel.media, canPlayNativeHls, injectedHlsSupported }),
    [canPlayNativeHls, injectedHlsSupported, reel.media],
  );
  const videoRenderable = reel.media.kind === "video" && playbackSource.kind !== "poster";

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.65)),
      { threshold: [0.35, 0.65] },
    );
    observer.observe(article);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playbackSource.kind === "poster") return;
    return attachVideoPlayback(video, playbackSource) ?? undefined;
  }, [playbackSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!visible || broken) {
      video.pause();
      return;
    }
    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "NotAllowedError") return;
        setBroken(true);
      });
    }
  }, [broken, visible]);

  return (
    <article ref={articleRef} className="relative h-dvh snap-start overflow-hidden bg-ink text-white" aria-label={`${creator.handle} 릴`}>
      <Image src={posterUrl} alt="" aria-hidden fill priority sizes="100vw" className="object-cover" />
      {videoRenderable ? (
        <video
          ref={videoRef}
          poster={posterUrl}
          muted
          playsInline
          loop
          preload="metadata"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${ready && !broken ? "opacity-100" : "opacity-0"}`}
          onCanPlay={() => setReady(true)}
          onError={() => setBroken(true)}
        />
      ) : null}
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/35" />
      <div className="absolute inset-x-0 bottom-0 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-24">
        {broken && (
          <p className="mb-3 inline-flex rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm">
            미디어를 불러오지 못했어요. 포스터로 내용을 확인할 수 있어요.
          </p>
        )}
        <div className="flex items-center gap-2.5">
          <Avatar creator={creator} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold">{creator.handle}</p>
            <p className="text-[11px] text-white/65">{reel.sourceLabel}</p>
          </div>
        </div>
        <h1 className="mt-4 max-w-[330px] text-[26px] font-extrabold leading-tight">{reel.title}</h1>
        <p className="mt-2 max-w-[350px] text-[14px] leading-relaxed text-white/86">{reel.caption}</p>
        <div className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-white/75">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 backdrop-blur-sm">
            <HeartIcon size={14} filled /> {compact(reel.likes)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-3 py-1.5 backdrop-blur-sm">
            <BagIcon size={14} /> 정확 태그 {reel.objects.filter((object) => object.exactness === "exact").length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {reel.objects.map((object) => (
            <button
              key={object.id}
              type="button"
              onClick={() => setSelectedObject(object)}
              className="press rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm"
            >
              {object.label}
            </button>
          ))}
        </div>
        <p className="mt-3 max-w-[350px] text-[10.5px] leading-relaxed text-white/66">
          {reel.disclosure} · {reel.attribution} · {reel.rights}
        </p>
        {purchaseTarget ? (
          <a href={purchaseTarget.href} target="_blank" rel="noreferrer" className="press mt-5 inline-flex h-12 items-center gap-2 rounded-(--radius-btn) bg-white px-4 text-[13px] font-extrabold text-ink">
            {purchaseTarget.productName}
            <ArrowUpRightIcon size={15} strokeWidth={2} />
          </a>
        ) : (
          <p className="mt-5 max-w-[320px] text-[11px] leading-relaxed text-white/60">
            검증된 exact 구매 경로가 있는 상품만 CTA를 표시합니다.
          </p>
        )}
      </div>
      {selectedObject && (
        <SocialObjectTagSheet
          surfaceId={reel.id}
          object={selectedObject}
          disclosure={reel.disclosure}
          attribution={reel.attribution}
          rights={reel.rights}
          onClose={() => setSelectedObject(null)}
        />
      )}
    </article>
  );
}

function fallbackCreatorForReel(reel: ReelItem): Creator {
  return {
    id: reel.creatorId,
    handle: reel.creatorId,
    name: reel.creatorId,
    bio: "Repository creator",
    followers: 0,
    category: "fashion",
    tone: "#5B556E",
    avatarImage: reel.media.poster?.url ?? reel.media.url,
  };
}

export default function ReelsPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-ink text-white">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
        <Link href="/feed" aria-label="피드로 돌아가기" className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm">
          <ChevronLeftIcon size={21} />
        </Link>
        <p className="rounded-full bg-black/25 px-3 py-1.5 text-[12px] font-bold backdrop-blur-sm">Reels</p>
      </header>
      <main data-testid="reel-feed" className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth">
        {REELS.map((reel) => <ReelCard key={reel.id} reel={reel} />)}
      </main>
    </div>
  );
}
