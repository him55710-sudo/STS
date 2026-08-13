/**
 * NAVER API HUB 어댑터 (서버 전용).
 *
 * ⚠️ 중요 — 2026-07 이관 및 쇼핑 검색 종료
 * 네이버 개발자센터 이용약관 부칙 제2조 ③ (시행 2026-07-31):
 *   "'Search API' 중 '쇼핑', '책', '학술정보' 데이터 제공 서비스는
 *    2026년 7월 31일 24:00부로 종료됩니다."
 * → `/v1/search/shop.json` 은 **되살릴 수 없다**. 재시도·키 교체로 해결되지 않는다.
 *
 * 이관 후 계약(contract)이 둘로 나뉜다:
 *   apihub : https://naverapihub.apigw.ntruss.com/search/v1/{type}
 *            헤더 X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY   (NCP 콘솔 발급)
 *   legacy : https://openapi.naver.com/v1/search/{type}.json
 *            헤더 X-Naver-Client-Id / X-Naver-Client-Secret      (구 개발자센터, 2027-06-30 종료 예정)
 *
 * 어느 계약인지 환경변수로 지정할 수 있고(NAVER_API_CONTRACT), 지정이 없으면
 * 두 계약을 모두 시도해 성공한 쪽을 프로세스 메모리에 캐시한다.
 */

export type NaverContract = "apihub" | "legacy";

/** API HUB로 이관된 검색 하위 API (쇼핑·책·학술정보는 종료되어 목록에 없다) */
export const HUB_SEARCH_TYPES = [
  "blog",
  "news",
  "image",
  "webkr",
  "cafearticle",
  "kin",
  "encyc",
  "local",
  "adult",
  "errata",
] as const;
export type SearchType = (typeof HUB_SEARCH_TYPES)[number];

/** 종료된 검색 타입 — 호출하면 안 된다 */
export const RETIRED_SEARCH_TYPES = ["shop", "book", "doc"] as const;

interface ContractConfig {
  contract: NaverContract;
  url: (type: SearchType) => string;
  headers: Record<string, string>;
}

const clean = (v?: string) =>
  v
    ?.split(/[\s\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)[0] || undefined;

/**
 * 환경변수 → 계약 설정.
 * 전용 변수(NAVER_APIGW_*)가 있으면 그걸 쓰고, 없으면 기존 NAVER_CLIENT_* 값을
 * 두 계약 모두에 시도한다 (값의 성격은 Client ID/Secret 으로 동일하다).
 */
export function contractConfigs(): ContractConfig[] {
  const apigwId = clean(process.env.NAVER_APIGW_API_KEY_ID) ?? clean(process.env.NAVER_CLIENT_ID);
  const apigwKey = clean(process.env.NAVER_APIGW_API_KEY) ?? clean(process.env.NAVER_CLIENT_SECRET);
  const legacyId = clean(process.env.NAVER_CLIENT_ID);
  const legacySecret = clean(process.env.NAVER_CLIENT_SECRET);

  const forced = clean(process.env.NAVER_API_CONTRACT)?.toLowerCase() as NaverContract | undefined;
  const list: ContractConfig[] = [];

  if (apigwId && apigwKey && forced !== "legacy") {
    list.push({
      contract: "apihub",
      url: (type) => `https://naverapihub.apigw.ntruss.com/search/v1/${type}`,
      headers: {
        "X-NCP-APIGW-API-KEY-ID": apigwId,
        "X-NCP-APIGW-API-KEY": apigwKey,
      },
    });
  }
  if (legacyId && legacySecret && forced !== "apihub") {
    list.push({
      contract: "legacy",
      url: (type) => `https://openapi.naver.com/v1/search/${type}.json`,
      headers: {
        "X-Naver-Client-Id": legacyId,
        "X-Naver-Client-Secret": legacySecret,
      },
    });
  }
  return list;
}

export function isNaverConfigured(): boolean {
  return contractConfigs().length > 0;
}

let resolvedContract: NaverContract | null = null;

export interface NaverSearchResult<T> {
  ok: boolean;
  contract?: NaverContract;
  httpStatus?: number;
  items: T[];
  total?: number;
  /** 두 계약 오류 형태를 모두 정규화: {error:{errorCode,message}} | {errorCode,errorMessage} */
  errorCode?: string;
  errorMessage?: string;
  elapsedMs?: number;
}

export interface ImageItem {
  title: string;
  link: string;
  thumbnail: string;
  sizeheight?: string;
  sizewidth?: string;
}

/**
 * 검색 호출 — 계약 자동 판별.
 * 성공한 계약을 캐시해 이후 호출은 1회 요청으로 끝난다.
 */
export async function naverSearch<T = unknown>(
  type: SearchType,
  query: string,
  params: Record<string, string | number> = {},
  timeoutMs = 7000
): Promise<NaverSearchResult<T>> {
  const configs = contractConfigs();
  if (configs.length === 0) {
    return { ok: false, items: [], errorMessage: "네이버 인증 정보가 설정되지 않았습니다." };
  }
  const ordered = resolvedContract
    ? [...configs.filter((c) => c.contract === resolvedContract), ...configs.filter((c) => c.contract !== resolvedContract)]
    : configs;

  let last: NaverSearchResult<T> = { ok: false, items: [] };
  for (const cfg of ordered) {
    const t0 = Date.now();
    const qs = new URLSearchParams({ query, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
    try {
      const res = await fetch(`${cfg.url(type)}?${qs}`, {
        headers: cfg.headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      const elapsedMs = Date.now() - t0;
      if (res.ok) {
        const json = JSON.parse(text) as { items?: T[]; total?: number };
        resolvedContract = cfg.contract;
        return {
          ok: true,
          contract: cfg.contract,
          httpStatus: res.status,
          items: json.items ?? [],
          total: json.total,
          elapsedMs,
        };
      }
      last = { ok: false, contract: cfg.contract, httpStatus: res.status, items: [], elapsedMs, ...parseError(text) };
    } catch (e) {
      last = {
        ok: false,
        contract: cfg.contract,
        items: [],
        errorMessage: (e as Error).message.slice(0, 160),
        elapsedMs: Date.now() - t0,
      };
    }
  }
  return last;
}

/** 두 층의 오류 형태를 하나로 정규화 */
function parseError(text: string): { errorCode?: string; errorMessage?: string } {
  try {
    const j = JSON.parse(text) as {
      error?: { errorCode?: string; message?: string };
      errorCode?: string;
      errorMessage?: string;
    };
    if (j.error) return { errorCode: j.error.errorCode, errorMessage: j.error.message };
    return { errorCode: j.errorCode, errorMessage: j.errorMessage };
  } catch {
    return { errorMessage: text.slice(0, 200) };
  }
}

/** 이미지 검색 — 상품 후보의 시각 검증(색상 비교)에 사용한다 */
export async function searchImages(query: string, display = 5): Promise<NaverSearchResult<ImageItem>> {
  return naverSearch<ImageItem>("image", query, { display, sort: "sim", filter: "all" });
}
