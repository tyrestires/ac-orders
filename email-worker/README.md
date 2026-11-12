# tyrestires-email-worker (v15)

Cloudflare Worker powering the TyresTires.ca automated invoice pipeline.

## What it does

1. **Receives orders** (`POST /quote-request`) from tyrestires.ca checkout → stores in KV as `pending:TT-XXXXXX`
2. **Sends branded quote email** to supplier via Resend with full order details + reply instructions
3. **Receives supplier reply** (CF Email Routing → `email` handler) → parses `Shipping $NNN` from body
4. **Creates Wave invoice** automatically: find/create customer → invoiceCreate → invoiceApprove → invoiceSend
5. **Updates KV** status: `quote_requested` → `invoiced`

## Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/quote-request` | Receive order from website |
| GET | `/ping` | Health check (returns `pong v15`) |
| GET | `/debug-read` | Read last KV entries |
| POST | `/debug-parse` | Test MIME parsing |

## Secrets required

```bash
wrangler secret put RESEND_API_KEY     # Resend transactional email API key
wrangler secret put SUPPLIER_EMAIL     # TEST: paul@pauljanzendesign.com / LIVE: manny@autocountry.ca
wrangler secret put WAVE_API_KEY       # Wave accounting GraphQL API key
wrangler secret put WAVE_BUSINESS_ID   # Wave business ID
```

## KV Namespace

- Binding: `PO_SENT`
- ID: `bffffc80cf67475db122b608eb45627c`
- Keys: `pending:TT-XXXXXX` (orders), `debug:last-email` (last parsed email)

## Go-live checklist

- [ ] Update `SUPPLIER_EMAIL` secret from test address to `manny@autocountry.ca`
- [ ] Verify CF Email Routing: `paul@tyrestires.ca` → `tyrestires-email-worker`
- [ ] Delete unused `hello-world-quiet-frost-2d99` worker from CF dashboard

## Pricing logic

Customer price = supplier price (under `$`) × 1.18 + $25/tire shipping
