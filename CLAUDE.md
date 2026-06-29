# centrapay-mcp — Claude Code Instructions

## What this project is

An MCP server for the Centrapay payments API (NZ). Enables Claude Code to create and test NZ payment flows — payment requests, settlement, refunds, and merchant lookup. Speaks Centrapay's real model: **Account → Merchant Config (`configId`) → Payment Request**, with money as `{ amount: string (minor units), currency }`.

## Credentials

```
CENTRAPAY_API_KEY=your_key
```

Public test key documented at docs.centrapay.com/api/auth; for your own merchant config contact integrations@centrapay.com. There is no free fallback (unlike xe-mcp) — every call hits the live API. Auth header is `x-api-key`.

## Build and test

```bash
npm install
npm run build   # TypeScript → dist/
npm test        # Jest — tests the real source (no network)
```

## Architecture

```
src/
├── index.ts                    # MCP server (stdio transport) — 9 tools
├── centrapay-client.ts         # REST client — x-api-key auth, amount→minor-unit-string
└── tools/
    └── payments.ts             # tool defs + handlers, defensive response formatting
```

Tools: `create_payment_request`, `get_payment_status`, `void_payment_request`,
`list_payment_requests`, `pay_payment_request`, `create_refund`,
`list_merchants`, `get_merchant`, `create_merchant`.

## Adding a tool

1. Add a client method in `centrapay-client.ts` (match the real endpoint/method/body)
2. Add tool definition + handler in `src/tools/payments.ts`
3. Import and register in `src/index.ts`
4. Add a test against the real exported function

## Verification approach

The request contract (endpoints, methods, bodies, auth) is verified against the live
sandbox. Response field names are only confirmed once a live `create` runs under a real
`configId`, so formatting is defensive (known fields + fallbacks + raw passthrough).
Don't assert response shapes that haven't been observed live.

## Key Centrapay concepts

- **Merchant Config (`configId`)**: payment requests are created under this, not a bare merchant id
- **value**: `{ amount, currency }` where amount is minor units **as a string** — $25.00 NZD = `"2500"`
- **Pay**: sandbox settlement needs `assetType` (e.g. `centrapay.nzd.test`) + an asset reference + `idempotencyKey`
- **Void**: cancel is `POST /{id}/void` (not DELETE); **Refund** is `POST /{id}/refund` with `value` + `externalRef`
- **List**: no flat list-all — payment requests are looked up by `externalRef` + `merchantAccountId`
