"use client";

import { useEffect, useMemo, useState } from "react";
import { POSTS } from "@/lib/catalog";
import { isBackendConfigured, isDemoMode } from "@/lib/config";
import { toCandidate } from "@/lib/recommendation/candidates";
import { rankFeed, rankFollowingFeed } from "@/lib/recommendation/feed-ranker";
import { useApp, useHydrated, useProductLookup } from "@/lib/store";
import PostCard from "@/components/PostCard";

/**
 * Home Feed — PRD §11, §52.
 *   Following : 시간순 (팔로우한 크리에이터만)
 *   For You   : 결정적 랭킹 v1 (lib/recommendation/feed-ranker.ts)
 *
 * 숨긴 게시물은 두 탭 모두에서 제외된다. 랭킹은 취향·품질·신선도가 주도하고
 * 수수료는 최소 가중치만 갖는다 — 피드는 카탈로그가 아니라 소셜이다.
 */
export default function HomePage() {
  const [tab, setTab] = useState<"foryou" | "following">("foryou");
  const hydrated = useHydrated();
  const userPosts = useApp((s) => s.userPosts);
  const following = useApp((s) => s.following);
  const remotePosts = useApp((s) => s.remotePosts);
  const remoteLoaded = useApp((s) => s.remoteLoaded);
  const hiddenPosts = useApp((s) => s.hiddenPosts);
  const seenPosts = useApp((s) => s.seenPosts);
  const tasteProfile = useApp((s) => s.tasteProfile);
  const engagement = useApp((s) => s.engagement);
  const signalsLoaded = useApp((s) => s.signalsLoaded);
  const loadSignals = useApp((s) => s.loadSignals);
  const session = useApp((s) => s.session);
  const lookupProduct = useProductLookup();
  const demo = isDemoMode();

  // 취향 신호는 원격 피드가 도착한 뒤 한 번 로드한다
  useEffect(() => {
    if (!isBackendConfigured() || !remoteLoaded) return;
    void loadSignals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteLoaded, session?.userId]);

  const allPosts = useMemo(
    () => [
      ...remotePosts,
      ...(hydrated && demo ? userPosts : []),
      ...(demo ? POSTS : []),
    ],
    [remotePosts, hydrated, demo, userPosts]
  );

  const feed = useMemo(() => {
    const hidden = new Set(hiddenPosts);
    const byId = new Map(allPosts.map((p) => [p.id, p]));

    const candidates = allPosts.map((p) =>
      toCandidate(p, lookupProduct, {
        views: engagement[p.id]?.view_count ?? 0,
        likes: engagement[p.id]?.like_count ?? 0,
        taps: engagement[p.id]?.tap_count ?? 0,
        shares: engagement[p.id]?.share_count ?? 0,
        comments: engagement[p.id]?.comment_count ?? 0,
      })
    );

    if (tab === "following") {
      return rankFollowingFeed(candidates, { following: new Set(following), hidden })
        .map((c) => byId.get(c.postId))
        .filter((p) => p != null);
    }

    return rankFeed(candidates, {
      profile: tasteProfile,
      following: new Set(following),
      hidden,
      seen: new Set(seenPosts),
      now: Date.now(),
    })
      .map((r) => byId.get(r.candidate.postId))
      .filter((p) => p != null);
  }, [tab, allPosts, following, hiddenPosts, seenPosts, tasteProfile, engagement, lookupProduct]);

  const personalized = signalsLoaded && !tasteProfile.isCold;

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
        {tab === "foryou" && session && (
          <p className="px-4 pb-2 text-[11px] text-ink-2">
            {personalized ? "내 취향을 반영한 순서예요" : "탐색할수록 추천이 정확해져요"}
          </p>
        )}
      </header>

      <div className="flex flex-col">
        {feed.map((post, i) => (
          <div key={post.id} className="card-in" style={{ animationDelay: `${Math.min(i, 4) * 60}ms` }}>
            <PostCard post={post} surface="feed" />
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
