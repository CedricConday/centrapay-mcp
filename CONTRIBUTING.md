# Contributing to centrapay-mcp

Pull requests welcome. Here's how to work on this project.

## Quick start

```bash
git clone https://github.com/CedricConday/centrapay-mcp
cd centrapay-mcp
npm install
npm run build
npm test
```

## Adding a tool

1. Add a client method in `src/centrapay-client.ts`
2. Add tool definition + handler in `src/tools/payments.ts`
3. Import and register in `src/index.ts` (tools list + switch case)
4. Write unit tests in `src/__tests__/payments.test.ts` covering formatting and validation

See `handleCreateRefund` as a pattern example.

## Testing approach

- Unit tests cover formatting, validation, and status logic — no live API calls
- Tests run against pure TypeScript functions that mirror the live handlers
- All tests must pass before any PR is merged

## Credentials

You need a Centrapay sandbox API key for live integration testing:
- Contact integrations@centrapay.com
- Or see docs.centrapay.com

Without credentials, unit tests still pass — they don't call the API.

## Commit style

```
feat: short description of new tool or feature
fix: what broke and what changed
docs: README, CLAUDE.md, examples
test: new or updated tests
```

## What fits here

- Centrapay API endpoints documented at docs.centrapay.com
- Sandbox-specific tools clearly labeled as such
- All tools must have corresponding unit tests

## What doesn't fit

- Non-Centrapay payment APIs (use a separate MCP server)
- Tools without tests
- Client-side state management (this is a stateless API wrapper)
