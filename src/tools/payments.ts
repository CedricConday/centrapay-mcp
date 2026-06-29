import {
  createPaymentRequest,
  getPaymentRequest,
  voidPaymentRequest,
  listPaymentRequestsByExternalRef,
  payPaymentRequest,
  refundPaymentRequest,
  listMerchants,
  getMerchant,
  createMerchant,
  PaymentRequest,
  Merchant,
} from "../centrapay-client.js";

// Defensive: real response field names are confirmed only once a live `create`
// runs against a real merchant config. Pull known fields with fallbacks, then
// append the raw JSON so nothing is hidden if a name differs.
function pick(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return undefined;
}

export function formatPaymentRequest(pr: PaymentRequest): string {
  const o = pr as Record<string, unknown>;
  const value = (o.value ?? {}) as { amount?: string; currency?: string };
  const lines = [
    `ID:       ${pick(o, ["id", "paymentRequestId"]) ?? "—"}`,
    `Status:   ${pick(o, ["status", "state"]) ?? "—"}`,
    `Amount:   ${value.amount ?? "—"} ${value.currency ?? ""}`.trim(),
    `URL:      ${pick(o, ["paymentUrl", "url", "qrCodeUrl"]) ?? "—"}`,
    `Expires:  ${pick(o, ["expiresAt", "expiryTime"]) ?? "—"}`,
  ];
  return `${lines.join("\n")}\n\nraw: ${JSON.stringify(pr)}`;
}

function formatMerchant(m: Merchant): string {
  const o = m as Record<string, unknown>;
  return [
    `Merchant: ${pick(o, ["merchantId", "id"]) ?? "—"}`,
    `Name:     ${pick(o, ["name"]) ?? "—"}`,
    `raw: ${JSON.stringify(m)}`,
  ].join("\n");
}

// ---- create_payment_request ----
export const createPaymentRequestTool = {
  name: "create_payment_request",
  description:
    "Create a Centrapay payment request under a merchant config. Returns a payment URL and request id.",
  inputSchema: {
    type: "object",
    properties: {
      configId: { type: "string", description: "Merchant Config id the request is created under" },
      amount: { type: "number", description: "Amount in minor units (e.g. 10000 = $100.00 NZD)" },
      currency: { type: "string", description: "Currency code, e.g. NZD" },
      idempotencyKey: { type: "string", description: "Optional idempotency key" },
      externalRef: { type: "string", description: "Optional caller reference for later lookup" },
    },
    required: ["configId", "amount", "currency"],
  },
};
export async function handleCreatePaymentRequest(args: {
  configId: string;
  amount: number;
  currency: string;
  idempotencyKey?: string;
  externalRef?: string;
}): Promise<string> {
  return formatPaymentRequest(await createPaymentRequest(args));
}

// ---- get_payment_status ----
export const getPaymentRequestTool = {
  name: "get_payment_status",
  description: "Get the current status of a Centrapay payment request by id.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "Payment request id" } },
    required: ["id"],
  },
};
export async function handleGetPaymentRequest(args: { id: string }): Promise<string> {
  return formatPaymentRequest(await getPaymentRequest(args.id));
}

// ---- void_payment_request ----
export const voidPaymentRequestTool = {
  name: "void_payment_request",
  description: "Void (cancel) an active Centrapay payment request.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string", description: "Payment request id to void" } },
    required: ["id"],
  },
};
export async function handleVoidPaymentRequest(args: { id: string }): Promise<string> {
  const pr = await voidPaymentRequest(args.id);
  return `Voided ${args.id}.\n${formatPaymentRequest(pr)}`;
}

