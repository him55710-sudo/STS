import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

/**
 * 웹 상품 검색 provider — Naver Shopping OpenAPI adapter.
 * https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
 *
 * NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 서버 환경변수에 있어야 동작하며,
 * 없으면 { candidates: [], provider: "none" } 을 반환하고 클라이언트는
 * 카탈로그 provider 결과만 사용한다 (graceful fallback).
 * secret은 절대 클라이언트로 노출되지 않는다 (server route 전용).
 */

interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
}

export async function POST(req: NextRequest) {
  let body: { queries?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const queries = (body.queries ?? []).filter((q) => typeof q === "string" && q.trim()).slice(0, 5);
  if (queries.length === 0) {
    return NextResponse.json({ error: "queries required" }, { status: 400 });
  }

  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    return NextResponse.json({ candidates: [], provider: "none" });
  }

  try {
    // 쿼리 variant를 순차가 아닌 병렬로, 상한을 두고 조회
    const results = await Promise.allSettled(
      queries.slice(0, 3).map(async (q) => {
        const res = await fetch(
          `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}&display=6&sort=sim`,
          {
            headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!res.ok) throw new Error(`naver ${res.status}`);
        const json = (await res.json()) as { items?: NaverItem[] };
        return json.items ?? [];
      })
    );

    // normalize + URL 기준 dedupe. 검색결과 페이지가 아닌 상품 상세로 연결되는
    // 네이버 카탈로그 링크를 우선한다.
    const seen = new Set<string>();
    const candidates = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((it) => {
        if (!it.link || seen.has(it.link)) return false;
        seen.add(it.link);
        return true;
      })
      .slice(0, 12)
      .map((it) => ({
        id: `naver-${it.productId}`,
        brand: it.brand || it.maker || null,
        productName: stripTags(it.title),
        category: it.category2 || it.category1 || null,
        color: null,
        price: { value: parseInt(it.lprice, 10) || null, currency: "KRW" },
        retailer: it.mallName || "네이버쇼핑",
        url: it.link,
        imageUrls: it.image ? [it.image] : [],
        source: "naver",
        // 신뢰도: 네이버 카탈로그(가격비교 상품 페이지) > 개별 몰 링크
        pageTrust: it.productType === "1" ? 0.85 : 0.6,
      }));

    return NextResponse.json({ candidates, provider: "naver" });
  } catch {
    return NextResponse.json({ candidates: [], provider: "error" });
  }
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");
