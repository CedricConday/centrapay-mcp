# centrapay-mcp

[![CI](https://github.com/CedricConday/centrapay-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/CedricConday/centrapay-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/centrapay-mcp.svg)](https://www.npmjs.com/package/centrapay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An MCP server for the [Centrapay](https://docs.centrapay.com) payments API — bring NZ payment-flow testing directly into Claude Code, Claude Desktop, and any MCP-compatible AI tool.

Ask Claude things like:
- *"Create a $25 NZD payment request under config X"*
- *"What's the status of payment request abc123?"*
- *"List the merchants on this account"*

---

## Centrapay's model

Centrapay is structured **Account → Merchant Config (`configId`) → Payment Request**. A payment request is always created under a merchant config, and money is expressed as a `value` object with the amount in **minor units as a string** (`{ "amount": "2500", "currency": "NZD" }` = $25.00).

This server speaks that model directly — endpoints, methods, and field names are matched to the live API (see *Verification* below).

---

## Tools

| Tool | What it does | Endpoint |
|---|---|---|
| `create_payment_request` | Create a request under a `configId` | `POST /payment-requests` |
| `get_payment_status` | Get a request by id | `GET /payment-requests/{id}` |
| `void_payment_request` | Void (cancel) a request | `POST /payment-requests/{id}/void` |
| `list_payment_requests` | List by `externalRef` for a merchant account | `GET /payment-requests/external-ref/{ref}` |
| `pay_payment_request` | Settle a paid request — **live call** (test vs live depends on key + `assetType`) | `POST /payment-requests/{id}/pay` |
| `create_refund` | Refund a paid request (`value` + `idempotencyKey` + `externalRef`) | `POST /payment-requests/{id}/refund` |
| `list_merchants` | Merchants visible to the API key | `GET /merchants` |
| `get_merchant` | Merchant details by id | `GET /merchants/{id}` |
| `create_merchant` | Create a merchant under an account | `POST /merchants` |

Auth is via the `x-api-key` header.

---

## Setup

**1. Credentials** — a public **test** key is documented at [docs.centrapay.com/api/auth](https://docs.centrapay.com/api/auth); for your own merchant config, contact [integrations@centrapay.com](mailto:integrations@centrapay.com).

**2. Install and build**

```bash
git clone https://github.com/CedricConday/centrapay-mcp
cd centrapay-mcp
npm install && npm run build
```

**3. Add to Claude Code**

```bash
claude mcp add centrapay-mcp node /path/to/centrapay-mcp/dist/index.js \
  -e CENTRAPAY_API_KEY=your_key
```

---

## Verification

The **request contract** (endpoints, methods, body shapes, `x-api-key` auth) is pinned by **contract tests** (`src/__tests__/payments.test.ts`) that mock `fetch` and assert the exact method, path, and body for `create` / `pay` / `refund` — including the required refund `idempotencyKey`. Note: Centrapay has **no separate sandbox host** — `service.centrapay.com` is production, and test vs live is determined by your API key and the asset types you settle with, so `pay` / `refund` are real money-moving calls. A full `create → pay → refund` round-trip needs a `configId` under your own merchant account, so response formatting stays **defensive** (known fields with fallbacks, plus raw passthrough) until pinned against a live create.

---

## Why

Centrapay builds the payment infrastructure NZ merchants use daily. I built this to understand their API from the outside — what integrating actually feels like, and where the friction is. If you're interviewing a candidate who already shipped a correct MCP server around your API, they've done the reading.

---

## Tests

```bash
npm test
# Tests run against the real source (not reimplemented copies):
# amount → minor-unit-string coercion, and defensive response formatting.
```

---

## Stack

TypeScript · Node.js · `@modelcontextprotocol/sdk` · Centrapay REST API

## License

MIT
