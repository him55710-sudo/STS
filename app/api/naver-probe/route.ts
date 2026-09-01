import { NextRequest, NextResponse } from "next/server";
import { contractConfigs, naverSearch, type SearchType, HUB_SEARCH_TYPES } from "@/lib/naver/api-hub";
import {
  searchWebkrProducts,
  searchImageTitleProducts,
  searchNaverProducts,
} from "@/lib/naver/product-provider";
import { authorizeAdminRequest } from "@/lib/admin/authorize";

interface WebkrRaw {
  title: string;
  link: string;
  description?: string;
}

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
  const authorization = await authorizeAdminRequest(req, {
    localAdminToken: process.env.STS_ADMIN_TOKEN,
    production: process.env.NODE_ENV === "production",
  });
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.reason },
      { status: authorization.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "webkr";
  const q = (url.searchParams.get("q") ?? "크림 니트").slice(0, 60);

  if (type === "shopcheck") {
    // 종료된 쇼핑 API를 두 계약으로 1회씩 실측 — "정말 죽었는가"의 라이브 증거.
    // (RETIRED_SEARCH_TYPES 로 일반 코드 경로에서는 호출이 금지되어 있다)
    const out: { readonly status: number | "network-error" }[] = [];
    for (const cfg of contractConfigs()) {
      const probeUrl =
        cfg.contract === "apihub"
          ? "https://naverapihub.apigw.ntruss.com/search/v1/shop?query=%EB%8B%88%ED%8A%B8&display=1"
          : "https://openapi.naver.com/v1/search/shop.json?query=%EB%8B%88%ED%8A%B8&display=1";
      try {
        const res = await fetch(probeUrl, { headers: cfg.headers, signal: AbortSignal.timeout(7000) });
        await res.text();
        out.push({ status: res.status });
      } catch {
        out.push({ status: "network-error" });
      }
    }
    return NextResponse.json(
      { check: "shop API 생사 실측", results: out },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (type === "image") {
    const parsed = await searchImageTitleProducts([q]);
    return NextResponse.json(
      { q, parsedCount: parsed.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (type === "product") {
    // 실제 상품 검색이 타는 경로 그대로 — webkr 등록 여부까지 한 번에 판정한다
    const [webkrRaw, combined] = await Promise.all([
      naverSearch<WebkrRaw>("webkr", q, { display: 5 }),
      searchNaverProducts([q]),
    ]);
    const bySource = combined.reduce<Record<string, number>>((acc, c) => {
      acc[c.source] = (acc[c.source] ?? 0) + 1;
      return acc;
    }, {});
    const webkrOk = webkrRaw.ok;
    return NextResponse.json(
      {
        q,
        webkr: {
          registered: webkrOk,
          httpStatus: webkrRaw.httpStatus ?? null,
          totalFromNaver: webkrRaw.total ?? null,
          mallPagesFound: bySource["naver-web"] ?? 0,
        },
        verdict: !webkrOk
          ? `webkr 미등록/오류 (${webkrRaw.httpStatus}) — 이미지 제목 폴백으로 동작 중입니다.`
          : (bySource["naver-web"] ?? 0) > 0
            ? `정상 — 웹문서 검색이 켜졌고 쇼핑몰 상품 페이지 ${bySource["naver-web"]}건을 직링크로 확보했습니다.`
            : "웹문서 검색은 켜졌지만 이 질의에선 쇼핑몰 페이지가 잡히지 않아 이미지 제목 폴백으로 채웠습니다.",
        candidatesBySource: bySource,
        candidateCount: combined.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!HUB_SEARCH_TYPES.includes(type as SearchType)) {
    return NextResponse.json({ error: `type must be one of ${HUB_SEARCH_TYPES.join(",")}` }, { status: 400 });
  }

  const raw = await naverSearch<{ title: string; link: string; description?: string }>(
    type as SearchType,
    q,
    { display: 5 }
  );
  const parsed = type === "webkr" ? await searchWebkrProducts([q], 5) : [];
  return NextResponse.json(
    {
      q,
      upstream: {
        ok: raw.ok,
        httpStatus: raw.httpStatus,
        total: raw.total ?? null,
      },
      parsedCount: parsed.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
