"use client";

import { useState } from "react";
import { creatorById } from "@/lib/catalog";
import { STORIES } from "@/lib/stories";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";

export default function StoryRail() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <>
      <section aria-label="새 스토리" className="border-b border-line bg-surface py-3">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
          {STORIES.map((story, index) => {
            const creator = creatorById(story.creatorId);

            return (
              <button
                key={story.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`${creator.handle} 스토리 열기`}
                className="press flex w-[64px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className="story-ring rounded-full p-[2px]">
                  <span className="block rounded-full border-2 border-surface p-[1px]">
                    <Avatar creator={creator} size={52} />
                  </span>
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium text-ink">{creator.handle}</span>
              </button>
            );
          })}
        </div>
      </section>
      {selectedIndex !== null && (
        <StoryViewer stories={STORIES} initialIndex={selectedIndex} onClose={() => setSelectedIndex(null)} />
      )}
    </>
  );
}