// ---- list_payment_requests (by externalRef) ----
export const listPaymentRequestsTool = {
  name: "list_payment_requests",
  description:
    "List payment requests matching an externalRef for a merchant account (Centrapay has no flat list-all).",
  inputSchema: {
    type: "object",
    properties: {
      externalRef: { type: "string", description: "The externalRef set at creation" },
      merchantAccountId: { type: "string", description: "Merchant account id to scope the lookup" },
    },
    required: ["externalRef", "merchantAccountId"],
  },
};
export async function handleListPaymentRequests(args: {
  externalRef: string;
  merchantAccountId: string;
}): Promise<string> {
  const items = await listPaymentRequestsByExternalRef(args.externalRef, args.merchantAccountId);
  if (items.length === 0) return "No payment requests found.";
  return items.map(formatPaymentRequest).join("\n\n---\n\n");
}

// ---- pay_payment_request (sandbox settle) ----
export const payPaymentRequestTool = {
  name: "pay_payment_request",
  description:
    "Settle a payment request in the sandbox. Requires an assetType and asset reference — used to test webhook/settlement flows.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Payment request id to pay" },
      assetType: { type: "string", description: "Asset type, e.g. centrapay.nzd.test" },
      assetId: { type: "string", description: "Asset id funding the payment" },
      idempotencyKey: { type: "string", description: "Idempotency key for the pay action" },
    },
    required: ["id", "assetType", "assetId", "idempotencyKey"],
  },
};
export async function handlePayPaymentRequest(args: {
  id: string;
  assetType: string;
  assetId: string;
  idempotencyKey: string;
}): Promise<string> {
  const pr = await payPaymentRequest(args.id, args.assetType, args.idempotencyKey, args.assetId);
  return `Paid ${args.id}.\n${formatPaymentRequest(pr)}`;
}

// ---- create_refund ----
export const createRefundTool = {
  name: "create_refund",
  description:
    "Refund a paid payment request. amount is in MINOR units (cents): 2500 = $25.00, must not exceed the original. Requires an idempotencyKey — a refund moves money irreversibly, so a retry without one would double-refund.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Payment request id to refund" },
      amount: { type: "number", description: "Refund amount in MINOR units (cents): 2500 = $25.00. Must not exceed the original." },
      currency: { type: "string", description: "Currency code, e.g. NZD" },
      idempotencyKey: {
        type: "string",
        description: "Unique key that makes the refund safe to retry (prevents a double-refund). Reuse the same key for the same logical refund.",
      },
      externalRef: { type: "string", description: "Caller reference for the refund" },
    },
    required: ["id", "amount", "currency", "idempotencyKey", "externalRef"],
  },
};
export async function handleCreateRefund(args: {
  id: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  externalRef: string;
}): Promise<string> {
  const r = await refundPaymentRequest(args.id, args.amount, args.currency, args.idempotencyKey, args.externalRef);
  return `Refund created for ${args.id}.\n${JSON.stringify(r, null, 2)}`;
}

// ---- list_merchants ----
export const listMerchantsTool = {
  name: "list_merchants",
  description: "List merchants visible to the API key.",
  inputSchema: { type: "object", properties: {} },
};
export async function handleListMerchants(): Promise<string> {
  const items = await listMerchants();
  if (items.length === 0) return "No merchants found for this key.";
  return items.map(formatMerchant).join("\n\n");
}

// ---- get_merchant ----
export const getMerchantTool = {
  name: "get_merchant",
  description: "Get details for a Centrapay merchant by id.",
  inputSchema: {
    type: "object",
    properties: { merchantId: { type: "string", description: "Merchant id" } },
    required: ["merchantId"],
  },
};
export async function handleGetMerchant(args: { merchantId: string }): Promise<string> {
  return formatMerchant(await getMerchant(args.merchantId));
}

// ---- create_merchant ----
export const createMerchantTool = {
  name: "create_merchant",
  description: "Create a merchant under an account.",
  inputSchema: {
    type: "object",
    properties: {
      accountId: { type: "string", description: "Account id the merchant belongs to" },
      name: { type: "string", description: "Merchant business name" },
    },
    required: ["accountId", "name"],
  },
};
export async function handleCreateMerchant(args: { accountId: string; name: string }): Promise<string> {
  return formatMerchant(await createMerchant(args));
}
