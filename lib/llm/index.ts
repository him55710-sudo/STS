import { geminiProvider } from "./gemini";
import { letsurProvider } from "./letsur";
import type { LlmProvider, ProviderResult, TextRequest, VisionRequest } from "./types";

export { extractJson } from "./types";
export type { ProviderResult, ProviderStatus } from "./types";

/**
 * Provider 체인 — 앞에서부터 시도하고, 사용 불가/쿼터/오류면 다음으로 넘어간다.
 *
 * 기본 우선순위: **Gemini → Letsur**.
 * Letsur는 프로덕션 실측에서 게이트웨이 앞단 차단(모든 요청 403)으로 판정되어
 * 사용자 결정으로 보류됐다(2026-08, docs/VISION.md 판정 기록). 어댑터는 유지하되
 * 매 호출마다 죽은 provider에 왕복을 낭비하지 않도록 후순위로 내린다.
 * `LLM_PROVIDER=letsur` 로 강제 지정하면 다시 단독 1순위가 된다.
 */
export function providerChain(): LlmProvider[] {
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const all: LlmProvider[] = [geminiProvider, letsurProvider];
  if (forced === "gemini") return [geminiProvider];
  if (forced === "letsur") return [letsurProvider];
  return all.filter((p) => p.isConfigured());
}

/** 이미지 → JSON 텍스트. 체인 전체가 실패하면 마지막 실패 결과를 반환한다. */
export async function visionJson(req: VisionRequest): Promise<ProviderResult<string>> {
  const chain = providerChain();
  if (chain.length === 0) {
    return { data: null, status: "unavailable", provider: "none", detail: "no provider configured" };
  }
  let last: ProviderResult<string> = {
    data: null,
    status: "unavailable",
    provider: "none",
    detail: "not attempted",
  };
  for (const p of chain) {
    const r = await p.visionJson(req);
    if (r.status === "ok" && r.data) return r;
    console.warn(`[llm] ${p.name} vision ${r.status}: ${r.detail ?? ""}`);
    last = r;
  }
  return last;
}

/** 텍스트 → JSON 텍스트 (웹 검색 지원 provider 우선 활용) */
export async function textJson(req: TextRequest): Promise<ProviderResult<string>> {
  const chain = providerChain().filter((p) => typeof p.textJson === "function");
  let last: ProviderResult<string> = {
    data: null,
    status: "unavailable",
    provider: "none",
    detail: "no text provider",
  };
  for (const p of chain) {
    const r = await p.textJson!(req);
    if (r.status === "ok" && r.data) return r;
    console.warn(`[llm] ${p.name} text ${r.status}: ${r.detail ?? ""}`);
    last = r;
  }
  return last;
}
