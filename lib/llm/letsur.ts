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
];

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

/** 진단용 — 후보별 응답 상태를 그대로 보고한다 */
export async function probeAll(key: string): Promise<
  { base: string; status: number | "network-error"; models?: string[]; detail?: string }[]
> {
  const bases = configuredBase() ? [configuredBase()!] : LETSUR_BASE_CANDIDATES;
  const out: { base: string; status: number | "network-error"; models?: string[]; detail?: string }[] = [];
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/models`, {
        headers: authHeaders(key),
        signal: AbortSignal.timeout(6000),
      });
      const entry: (typeof out)[number] = { base, status: res.status };
      const text = await res.text();
      if (res.ok) {
        try {
          const json = JSON.parse(text) as { data?: { id?: string }[] };
          entry.models = (json.data ?? []).map((m) => m.id ?? "").filter(Boolean).slice(0, 30);
        } catch {
          entry.detail = text.slice(0, 200);
        }
      } else {
        entry.detail = text.slice(0, 200);
      }
      out.push(entry);
    } catch (e) {
      out.push({ base, status: "network-error", detail: (e as Error).message.slice(0, 160) });
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
