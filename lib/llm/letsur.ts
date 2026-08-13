import type { LlmProvider, ProviderResult, TextRequest, VisionRequest } from "./types";

/**
 * Letsur Platform 어댑터.
 *
 * 키 형식(`sk-…`)이 OpenAI 규약을 따르므로 **OpenAI 호환 Chat Completions**로 호출한다.
 * 다만 정확한 base URL은 환경마다 다를 수 있어 **하드코딩하지 않는다**:
 *   1) `LETSUR_BASE_URL`이 있으면 그 값만 사용한다 (권장 — 운영에서 확정)
 *   2) 없으면 표준 후보 경로를 순차 probe 하고, 처음 성공한 URL을 프로세스 메모리에 캐시한다
 *   3) 모두 실패하면 unavailable 을 반환해 상위 폴백(Gemini → 온디바이스)이 동작한다
 *
 * 실제로 어떤 base URL·모델이 유효한지는 `/api/vision-health` 로 확인할 수 있다.
 */

/**
 * base URL 후보.
 * 1순위는 프로덕션 probe 실측 결과 — `https://api.letsur.ai/v1` 만 실제 API 응답
 * (`403 {"message":"Forbidden"}` = 인증 없이 호출해 거부됨)을 돌려줬다.
 * 나머지: api.platform.letsur.ai = DNS 없음, platform.letsur.ai = 웹 콘솔(404 HTML).
 */
export const LETSUR_BASE_CANDIDATES = [
  "https://api.letsur.ai/v1",
  "https://api.letsur.ai",
  "https://api.platform.letsur.ai/v1",
  "https://platform.letsur.ai/api/v1",
];

/**
 * 인증 헤더 방식. 게이트웨이 응답이 AWS API Gateway 형식이라
 * `Authorization: Bearer` 와 `x-api-key` 를 모두 시도하고 성공한 쪽을 캐시한다.
 */
export type AuthStyle = "bearer" | "x-api-key";
export const AUTH_STYLES: AuthStyle[] = ["bearer", "x-api-key"];
let resolvedAuth: AuthStyle | null = null;

export function configuredAuthStyle(): AuthStyle | null {
  const raw = process.env.LETSUR_AUTH_STYLE?.trim().toLowerCase();
  return raw === "bearer" || raw === "x-api-key" ? raw : null;
}

/** 관리(Management) API 키 — 스페이스/멤버/키 조회용. 비전 호출에는 사용하지 않는다. */
export function letsurManagementKey(): string | undefined {
  return sanitizeKey(process.env.LETSUR_MANAGEMENT_KEY);
}

let resolvedBase: string | null = null;

