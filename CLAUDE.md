# centrapay-mcp — Claude Code Instructions

## What this project is

An MCP server for the Centrapay payments API (NZ). Enables Claude Code to create and test NZ payment flows — create payment requests, check status, cancel, and list asset types.

## Credentials

```
CENTRAPAY_API_KEY=your_sandbox_key
```

Get a sandbox key from docs.centrapay.com (contact integrations@centrapay.com).
Without credentials, the tools will return an error on every call — there is no free fallback (unlike xe-mcp).

## Build and test

```bash
npm install
npm run build   # TypeScript → dist/
npm test        # Jest — 22 tests, no API calls
```

## Architecture

```
src/
├── index.ts                    # MCP server (stdio transport)
├── centrapay-client.ts         # REST client — X-Api-Key auth
└── tools/
    └── payments.ts             # 10 tools: create, status, cancel, list_asset_types, create_merchant, get_merchant, list_webhook_events, list_payment_requests, simulate_payment, create_refund
```

## Adding a tool

1. Add a client method in `centrapay-client.ts`
2. Add tool definition + handler in `src/tools/payments.ts`
3. Import and register in `src/index.ts`
4. Write a unit test that tests formatting/validation without hitting the API

## Testing approach

Unit tests cover data formatting, validation, and status logic — no live API calls.
Integration tests (against the sandbox) are manual for now.

## Key Centrapay concepts

- **Payment request**: A merchant-side object with a URL the customer opens to pay
- **Asset type**: The payment method — NZD, Bitcoin, gift vouchers, etc.
- **Amount**: In the smallest currency unit (cents) — $25.00 NZD = 2500
- **Status**: `new` → `paid` | `cancelled` | `expired`
- **Merchant ID**: Required to create payment requests — from your sandbox account
