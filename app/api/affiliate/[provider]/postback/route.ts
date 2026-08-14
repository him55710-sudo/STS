import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/commerce/providers/registry";
import { computeSplit, LEDGER_HOLD_DAYS } from "@/lib/commerce/revenue";
import { isBackendConfigured } from "@/lib/config";
import { evaluateConversionRisk, isImplausibleTimestamp } from "@/lib/integrity/fraud";
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

  // 미래 시각으로 온 전환은 신뢰할 수 없다 — 스키마는 통과해도 거절한다
  if (isImplausibleTimestamp(Date.parse(c.occurredAt), Date.now())) {
    await supabase.rpc("record_postback_failure", {
      p_provider: provider,
      p_secret: secret,
      p_reason: "occurred_at is in the future",
      p_raw: payload,
    });
    return NextResponse.json({ error: "invalid payload", reason: "future timestamp" }, { status: 400 });
  }

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

  // 결정적 사기 검사 — 중복 콜백·과거 전환 리플레이. 수익 계산에는 영향을 주지 않고
  // 감사 기록만 남긴다 (중복 수익 차단은 DB 제약이 이미 보장한다).
  const outcome = (data as { outcome?: string } | null)?.outcome;
  const conversionId = (data as { conversion_id?: string } | null)?.conversion_id;
  const flags = evaluateConversionRisk({
    outcome: (outcome ?? "created") as Parameters<typeof evaluateConversionRisk>[0]["outcome"],
    occurredAt: Date.parse(c.occurredAt),
    now: Date.now(),
    incomingCommission: c.commissionAmount,
  });
  for (const f of flags) {
    await supabase
      .rpc("record_fraud_flag", {
        p_provider: provider,
        p_secret: secret,
        p_kind: f.kind,
        p_severity: f.severity,
        p_subject_type: "conversion",
        p_subject_id: conversionId ?? c.externalConversionId,
        p_creator_id: null,
        p_reason: f.reason,
        p_detail: { external_conversion_id: c.externalConversionId, outcome },
      })
      .then(({ error: flagError }) => {
        if (flagError) console.warn(`[postback] flag failed: ${flagError.message}`);
      });
  }

  return NextResponse.json({ ...(data as object), flags: flags.map((f) => f.kind) });
}
