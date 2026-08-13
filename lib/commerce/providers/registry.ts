import { mockProvider } from "./mock-provider";
import type { AffiliateProviderAdapter } from "./types";

/**
 * Provider registry.
 *
 * 시드 프로그램의 provider 문자열("direct" | "linkprice" | "coupang-partners")은
 * 전부 mock 어댑터로 라우팅된다 — 공식 자격증명·문서 없이 실제 엔드포인트를
 * 지어내지 않는다는 원칙. 실연동 시 해당 키에 실 어댑터를 등록하면
 * /go 생성과 postback 파싱이 그 즉시 교체된다 (다른 코드는 무변경).
 */
const ADAPTERS: Record<string, AffiliateProviderAdapter> = {
  mock: mockProvider,
  // 실연동 전 자리표시 라우팅 — 전부 mock 구현으로 처리
  direct: mockProvider,
  linkprice: mockProvider,
  "coupang-partners": mockProvider,
};

export function getProvider(id: string): AffiliateProviderAdapter | null {
  return ADAPTERS[id] ?? null;
}

/** 판매처의 활성 프로그램 provider → 어댑터. 프로그램이 없으면 mock */
export function providerForProgram(providerId: string | null | undefined): AffiliateProviderAdapter {
  return (providerId && ADAPTERS[providerId]) || mockProvider;
}
