"use client";

export type AttributionEventType =
  | "view_look"
  | "touch_region"
  | "select_step"
  | "watch_step"
  | "view_product"
  | "similar_shade_click"
  | "add_to_cart"
  | "bundle_add_to_cart"
  | "checkout_completed";

export type AttributionEvent = {
  id: string;
  type: AttributionEventType;
  timestamp: number;
  creatorHandle: string;
  region?: string;
  stepId?: string;
  productId?: string;
  productName?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
};

export type SettlementShare = {
  totalOrderAmount: number;
  grossMarginRate: number; // 20%
  totalCommission: number;
  creatorShareRate: number; // 70%
  stsShareRate: number; // 30%
  creatorSettlement: number;
  stsSettlement: number;
  currency: string;
};

const STORAGE_KEY = "sts_attribution_events_v1";

function getStoredEvents(): AttributionEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AttributionEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: AttributionEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-200)));
    window.dispatchEvent(new CustomEvent("sts_attribution_updated"));
  } catch {
    // Ignore storage quota errors
  }
}

export const AttributionEngine = {
  track(event: Omit<AttributionEvent, "id" | "timestamp">): AttributionEvent {
    const newEvent: AttributionEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    const events = getStoredEvents();
    events.push(newEvent);
    saveEvents(events);
    return newEvent;
  },

  getEvents(): AttributionEvent[] {
    return getStoredEvents();
  },

  calculateSettlement(orderAmount: number): SettlementShare {
    const grossMarginRate = 0.2; // 20% 플랫폼 제휴 마진
    const totalCommission = Math.round(orderAmount * grossMarginRate);
    const creatorShareRate = 0.7; // PDF 10p: Creator 70%
    const stsShareRate = 0.3; // PDF 10p: STS 30%
    const creatorSettlement = Math.round(totalCommission * creatorShareRate);
    const stsSettlement = totalCommission - creatorSettlement;

    return {
      totalOrderAmount: orderAmount,
      grossMarginRate,
      totalCommission,
      creatorShareRate,
      stsShareRate,
      creatorSettlement,
      stsSettlement,
      currency: "KRW",
    };
  },

  getTouchpointStats() {
    const events = getStoredEvents();
    const regionCounts: Record<string, number> = {
      lip: 0,
      cheek: 0,
      eye: 0,
      base: 0,
      skin: 0,
    };
    let bundleCartCount = 0;
    let singleCartCount = 0;
    let conversionCount = 0;
    let totalRevenue = 0;

    events.forEach((evt) => {
      if (evt.region && evt.region in regionCounts) {
        regionCounts[evt.region] += 1;
      }
      if (evt.type === "bundle_add_to_cart") bundleCartCount += 1;
      if (evt.type === "add_to_cart") singleCartCount += 1;
      if (evt.type === "checkout_completed") {
        conversionCount += 1;
        totalRevenue += evt.amount ?? 0;
      }
    });

    const totalTouches = Object.values(regionCounts).reduce((a, b) => a + b, 0);

    return {
      regionCounts,
      totalTouches,
      bundleCartCount,
      singleCartCount,
      conversionCount,
      totalRevenue,
      attributionWeights: {
        lip: totalTouches > 0 ? Math.round((regionCounts.lip / totalTouches) * 100) : 40,
        cheek: totalTouches > 0 ? Math.round((regionCounts.cheek / totalTouches) * 100) : 25,
        eye: totalTouches > 0 ? Math.round((regionCounts.eye / totalTouches) * 100) : 20,
        base: totalTouches > 0 ? Math.round((regionCounts.base / totalTouches) * 100) : 10,
        skin: totalTouches > 0 ? Math.round((regionCounts.skin / totalTouches) * 100) : 5,
      },
    };
  },

  clearEvents() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("sts_attribution_updated"));
  },
};
