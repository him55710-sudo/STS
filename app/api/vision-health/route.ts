import { NextRequest, NextResponse } from "next/server";
import { letsurKey, letsurKeyRaw, letsurModel, configuredBase, probeAll, probeChat, probeManagement, letsurManagementKey, keyWarning, sanitizeKey, configuredAuthStyle, probeDiagnostic, interpretDiagnostic, probeBasePathSweep, interpretSweep } from "@/lib/llm/letsur";
import { providerChain, visionJson, extractJson } from "@/lib/llm";
import { isNaverConfigured, searchImages } from "@/lib/naver/api-hub";

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

/**
 * 네이버 API 실호출 진단 — API HUB 이관 반영.
 *
 * 쇼핑 검색(/v1/search/shop.json)은 2026-07-31 종료되어 더 이상 호출하지 않는다.
 * 대신 사용자가 실제 보유한 **이미지 검색**으로 계약(apihub/legacy)을 판별한다.
 */
async function checkNaver() {
  const configured = isNaverConfigured();
  const base = {
    configured,
    contractFromEnv: sanitizeKey(process.env.NAVER_API_CONTRACT) ?? null,
    clientIdPreview: (() => {
      const id = sanitizeKey(process.env.NAVER_APIGW_API_KEY_ID) ?? sanitizeKey(process.env.NAVER_CLIENT_ID);
      return id ? `${id.slice(0, 4)}…(len ${id.length})` : null;
    })(),
    secretConfigured: Boolean(
      sanitizeKey(process.env.NAVER_APIGW_API_KEY) ?? sanitizeKey(process.env.NAVER_CLIENT_SECRET)
    ),
    shoppingSearchApi:
      "종료됨 (2026-07-31, 개발자센터 이용약관 부칙 제2조 ③). API HUB에도 항목 없음 — 호출하지 않습니다.",
  };
  if (!configured) {
    return { ...base, live: null, hint: "네이버 인증 정보가 설정되지 않았습니다." };
  }

  // 실제 보유 API로 검증: 이미지 검색
  const res = await searchImages("니트", 3);
  if (res.ok) {
    return {
      ...base,
      live: {
        ok: true,
        contract: res.contract,
        httpStatus: res.httpStatus,
        elapsedMs: res.elapsedMs,
        total: res.total ?? null,
        sample: res.items.slice(0, 2).map((i) => ({
          title: (i.title ?? "").replace(/<[^>]+>/g, ""),
          thumbnail: i.thumbnail ? "(있음)" : "(없음)",
        })),
      },
      hint:
        res.contract === "apihub"
          ? "정상 — NAVER API HUB(NCP) 계약으로 연결됐습니다. 후보 상품의 색상 검증에 사용됩니다."
          : "정상 — 구 개발자센터(legacy) 계약으로 연결됐습니다. 2027-06-30 지원 종료 예정입니다.",
    };
  }
  const ERR_HINT: Record<string, string> = {
    "024": "인증 실패 또는 API 미등록 — errorMessage 가 'Scope Status Invalid' 면 콘솔에서 해당 API를 추가하세요. 'Authentication failed' 면 키/계약(호스트·헤더) 불일치입니다.",
    "012": "이 애플리케이션에 해당 API가 추가되어 있지 않습니다.",
    "101": "잘못된 요청 — 파라미터를 확인하세요.",
  };
  return {
    ...base,
    live: {
      ok: false,
      contract: res.contract ?? null,
      httpStatus: res.httpStatus ?? null,
      errorCode: res.errorCode ?? null,
      errorMessage: res.errorMessage ?? null,
      elapsedMs: res.elapsedMs,
    },
    hint:
      (res.errorCode && ERR_HINT[res.errorCode]) ??
      "네이버가 오류를 반환했습니다. errorCode/errorMessage를 확인하세요.",
  };
}

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
      keyWarning: keyWarning(letsurKeyRaw()),
      authStyleFromEnv: configuredAuthStyle(),
      baseUrlFromEnv: configuredBase(),
      model: letsurModel(),
      managementKeyConfigured: Boolean(letsurManagementKey()),
    },
    gemini: {
      keyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    },
    naverShopping: await checkNaver(),
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
  body.authStyleWorking = working?.authStyle ?? null;
  body.availableModels = working?.models ?? null;
  // 200이 없더라도 401/403은 "주소는 맞다"는 신호 — 단 프록시 차단 응답은 제외
  body.baseUrlLikely =
    working?.base ??
    probes.find((p) => !p.blockedByProxy && (p.status === 401 || p.status === 403))?.base ??
    null;
  body.blockedByNetworkPolicy = probes.some((p) => p.blockedByProxy);

  // 가장 중요한 진단: 실제 채팅 엔드포인트 호출 결과
  if (key) {
    body.chatProbes = await probeChat(key);
    const okChat = (body.chatProbes as { status: number | string }[]).find((c) => c.status === 200);
    body.letsurUsable = Boolean(okChat);

    // 403이 계속 나올 때 원인을 가른다 (인증 실패인가, 경로/게이트웨이 문제인가).
    // 대조군(무인증·가짜키·없는경로)과 AWS 오류 헤더로 판정한다.
    if (!okChat) {
      const diag = await probeDiagnostic(key);
      body.diagnostic = diag;
      body.diagnosis = interpretDiagnostic(diag);

      // 대조군이 전부 같으면 경로 문제인지 차단인지 한 번 더 가른다
      const allSame = new Set(diag.map((d) => `${d.status}|${d.body}`)).size === 1;
      if (allSame) {
        const sweep = await probeBasePathSweep();
        body.basePathSweep = sweep;
        body.sweepDiagnosis = interpretSweep(sweep);
      }
    }
  }

  // 환경변수 **이름만** 노출 — 값은 절대 노출하지 않는다.
  // "분명히 넣었는데 미설정으로 나온다" 상황의 원인(오타·다른 이름·미재배포)을 가르기 위함.
  body.envKeysPresent = Object.keys(process.env)
    .filter((k) => /^(LETSUR|NAVER|GEMINI|LLM)_/.test(k))
    .sort();

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
