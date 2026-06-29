// Tests against the REAL source (not local reimplementations).
import {
  toMinorUnitString,
  createPaymentRequest,
  payPaymentRequest,
  refundPaymentRequest,
} from "../centrapay-client.js";
import { formatPaymentRequest } from "../tools/payments.js";

describe("toMinorUnitString (Centrapay amount = minor-unit STRING)", () => {
  test("number is stringified", () => {
    expect(toMinorUnitString(10000)).toBe("10000");
  });
  test("rejects non-integer amounts (guards the major-vs-minor-unit footgun)", () => {
    expect(() => toMinorUnitString(2500.4)).toThrow(/minor units/i);
  });
  test("rejects negative amounts", () => {
    expect(() => toMinorUnitString(-5)).toThrow(/minor units/i);
  });
  test("passes through a valid integer string unchanged", () => {
    expect(toMinorUnitString("2500")).toBe("2500");
  });
  test("rejects a non-numeric / major-unit string", () => {
    expect(() => toMinorUnitString("25.00")).toThrow(/minor units/i);
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

describe("client request contract (mocked fetch — asserts method/path/body)", () => {
  const origFetch = global.fetch;
  let captured: { url: string; init: any };

  beforeEach(() => {
    process.env.CENTRAPAY_API_KEY = "test-key";
    captured = { url: "", init: {} };
    global.fetch = jest.fn(async (url: any, init: any) => {
      captured = { url: String(url), init };
      return { ok: true, status: 200, text: async () => JSON.stringify({ id: "pr_1" }) } as any;
    }) as any;
  });
  afterEach(() => {
    global.fetch = origFetch;
  });

  test("create_payment_request → POST /payment-requests with configId + value", async () => {
    await createPaymentRequest({ configId: "cfg_1", amount: 2500, currency: "NZD" });
    expect(captured.init.method).toBe("POST");
    expect(captured.url).toMatch(/\/payment-requests$/);
    expect(captured.init.headers["x-api-key"]).toBe("test-key");
    expect(JSON.parse(captured.init.body)).toMatchObject({
      configId: "cfg_1",
      value: { amount: "2500", currency: "NZD" },
    });
  });

  test("pay → POST /payment-requests/:id/pay with assetType + idempotencyKey + assetId", async () => {
    await payPaymentRequest("pr_1", "centrapay.nzd.test", "idem-1", "asset-1");
    expect(captured.init.method).toBe("POST");
    expect(captured.url).toMatch(/\/payment-requests\/pr_1\/pay$/);
    expect(JSON.parse(captured.init.body)).toEqual({
      assetType: "centrapay.nzd.test",
      idempotencyKey: "idem-1",
      assetId: "asset-1",
    });
  });

  test("refund → POST /:id/refund MUST include idempotencyKey (prevents double-refund)", async () => {
    await refundPaymentRequest("pr_1", 2500, "NZD", "idem-refund-1", "ext-1");
    expect(captured.init.method).toBe("POST");
    expect(captured.url).toMatch(/\/payment-requests\/pr_1\/refund$/);
    const body = JSON.parse(captured.init.body);
    expect(body.idempotencyKey).toBe("idem-refund-1");
    expect(body).toMatchObject({ value: { amount: "2500", currency: "NZD" }, externalRef: "ext-1" });
  });
});
