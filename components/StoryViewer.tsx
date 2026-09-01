"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { creatorById } from "@/lib/catalog";
import { getManualStoryIndex } from "@/lib/stories";
import type { Story, StoryDirection } from "@/lib/stories";
import Avatar from "./Avatar";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "./Icons";

type StoryViewerProps = {
  readonly stories: readonly Story[];
  readonly initialIndex: number;
  readonly onClose: () => void;
};

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, stories.length - 1))
  );
  const activeStory = stories[activeIndex];

  const moveStory = useCallback((direction: StoryDirection) => {
    setActiveIndex((currentIndex) =>
      getManualStoryIndex({ currentIndex, direction, storyCount: stories.length })
    );
  }, [stories.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          moveStory("previous");
          break;
        case "ArrowRight":
          moveStory("next");
          break;
        case "Escape":
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveStory, onClose]);

  if (!activeStory) return null;

  const creator = creatorById(activeStory.creatorId);
  const atFirstStory = activeIndex === 0;
  const atLastStory = activeIndex === stories.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 px-3 py-4" role="dialog" aria-modal="true" aria-label="스토리 보기">
      <section className="relative flex h-full max-h-[780px] w-full max-w-[430px] overflow-hidden rounded-(--radius-sheet) bg-ink text-white shadow-[0_16px_48px_rgba(17,18,20,0.38)]">
        <Image
          src={activeStory.image}
          alt={`${creator.name}의 스토리: ${activeStory.title}`}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 430px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-3">
          {stories.map((story, index) => (
            <span
              key={story.id}
              className={`h-0.5 flex-1 rounded-full ${index <= activeIndex ? "bg-white" : "bg-white/35"}`}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 z-[5] h-40 bg-linear-to-b from-black/60 to-transparent" />
        <header className="absolute inset-x-0 top-0 z-30 flex items-center gap-2.5 px-4 pt-7">
          <Avatar creator={creator} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{creator.handle}</p>
            <p className="mt-0.5 text-[11px] text-white/70">{activeStory.postedLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="스토리 닫기"
            className="press flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm"
          >
            <XIcon size={18} />
          </button>
        </header>

        <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/75 via-black/20 to-transparent px-5 pb-6 pt-20">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/70">{activeStory.category.toUpperCase()}</p>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight">{activeStory.title}</h2>
          <p className="mt-1 text-[14px] text-white/85">{activeStory.subtitle}</p>
          <p className="mt-4 inline-flex rounded-full border border-white/30 bg-black/20 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm">
            상품 태그 {activeStory.productCount}개
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/65">자동으로 넘어가지 않아요. 화면 양쪽을 눌러 직접 이동하세요.</p>
        </div>

        <button
          type="button"
          onClick={() => moveStory("previous")}
          aria-label="이전 스토리"
          disabled={atFirstStory}
          className="absolute inset-y-0 left-0 z-20 w-[36%] disabled:cursor-default"
        >
          <span className="sr-only">이전 스토리</span>
          {!atFirstStory && (
            <span className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:opacity-100">
              <ChevronLeftIcon size={18} />
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => moveStory("next")}
          aria-label="다음 스토리"
          disabled={atLastStory}
          className="absolute inset-y-0 right-0 z-20 w-[64%] disabled:cursor-default"
        >
          <span className="sr-only">다음 스토리</span>
          {!atLastStory && (
            <span className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white opacity-0 transition-opacity hover:opacity-100">
              <ChevronRightIcon size={18} />
            </span>
          )}
        </button>
      </section>
    </div>
  );
}