export function configuredBase(): string | null {
  const raw = sanitizeKey(process.env.LETSUR_BASE_URL);
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/**
 * 환경변수 값 정리 — 붙여넣기 사고에 강하게.
 * 값에 줄바꿈/공백이 섞이거나 같은 키가 여러 번 들어가도 첫 토큰만 사용한다.
 * (HTTP 헤더에 줄바꿈이 들어가면 `Headers.append` 가 예외를 던져 전체 호출이 실패한다)
 */
export function sanitizeKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const first = raw
    .split(/[\s\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first || undefined;
}

/** 원본과 정리본이 다르면 경고 문구를 만든다 (진단용) */
export function keyWarning(raw?: string): string | null {
  if (!raw) return null;
  const clean = sanitizeKey(raw);
  if (!clean || clean === raw.trim()) return null;
  const repeats = raw.split(/[\s\r\n]+/).filter(Boolean).length;
  return `환경변수 값에 줄바꿈/중복이 있어 자동 정리했습니다 (원본 ${raw.length}자, 토큰 ${repeats}개 → ${clean.length}자 사용). Vercel 값에 키를 한 번만 넣어주세요.`;
}

export function letsurKey(): string | undefined {
  return sanitizeKey(process.env.LETSUR_API_KEY);
}

export function letsurKeyRaw(): string | undefined {
  return process.env.LETSUR_API_KEY;
}

export function letsurModel(): string {
  return sanitizeKey(process.env.LETSUR_MODEL) || "gpt-4o";
}

function authHeaders(key: string, style: AuthStyle = "bearer"): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (style === "bearer") h["Authorization"] = `Bearer ${key}`;
  else h["x-api-key"] = key;
  return h;
}

/** base URL 후보를 probe 해서 /models 가 200을 주는 URL(+인증 방식)을 찾는다 */
export async function discoverBaseUrl(key: string, timeoutMs = 6000): Promise<string | null> {
  const explicit = configuredBase();
  if (explicit) {
    if (!resolvedAuth) resolvedAuth = configuredAuthStyle() ?? (await discoverAuthStyle(explicit, key, timeoutMs));
    return explicit;
  }
  if (resolvedBase) return resolvedBase;

  for (const base of LETSUR_BASE_CANDIDATES) {
    for (const style of configuredAuthStyle() ? [configuredAuthStyle()!] : AUTH_STYLES) {
      try {
        const res = await fetch(`${base}/models`, {
          headers: authHeaders(key, style),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) {
          resolvedBase = base;
          resolvedAuth = style;
          return base;
        }
      } catch {
        // 다음 후보
      }
    }
  }
  return null;
}

/** 주소는 알지만 인증 방식이 불확실할 때 — 200을 주는 헤더 방식을 찾는다 */
async function discoverAuthStyle(base: string, key: string, timeoutMs = 6000): Promise<AuthStyle> {
  for (const style of AUTH_STYLES) {
    try {
      const res = await fetch(`${base}/models`, {
        headers: authHeaders(key, style),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return style;
    } catch {
      // 다음 방식
    }
  }
  return "bearer";
}

export interface ProbeEntry {
  base: string;
  status: number | "network-error";
  models?: string[];
  detail?: string;
  /** 이 후보로 어떤 키를 썼는지 (none = 인증 없이 호출) */
  auth: "service" | "management" | "none";
  /** 사용한 인증 헤더 방식 */
  authStyle?: AuthStyle;
  /**
   * 네트워크 정책(egress 프록시)이 막은 응답인지.
   * 이런 403은 "주소가 맞다"는 신호가 아니므로 판정에서 제외해야 한다.
   */
  blockedByProxy?: boolean;
}

/** 프록시 차단 응답 식별 — 실제 API의 401/403과 구분한다 */
export function isProxyBlock(status: number | "network-error", detail?: string): boolean {
  if (!detail) return false;
  return /not in allowlist|egress|network access|proxy/i.test(detail);
}

/**
 * 진단용 — 후보 base URL별 응답 상태를 그대로 보고한다.
 *
 * 키가 없어도 호출한다: 존재하지 않는 호스트는 network-error, 주소가 맞으면
 * 401/403(인증 필요)이 오므로 **키 없이도 올바른 base URL을 판별**할 수 있다.
 */
export async function probeAll(key?: string): Promise<ProbeEntry[]> {
  const bases = configuredBase() ? [configuredBase()!] : LETSUR_BASE_CANDIDATES;
  const mgmt = letsurManagementKey();
  const out: ProbeEntry[] = [];
  for (const base of bases) {
    // 키가 있으면 두 인증 방식을 모두 시도한다 (게이트웨이가 x-api-key를 쓸 수 있음)
    const attempts: { header: Record<string, string>; auth: ProbeEntry["auth"]; style?: AuthStyle }[] = key
      ? AUTH_STYLES.map((style) => ({ header: authHeaders(key, style), auth: "service" as const, style }))
      : mgmt
        ? AUTH_STYLES.map((style) => ({ header: authHeaders(mgmt, style), auth: "management" as const, style }))
        : [{ header: { "Content-Type": "application/json" }, auth: "none" as const }];

    for (const attempt of attempts) {
      try {
        const res = await fetch(`${base}/models`, {
          headers: attempt.header,
          signal: AbortSignal.timeout(6000),
        });
        const entry: ProbeEntry = { base, status: res.status, auth: attempt.auth, authStyle: attempt.style };
        const text = await res.text();
        if (res.ok) {
          try {
            const json = JSON.parse(text) as { data?: { id?: string }[] };
            entry.models = (json.data ?? []).map((m) => m.id ?? "").filter(Boolean).slice(0, 40);
          } catch {
            entry.detail = text.slice(0, 200);
          }
        } else {
          entry.detail = text.slice(0, 200);
        }
        if (isProxyBlock(entry.status, entry.detail)) entry.blockedByProxy = true;
        out.push(entry);
      } catch (e) {
        out.push({
          base,
          status: "network-error",
          detail: (e as Error).message.slice(0, 160),
          auth: attempt.auth,
          authStyle: attempt.style,
        });
      }
    }
  }
  return out;
}

/**
 * 실제 채팅 엔드포인트 probe — 가장 중요한 진단.
 *
 * AWS API Gateway는 **존재하지 않는 경로에도 403 `{"message":"Forbidden"}`** 을 돌려준다.
 * 따라서 `/models` 403 만으로는 인증 실패인지 경로 부재인지 알 수 없다.
 * 실제로 쓰는 `/chat/completions` 를 최소 payload로 호출해 응답 본문을 그대로 보고한다:
 *   - 400 "model not found" 류 → 인증 성공, 모델 이름만 바꾸면 됨
 *   - 401/403 → 인증/권한 문제
 *   - 200 → 즉시 사용 가능
 */
export async function probeChat(
  key: string,
  model = letsurModel()
): Promise<{ url: string; authStyle: AuthStyle; status: number | "network-error"; preview: string }[]> {
  const bases = configuredBase() ? [configuredBase()!] : LETSUR_BASE_CANDIDATES.slice(0, 2);
  const paths = ["/chat/completions"];
  const styles = configuredAuthStyle() ? [configuredAuthStyle()!] : AUTH_STYLES;
  const out: { url: string; authStyle: AuthStyle; status: number | "network-error"; preview: string }[] = [];

  for (const base of bases) {
    for (const path of paths) {
      for (const style of styles) {
        const url = `${base}${path}`;
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: authHeaders(key, style),
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout(12000),
          });
          out.push({
            url,
            authStyle: style,
            status: res.status,
            preview: (await res.text()).slice(0, 300),
          });
        } catch (e) {
          out.push({
            url,
            authStyle: style,
            status: "network-error",
            preview: (e as Error).message.slice(0, 160),
          });
        }
      }
    }
  }
  return out;
}

/**
 * 관리 API 탐색 — 문서 접근이 막힌 상태에서 실제 사용 가능한 경로를 찾기 위해
 * 관리 키로 대표 경로들을 조회한다. (프로덕션에서만 의미 있음)
 */
export async function probeManagement(): Promise<
  { url: string; status: number | "network-error"; preview?: string }[]
> {
  const mgmt = letsurManagementKey();
  if (!mgmt) return [];
  // 실측으로 확인된 호스트(api.letsur.ai) 기준 대표 경로
  const urls = [
    "https://api.letsur.ai/v1/spaces",
    "https://api.letsur.ai/v1/models",
    "https://api.letsur.ai/spaces",
    "https://api.letsur.ai/models",
  ];
  const out: { url: string; status: number | "network-error"; preview?: string }[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: authHeaders(mgmt),
        signal: AbortSignal.timeout(6000),
      });
      out.push({ url, status: res.status, preview: (await res.text()).slice(0, 300) });
    } catch (e) {
      out.push({ url, status: "network-error", preview: (e as Error).message.slice(0, 120) });
    }
  }
  return out;
}

