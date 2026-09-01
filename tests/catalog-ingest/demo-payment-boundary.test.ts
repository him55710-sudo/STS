import { describe, expect, it } from "vitest";
import {
  DEMO_PAYMENT_ACCOUNT_DISCONNECTED,
  canUseDemoPayment,
  createConnectedDemoPaymentAccount,
} from "../../lib/demo-payment";

describe("demo payment boundary", () => {
  it("keeps demo payment local-only and disconnected by default", () => {
    expect(canUseDemoPayment(DEMO_PAYMENT_ACCOUNT_DISCONNECTED)).toBe(false);
    expect(createConnectedDemoPaymentAccount()).toMatchObject({
      kind: "connected",
      provider: "toss-demo",
    });
  });
});
