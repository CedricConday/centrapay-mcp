import {
  createPaymentRequest,
  getPaymentRequest,
  cancelPaymentRequest,
  listAssetTypes,
  createMerchant,
  getMerchant,
  listWebhookEvents,
  listPaymentRequests,
  simulatePayment,
  createRefund,
  PaymentRequest,
  Merchant,
} from "../centrapay-client.js";

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

export const createPaymentRequestTool = {
  name: "create_payment_request",
  description:
    "Create a Centrapay payment request in the sandbox. Returns a payment URL and request ID.",
  inputSchema: {
    type: "object",
    properties: {
      merchantId: { type: "string", description: "Centrapay merchant ID (sandbox)" },
      amount: { type: "number", description: "Amount in the smallest currency unit (e.g. cents)" },
      currency: { type: "string", description: "Currency code (e.g. NZD)" },
      description: { type: "string", description: "Optional payment description" },
    },
    required: ["merchantId", "amount", "currency"],
  },
};

export async function handleCreatePaymentRequest(args: {
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
}): Promise<string> {
  const pr = await createPaymentRequest(args);
  return formatPaymentRequest(pr);
}

export const getPaymentRequestTool = {
  name: "get_payment_status",
  description: "Get the current status of a Centrapay payment request by ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Payment request ID returned by create_payment_request" },
    },
    required: ["id"],
  },
};

export async function handleGetPaymentRequest(args: { id: string }): Promise<string> {
  const pr = await getPaymentRequest(args.id);
  return formatPaymentRequest(pr);
}

export const cancelPaymentRequestTool = {
  name: "cancel_payment_request",
  description: "Cancel an active Centrapay payment request.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Payment request ID to cancel" },
    },
    required: ["id"],
  },
};

export async function handleCancelPaymentRequest(args: { id: string }): Promise<string> {
  await cancelPaymentRequest(args.id);
  return `Payment request ${args.id} cancelled.`;
}

export const listAssetTypesTool = {
  name: "list_asset_types",
  description: "List all Centrapay asset types (payment methods) available — NZD, crypto, vouchers.",
  inputSchema: { type: "object", properties: {} },
};

export async function handleListAssetTypes(): Promise<string> {
  const result = await listAssetTypes();
  return JSON.stringify(result, null, 2);
}

function formatMerchant(m: Merchant): string {
  return [
    `ID:      ${m.id}`,
    `Name:    ${m.name}`,
    `Country: ${m.country}`,
    `Test:    ${m.test ?? false}`,
  ].join("\n");
}

export const createMerchantTool = {
  name: "create_merchant",
  description: "Register a new merchant account in the Centrapay sandbox.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Business name" },
      country: { type: "string", description: "ISO country code (e.g. NZ)" },
      test: { type: "boolean", description: "Set true to create a test merchant (default true for sandbox)" },
    },
    required: ["name", "country"],
  },
};

export async function handleCreateMerchant(args: {
  name: string;
  country: string;
  test?: boolean;
}): Promise<string> {
  const m = await createMerchant({ ...args, test: args.test ?? true });
  return formatMerchant(m);
}

export const getMerchantTool = {
  name: "get_merchant",
  description: "Get details for a Centrapay merchant by ID.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Merchant ID" },
    },
    required: ["id"],
  },
};

export async function handleGetMerchant(args: { id: string }): Promise<string> {
  const m = await getMerchant(args.id);
  return formatMerchant(m);
}

export const listWebhookEventsTool = {
  name: "list_webhook_events",
  description: "List webhook events for a merchant — payment completions, cancellations, expirations.",
  inputSchema: {
    type: "object",
    properties: {
      merchantId: { type: "string", description: "Merchant ID to list events for" },
    },
    required: ["merchantId"],
  },
};

export async function handleListWebhookEvents(args: { merchantId: string }): Promise<string> {
  const events = await listWebhookEvents(args.merchantId);
  if (events.length === 0) return "No webhook events found for this merchant.";
  return events
    .map(
      (e) =>
        `[${e.createdAt}] ${e.type} — PR ${e.paymentRequestId} — ${e.value.amount} ${e.value.currency}`
    )
    .join("\n");
}

export const listPaymentRequestsTool = {
  name: "list_payment_requests",
  description: "List all payment requests for a merchant — see status, amounts, and expiry.",
  inputSchema: {
    type: "object",
    properties: {
      merchantId: { type: "string", description: "Merchant ID to list payment requests for" },
    },
    required: ["merchantId"],
  },
};

export async function handleListPaymentRequests(args: { merchantId: string }): Promise<string> {
  const requests = await listPaymentRequests(args.merchantId);
  if (requests.length === 0) return "No payment requests found for this merchant.";
  return requests.map(formatPaymentRequest).join("\n\n---\n\n");
}

export const simulatePaymentTool = {
  name: "simulate_payment",
  description: "Simulate a payment in the sandbox (triggers payment.completed). Sandbox only — use to test your webhook handlers without scanning a QR code.",
  inputSchema: {
    type: "object",
    properties: {
      paymentRequestId: { type: "string", description: "Payment request ID to simulate payment on" },
    },
    required: ["paymentRequestId"],
  },
};

export async function handleSimulatePayment(args: { paymentRequestId: string }): Promise<string> {
  await simulatePayment(args.paymentRequestId);
  return `Sandbox payment triggered for ${args.paymentRequestId}. Check list_webhook_events for the payment.completed event.`;
}

export const createRefundTool = {
  name: "create_refund",
  description: "Initiate a refund for a completed payment request. Amount must not exceed the original payment.",
  inputSchema: {
    type: "object",
    properties: {
      paymentRequestId: { type: "string", description: "Payment request ID to refund" },
      amount: { type: "number", description: "Amount to refund (smallest currency unit — cents)" },
      reason: { type: "string", description: "Optional refund reason" },
    },
    required: ["paymentRequestId", "amount"],
  },
};

export async function handleCreateRefund(args: {
  paymentRequestId: string;
  amount: number;
  reason?: string;
}): Promise<string> {
  const refund = await createRefund(args.paymentRequestId, args.amount, args.reason);
  return [
    `Refund ID:          ${refund.id}`,
    `Payment Request ID: ${refund.paymentRequestId}`,
    `Amount:             ${refund.amount} ${refund.currency}`,
    `Status:             ${refund.status}`,
    `Created:            ${refund.createdAt}`,
  ].join("\n");
}
