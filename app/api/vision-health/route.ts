import { NextRequest, NextResponse } from "next/server";
import { letsurKey, probeAll, probeChat, probeManagement, probeDiagnostic, probeBasePathSweep } from "@/lib/llm/letsur";
import { visionJson } from "@/lib/llm";
import { isNaverConfigured, searchImages } from "@/lib/naver/api-hub";
import { isAliExpressConfigured } from "@/lib/affiliate/aliexpress";
import { authorizeAdminRequest } from "@/lib/admin/authorize";

export const maxDuration = 45;

/**
 * Vision provider 진단 엔드포인트.
 *
 *   GET /api/vision-health           → 설정 상태 + Letsur base URL 후보 probe 결과(+모델 목록)
 *   GET /api/vision-health?vision=1  → 작은 테스트 이미지로 실제 비전 호출까지 검증
 *
 * 개발 컨테이너에서 letsur.ai 로의 아웃바운드가 막혀 있어도, 배포 환경(Vercel)에서
 * 이 URL을 열면 어떤 base URL·모델이 실제로 동작하는지 즉시 확인할 수 있다.
 * 서버 측 admin 경계를 통과한 호출만 실행하며, 응답은 상태 요약만 포함한다.
 */

// 8x8 빨강/파랑 체크 PNG (비전 경로 왕복 확인용 최소 이미지)
const TEST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKklEQVR4nGP8z8Dwn4GKgImaho0aOGrgqIGjBo4aOGrgqIGjBo4aSGMDAaXbAgFPvnhLAAAAAElFTkSuQmCC";

/**
 * 네이버 API 실호출 진단 — API HUB 이관 반영.
 *
 * 쇼핑 검색(/v1/search/shop.json)은 2026-07-31 종료되어 더 이상 호출하지 않는다.
 * 대신 사용자가 실제 보유한 **이미지 검색**으로 계약(apihub/legacy)을 판별한다.
 */
async function checkNaver() {
  const configured = isNaverConfigured();
  const base = { configured };
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
        httpStatus: res.httpStatus,
        elapsedMs: res.elapsedMs,
      },
      hint: "네이버 이미지 검색 호출이 성공했습니다.",
    };
  }
  return {
    ...base,
    live: {
      ok: false,
      httpStatus: res.httpStatus ?? null,
      elapsedMs: res.elapsedMs,
    },
    hint: "네이버 이미지 검색 호출이 실패했습니다.",
  };
}

export async function GET(req: NextRequest) {
  const authorization = await authorizeAdminRequest(req, {
    localAdminToken: process.env.STS_ADMIN_TOKEN,
    production: process.env.NODE_ENV === "production",
  });
  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.reason },
      { status: authorization.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = new URL(req.url);
  const wantVision = url.searchParams.get("vision") === "1";

  const key = letsurKey();
  const body: Record<string, unknown> = {
    configured: {
      vision: Boolean(key),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      naver: isNaverConfigured(),
      aliExpress: isAliExpressConfigured(),
    },
    naverShopping: await checkNaver(),
    hint: "관리자 전용 진단 결과입니다. 상세 자격 증명과 provider 응답 본문은 반환하지 않습니다.",
  };

  // 키 유무와 무관하게 probe 한다 — 주소가 맞으면 401/403이 오므로
  // 키 없이도 올바른 base URL을 판별할 수 있다.
  const probes = await probeAll(key);
  body.probes = probes.map((probe) => ({
    status: probe.status,
    blockedByProxy: probe.blockedByProxy ?? false,
  }));
  const working = probes.find((p) => p.status === 200);
  body.baseUrlWorking = Boolean(working);
  body.availableModelCount = working?.models?.length ?? 0;
  // 200이 없더라도 401/403은 "주소는 맞다"는 신호 — 단 프록시 차단 응답은 제외
  body.baseUrlLikely =
    Boolean(working ?? probes.find((p) => !p.blockedByProxy && (p.status === 401 || p.status === 403)));
  body.blockedByNetworkPolicy = probes.some((p) => p.blockedByProxy);

  // 가장 중요한 진단: 실제 채팅 엔드포인트 호출 결과
  if (key) {
    const chatProbes = await probeChat(key);
    body.chatProbes = chatProbes.map((probe) => ({ status: probe.status }));
    const okChat = chatProbes.find((c) => c.status === 200);
    body.letsurUsable = Boolean(okChat);

    // 403이 계속 나올 때 원인을 가른다 (인증 실패인가, 경로/게이트웨이 문제인가).
    // 대조군(무인증·가짜키·없는경로)과 AWS 오류 헤더로 판정한다.
    if (!okChat) {
      const diag = await probeDiagnostic(key);
      body.diagnostic = diag.map((probe) => ({ case: probe.case, status: probe.status }));
      body.diagnosis = "diagnostic probes completed";

      // 대조군이 전부 같으면 경로 문제인지 차단인지 한 번 더 가른다
      const allSame = new Set(diag.map((d) => `${d.status}|${d.body}`)).size === 1;
      if (allSame) {
        const sweep = await probeBasePathSweep();
        body.basePathSweep = sweep.map((probe) => ({ case: probe.case, status: probe.status }));
        body.sweepDiagnosis = "base path sweep completed";
      }
    }
  }

  const mgmt = await probeManagement();
  if (mgmt.length > 0) body.managementProbes = mgmt.map((probe) => ({ status: probe.status }));

  if (wantVision) {
    const t0 = Date.now();
    const r = await visionJson({
      imageDataUrl: TEST_PNG,
      prompt: "Describe this tiny test image.",
      jsonHint: 'Return ONLY JSON: {"ok":true,"note":"<one short sentence>"}',
      timeoutMs: 25000,
    });
    body.visionTest = {
      status: r.status,
      elapsedMs: r.elapsedMs ?? Date.now() - t0,
      hasData: Boolean(r.data),
    };
  }

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
