# centrapay-mcp

An MCP server for the [Centrapay](https://docs.centrapay.com) payments API — bring NZ payment flow testing directly into Claude Code, Claude Desktop, and any MCP-compatible AI tool.

Ask Claude things like:
- *"Create a $25 NZD payment request on merchant X"*
- *"What's the status of payment request abc123?"*
- *"What asset types does Centrapay support?"*

---

## Tools

| Tool | What it does |
|---|---|
| `create_payment_request` | Create a Centrapay payment request (returns URL + ID) |
| `get_payment_status` | Poll payment status by ID |
| `cancel_payment_request` | Cancel an active payment request |
| `list_asset_types` | All supported payment methods (NZD, crypto, vouchers) |
| `create_merchant` | Register a merchant account in the sandbox |
| `get_merchant` | Get merchant details by ID |
| `list_webhook_events` | List payment events (completed, cancelled, expired) |
| `list_payment_requests` | List all payment requests for a merchant |
| `simulate_payment` | Trigger sandbox payment completion (no QR scan needed) |
| `create_refund` | Initiate a refund on a completed payment |

---

## Setup

**1. Get sandbox credentials**

Contact [integrations@centrapay.com](mailto:integrations@centrapay.com) or see [docs.centrapay.com](https://docs.centrapay.com/api/introduction) to get sandbox API access.

**2. Install and build**

```bash
git clone https://github.com/CedricConday/centrapay-mcp
cd centrapay-mcp
npm install && npm run build
```

**3. Add to Claude Code**

```bash
claude mcp add centrapay-mcp node /path/to/centrapay-mcp/dist/index.js \
  -e CENTRAPAY_API_KEY=your_sandbox_key
```

---

## Why

Centrapay engineers build the payment infrastructure that NZ merchants use daily. I built this to understand their API from the outside — what it's like to integrate, where the friction is, what a developer hitting their docs for the first time actually experiences.

The tool is useful for testing payment flows without leaving Claude Code. It's also a signal: if you're interviewing at Centrapay and a candidate shows up having already shipped an MCP server around your API, they've done the reading.

---

## Amount formatting

Centrapay amounts are always in the **smallest currency unit** (like Stripe):

| Display | API value |
|---|---|
| $1.00 NZD | `100` |
| $25.00 NZD | `2500` |

---

## Tests

```bash
npm test
# Tests: 19 passed (payment formatting, merchant, webhook events, validation)
```

---

## Stack

TypeScript · Node.js · `@modelcontextprotocol/sdk` · Centrapay REST API

## License

MIT
