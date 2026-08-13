import type { LlmProvider, ProviderResult, TextRequest, VisionRequest } from "./types";

/**
 * Gemini 어댑터 — Letsur 도입 후 **폴백 provider**로 유지한다.
 * (키가 없거나 Letsur가 우선이면 호출되지 않는다)
 */

function key(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

async function call(
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<ProviderResult<string>> {
  const k = key();
  if (!k) return { data: null, status: "unavailable", provider: "gemini", detail: "no key" };
  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent?key=${k}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    const elapsedMs = Date.now() - t0;
    if (res.status === 429) return { data: null, status: "quota", provider: "gemini", detail: "429", elapsedMs };
    if (res.status === 401 || res.status === 403)
      return { data: null, status: "auth", provider: "gemini", detail: `${res.status}`, elapsedMs };
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return { data: null, status: "error", provider: "gemini", detail: `${res.status} ${detail}`, elapsedMs };
    }
    const json = await res.json();
    const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("");
    if (!text) return { data: null, status: "error", provider: "gemini", detail: "empty", elapsedMs };
    return { data: text, status: "ok", provider: "gemini", elapsedMs };
  } catch (e) {
    return {
      data: null,
      status: "unavailable",
      provider: "gemini",
      detail: (e as Error).message.slice(0, 160),
      elapsedMs: Date.now() - t0,
    };
  }
}

export const geminiProvider: LlmProvider = {
  name: "gemini",

  isConfigured() {
    return Boolean(key());
  },

  async visionJson(req: VisionRequest): Promise<ProviderResult<string>> {
    const [meta, data] = req.imageDataUrl.split(",", 2);
    const mimeType = meta.slice(5, meta.indexOf(";"));
    return call(
      {
        contents: [
          {
            parts: [{ inlineData: { mimeType, data } }, { text: `${req.prompt}\n\n${req.jsonHint}` }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      },
      req.timeoutMs ?? 30000
    );
  },

  async textJson(req: TextRequest): Promise<ProviderResult<string>> {
    return call(
      {
        contents: [{ parts: [{ text: req.prompt }] }],
        ...(req.useWebSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.2 },
      },
      req.timeoutMs ?? 20000
    );
  },
};
