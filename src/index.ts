#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createPaymentRequestTool,
  handleCreatePaymentRequest,
  getPaymentRequestTool,
  handleGetPaymentRequest,
  cancelPaymentRequestTool,
  handleCancelPaymentRequest,
  listAssetTypesTool,
  handleListAssetTypes,
  createMerchantTool,
  handleCreateMerchant,
  getMerchantTool,
  handleGetMerchant,
  listWebhookEventsTool,
  handleListWebhookEvents,
  listPaymentRequestsTool,
  handleListPaymentRequests,
  simulatePaymentTool,
  handleSimulatePayment,
  createRefundTool,
  handleCreateRefund,
} from "./tools/payments.js";

const server = new Server(
  { name: "centrapay-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    createPaymentRequestTool,
    getPaymentRequestTool,
    cancelPaymentRequestTool,
    listAssetTypesTool,
    createMerchantTool,
    getMerchantTool,
    listWebhookEventsTool,
    listPaymentRequestsTool,
    simulatePaymentTool,
    createRefundTool,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let text: string;

    switch (name) {
      case "create_payment_request":
        text = await handleCreatePaymentRequest(args as { merchantId: string; amount: number; currency: string; description?: string });
        break;
      case "get_payment_status":
        text = await handleGetPaymentRequest(args as { id: string });
        break;
      case "cancel_payment_request":
        text = await handleCancelPaymentRequest(args as { id: string });
        break;
      case "list_asset_types":
        text = await handleListAssetTypes();
        break;
      case "create_merchant":
        text = await handleCreateMerchant(args as { name: string; country: string; test?: boolean });
        break;
      case "get_merchant":
        text = await handleGetMerchant(args as { id: string });
        break;
      case "list_webhook_events":
        text = await handleListWebhookEvents(args as { merchantId: string });
        break;
      case "list_payment_requests":
        text = await handleListPaymentRequests(args as { merchantId: string });
        break;
      case "simulate_payment":
        text = await handleSimulatePayment(args as { paymentRequestId: string });
        break;
      case "create_refund":
        text = await handleCreateRefund(args as { paymentRequestId: string; amount: number; reason?: string });
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return { content: [{ type: "text", text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
