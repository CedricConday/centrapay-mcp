// Tests against the REAL source (not local reimplementations).
import { toMinorUnitString } from "../centrapay-client.js";
import { formatPaymentRequest } from "../tools/payments.js";

describe("toMinorUnitString (Centrapay amount = minor-unit STRING)", () => {
  test("number is stringified", () => {
    expect(toMinorUnitString(10000)).toBe("10000");
  });
  test("rounds non-integers (no fractional minor units)", () => {
    expect(toMinorUnitString(2500.4)).toBe("2500");
  });
  test("passes through a string unchanged", () => {
    expect(toMinorUnitString("2500")).toBe("2500");
  });
});

describe("formatPaymentRequest (defensive field picking)", () => {
  test("pulls known fields and keeps raw passthrough", () => {
    const pr = {
      id: "pr_abc",
      status: "new",
      value: { amount: "2500", currency: "NZD" },
      paymentUrl: "https://app.centrapay.com/pay/pr_abc",
      expiresAt: "2026-07-01T12:00:00Z",
    };
    const out = formatPaymentRequest(pr);
    expect(out).toContain("ID:       pr_abc");
    expect(out).toContain("Status:   new");
    expect(out).toContain("Amount:   2500 NZD");
    expect(out).toContain("URL:      https://app.centrapay.com/pay/pr_abc");
    expect(out).toContain("raw: ");
  });

  test("tolerates alternate field names via fallback (url, state)", () => {
    const pr = { paymentRequestId: "pr_x", state: "PAID", url: "https://x", value: { amount: "5", currency: "NZD" } };
    const out = formatPaymentRequest(pr);
    expect(out).toContain("pr_x");
    expect(out).toContain("PAID");
    expect(out).toContain("https://x");
  });

  test("missing fields render as em dash, never crash", () => {
    const out = formatPaymentRequest({});
    expect(out).toContain("ID:       —");
    expect(out).toContain("raw: {}");
  });
});
