"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminBundle, EMPTY_BUNDLE, type AdminBundle } from "@/lib/backend/admin";
import { POSTS, PRODUCTS } from "@/lib/catalog";
import { canonicalById, merchantById, offersForProduct } from "@/lib/commerce";
import { SEED_MERCHANTS, SEED_OFFERS, SEED_CANONICAL_PRODUCTS } from "@/lib/commerce/seed";
import { SEED_PLACEMENTS } from "@/lib/commerce/sponsored";
import { getProvider } from "@/lib/commerce/providers/registry";
import { SEED_AFFILIATE_PROGRAMS } from "@/lib/commerce/seed";
import { isDemoMode, isBackendConfigured } from "@/lib/config";
import { won } from "@/lib/format";
import { FRAUD_RULES } from "@/lib/integrity/fraud";
import { useApp, useCreatorLookup, useHydrated } from "@/lib/store";
import IntegrityPanel from "@/components/IntegrityPanel";
import { ChevronLeftIcon } from "@/components/Icons";

/**
 * 운영 콘솔 — 사업 MVP 전 영역을 한 화면에서 점검한다.
 * Overview · Products · Affiliate · Finance · Integrations · Trust
 *
 * 서버 데이터는 전부 is_admin() RLS를 통과해야 보인다 (관리자가 아니면 빈 결과).
 * 상품 그래프·provider 레지스트리는 코드 시드라 로그인 없이도 점검 가능하다.
 */
type Tab = "overview" | "products" | "affiliate" | "finance" | "integrations" | "trust";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "개요" },
  { key: "products", label: "상품" },
  { key: "affiliate", label: "제휴" },
  { key: "finance", label: "정산" },
  { key: "integrations", label: "연동" },
  { key: "trust", label: "신뢰" },
];

