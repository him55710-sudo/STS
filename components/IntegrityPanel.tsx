"use client";

import { useMemo } from "react";
import {
  assessIntegrity,
  computeIntegrityMetrics,
  type PostShape,
} from "@/lib/metrics/integrity";
import { useApp } from "@/lib/store";
import type { Post, TrackedEvent } from "@/lib/types";

/**
 * 커머스 무결성 대시보드 — 성장 지표보다 먼저 보는 숫자들.
 * 이 지표가 나빠지면 STS가 소셜 플랫폼에서 카탈로그로 변질되고 있다는 신호다.
 */
export default function IntegrityPanel({
  posts,
  events,
}: {
  posts: Post[];
  events: TrackedEvent[];
}) {
  const hiddenPosts = useApp((s) => s.hiddenPosts);

  const health = useMemo(() => {
    const shapes: PostShape[] = posts.map((p) => ({
      postId: p.id,
      creatorId: p.creatorId,
      linkedProductCount: p.objects.filter((o) => o.productId).length,
      publishedAt: Date.parse(p.createdAt) || 0,
    }));
    const impressions = events.filter((e) => e.type === "asset_view").length;
    return assessIntegrity(
      computeIntegrityMetrics({ posts: shapes, hides: hiddenPosts.length, impressions })
    );
  }, [posts, events, hiddenPosts]);

  return (
    <div className="px-4 pt-5">
      <p className="mb-2 text-[13px] font-semibold">커머스 무결성</p>
      <div className="grid grid-cols-2 gap-2.5">
        {health.map((m) => (
          <div
            key={m.key}
            className={`rounded-(--radius-card) border bg-surface p-3.5 ${
              m.status === "warn" ? "border-[#e6b98a]" : "border-line"
            }`}
          >
            <p className="flex items-center gap-1.5 text-[11px] text-ink-2">
              {m.label}
              {m.status === "warn" && (
                <span className="rounded-[4px] bg-[#fdf3e7] px-1 py-px text-[9px] font-semibold text-[#b3752e]">
                  주의
                </span>
              )}
            </p>
            {/* 표본이 없으면 0%가 아니라 "데이터 없음" — 없는 걸 나쁜 걸로 그리지 않는다 */}
            {m.value == null ? (
              <p className="mt-0.5 text-[14px] font-semibold text-ink-2">데이터 없음</p>
            ) : (
              <p className="mt-0.5 text-[18px] font-bold tracking-tight">
                {Math.round(m.value * 100)}%
              </p>
            )}
            <p className="mt-1 text-[10px] leading-relaxed text-ink-2">{m.guide}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
