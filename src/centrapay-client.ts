const BASE = "https://service.centrapay.com/api";

export interface PaymentRequest {
  id: string;
  status: "new" | "paid" | "cancelled" | "expired";
  merchantName: string;
  value: { amount: number; currency: string };
  expiresAt: string;
  url: string;
}

export interface CreatePaymentRequestParams {
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
}

function apiKey(): string {
  const key = process.env.CENTRAPAY_API_KEY;
  if (!key) throw new Error("CENTRAPAY_API_KEY must be set (get a sandbox key at docs.centrapay.com)");
  return key;
}

async function cpFetch<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "X-Api-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Centrapay API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function createPaymentRequest(
  params: CreatePaymentRequestParams
): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("POST", "/payment-requests", {
    merchantId: params.merchantId,
    value: { amount: params.amount, currency: params.currency },
    description: params.description,
  });
}

export async function getPaymentRequest(id: string): Promise<PaymentRequest> {
  return cpFetch<PaymentRequest>("GET", `/payment-requests/${id}`);
}

export async function cancelPaymentRequest(id: string): Promise<void> {
  await cpFetch("DELETE", `/payment-requests/${id}`);
}

export async function listAssetTypes(): Promise<unknown> {
  return cpFetch("GET", "/asset-types");
}

export interface Merchant {
  id: string;
  name: string;
  country: string;
  test?: boolean;
}

export interface CreateMerchantParams {
  name: string;
  country: string;
  test?: boolean;
}

export async function createMerchant(params: CreateMerchantParams): Promise<Merchant> {
  return cpFetch<Merchant>("POST", "/merchants", params);
}

export async function getMerchant(id: string): Promise<Merchant> {
  return cpFetch<Merchant>("GET", `/merchants/${id}`);
}

export interface WebhookEvent {
  id: string;
  type: string;
  merchantId: string;
  paymentRequestId: string;
  createdAt: string;
  value: { amount: number; currency: string };
}

export async function listWebhookEvents(merchantId: string): Promise<WebhookEvent[]> {
  const result = await cpFetch<{ items: WebhookEvent[] }>("GET", `/merchants/${merchantId}/webhook-events`);
  return result.items ?? [];
}

export async function listPaymentRequests(
  merchantId: string
): Promise<PaymentRequest[]> {
  const result = await cpFetch<{ items: PaymentRequest[] }>(
    "GET",
    `/payment-requests?merchantId=${merchantId}`
  );
  return result.items ?? [];
}

export async function simulatePayment(paymentRequestId: string): Promise<void> {
  await cpFetch("POST", `/payment-requests/${paymentRequestId}/pay`, {
    assetType: "centrapay.nzd.test",
    value: { amount: 0, currency: "NZD" },
  });
}

export interface Refund {
  id: string;
  paymentRequestId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export async function createRefund(
  paymentRequestId: string,
  amount: number,
  reason?: string
): Promise<Refund> {
  return cpFetch<Refund>("POST", `/payment-requests/${paymentRequestId}/refunds`, {
    amount,
    reason,
  });
}
