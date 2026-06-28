import {
  createPaymentRequest,
  getPaymentRequest,
  cancelPaymentRequest,
  listAssetTypes,
  PaymentRequest,
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
