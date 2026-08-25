/**
 * LLM Provider 추상화 — 비전 탐지·웹 상품 조사를 provider에 독립적으로 사용한다.
 * 새 provider는 이 인터페이스만 구현하면 파이프라인 코드 변경 없이 교체된다.
 */

export interface VisionRequest {
  /** data:image/...;base64,... */
  imageDataUrl: string;
  /** 시스템/작업 지시 프롬프트 */
  prompt: string;
  /** 응답 JSON 스키마 힌트 (프롬프트에 삽입되며, 지원 provider는 structured output으로도 사용) */
  jsonHint: string;
  timeoutMs?: number;
}

export interface TextRequest {
  prompt: string;
  /** 웹 검색 도구 사용 요청 (지원 provider만) */
  useWebSearch?: boolean;
  timeoutMs?: number;
}

export type ProviderStatus = "ok" | "quota" | "auth" | "unavailable" | "error";

export interface ProviderResult<T> {
  data: T | null;
  status: ProviderStatus;
  /** 실제 사용된 provider 이름 (letsur / gemini) */
  provider: string;
  /** 진단용 상세 (에러 메시지·HTTP 코드 등) */
  detail?: string;
  elapsedMs?: number;
}

export interface LlmProvider {
  name: string;
  /** 설정(키 등)이 존재해 시도할 가치가 있는지 */
  isConfigured(): boolean;
  /** 이미지 + 프롬프트 → JSON 텍스트 */
  visionJson(req: VisionRequest): Promise<ProviderResult<string>>;
  /** 텍스트 프롬프트 → 텍스트 (웹 검색 지원 시 활용) */
  textJson?(req: TextRequest): Promise<ProviderResult<string>>;
}

/** 코드펜스·서문이 섞인 응답에서 JSON 배열/객체만 안전하게 뽑아낸다 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  // 배열 우선 (탐지 결과는 배열)
  for (const [open, close] of [
    ["[", "]"],
    ["{", "}"],
  ] as const) {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // 다음 후보로
      }
    }
  }
  return null;
}
