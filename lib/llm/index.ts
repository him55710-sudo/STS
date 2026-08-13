import { geminiProvider } from "./gemini";
import { letsurProvider } from "./letsur";
import type { LlmProvider, ProviderResult, TextRequest, VisionRequest } from "./types";

export { extractJson } from "./types";
export type { ProviderResult, ProviderStatus } from "./types";

/**
 * Provider 체인 — 앞에서부터 시도하고, 사용 불가/쿼터/오류면 다음으로 넘어간다.
 * 기본 우선순위: Letsur → Gemini.
 * `LLM_PROVIDER=gemini|letsur` 로 강제 지정 가능(비교·롤백용).
 */
export function providerChain(): LlmProvider[] {
  const forced = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const all: LlmProvider[] = [letsurProvider, geminiProvider];
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
