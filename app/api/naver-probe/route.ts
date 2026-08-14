import { NextRequest, NextResponse } from "next/server";
import { contractConfigs, naverSearch, type SearchType, HUB_SEARCH_TYPES } from "@/lib/naver/api-hub";
import { searchWebkrProducts, searchImageTitleProducts } from "@/lib/naver/product-provider";

export const maxDuration = 20;

/**
 * 네이버 검색 진단 (읽기 전용, 시크릿 미노출).
 *
 *   GET /api/naver-probe?type=webkr&q=크림 니트   → 원본 items + provider 파싱 결과
 *   GET /api/naver-probe?type=image&q=크림 니트   → 이미지 검색 제목 기반 후보
 *   GET /api/naver-probe?type=shopcheck           → 종료된 쇼핑 검색 API 생사 실측
 *
 * 목적: 상품 provider의 파싱 품질을 프로덕션 실데이터로 검증·튜닝하기 위함.
 * display는 5로 고정해 검색 프록시로의 오남용을 막는다.
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "webkr";
  const q = (url.searchParams.get("q") ?? "크림 니트").slice(0, 60);

  if (type === "shopcheck") {
    // 종료된 쇼핑 API를 두 계약으로 1회씩 실측 — "정말 죽었는가"의 라이브 증거.
    // (RETIRED_SEARCH_TYPES 로 일반 코드 경로에서는 호출이 금지되어 있다)
    const out: Record<string, unknown>[] = [];
    for (const cfg of contractConfigs()) {
      const probeUrl =
        cfg.contract === "apihub"
          ? "https://naverapihub.apigw.ntruss.com/search/v1/shop?query=%EB%8B%88%ED%8A%B8&display=1"
          : "https://openapi.naver.com/v1/search/shop.json?query=%EB%8B%88%ED%8A%B8&display=1";
      try {
        const res = await fetch(probeUrl, { headers: cfg.headers, signal: AbortSignal.timeout(7000) });
        out.push({
          contract: cfg.contract,
          url: probeUrl.split("?")[0],
          status: res.status,
          body: (await res.text()).slice(0, 300),
        });
      } catch (e) {
        out.push({
          contract: cfg.contract,
          url: probeUrl.split("?")[0],
          status: "network-error",
          body: (e as Error).message.slice(0, 160),
        });
      }
    }
    return NextResponse.json(
      { check: "shop API 생사 실측", results: out },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (type === "image") {
    const parsed = await searchImageTitleProducts([q]);
    return NextResponse.json({ q, parsed }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!HUB_SEARCH_TYPES.includes(type as SearchType)) {
    return NextResponse.json({ error: `type must be one of ${HUB_SEARCH_TYPES.join(",")}` }, { status: 400 });
  }

  // 원본 응답과 provider 파싱 결과를 나란히 — 파싱 손실을 눈으로 확인
  const raw = await naverSearch<{ title: string; link: string; description?: string }>(
    type as SearchType,
    q,
    { display: 5 }
  );
  const parsed = type === "webkr" ? await searchWebkrProducts([q], 5) : [];
  return NextResponse.json(
    {
      q,
      raw: {
        ok: raw.ok,
        contract: raw.contract,
        httpStatus: raw.httpStatus,
        errorCode: raw.errorCode ?? null,
        errorMessage: raw.errorMessage ?? null,
        total: raw.total ?? null,
        items: raw.items.slice(0, 5).map((i) => ({
          title: i.title,
          link: i.link,
          description: (i.description ?? "").slice(0, 160),
        })),
      },
      parsed,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
