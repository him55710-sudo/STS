"use client";

import { useMemo, useState } from "react";
import { POSTS } from "@/lib/catalog";
import { isBackendConfigured, isDemoMode } from "@/lib/config";
import { useApp, useHydrated } from "@/lib/store";
import PostCard from "@/components/PostCard";

/**
 * Home Feed — PRD §11, §52. 상단은 로고 + For You/Following만, 나머지는 콘텐츠.
 * 서버 게시물이 우선이고, 시드/로컬 데모 콘텐츠는 데모 모드에서만 섞인다.
 */
export default function HomePage() {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const hydrated = useHydrated();
  const userPosts = useApp((s) => s.userPosts);
  const following = useApp((s) => s.following);
  const remotePosts = useApp((s) => s.remotePosts);
  const remoteLoaded = useApp((s) => s.remoteLoaded);
  const demo = isDemoMode();

  const feed = useMemo(() => {
    const all = [
      ...remotePosts,
      ...(hydrated && demo ? userPosts : []),
      ...(demo ? POSTS : []),
    ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (tab === "following" && hydrated) {
      return all.filter((p) => following.includes(p.creatorId) || p.isUserPost);
    }
    return all;
  }, [tab, hydrated, demo, userPosts, following, remotePosts]);

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
        {feed.map((post, i) => (
          <div key={post.id} className="card-in" style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}>
            <PostCard post={post} />
          </div>
        ))}
        {feed.length === 0 && (
          <p className="px-4 py-16 text-center text-sm text-ink-2">
            {isBackendConfigured() && !remoteLoaded
              ? "불러오는 중..."
              : tab === "following"
                ? "팔로우한 크리에이터의 콘텐츠가 여기에 표시돼요."
                : "아직 게시물이 없어요. 첫 콘텐츠를 올려보세요."}
          </p>
        )}
      </div>
    </div>
  );
}
