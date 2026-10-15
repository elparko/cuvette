# Cuvette inference server

This server sells Claude access to Cuvette users who have no Anthropic key.
It is a Cloudflare Worker with a D1 database (the Cloudflare SQL database).
A user pays with Stripe and uses a prepaid balance in US dollars (USD).
The server forwards each request to the Anthropic Messages API with the key of the owner.

## Routes

| Route | Auth | Result |
| --- | --- | --- |
| `POST /v1/accounts` | none | 201 `{account_id, token}`. The limit is five accounts each hour for each IP address. |
| `GET /v1/account` | token | `{account_id, balance_usd}` |
| `POST /v1/checkout` | token | `{url}` of a Stripe Checkout session. Body: `{amount_usd}` with 10, 25 or 50. |
| `POST /v1/stripe/webhook` | Stripe signature | Adds credit for a paid `checkout.session.completed` event. |
| `POST /v1/messages` | token | Forwards to Anthropic. Accepts any query string. Only `beta=true` goes upstream. |

The token has the form `cuv_` and 43 characters. Send it as `Authorization: Bearer <token>`.
The server stores only the SHA-256 hash of the token.
The server does not log or store request or response bodies.

## How the server charges

1. The server reserves credit before it forwards a request.
   The reservation is the input estimate plus `max_tokens`, at the list price of the model, times `MARKUP`.
   The input estimate is the body size in bytes divided by two.
   The server limits `max_tokens` to 64000.
2. One conditional SQL update takes the reservation and adds one to `in_flight`.
   The update fails if the balance is too low (HTTP 402) or if `in_flight` is four or more (HTTP 429).
3. After the final usage, the server refunds the difference between the reservation and the real cost.
4. If the stream ends with no final usage, the server keeps the reservation.
   The charge is the input cost plus the full output reservation.
5. If Anthropic returns an HTTP error before any token, the server refunds the full reservation.

The server prices a request by the model in the `message_start` event, not by the model that the client asked for.
The server prices 5-minute and 1-hour cache writes separately.
`src/pricing.ts` must match the `PRICES` table in `src/core/spend.ts` of the Cuvette app.
A test fails if the two tables differ.

## Body rules

The server accepts only these top-level fields: `model`, `messages`, `system`, `max_tokens`, `tools`, `tool_choice`, `stream`, `thinking`, `metadata`, `output_config` and `fallbacks`.
The server rejects any other field with HTTP 400.
The server rejects every tool that has a `type` other than `custom`.
The server removes every `anthropic-beta` value except `server-side-fallback-2026-07-01`.

## Deploy

Run all commands in the `server/` folder. You need a Cloudflare account that has the `cuvette.ai` zone.

1. Install the packages: `npm install`
2. Log in to Cloudflare: `npx wrangler login`
3. Create the database: `npx wrangler d1 create cuvette-inference`
4. Copy the `database_id` from the output into `wrangler.toml`.
5. Apply the migrations to the remote database: `npx wrangler d1 migrations apply cuvette-inference --remote`
6. Set the three secrets. Wrangler asks for each value.
   - `npx wrangler secret put ANTHROPIC_API_KEY`
   - `npx wrangler secret put STRIPE_SECRET_KEY`
   - `npx wrangler secret put STRIPE_WEBHOOK_SECRET`
7. Deploy the Worker: `npx wrangler deploy`
   The `routes` entry in `wrangler.toml` attaches the custom domain `api.cuvette.ai`. Cloudflare creates the DNS record and the certificate.
8. Add the Stripe webhook endpoint in the Stripe Dashboard, under Developers, Webhooks.
   - URL: `https://api.cuvette.ai/v1/stripe/webhook`
   - Event: `checkout.session.completed`
9. Copy the signing secret of the endpoint (it starts with `whsec_`). Run step 6 again for `STRIPE_WEBHOOK_SECRET` with this value, then run `npx wrangler deploy`.
10. Check the Worker: `curl -X POST https://api.cuvette.ai/v1/accounts`. The answer must be HTTP 201 with a token.

Use a Stripe test key and a test webhook secret first. Replace them with live values when the test purchase works.

## Settings

| Name | Kind | Default | Use |
| --- | --- | --- | --- |
| `MARKUP` | variable | `1.25` | Factor on the list price. |
| `SITE_URL` | variable | `https://cuvette.ai` | Base of the Stripe success and cancel URLs. |
| `ANTHROPIC_API_KEY` | secret | none | Key that pays Anthropic. |
| `STRIPE_SECRET_KEY` | secret | none | Key that creates Checkout sessions. |
| `STRIPE_WEBHOOK_SECRET` | secret | none | Key that checks webhook signatures. |

## Tables

`schema.sql` and `migrations/0001_init.sql` must stay identical. A test checks this.

- `accounts`: id, token hash, balance in USD, `in_flight` count.
- `payments`: one row for each Stripe session. The primary key stops a second credit for the same session.
- `usage`: one row for each request, with token counts, cost and status.
- `signups`: count of new accounts for each IP hash and hour.

## Develop

1. Run the tests: `npm test`
2. Check the types: `npm run typecheck`
3. Run the Worker on your computer: `npx wrangler d1 migrations apply cuvette-inference --local`, then `npm run dev`

## Known limits

- A balance can go a little below zero after one request. The server accepts this.
- A Worker that stops during a stream leaves `in_flight` too high. Four such stops lock the account. Set `in_flight` to 0 for the account in D1 to fix it.
- The Workers rate-limit binding accepts only a period of 10 or 60 seconds. The limit of five accounts each hour uses the `signups` table instead.
- A model with an unknown name in `message_start` costs the highest list price.
