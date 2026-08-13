import type {
  AffiliateProviderAdapter,
  ParseConversionResult,
  TrackingUrlInput,
} from "./types";

/**
 * Mock provider — 실 네트워크 자격증명/문서 확보 전의 자리표시 구현.
 *
 *  - createTrackingUrl: 판매처 URL에 `stsclick` 파라미터만 부가한다.
 *    (검색 딥링크는 여분 쿼리 파라미터를 무시하므로 무해하다.
 *     실제 어댑터는 여기서 네트워크 딥링크를 생성한다.)
 *  - parseConversion: 아래 mock 페이로드 스키마를 엄격 검증한다.
 *    { conversion_id, order_id?, click_id?, order_value, eligible_value?,
 *      commission, currency?, status, occurred_at }
 */

const CLICK_PARAM = "stsclick";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(reason: string): ParseConversionResult {
  return { ok: false, reason };
}

export const mockProvider: AffiliateProviderAdapter = {
  id: "mock",

  createTrackingUrl({ offer, clickId }: TrackingUrlInput): string {
    const url = new URL(offer.affiliateUrl ?? offer.productUrl);
    url.searchParams.set(CLICK_PARAM, clickId);
    return url.toString();
  },

  parseConversion(payload: unknown): ParseConversionResult {
    if (payload == null || typeof payload !== "object" || Array.isArray(payload)) {
      return fail("payload must be a JSON object");
    }
    const p = payload as Record<string, unknown>;

    if (typeof p.conversion_id !== "string" || !p.conversion_id.trim()) {
      return fail("conversion_id (string) required");
    }
    if (typeof p.order_value !== "number" || !Number.isFinite(p.order_value) || p.order_value < 0) {
      return fail("order_value must be a non-negative number");
    }
    if (typeof p.commission !== "number" || !Number.isFinite(p.commission) || p.commission < 0) {
      return fail("commission must be a non-negative number");
    }
    if (p.commission > p.order_value) {
      return fail("commission cannot exceed order_value");
    }
    const eligible =
      p.eligible_value == null
        ? p.order_value
        : typeof p.eligible_value === "number" && Number.isFinite(p.eligible_value) && p.eligible_value >= 0
          ? p.eligible_value
          : null;
    if (eligible == null) return fail("eligible_value must be a non-negative number");
    if (eligible > p.order_value) return fail("eligible_value cannot exceed order_value");

    const status = p.status;
    if (status !== "pending" && status !== "confirmed" && status !== "reversed") {
      return fail("status must be pending | confirmed | reversed");
    }

    if (typeof p.occurred_at !== "string" || Number.isNaN(Date.parse(p.occurred_at))) {
      return fail("occurred_at must be an ISO datetime string");
    }

    let clickId: string | null = null;
    if (p.click_id != null) {
      if (typeof p.click_id !== "string" || !UUID_RE.test(p.click_id)) {
        return fail("click_id must be a uuid when present");
      }
      clickId = p.click_id.toLowerCase();
    }

    const currency = p.currency == null ? "KRW" : p.currency;
    if (typeof currency !== "string" || currency.length !== 3) {
      return fail("currency must be a 3-letter code");
    }

    return {
      ok: true,
      conversion: {
        externalConversionId: p.conversion_id.trim(),
        externalOrderId: typeof p.order_id === "string" && p.order_id.trim() ? p.order_id.trim() : null,
        clickId,
        grossOrderValue: p.order_value,
        eligibleValue: eligible,
        commissionAmount: p.commission,
        currency: currency.toUpperCase(),
        status,
        occurredAt: new Date(p.occurred_at as string).toISOString(),
      },
    };
  },
};
