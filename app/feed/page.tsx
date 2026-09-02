"use client";

import { useEffect, useMemo, useState } from "react";
import type { Post } from "@/lib/types";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp, useHydrated } from "@/lib/store";
import PostCard from "@/components/PostCard";
import StoryRail from "@/components/StoryRail";
import { MIXED_FEED_FIXTURE_POSTS } from "@/components/MixedFeedFixtures";
import {
  REPOSITORY_FEED_SELECT,
  repositoryEmptyMessage,
  repositoryRowsToPosts,
} from "@/components/MixedMediaRepository";
import {
  getFeedModeFromSearchParams,
  selectFeedPosts,
  type FeedMode,
  type FeedTab,
} from "@/components/MixedMediaFeed";

type RepositoryState = "loading" | "ready" | "unavailable" | "error";

export default function FeedPage() {
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [mode, setMode] = useState<FeedMode>("repository");
  const [repositoryPosts, setRepositoryPosts] = useState<readonly Post[]>([]);
  const [repositoryState, setRepositoryState] = useState<RepositoryState>("loading");
  const hydrated = useHydrated();
  const userPosts = useApp((s) => s.userPosts);
  const following = useApp((s) => s.following);

  useEffect(() => {
    setMode(getFeedModeFromSearchParams(new URLSearchParams(window.location.search)));
  }, []);

  useEffect(() => {
    if (mode === "fixture") {
      setRepositoryPosts([]);
      setRepositoryState("ready");
      return;
    }

    if (!isSupabaseConfigured()) {
      setRepositoryPosts([]);
      setRepositoryState("unavailable");
      return;
    }

    let cancelled = false;
    setRepositoryState("loading");

    async function loadRepositoryPosts(): Promise<void> {
      const { data, error } = await getSupabaseBrowserClient()
        .from("posts")
        .select(REPOSITORY_FEED_SELECT)
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (error) {
        setRepositoryPosts([]);
        setRepositoryState("error");
        return;
      }
      const posts = repositoryRowsToPosts(data);
      setRepositoryPosts(posts ?? []);
      setRepositoryState(posts ? "ready" : "error");
    }

    void loadRepositoryPosts();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const feed = useMemo(() => {
    return selectFeedPosts(
      {
        mode,
        repositoryPosts,
        fixturePosts: MIXED_FEED_FIXTURE_POSTS,
        localPosts: userPosts,
        hydrated,
        now: new Date(),
      },
      tab,
      following,
    );
  }, [tab, mode, repositoryPosts, hydrated, userPosts, following]);

  const emptyMessage =
    mode === "repository" && (repositoryPosts.length === 0 || repositoryState !== "ready")
      ? repositoryEmptyMessage(repositoryState)
      : "팔로우한 크리에이터의 콘텐츠가 여기에 표시돼요.";

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="flex items-end justify-between px-4 pb-2.5 pt-3.5">
          <h1 className="text-[20px] font-extrabold tracking-[0.14em]">
            STS<span className="text-primary">.</span>
          </h1>
          <div className="flex gap-4 text-[14px]">
            <button
              onClick={() => setTab("foryou")}
              className={`pb-0.5 transition-colors ${
                tab === "foryou" ? "border-b-[1.5px] border-ink font-semibold text-ink" : "text-ink-2"
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setTab("following")}
              className={`pb-0.5 transition-colors ${
                tab === "following"
                  ? "border-b-[1.5px] border-ink font-semibold text-ink"
                  : "text-ink-2"
              }`}
            >
              Following
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col">
        <StoryRail />
        <section className="flex items-center justify-between border-b border-line bg-bg px-4 py-3">
          <div>
            <p className="text-[14px] font-bold">
              {mode === "fixture" ? "Fixture mixed feed" : "Repository public feed"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-2">다양한 크리에이터의 사진과 검증된 상품 태그를 둘러보세요.</p>
          </div>
          <span className="rounded-(--radius-btn) bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {mode === "fixture" ? "FIXTURE" : "LIVE"}
          </span>
        </section>
        {feed.map((post, i) => (
          <div key={post.id} className="card-in" style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}>
            <PostCard post={post} />
          </div>
        ))}
        {feed.length === 0 && (
          <p className="px-4 py-16 text-center text-sm text-ink-2">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
