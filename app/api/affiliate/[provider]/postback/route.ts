import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/commerce/providers/registry";
import { computeSplit, LEDGER_HOLD_DAYS } from "@/lib/commerce/revenue";
import { isBackendConfigured } from "@/lib/config";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * 제휴 postback/webhook 수신 — 전환·원장 쓰기의 유일한 HTTP 입구.
 *
 *  - provider 어댑터가 페이로드를 스키마 검증한다 (provider 값을 맹신하지 않는다)
 *  - 시크릿 검증·멱등 처리·전이 규칙은 전부 DB의 ingest_conversion RPC 안에서
 *    트랜잭션으로 수행된다 — 중복 webhook은 절대 중복 수익을 만들 수 없다
 *  - 원문 페이로드는 conversions.raw_payload에 그대로 보존된다 (audit)
 *  - 검증 실패는 postback_failures에 남는다 (운영 가시성)
 *
 * 인증: X-Postback-Secret 헤더 ↔ DB provider_secrets 대조 (RPC 내부).
 * mock provider의 개발 시크릿은 마이그레이션 참조 — 운영 전 반드시 교체.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const adapter = getProvider(provider);
  if (!adapter) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "backend not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-postback-secret") ?? "";
  if (!secret) {
    return NextResponse.json({ error: "missing postback secret" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = adapter.parseConversion(payload);
  if (!parsed.ok) {
    // 스키마 검증 실패 — audit 기록 후 거절 (시크릿이 틀리면 RPC가 거절 → 401)
    const { error } = await supabase.rpc("record_postback_failure", {
      p_provider: provider,
      p_secret: secret,
      p_reason: parsed.reason,
      p_raw: payload,
    });
    if (error?.message.includes("invalid provider secret")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "invalid payload", reason: parsed.reason }, { status: 400 });
  }

  const c = parsed.conversion;
  const split = computeSplit(c.commissionAmount);

  const { data, error } = await supabase.rpc("ingest_conversion", {
    p_provider: provider,
    p_secret: secret,
    p_external_conversion_id: c.externalConversionId,
    p_external_order_id: c.externalOrderId,
    p_click_id: c.clickId,
    p_gross: c.grossOrderValue,
    p_eligible: c.eligibleValue,
    p_commission: c.commissionAmount,
    p_currency: c.currency,
    p_status: c.status,
    p_occurred_at: c.occurredAt,
    p_creator_share_amount: split.creatorShare,
    p_platform_share_amount: split.platformShare,
    p_raw: payload,
    p_hold_days: LEDGER_HOLD_DAYS,
  });

  if (error) {
    if (error.message.includes("invalid provider secret")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error(`[postback] ingest failed: ${error.message}`);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}
