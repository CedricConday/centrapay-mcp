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
