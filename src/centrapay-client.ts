// Base URL is configurable so a non-production host can be targeted; it defaults
// to production. Centrapay has no separate "sandbox" host — test vs live is
// determined by your API key and the asset types you settle with, so money-moving
// calls (pay / refund) hit the LIVE service. See review 2026-06-29.
const BASE = process.env.CENTRAPAY_API_BASE ?? "https://service.centrapay.com/api";

// Centrapay money is { amount: string (minor units), currency }. Amount is a STRING.
export interface Money {
  amount: string;
  currency: string;
}

// Response shapes are intentionally loose: the real field names are only
// confirmed once we can run a live `create` against a real merchant config.
// Until then we keep raw passthrough + defensive formatting in the tools layer.
export type PaymentRequest = Record<string, unknown> & {
  id?: string;
  status?: string;
  value?: Money;
};

export type Merchant = Record<string, unknown> & {
  merchantId?: string;
  id?: string;
  name?: string;
};

function apiKey(): string {
  const key = process.env.CENTRAPAY_API_KEY;
  if (!key)
    throw new Error(
      "CENTRAPAY_API_KEY must be set. Public test key is documented at docs.centrapay.com/api/auth; for your own merchant config contact integrations@centrapay.com."
    );
  return key;
}

async function cpFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Centrapay API ${res.status} ${method} ${path}: ${text}`);
  }
  // Some endpoints (void) may return empty body.
  return (text ? JSON.parse(text) : {}) as T;
}

export function toMinorUnitString(amount: number | string): string {
  // Centrapay amounts are MINOR UNITS as a string ("2500" = $25.00). Reject
  // non-integers / non-numeric strings so a major-unit value (e.g. 25.5 dollars)
  // can't silently settle as the wrong amount. See review 2026-06-29.
  if (typeof amount === "string") {
    if (!/^\d+$/.test(amount.trim())) {
      throw new Error(
        `amount must be a whole number of minor units (cents) as a string, e.g. "2500" for $25.00 — got "${amount}"`
      );
    }
    return amount.trim();
  }
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error(
      `amount must be a non-negative whole number of MINOR units (cents), e.g. 2500 for $25.00 — got ${amount}. Do not pass major units (25 means $0.25, not $25.00).`
    );
  }
  return String(amount);
}

// ---- Payment requests ----

export interface CreatePaymentRequestParams {
  configId: string;
  amount: number | string;
  currency: string;
  idempotencyKey?: string;
  externalRef?: string;
  expirySeconds?: number;
}

export async function createPaymentRequest(p: CreatePaymentRequestParams): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("POST", "/payment-requests", {
    configId: p.configId,
    value: { amount: toMinorUnitString(p.amount), currency: p.currency },
    ...(p.idempotencyKey ? { idempotencyKey: p.idempotencyKey } : {}),
    ...(p.externalRef ? { externalRef: p.externalRef } : {}),
    ...(p.expirySeconds ? { expirySeconds: p.expirySeconds } : {}),
  });
}

export async function getPaymentRequest(id: string): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("GET", `/payment-requests/${id}`);
}

// Cancel is a void action (POST), not a DELETE.
export async function voidPaymentRequest(id: string): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("POST", `/payment-requests/${id}/void`, {});
}

// List is keyed by externalRef + merchantAccountId (no flat "list all").
export async function listPaymentRequestsByExternalRef(
  externalRef: string,
  merchantAccountId: string
): Promise<PaymentRequest[]> {
  const r = await cpFetch<{ items?: PaymentRequest[] }>(
    "GET",
    `/payment-requests/external-ref/${encodeURIComponent(externalRef)}?merchantAccountId=${encodeURIComponent(
      merchantAccountId
    )}`
  );
  return r.items ?? [];
}

// Sandbox settlement. Requires assetType + idempotencyKey + an asset reference.
export async function payPaymentRequest(
  id: string,
  assetType: string,
  idempotencyKey: string,
  assetId: string
): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("POST", `/payment-requests/${id}/pay`, {
    assetType,
    idempotencyKey,
    assetId,
  });
}

export async function refundPaymentRequest(
  id: string,
  amount: number | string,
  currency: string,
  idempotencyKey: string,
  externalRef: string
): Promise<PaymentRequest> {
  // idempotencyKey is REQUIRED: a refund moves money irreversibly, so a retried
  // call without one would double-refund. See review 2026-06-29.
  return cpFetch<PaymentRequest>("POST", `/payment-requests/${id}/refund`, {
    value: { amount: toMinorUnitString(amount), currency },
    idempotencyKey,
    externalRef,
  });
}

// ---- Merchants ----

export async function listMerchants(): Promise<Merchant[]> {
  const r = await cpFetch<{ items?: Merchant[] }>("GET", "/merchants");
  return r.items ?? [];
}

export async function getMerchant(merchantId: string): Promise<Merchant> {
  return cpFetch<Merchant>("GET", `/merchants/${merchantId}`);
}

export interface CreateMerchantParams {
  accountId: string;
  name: string;
}

export async function createMerchant(p: CreateMerchantParams): Promise<Merchant> {
  return cpFetch<Merchant>("POST", "/merchants", { accountId: p.accountId, name: p.name });
}
