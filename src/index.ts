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
  voidPaymentRequestTool,
  handleVoidPaymentRequest,
  listPaymentRequestsTool,
  handleListPaymentRequests,
  payPaymentRequestTool,
  handlePayPaymentRequest,
  createRefundTool,
  handleCreateRefund,
  listMerchantsTool,
  handleListMerchants,
  getMerchantTool,
  handleGetMerchant,
  createMerchantTool,
  handleCreateMerchant,
} from "./tools/payments.js";

const server = new Server(
  { name: "centrapay-mcp", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    createPaymentRequestTool,
    getPaymentRequestTool,
    voidPaymentRequestTool,
    listPaymentRequestsTool,
    payPaymentRequestTool,
    createRefundTool,
    listMerchantsTool,
    getMerchantTool,
    createMerchantTool,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let text: string;

    switch (name) {
      case "create_payment_request":
        text = await handleCreatePaymentRequest(
          args as { configId: string; amount: number; currency: string; idempotencyKey?: string; externalRef?: string }
        );
        break;
      case "get_payment_status":
        text = await handleGetPaymentRequest(args as { id: string });
        break;
      case "void_payment_request":
        text = await handleVoidPaymentRequest(args as { id: string });
        break;
      case "list_payment_requests":
        text = await handleListPaymentRequests(args as { externalRef: string; merchantAccountId: string });
        break;
      case "pay_payment_request":
        text = await handlePayPaymentRequest(
          args as { id: string; assetType: string; assetId: string; idempotencyKey: string }
        );
        break;
      case "create_refund":
        text = await handleCreateRefund(
          args as { id: string; amount: number; currency: string; externalRef: string }
        );
        break;
      case "list_merchants":
        text = await handleListMerchants();
        break;
      case "get_merchant":
        text = await handleGetMerchant(args as { merchantId: string });
        break;
      case "create_merchant":
        text = await handleCreateMerchant(args as { accountId: string; name: string });
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
