import type { Post, TrackedEvent } from "./types";

/**
 * 데모용 시드 지표 — 크리에이터 콘솔이 비어 보이지 않도록 하는 기준값.
 * 실 서비스에서는 event pipeline 집계로 대체된다 (사업계획서 §10, §20).
 */
export interface PostStats {
  views: number;
  taps: number;
  cardOpens: number;
  outbound: number;
  saves: number;
}

export const SEED_STATS: Record<string, PostStats> = {
  "post-ootd": { views: 48200, taps: 3320, cardOpens: 2410, outbound: 1120, saves: 860 },
  "post-mug": { views: 21400, taps: 1980, cardOpens: 1350, outbound: 610, saves: 540 },
  "post-desk": { views: 36800, taps: 2540, cardOpens: 1720, outbound: 830, saves: 720 },
  "post-interior": { views: 52300, taps: 3010, cardOpens: 2130, outbound: 940, saves: 1130 },
  "post-beauty": { views: 18900, taps: 1420, cardOpens: 1010, outbound: 520, saves: 380 },
  "post-street": { views: 14600, taps: 890, cardOpens: 600, outbound: 260, saves: 210 },
};

const EMPTY: PostStats = { views: 0, taps: 0, cardOpens: 0, outbound: 0, saves: 0 };

/** 시드 + 라이브 이벤트를 합산해 post별 지표 산출 */
export function statsForPosts(posts: Post[], events: TrackedEvent[]): Map<string, PostStats> {
  const map = new Map<string, PostStats>();
  for (const p of posts) {
    map.set(p.id, { ...(SEED_STATS[p.id] ?? EMPTY) });
  }
  for (const ev of events) {
    if (!ev.postId) continue;
    const s = map.get(ev.postId);
    if (!s) continue;
    if (ev.type === "asset_view") s.views += 1;
    else if (ev.type === "object_tap") s.taps += 1;
    else if (ev.type === "card_open") s.cardOpens += 1;
    else if (ev.type === "outbound_click") s.outbound += 1;
    else if (ev.type === "post_save" || ev.type === "product_save") s.saves += 1;
  }
  return map;
}

export function totals(stats: Iterable<PostStats>): PostStats {
  const t = { ...EMPTY };
  for (const s of stats) {
    t.views += s.views;
    t.taps += s.taps;
    t.cardOpens += s.cardOpens;
    t.outbound += s.outbound;
    t.saves += s.saves;
  }
  return t;
}

export const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) : "0.0");

/** 예상 수익 (데모): outbound × 전환율 2.5% × AOV 7만원 × 수수료 5% × 크리에이터 몫 75% */
export const estimatedEarnings = (outbound: number) =>
  Math.round(outbound * 0.025 * 70000 * 0.05 * 0.75);