async function chat(
  key: string,
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<ProviderResult<string>> {
  const t0 = Date.now();
  const base = await discoverBaseUrl(key);
  if (!base) {
    return { data: null, status: "unavailable", provider: "letsur", detail: "base url not resolved" };
  }
  const styles: AuthStyle[] = configuredAuthStyle()
    ? [configuredAuthStyle()!]
    : resolvedAuth
      ? [resolvedAuth]
      : AUTH_STYLES;

  try {
    let res!: Response;
    // 인증 방식이 미확정이면 Bearer → x-api-key 순으로 시도하고 성공한 쪽을 캐시
    for (const style of styles) {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: authHeaders(key, style),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status !== 401 && res.status !== 403) {
        resolvedAuth = style;
        break;
      }
    }
    const elapsedMs = Date.now() - t0;
    if (res.status === 429) {
      return { data: null, status: "quota", provider: "letsur", detail: "429", elapsedMs };
    }
    if (res.status === 401 || res.status === 403) {
      const detail = (await res.text()).slice(0, 160);
      return {
        data: null,
        status: "auth",
        provider: "letsur",
        detail: `${res.status} (bearer/x-api-key 모두 거부) ${detail}`,
        elapsedMs,
      };
    }
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return { data: null, status: "error", provider: "letsur", detail: `${res.status} ${detail}`, elapsedMs };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | { text?: string }[] } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.map((c) => c.text ?? "").join("")
          : "";
    if (!text) {
      return { data: null, status: "error", provider: "letsur", detail: "empty content", elapsedMs };
    }
    return { data: text, status: "ok", provider: "letsur", elapsedMs };
  } catch (e) {
    return {
      data: null,
      status: "unavailable",
      provider: "letsur",
      detail: (e as Error).message.slice(0, 160),
      elapsedMs: Date.now() - t0,
    };
  }
}

export const letsurProvider: LlmProvider = {
  name: "letsur",

  isConfigured() {
    return Boolean(letsurKey());
  },

  async visionJson(req: VisionRequest): Promise<ProviderResult<string>> {
    const key = letsurKey();
    if (!key) return { data: null, status: "unavailable", provider: "letsur", detail: "no key" };
    return chat(
      key,
      {
        model: letsurModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${req.prompt}\n\n${req.jsonHint}` },
              { type: "image_url", image_url: { url: req.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4096,
      },
      req.timeoutMs ?? 30000
    );
  },

  async textJson(req: TextRequest): Promise<ProviderResult<string>> {
    const key = letsurKey();
    if (!key) return { data: null, status: "unavailable", provider: "letsur", detail: "no key" };
    return chat(
      key,
      {
        model: letsurModel(),
        messages: [{ role: "user", content: req.prompt }],
        temperature: 0.2,
        max_tokens: 1500,
      },
      req.timeoutMs ?? 20000
    );
  },
};
