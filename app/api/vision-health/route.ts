import { NextRequest, NextResponse } from "next/server";
import { letsurKey, letsurModel, configuredBase, probeAll, probeManagement, letsurManagementKey } from "@/lib/llm/letsur";
import { providerChain, visionJson, extractJson } from "@/lib/llm";

export const maxDuration = 45;

/**
 * Vision provider 진단 엔드포인트.
 *
 *   GET /api/vision-health           → 설정 상태 + Letsur base URL 후보 probe 결과(+모델 목록)
 *   GET /api/vision-health?vision=1  → 작은 테스트 이미지로 실제 비전 호출까지 검증
 *
 * 개발 컨테이너에서 letsur.ai 로의 아웃바운드가 막혀 있어도, 배포 환경(Vercel)에서
 * 이 URL을 열면 어떤 base URL·모델이 실제로 동작하는지 즉시 확인할 수 있다.
 * 시크릿은 절대 응답에 포함하지 않는다 (설정 여부와 마스킹된 접두사만 노출).
 */

// 8x8 빨강/파랑 체크 PNG (비전 경로 왕복 확인용 최소 이미지)
const TEST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKklEQVR4nGP8z8Dwn4GKgImaho0aOGrgqIGjBo4aOGrgqIGjBo4aSGMDAaXbAgFPvnhLAAAAAElFTkSuQmCC";

const mask = (v?: string) => (v ? `${v.slice(0, 6)}…${v.slice(-3)} (len ${v.length})` : null);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const wantVision = url.searchParams.get("vision") === "1";

  const key = letsurKey();
  const body: Record<string, unknown> = {
    activeChain: providerChain().map((p) => p.name),
    forcedProvider: process.env.LLM_PROVIDER ?? null,
    letsur: {
      keyConfigured: Boolean(key),
      keyPreview: mask(key),
      baseUrlFromEnv: configuredBase(),
      model: letsurModel(),
      managementKeyConfigured: Boolean(letsurManagementKey()),
    },
    gemini: {
      keyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    },
    naverShopping: {
      configured: Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    },
    hint:
      "baseUrlWorking 이 null 이면 Letsur 문서의 정확한 base URL을 LETSUR_BASE_URL 환경변수로 지정하세요. " +
      "models 목록에서 비전 지원 모델을 골라 LETSUR_MODEL 로 지정하면 됩니다.",
  };

  // 키 유무와 무관하게 probe 한다 — 주소가 맞으면 401/403이 오므로
  // 키 없이도 올바른 base URL을 판별할 수 있다.
  const probes = await probeAll(key);
  body.probes = probes;
  const working = probes.find((p) => p.status === 200);
  body.baseUrlWorking = working?.base ?? null;
  body.availableModels = working?.models ?? null;
  // 200이 없더라도 401/403은 "주소는 맞다"는 강한 신호
  body.baseUrlLikely =
    working?.base ?? probes.find((p) => p.status === 401 || p.status === 403)?.base ?? null;

  const mgmt = await probeManagement();
  if (mgmt.length > 0) body.managementProbes = mgmt;

  if (wantVision) {
    const t0 = Date.now();
    const r = await visionJson({
      imageDataUrl: TEST_PNG,
      prompt: "Describe this tiny test image.",
      jsonHint: 'Return ONLY JSON: {"ok":true,"note":"<one short sentence>"}',
      timeoutMs: 25000,
    });
    body.visionTest = {
      provider: r.provider,
      status: r.status,
      elapsedMs: r.elapsedMs ?? Date.now() - t0,
      detail: r.detail ?? null,
      parsed: r.data ? extractJson(r.data) : null,
      rawPreview: r.data?.slice(0, 200) ?? null,
    };
  }

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
