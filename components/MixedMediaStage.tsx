"use client";

import { useMemo, useState } from "react";
import type { ObjectTag, Post } from "@/lib/types";
import { MixedFeedCarouselControls } from "./MixedFeedCarouselControls";
import { MediaBox } from "./MixedMediaFrame";
import {
  disclosureLabel,
  displayableAssetsForPost,
  resolveCarouselSlide,
  resolveMediaFrame,
} from "./MixedMediaFeed";
import ObjectLayer from "./ObjectLayer";

export default function MixedMediaStage({
  post,
  selectedId,
  onSelect,
}: {
  readonly post: Post;
  readonly selectedId: string | null;
  readonly onSelect: (object: ObjectTag | null) => void;
}) {
  const assets = useMemo(() => displayableAssetsForPost(post), [post]);
  const [activeIndex, setActiveIndex] = useState(0);
  const boundedIndex = Math.min(activeIndex, Math.max(assets.length - 1, 0));
  const activeSlide = resolveCarouselSlide(post, boundedIndex);
  const frame = activeSlide?.frame ?? resolveMediaFrame(undefined, post);
  const tags = activeSlide?.tags ?? [];
  const showCarouselControls = assets.length > 1;

  const moveSlide = (nextIndex: number) => {
    setActiveIndex(Math.min(Math.max(nextIndex, 0), Math.max(assets.length - 1, 0)));
    onSelect(null);
  };

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (!showCarouselControls) return;
        if (event.key === "ArrowLeft") moveSlide(activeIndex - 1);
        if (event.key === "ArrowRight") moveSlide(activeIndex + 1);
      }}
    >
      <ObjectLayer postId={post.id} objects={[...tags]} selectedId={selectedId} onSelect={onSelect}>
        <MediaBox frame={frame} caption={post.caption} />
      </ObjectLayer>

      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        <span className="rounded-(--radius-btn) bg-ink/70 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm">
          {frame.label}
        </span>
        <span className="rounded-(--radius-btn) bg-surface/85 px-2 py-1 text-[10.5px] font-semibold text-ink backdrop-blur-sm">
          {disclosureLabel(post)}
        </span>
      </div>

      {showCarouselControls && (
        <MixedFeedCarouselControls activeIndex={activeIndex} count={assets.length} postId={post.id} onMove={moveSlide} />
      )}
    </div>
  );
}
