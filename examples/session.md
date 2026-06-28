# Example Claude Code session using centrapay-mcp

Once centrapay-mcp is added to Claude Code with a sandbox API key:

---

**Q: Create a $25 NZD payment request for my test merchant.**

```
> create_payment_request merchantId="m_abc123" amount=2500 currency="NZD" description="Coffee"

ID:          pr_xyz789
Status:      new
Merchant:    Test Merchant NZ
Amount:      2500 NZD
Expires:     2026-07-01T12:00:00Z
Payment URL: https://app.centrapay.com/pay/pr_xyz789
```

→ Claude Code: "Payment request created. Share the URL with your test customer to complete the payment. It expires in 30 minutes."

---

**Q: Check if it's been paid.**

```
> get_payment_status id="pr_xyz789"

ID:          pr_xyz789
Status:      paid
Merchant:    Test Merchant NZ
Amount:      2500 NZD
Expires:     2026-07-01T12:00:00Z
Payment URL: https://app.centrapay.com/pay/pr_xyz789
```

---

**Q: What payment methods does Centrapay support?**

```
> list_asset_types

[
  { "id": "centrapay.nzd.main", "name": "NZD", ... },
  { "id": "bitcoin.main", "name": "Bitcoin", ... },
  { "id": "epay.nzd.main", "name": "Epay Gift Card", ... }
]
```

---

## Setup

```bash
claude mcp add centrapay-mcp node /path/to/centrapay-mcp/dist/index.js \
  -e CENTRAPAY_API_KEY=your_sandbox_key
```

Get sandbox access at docs.centrapay.com.
