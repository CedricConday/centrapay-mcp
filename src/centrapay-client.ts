const BASE = "https://service.centrapay.com/api";

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
  // Centrapay expects amount in minor units as a string ("10000" = $100.00).
  return typeof amount === "string" ? amount : String(Math.round(amount));
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
  externalRef: string
): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("POST", `/payment-requests/${id}/refund`, {
    value: { amount: toMinorUnitString(amount), currency },
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
