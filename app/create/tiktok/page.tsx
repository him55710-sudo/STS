"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { fetchTikTokStatus, type TikTokStatus } from "@/lib/backend/drafts";
import { isBackendConfigured } from "@/lib/config";
import { useApp, useHydrated } from "@/lib/store";
import { CheckIcon, ChevronLeftIcon } from "@/components/Icons";

/**
 * TikTok 가져오기 — 공식 API로 본인 영상을 불러와 STS 드래프트로 만든다.
 * 가져온 콘텐츠는 자동 발행되지 않는다: 크리에이터가 상품을 확정해야 발행된다.
 */
export default function TikTokImportPage() {
  return (
    <Suspense>
      <TikTokImportBody />
    </Suspense>
  );
}

interface VideoItem {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  share_url?: string;
}

const ERROR_MESSAGE: Record<string, string> = {
  not_configured:
    "TikTok 앱 자격증명이 아직 등록되지 않았어요. 관리자가 TIKTOK_CLIENT_KEY/SECRET을 설정하면 활성화됩니다.",
  denied: "TikTok에서 권한 요청이 거부됐어요.",
  state_mismatch: "보안 검증에 실패했어요 (state 불일치). 다시 시도해주세요.",
  token_exchange: "TikTok 토큰 교환에 실패했어요. 잠시 후 다시 시도해주세요.",
  save_failed: "연결 정보를 저장하지 못했어요.",
  backend: "백엔드에 연결하지 못했어요.",
};

