// Unit tests for payment formatting and validation — no API calls

interface PaymentRequest {
  id: string;
  status: "new" | "paid" | "cancelled" | "expired";
  merchantName: string;
  value: { amount: number; currency: string };
  expiresAt: string;
  url: string;
}

function formatPaymentRequest(pr: PaymentRequest): string {
  return [
    `ID:          ${pr.id}`,
    `Status:      ${pr.status}`,
    `Merchant:    ${pr.merchantName}`,
    `Amount:      ${pr.value.amount} ${pr.value.currency}`,
    `Expires:     ${pr.expiresAt}`,
    `Payment URL: ${pr.url}`,
  ].join("\n");
}

function isValidCurrency(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

function isValidAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

const mockPaymentRequest: PaymentRequest = {
  id: "pr_abc123",
  status: "new",
  merchantName: "Test Merchant NZ",
  value: { amount: 2500, currency: "NZD" },
  expiresAt: "2026-07-01T12:00:00Z",
  url: "https://app.centrapay.com/pay/pr_abc123",
};

describe("payment request formatting", () => {
  test("formats all fields correctly", () => {
    const output = formatPaymentRequest(mockPaymentRequest);
    expect(output).toContain("ID:          pr_abc123");
    expect(output).toContain("Status:      new");
    expect(output).toContain("Merchant:    Test Merchant NZ");
    expect(output).toContain("Amount:      2500 NZD");
    expect(output).toContain("Expires:     2026-07-01T12:00:00Z");
    expect(output).toContain("Payment URL: https://app.centrapay.com/pay/pr_abc123");
  });

  test("handles paid status", () => {
    const paid = { ...mockPaymentRequest, status: "paid" as const };
    expect(formatPaymentRequest(paid)).toContain("Status:      paid");
  });

  test("handles cancelled status", () => {
    const cancelled = { ...mockPaymentRequest, status: "cancelled" as const };
    expect(formatPaymentRequest(cancelled)).toContain("Status:      cancelled");
  });
});

describe("input validation", () => {
  test("valid NZD currency code", () => {
    expect(isValidCurrency("NZD")).toBe(true);
  });

  test("valid USD currency code", () => {
    expect(isValidCurrency("USD")).toBe(true);
  });

  test("invalid currency codes rejected", () => {
    expect(isValidCurrency("nzd")).toBe(false);
    expect(isValidCurrency("NZDD")).toBe(false);
    expect(isValidCurrency("")).toBe(false);
    expect(isValidCurrency("12")).toBe(false);
  });

  test("valid amounts (smallest currency unit — cents)", () => {
    expect(isValidAmount(100)).toBe(true);  // $1.00 NZD
    expect(isValidAmount(2500)).toBe(true); // $25.00 NZD
    expect(isValidAmount(1)).toBe(true);
  });

  test("invalid amounts rejected", () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
    expect(isValidAmount(1.5)).toBe(false); // must be integer (cents)
  });
});

describe("Centrapay payment flow", () => {
  test("payment URL contains payment request ID", () => {
    const url = `https://app.centrapay.com/pay/${mockPaymentRequest.id}`;
    expect(url).toContain("pr_abc123");
  });

  test("status transitions are a known set", () => {
    const validStatuses = ["new", "paid", "cancelled", "expired"];
    expect(validStatuses).toContain(mockPaymentRequest.status);
  });

  test("amount is in smallest currency unit (cents)", () => {
    // $25.00 NZD = 2500 cents
    expect(mockPaymentRequest.value.amount).toBe(2500);
    expect(mockPaymentRequest.value.currency).toBe("NZD");
  });
});