export default function AdminPage() {
  const hydrated = useHydrated();
  const { userPosts, events, remotePosts, session } = useApp();
  const lookupCreator = useCreatorLookup();
  const demo = isDemoMode();
  const [tab, setTab] = useState<Tab>("overview");
  const [bundle, setBundle] = useState<AdminBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAdminBundle(session?.userId ?? null)
      .then((b) => {
        if (!cancelled) setBundle(b);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const localPosts = [
    ...remotePosts,
    ...(hydrated && demo ? userPosts : []),
    ...(demo ? POSTS : []),
  ];

  return (
    <div className="pb-10">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-2 py-2.5">
          <Link href="/profile" aria-label="뒤로" className="flex h-9 w-9 items-center justify-center text-ink">
            <ChevronLeftIcon size={22} />
          </Link>
          <p className="text-[15px] font-semibold">운영 콘솔</p>
          <span className="ml-auto mr-3 rounded-[5px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
            {bundle.isAdmin ? "관리자" : "제한 보기"}
          </span>
        </div>
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 pb-2.5 text-[13px] transition-colors ${
                tab === t.key ? "border-b-[1.5px] border-ink font-bold text-ink" : "font-medium text-ink-2"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {!bundle.isAdmin && !loading && (
        <p className="mx-4 mt-3 rounded-(--radius-card) border border-line bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-ink-2">
          서버 운영 데이터는 관리자 계정에서만 보입니다.
          {isBackendConfigured()
            ? " (profiles.role = 'admin' 으로 지정하세요.)"
            : " (백엔드 미설정 — 상품 그래프만 점검 가능합니다.)"}
        </p>
      )}

      {tab === "overview" && (
        <>
          <Section title="운영 요약">
            {bundle.overview ? (
              <div className="grid grid-cols-3 gap-2.5">
                <Stat label="크리에이터" value={bundle.overview.creators} />
                <Stat label="발행 게시물" value={bundle.overview.posts_published} />
                <Stat label="드래프트" value={bundle.overview.posts_draft} />
                <Stat label="오브젝트" value={bundle.overview.objects} />
                <Stat label="상품 연결" value={bundle.overview.objects_linked} />
                <Stat label="exact 확정" value={bundle.overview.objects_exact} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                <Stat label="콘텐츠(로컬)" value={localPosts.length} />
                <Stat label="상품(시드)" value={PRODUCTS.length} />
                <Stat label="이벤트(로컬)" value={hydrated ? events.length : 0} />
              </div>
            )}
          </Section>

          <Section title={`크리에이터 · 게시물 · AI 작업 (${bundle.posts.length || localPosts.length})`}>
            <Table
              head={["콘텐츠", "크리에이터", "AI 파이프라인", "상태"]}
              rows={
                bundle.posts.length > 0
                  ? bundle.posts.map((p) => ({
                      key: p.id,
                      cells: [
                        p.caption.slice(0, 22) || "(제목 없음)",
                        p.creator_id.slice(0, 8),
                        p.objects.length > 0
                          ? `${p.objects[0].pipeline_version ?? "?"} · 객체 ${p.objects.length}`
                          : "객체 없음",
                        p.status,
                      ],
                    }))
                  : localPosts.slice(0, 25).map((p) => ({
                      key: p.id,
                      cells: [
                        p.caption.slice(0, 22),
                        `@${lookupCreator(p.creatorId).handle}`,
                        `객체 ${p.objects.length} · 연결 ${p.objects.filter((o) => o.productId).length}`,
                        "published",
                      ],
                    }))
              }
              empty="게시물이 없습니다."
            />
          </Section>

          <IntegrityPanel posts={localPosts} events={hydrated ? events : []} />
        </>
      )}

      {tab === "products" && (
        <>
          <Section title={`Canonical 상품 (${SEED_CANONICAL_PRODUCTS.length})`}>
            <Table
              head={["상품", "브랜드", "오퍼", "카테고리"]}
              rows={SEED_CANONICAL_PRODUCTS.slice(0, 25).map((c) => ({
                key: c.id,
                cells: [
                  c.modelName.slice(0, 20),
                  c.brand,
                  `${offersForProduct(c.id).length}개`,
                  c.category,
                ],
              }))}
              empty="상품이 없습니다."
            />
          </Section>

          <Section title={`판매처 오퍼 (${SEED_OFFERS.length})`}>
            <Table
              head={["상품", "판매처", "가격", "재고"]}
              rows={SEED_OFFERS.slice(0, 25).map((o) => ({
                key: o.id,
                cells: [
                  canonicalById(o.canonicalProductId)?.modelName.slice(0, 16) ?? o.canonicalProductId,
                  merchantById(o.merchantId)?.name ?? o.merchantId,
                  won(o.price),
                  o.stockStatus,
                ],
              }))}
              empty="오퍼가 없습니다."
            />
          </Section>

          <Section title={`판매처 (${SEED_MERCHANTS.length})`}>
            <Table
              head={["판매처", "도메인", "신뢰도", "상태"]}
              rows={SEED_MERCHANTS.slice(0, 25).map((m) => ({
                key: m.id,
                cells: [m.name, m.domain, `${Math.round(m.trustScore * 100)}%`, m.status],
              }))}
              empty="판매처가 없습니다."
            />
          </Section>
        </>
      )}

      {tab === "affiliate" && (
        <>
          <Section title={`클릭 (${bundle.clicks.length})`}>
            <Table
              head={["시각", "상품", "판매처", "유입면", "사용자"]}
              rows={bundle.clicks.map((c) => ({
                key: c.id,
                cells: [
                  new Date(c.created_at).toLocaleTimeString("ko-KR", { hour12: false }),
                  canonicalById(c.canonical_product_id)?.modelName.slice(0, 14) ?? c.canonical_product_id ?? "-",
                  merchantById(c.merchant_id)?.name ?? c.merchant_id,
                  c.source_surface,
                  c.viewer_id ? "로그인" : "익명",
                ],
              }))}
              empty="클릭 기록이 없습니다."
            />
          </Section>

          <Section title={`전환 (${bundle.conversions.length})`}>
            <Table
              head={["발생", "provider", "주문", "수수료", "상태"]}
              rows={bundle.conversions.map((c) => ({
                key: c.id,
                cells: [
                  new Date(c.occurred_at).toLocaleDateString("ko-KR"),
                  c.provider,
                  c.external_order_id ?? c.external_conversion_id,
                  won(c.commission_amount),
                  c.status,
                ],
              }))}
              empty="전환 기록이 없습니다."
            />
          </Section>

          <Section title={`실패한 콜백 (${bundle.failures.length})`}>
            <Table
              head={["시각", "provider", "사유"]}
              rows={bundle.failures.map((f) => ({
                key: f.id,
                cells: [
                  new Date(f.created_at).toLocaleTimeString("ko-KR", { hour12: false }),
                  f.provider,
                  f.reason.slice(0, 40),
                ],
              }))}
              empty="검증 실패 기록이 없습니다."
            />
          </Section>
        </>
      )}

      {tab === "finance" && (
        <>
          <Section title="원장 요약">
            {bundle.overview ? (
              <div className="grid grid-cols-2 gap-2.5">
                <Money label="미확정 (pending)" value={bundle.overview.ledger_pending} />
                <Money label="확정 (confirmed)" value={bundle.overview.ledger_confirmed} />
                <Money label="지급 가능 (payable)" value={bundle.overview.ledger_payable} highlight />
                <Money label="지급 완료 (paid)" value={bundle.overview.ledger_paid} />
              </div>
            ) : (
              <Empty text="관리자 로그인 후 표시됩니다." />
            )}
          </Section>

          <Section title={`크리에이터 원장 (${bundle.ledger.length})`}>
            <Table
              head={["생성", "크리에이터", "크리에이터 몫", "플랫폼 몫", "상태"]}
              rows={bundle.ledger.map((l) => ({
                key: l.id,
                cells: [
                  new Date(l.created_at).toLocaleDateString("ko-KR"),
                  l.creator_id.slice(0, 8),
                  won(l.creator_share),
                  won(l.platform_share),
                  l.status,
                ],
              }))}
              empty="원장 기록이 없습니다."
            />
          </Section>

          <Section title={`반전 (${bundle.ledger.filter((l) => l.status === "reversed").length})`}>
            <Table
              head={["생성", "크리에이터", "반전 금액"]}
              rows={bundle.ledger
                .filter((l) => l.status === "reversed")
                .map((l) => ({
                  key: `rev-${l.id}`,
                  cells: [
                    new Date(l.created_at).toLocaleDateString("ko-KR"),
                    l.creator_id.slice(0, 8),
                    won(l.creator_share),
                  ],
                }))}
              empty="반전된 원장이 없습니다."
            />
          </Section>
        </>
      )}

      {tab === "integrations" && (
        <>
          <Section title="TikTok 연동">
            <div className="grid grid-cols-2 gap-2.5">
              <Stat label="연결 계정" value={bundle.overview?.tiktok_connections ?? 0} />
              <Stat label="가져온 영상" value={bundle.overview?.tiktok_imports ?? 0} />
            </div>
            <div className="mt-2.5">
              <Table
                head={["영상 id", "제목", "드래프트", "가져온 시각"]}
                rows={bundle.tiktokImports.map((i) => ({
                  key: i.provider_video_id,
                  cells: [
                    i.provider_video_id.slice(0, 14),
                    (i.title ?? "-").slice(0, 16),
                    i.post_id ? "생성됨" : "없음",
                    new Date(i.imported_at).toLocaleDateString("ko-KR"),
                  ],
                }))}
                empty="가져오기 기록이 없습니다."
              />
            </div>
          </Section>

          <Section title="제휴 provider 상태">
            <Table
              head={["provider", "어댑터", "프로그램", "상태"]}
              rows={[...new Set(SEED_AFFILIATE_PROGRAMS.map((p) => p.provider))].map((providerId) => {
                const adapter = getProvider(providerId);
                const programs = SEED_AFFILIATE_PROGRAMS.filter((p) => p.provider === providerId);
                return {
                  key: providerId,
                  cells: [
                    providerId,
                    adapter ? (adapter.id === "mock" ? "mock 구현" : adapter.id) : "미등록",
                    `${programs.length}개`,
                    programs.every((p) => p.status === "pending") ? "자격증명 대기" : "활성",
                  ],
                };
              })}
              empty="등록된 provider가 없습니다."
            />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
              실 네트워크 자격증명이 없어 모든 provider가 mock 어댑터로 라우팅됩니다. 실연동 시
              registry에 어댑터를 등록하면 /go 생성과 postback 파싱이 즉시 교체됩니다.
            </p>
          </Section>
        </>
      )}

      {tab === "trust" && (
        <>
          <Section title={`사기 플래그 (${bundle.fraud.length})`}>
            <Table
              head={["시각", "종류", "심각도", "사유"]}
              rows={bundle.fraud.map((f) => ({
                key: f.id,
                cells: [
                  new Date(f.created_at).toLocaleTimeString("ko-KR", { hour12: false }),
                  f.kind,
                  f.severity,
                  f.reason.slice(0, 34),
                ],
              }))}
              empty="플래그가 없습니다."
            />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
              결정적 규칙만 사용합니다 (ML 없음): 중복 콜백 · {FRAUD_RULES.burstWindowSeconds}초 내
              같은 오퍼 {FRAUD_RULES.burstThreshold}회 이상 클릭 · 크리에이터 자기 클릭 ·{" "}
              {FRAUD_RULES.replayMaxAgeDays}일 초과 과거 전환 리플레이. 플래그는 사용자를 차단하지
              않고 정산 검토 대상으로만 표시합니다.
            </p>
          </Section>

          <Section title={`광고 고지 (${SEED_PLACEMENTS.length})`}>
            <Table
              head={["광고 상품", "타깃", "라벨", "상태"]}
              rows={SEED_PLACEMENTS.map((p) => ({
                key: p.id,
                cells: [
                  canonicalById(p.sponsoredProductId)?.modelName.slice(0, 16) ?? p.sponsoredProductId,
                  p.targetProductIds.length > 0 ? `상품 ${p.targetProductIds.length}개` : (p.targetCategory ?? "-"),
                  p.label,
                  p.status,
                ],
              }))}
              empty="광고 지면이 없습니다."
            />
            <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
              광고는 &quot;비슷한 스타일&quot; 슬롯에만 노출되며 항상 라벨이 붙습니다. exact(착용) 상품은
              구조적으로 광고 대상이 될 수 없습니다 — docs/COMMERCE_INTEGRITY.md
            </p>
          </Section>

          <Section title="신고">
            <Empty text="신고 접수 기능은 아직 구현되지 않았습니다 (감사 문서 Gap 14 잔여)." />
          </Section>
        </>
      )}
    </div>
  );
}

// ── 표시 조각 ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pt-5">
      <p className="mb-2 text-[13px] font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-3">
      <p className="text-[11px] text-ink-2">{label}</p>
      <p className="mt-0.5 text-[18px] font-bold">{value.toLocaleString("ko-KR")}</p>
    </div>
  );
}

function Money({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-(--radius-card) border bg-surface p-3.5 ${
        highlight ? "border-primary ring-1 ring-primary/25" : "border-line"
      }`}
    >
      <p className={`text-[11px] ${highlight ? "font-semibold text-primary" : "text-ink-2"}`}>{label}</p>
      <p className="mt-0.5 text-[17px] font-bold tracking-tight">{won(value)}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-(--radius-card) border border-line bg-surface px-3 py-5 text-center text-[12px] text-ink-2">
      {text}
    </p>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: { key: string; cells: string[] }[];
  empty: string;
}) {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-line bg-surface">
      <table className="w-full min-w-[420px] text-left text-[11.5px]">
        <thead>
          <tr className="border-b border-line text-ink-2">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line last:border-b-0">
              {r.cells.map((c, i) => (
                <td key={i} className="px-3 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
