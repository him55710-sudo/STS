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

/** 표준 OpenAI 호환 배치에서 흔한 경로 후보 (확정값 아님 — probe 대상) */
export const LETSUR_BASE_CANDIDATES = [
  "https://api.platform.letsur.ai/v1",
  "https://platform.letsur.ai/api/v1",
  "https://api.letsur.ai/v1",
  "https://api.platform.letsur.ai",
  "https://platform.letsur.ai/api",
];

/** 관리(Management) API 키 — 스페이스/멤버/키 조회용. 비전 호출에는 사용하지 않는다. */
export function letsurManagementKey(): string | undefined {
  return process.env.LETSUR_MANAGEMENT_KEY?.trim() || undefined;
}

let resolvedBase: string | null = null;

export function configuredBase(): string | null {
  const raw = process.env.LETSUR_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function letsurKey(): string | undefined {
  return process.env.LETSUR_API_KEY?.trim() || undefined;
}

export function letsurModel(): string {
  return process.env.LETSUR_MODEL?.trim() || "gpt-4o";
}

function authHeaders(key: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
}

/** base URL 후보를 probe 해서 /models 가 응답하는 첫 URL을 찾는다 */
export async function discoverBaseUrl(key: string, timeoutMs = 6000): Promise<string | null> {
  const explicit = configuredBase();
  if (explicit) return explicit;
  if (resolvedBase) return resolvedBase;

  for (const base of LETSUR_BASE_CANDIDATES) {
    try {
      const res = await fetch(`${base}/models`, {
        headers: authHeaders(key),
        signal: AbortSignal.timeout(timeoutMs),
      });
      // 200(정상) 또는 401/403(주소는 맞고 권한 이슈)이면 유효한 base로 간주
      if (res.ok || res.status === 401 || res.status === 403) {
        resolvedBase = base;
        return base;
      }
    } catch {
      // 다음 후보
    }
  }
  return null;
}

export interface ProbeEntry {
  base: string;
  status: number | "network-error";
  models?: string[];
  detail?: string;
  /** 이 후보로 어떤 키를 썼는지 (none = 인증 없이 호출) */
  auth: "service" | "management" | "none";
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
    const attempts: { header: Record<string, string>; auth: ProbeEntry["auth"] }[] = key
      ? [{ header: authHeaders(key), auth: "service" }]
      : mgmt
        ? [{ header: authHeaders(mgmt), auth: "management" }]
        : [{ header: { "Content-Type": "application/json" }, auth: "none" }];

    for (const attempt of attempts) {
      try {
        const res = await fetch(`${base}/models`, {
          headers: attempt.header,
          signal: AbortSignal.timeout(6000),
        });
        const entry: ProbeEntry = { base, status: res.status, auth: attempt.auth };
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
        });
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
  const urls = [
    "https://api.platform.letsur.ai/v1/spaces",
    "https://api.platform.letsur.ai/v1/models",
    "https://platform.letsur.ai/api/v1/spaces",
    "https://platform.letsur.ai/api/v1/models",
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
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: authHeaders(key),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsedMs = Date.now() - t0;
    if (res.status === 429) {
      return { data: null, status: "quota", provider: "letsur", detail: "429", elapsedMs };
    }
    if (res.status === 401 || res.status === 403) {
      return { data: null, status: "auth", provider: "letsur", detail: `${res.status}`, elapsedMs };
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
