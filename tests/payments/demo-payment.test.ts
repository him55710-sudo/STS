import { describe, expect, it } from "vitest";
import {
  DEMO_PAYMENT_ACCOUNT_DISCONNECTED,
  canUseDemoPayment,
  createConnectedDemoPaymentAccount,
} from "../../lib/demo-payment";

describe("demo account payments", () => {
  it("permits the demo payment only after the local demo account is connected", () => {
    // Given
    const disconnectedAccount = DEMO_PAYMENT_ACCOUNT_DISCONNECTED;
    const connectedAccount = createConnectedDemoPaymentAccount();

    // When
    const canPayWithoutAccount = canUseDemoPayment(disconnectedAccount);
    const canPayWithAccount = canUseDemoPayment(connectedAccount);

    // Then
    expect(canPayWithoutAccount).toBe(false);
    expect(canPayWithAccount).toBe(true);
  });
});
