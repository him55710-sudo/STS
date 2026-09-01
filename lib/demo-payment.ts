export type DemoPaymentAccount =
  | { readonly kind: "not_connected" }
  | {
      readonly kind: "connected";
      readonly provider: "toss-demo";
      readonly bankName: "토스뱅크";
      readonly accountName: "나의 데모 계좌";
      readonly maskedNumber: "•••• 0921";
    };

export const DEMO_PAYMENT_ACCOUNT_DISCONNECTED = {
  kind: "not_connected",
} as const satisfies DemoPaymentAccount;

export function createConnectedDemoPaymentAccount(): DemoPaymentAccount {
  return {
    kind: "connected",
    provider: "toss-demo",
    bankName: "토스뱅크",
    accountName: "나의 데모 계좌",
    maskedNumber: "•••• 0921",
  };
}

export function canUseDemoPayment(account: DemoPaymentAccount): boolean {
  switch (account.kind) {
    case "not_connected":
      return false;
    case "connected":
      return true;
    default:
      return assertNever(account);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected demo payment account: ${JSON.stringify(value)}`);
}