function TikTokImportBody() {
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const session = useApp((s) => s.session);

  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(ERROR_MESSAGE[params.get("error") ?? ""] ?? null);
  const [notice, setNotice] = useState<string | null>(
    params.get("connected") === "mock"
      ? "데모(mock) 모드로 연결됐어요. 실제 TikTok 계정이 아닙니다."
      : params.get("connected") === "1"
        ? "TikTok 계정이 연결됐어요."
        : null
  );

  const loadVideos = useCallback(async (next?: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = next ? `/api/integrations/tiktok/videos?cursor=${next}` : "/api/integrations/tiktok/videos";
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        if (json.error === "not_connected" || json.reauth) {
          setStatus({ connected: false });
          setError(json.reauth ? "TikTok 재연결이 필요해요." : null);
        } else {
          setError(ERROR_MESSAGE[json.error] ?? `영상을 불러오지 못했어요 (${json.error ?? res.status})`);
        }
        return;
      }
      setVideos((prev) => (next ? [...prev, ...json.videos] : json.videos));
      setCursor(json.cursor ?? null);
      setHasMore(Boolean(json.hasMore));
      setMock(Boolean(json.mock));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchTikTokStatus().then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (s.connected) void loadVideos();
    });
    return () => {
      cancelled = true;
    };
  }, [session, loadVideos]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/tiktok/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGE[json.error] ?? `가져오기 실패 (${json.error ?? res.status})`);
        return;
      }
      const failedNote =
        json.failed?.length > 0 ? ` · ${json.failed.length}개는 건너뜀 (${json.failed[0].reason})` : "";
      setNotice(`드래프트 ${json.draftCount}개를 만들었어요${failedNote}. 상품을 확정하면 발행됩니다.`);
      setSelected(new Set());
      // 드래프트 목록이 있는 만들기 화면으로
      if (json.draftCount > 0) setTimeout(() => router.push("/create?tab=drafts"), 900);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-bg/95 px-2 py-2.5 backdrop-blur-sm">
        <Link href="/create" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
          <ChevronLeftIcon size={22} />
        </Link>
        <p className="text-[15px] font-semibold">TikTok에서 가져오기</p>
        {mock && (
          <span className="ml-auto mr-3 rounded-[5px] bg-[#fdf3e7] px-1.5 py-0.5 text-[10px] font-semibold text-[#b3752e]">
            데모 모드
          </span>
        )}
      </header>

      {(error || notice) && (
        <p
          className={`mx-4 mt-3 rounded-(--radius-btn) px-3 py-2.5 text-[12.5px] leading-relaxed ${
            error ? "bg-[#fdecec] text-[#c0392b]" : "bg-primary-soft text-primary"
          }`}
        >
          {error ?? notice}
        </p>
      )}

      {!hydrated ? null : !isBackendConfigured() ? (
        <Notice title="백엔드가 필요해요" body="TikTok 가져오기는 실 계정 연결과 저장이 필요합니다." />
      ) : !session ? (
        <Notice
          title="로그인이 필요해요"
          body="내 TikTok 계정을 연결하려면 먼저 STS에 로그인하세요."
          cta={{ href: "/login", label: "로그인" }}
        />
      ) : status?.connected ? (
        <>
          <div className="flex items-center justify-between px-4 pt-4">
            <p className="text-[13px] text-ink-2">
              내 TikTok 영상 {videos.length}개
              {selected.size > 0 && ` · ${selected.size}개 선택됨`}
            </p>
            <Link href="/create" className="text-[12px] font-medium text-ink-2">
              직접 업로드 →
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-1.5 px-4 pt-3">
            {videos.map((v) => {
              const on = selected.has(v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggle(v.id)}
                  className={`relative overflow-hidden rounded-(--radius-card) border transition-colors ${
                    on ? "border-primary ring-2 ring-primary/30" : "border-line"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.cover_image_url}
                    alt={v.title ?? ""}
                    className="aspect-[9/16] w-full object-cover"
                    loading="lazy"
                  />
                  <span
                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                      on ? "border-primary bg-primary text-white" : "border-white/70 bg-black/25"
                    }`}
                  >
                    {on && <CheckIcon size={12} strokeWidth={3} />}
                  </span>
                  {v.duration != null && (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1 py-px text-[9.5px] font-medium text-white">
                      {Math.round(v.duration)}초
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {videos.length === 0 && !loading && (
            <p className="px-4 py-12 text-center text-[13px] text-ink-2">
              공개된 영상이 없어요.
            </p>
          )}

          {hasMore && (
            <div className="px-4 pt-3">
              <button
                onClick={() => loadVideos(cursor ?? undefined)}
                disabled={loading}
                className="h-10 w-full rounded-(--radius-btn) border border-line bg-surface text-[13px] font-medium disabled:opacity-60"
              >
                {loading ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}

          <p className="px-4 pt-4 text-[11.5px] leading-relaxed text-ink-2">
            TikTok 공식 API는 원본 영상 파일을 제공하지 않아요. 가져오기는 영상의 <b>커버 이미지</b>를
            AI로 분석합니다. 더 정밀한 태깅이 필요하면 원본 영상을 직접 업로드해주세요.
          </p>

          {/* 하단 고정 액션 */}
          {selected.size > 0 && (
            <div className="fixed bottom-[76px] left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-4 lg:bottom-6">
              <button
                onClick={runImport}
                disabled={importing}
                className="press h-12 w-full rounded-(--radius-btn) bg-primary text-[15px] font-bold text-white shadow-lg disabled:opacity-60"
              >
                {importing ? "가져오는 중..." : `선택한 ${selected.size}개 가져오기`}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 pt-6">
          <div className="rounded-(--radius-card) border border-line bg-surface p-5 text-center">
            <p className="text-[15px] font-bold">TikTok 계정 연결</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              내가 올린 TikTok 영상을 불러와 shoppable 콘텐츠로 만들어요.
              <br />
              STS는 공식 API로 <b>본인 영상 목록과 기본 프로필</b>만 읽습니다.
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-left text-[12px] text-ink-2">
              <li>· user.info.basic — 계정 식별</li>
              <li>· video.list — 내 영상 목록 조회</li>
            </ul>
            <a
              href="/api/integrations/tiktok/connect"
              className="press mt-4 flex h-12 items-center justify-center rounded-(--radius-btn) bg-ink text-[15px] font-bold text-surface"
            >
              TikTok 연결하기
            </a>
            <Link href="/create" className="mt-3 inline-block text-[12.5px] font-medium text-ink-2">
              대신 직접 업로드할게요
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Notice({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 rounded-(--radius-btn) bg-ink px-5 py-2.5 text-[13px] font-semibold text-surface"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
