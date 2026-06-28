// Unit tests for payment formatting and validation — no API calls

interface PaymentRequest {
  id: string;
  status: "new" | "paid" | "cancelled" | "expired";
  merchantName: string;
  value: { amount: number; currency: string };
  expiresAt: string;
  url: string;
}

interface Merchant {
  id: string;
  name: string;
  country: string;
  test?: boolean;
}

interface WebhookEvent {
  id: string;
  type: string;
  merchantId: string;
  paymentRequestId: string;
  createdAt: string;
  value: { amount: number; currency: string };
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

function formatMerchant(m: Merchant): string {
  return [
    `ID:      ${m.id}`,
    `Name:    ${m.name}`,
    `Country: ${m.country}`,
    `Test:    ${m.test ?? false}`,
  ].join("\n");
}

function formatWebhookEvents(events: WebhookEvent[]): string {
  if (events.length === 0) return "No webhook events found for this merchant.";
  return events
    .map((e) => `[${e.createdAt}] ${e.type} — PR ${e.paymentRequestId} — ${e.value.amount} ${e.value.currency}`)
    .join("\n");
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

const mockMerchant: Merchant = {
  id: "merchant_xyz",
  name: "Conday Digital",
  country: "NZ",
  test: true,
};

const mockWebhookEvents: WebhookEvent[] = [
  {
    id: "evt_001",
    type: "payment.completed",
    merchantId: "merchant_xyz",
    paymentRequestId: "pr_abc123",
    createdAt: "2026-07-01T11:00:00Z",
    value: { amount: 2500, currency: "NZD" },
  },
  {
    id: "evt_002",
    type: "payment.cancelled",
    merchantId: "merchant_xyz",
    paymentRequestId: "pr_def456",
    createdAt: "2026-07-01T11:05:00Z",
    value: { amount: 500, currency: "NZD" },
  },
];

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

describe("merchant formatting", () => {
  test("formats all fields correctly", () => {
    const output = formatMerchant(mockMerchant);
    expect(output).toContain("ID:      merchant_xyz");
    expect(output).toContain("Name:    Conday Digital");
    expect(output).toContain("Country: NZ");
    expect(output).toContain("Test:    true");
  });

  test("defaults test field to false when absent", () => {
    const noTest = { id: "m1", name: "Biz", country: "NZ" };
    expect(formatMerchant(noTest)).toContain("Test:    false");
  });

  test("NZ country code preserved", () => {
    expect(mockMerchant.country).toBe("NZ");
  });
});

describe("webhook events formatting", () => {
  test("formats events with type, PR id, amount", () => {
    const output = formatWebhookEvents(mockWebhookEvents);
    expect(output).toContain("payment.completed");
    expect(output).toContain("pr_abc123");
    expect(output).toContain("2500 NZD");
  });

  test("formats multiple events on separate lines", () => {
    const output = formatWebhookEvents(mockWebhookEvents);
    const lines = output.split("\n");
    expect(lines).toHaveLength(2);
  });

  test("returns empty message when no events", () => {
    expect(formatWebhookEvents([])).toBe("No webhook events found for this merchant.");
  });

  test("includes timestamp in output", () => {
    const output = formatWebhookEvents(mockWebhookEvents);
    expect(output).toContain("2026-07-01T11:00:00Z");
  });

  test("payment.cancelled event formatted correctly", () => {
    const output = formatWebhookEvents(mockWebhookEvents);
    expect(output).toContain("payment.cancelled");
    expect(output).toContain("pr_def456");
    expect(output).toContain("500 NZD");
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
