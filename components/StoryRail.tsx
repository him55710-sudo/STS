"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { creatorById } from "@/lib/catalog";
import { REPOSITORY_STORIES, type Story } from "@/lib/stories";
import Avatar from "./Avatar";
import StoryViewer from "./StoryViewer";

const VIEWER_SESSION_KEY = "sts.story.viewerSession.v1";

export type StoryRailStory = Story & {
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly seenAt?: string | null;
};

export type ActiveStoryRow = {
  readonly story: StoryRailStory;
  readonly seen: boolean;
};

type ActiveStoryRowsInput = {
  readonly stories: readonly StoryRailStory[];
  readonly now: Date;
  readonly seenStoryIds: ReadonlySet<string>;
};

type StoryRailProps = {
  readonly stories?: readonly StoryRailStory[];
};

type StoryViewRequest = {
  readonly storyId: string;
  readonly viewerSessionId: string;
};

export function getActiveStoryRows({ stories, now, seenStoryIds }: ActiveStoryRowsInput): readonly ActiveStoryRow[] {
  const nowTime = now.getTime();
  return stories.reduce<ActiveStoryRow[]>((rows, story) => {
    const startsAt = story.startsAt ? Date.parse(story.startsAt) : null;
    const expiresAt = story.expiresAt ? Date.parse(story.expiresAt) : null;
    if ((startsAt !== null && startsAt > nowTime) || (expiresAt !== null && expiresAt <= nowTime)) return rows;
    rows.push({ story, seen: (story.seenAt !== null && story.seenAt !== undefined) || seenStoryIds.has(story.id) });
    return rows;
  }, []);
}

function createViewerSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `story-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function viewerSessionId(storage: Storage | null): string {
  if (storage === null) return createViewerSessionId();
  const existing = storage.getItem(VIEWER_SESSION_KEY);
  if (existing !== null && existing.trim().length > 0) return existing;
  const next = createViewerSessionId();
  storage.setItem(VIEWER_SESSION_KEY, next);
  return next;
}

async function recordStoryView(request: StoryViewRequest): Promise<boolean> {
  try {
    const response = await fetch("/api/social/stories/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyId: request.storyId,
        viewerSessionId: request.viewerSessionId,
        idempotencyKey: `${request.viewerSessionId}:${request.storyId}`,
      }),
    });
    return response.ok;
  } catch (error) {
    if (error instanceof Error) return false;
    throw error;
  }
}

export default function StoryRail({ stories = REPOSITORY_STORIES }: StoryRailProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [seenStoryIds, setSeenStoryIds] = useState<ReadonlySet<string>>(() => new Set());
  const [now, setNow] = useState(() => new Date());
  const requestedStoryIds = useRef<Set<string>>(new Set());
  const viewerSessionRef = useRef<string | null>(null);
  const activeRows = useMemo(
    () => getActiveStoryRows({ stories, now, seenStoryIds }),
    [now, stories, seenStoryIds],
  );
  const activeStories = activeRows.map((row) => row.story);

  useEffect(() => {
    viewerSessionRef.current = viewerSessionId(typeof window === "undefined" ? null : window.sessionStorage);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const markSelectedSeen = (storyId: string) => {
    setSeenStoryIds((current) => {
      if (current.has(storyId)) return current;
      const next = new Set(current);
      next.add(storyId);
      return next;
    });
  };

  const markSeen = useCallback((storyId: string) => {
    if (requestedStoryIds.current.has(storyId)) return;
    const sessionId = viewerSessionRef.current ?? viewerSessionId(typeof window === "undefined" ? null : window.sessionStorage);
    viewerSessionRef.current = sessionId;
    requestedStoryIds.current.add(storyId);
    void recordStoryView({ storyId, viewerSessionId: sessionId }).then((recorded) => {
      if (recorded) markSelectedSeen(storyId);
    });
  }, []);

  if (activeRows.length === 0) return null;

  return (
    <>
      <section aria-label="새 스토리" className="border-b border-line bg-surface py-3">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
          {activeRows.map(({ story, seen }, index) => {
            const creator = story.creator ?? creatorById(story.creatorId);

            return (
              <button
                key={story.id}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={`${creator.handle} 스토리 열기${seen ? " · 본 스토리" : ""}`}
                className="press flex w-[64px] shrink-0 flex-col items-center gap-1.5"
              >
                <span className={`${seen ? "bg-surface-2" : "story-ring"} rounded-full p-[2px]`}>
                  <span className="block rounded-full border-2 border-surface p-[1px]">
                    <Avatar creator={creator} size={52} />
                  </span>
                </span>
                <span className={`w-full truncate text-center text-[11px] font-medium ${seen ? "text-ink-2" : "text-ink"}`}>{creator.handle}</span>
              </button>
            );
          })}
        </div>
      </section>
      {selectedIndex !== null && (
        <StoryViewer
          stories={activeStories}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onSeen={(storyId) => {
            markSeen(storyId);
            markSelectedSeen(storyId);
          }}
        />
      )}
    </>
  );
}
