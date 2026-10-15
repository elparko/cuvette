# Cuvette inference server

This server sells model access to Cuvette users who have no API key.
It is a Cloudflare Worker with a D1 database (the Cloudflare SQL database).
A user pays with Stripe and uses a prepaid balance in US dollars (USD).
The server forwards each request to an upstream with the key of the owner.
An upstream is the Anthropic Messages API or a host with an OpenAI-compatible chat completions API.
The table in `UPSTREAMS` chooses the upstream for each public model name.

## Routes

| Route | Auth | Result |
| --- | --- | --- |
| `POST /v1/accounts` | none | 201 `{account_id, token}`. The limit is five accounts each hour for each IP address. |
| `GET /v1/account` | token | `{account_id, balance_usd}` |
| `POST /v1/checkout` | token | `{url}` of a Stripe Checkout session. Body: `{amount_usd}` with 10, 25 or 50. |
| `POST /v1/stripe/webhook` | Stripe signature | Adds credit for a paid `checkout.session.completed` event. |
| `POST /v1/messages` | token | Forwards to an upstream of kind `anthropic`. Accepts any query string. Only `beta=true` goes upstream. |
| `POST /v1/messages/count_tokens` | token | Forwards to Anthropic `count_tokens`. No charge. The limit is 60 calls each minute for each account. |
| `POST /v1/chat/completions` | token | Forwards to an upstream of kind `openai`. Uses the OpenAI chat completions format. |
| `GET /v1/models` | token | `{object: "list", data: [{id, object, owned_by}]}`. The list has the public model names and nothing else. |

A model with kind `anthropic` on `/v1/chat/completions`, or kind `openai` on `/v1/messages`, gets HTTP 400.

The token has the form `cuv_` and 43 characters. Send it as `Authorization: Bearer <token>`.
The server stores only the SHA-256 hash of the token.
The server does not log or store request or response bodies.

## How the server charges

1. The server reserves credit before it forwards a request.
   The reservation is the input estimate plus `max_tokens`, at the list price of the model, times `MARKUP`.
   The input estimate is the body size in bytes divided by two.
   The server limits `max_tokens` to 64000.
2. One SQL batch takes the reservation and adds one row to the `in_flight` table.
   The batch fails if the balance is too low (HTTP 402) or if the account has four rows younger than 15 minutes (HTTP 429).
3. After the final usage, the server refunds the difference between the reservation and the real cost.
   The server then deletes the `in_flight` row.
4. If an `anthropic` stream ends with no final usage, the server keeps the input cost plus the full output reservation.
   If an `openai` response has no usage, the server keeps the full reservation.
5. If the upstream returns an HTTP error before any token, the server refunds the full reservation.
6. If the `in_flight` row is 15 minutes old or older at settle, or is gone, the server keeps the full reservation and does not refund.
   The usage row has the status `expired`.

A Worker that stops during a stream leaves its `in_flight` row. The row stops counting toward the limit after 15 minutes.
The server deletes old rows of an account when the account starts a new request.

For kind `anthropic`, the server prices a request by the model in the `message_start` event, not by the model that the client asked for.
For kind `openai`, the server prices a request by the public model name.
The server prices 5-minute and 1-hour cache writes separately.
For kind `openai`, the server reads `prompt_tokens`, `completion_tokens` and `prompt_tokens_details.cached_tokens`.
It charges `prompt_tokens` minus `cached_tokens` at the input price and `cached_tokens` at the cache read price.
For a stream, the server reads the last chunk that has `usage`.
`src/pricing.ts` must match the `PRICES` table in `src/core/spend.ts` of the Cuvette app.
A test fails if the two tables differ.

## Body rules

For `/v1/messages` and `/v1/messages/count_tokens`, the server accepts only these top-level fields:
`model`, `messages`, `system`, `max_tokens`, `tools`, `tool_choice`, `stream`, `thinking`, `metadata`, `output_config` and `fallbacks`.
`count_tokens` does not need `max_tokens`.
The server rejects every tool that has a `type` other than `custom`.
The server removes every `anthropic-beta` value except `server-side-fallback-2026-07-01`.

For `/v1/chat/completions`, the server accepts only these top-level fields:
`model`, `messages`, `tools`, `tool_choice`, `stream`, `max_tokens`, `max_completion_tokens`, `temperature`, `top_p`, `stop`, `response_format` and `stream_options`.
The server rejects every tool that has a `type` other than `function`.
If `stream` is true, the server sets `stream_options.include_usage` to true. The last chunk then carries the usage.
The server limits `max_tokens` and `max_completion_tokens` to `max_output_tokens` of the model.
If the client sends neither field, the server sets `max_tokens` to `max_output_tokens`.

Every route rejects any other field with HTTP 400.
Before the server forwards a request, it replaces `model` with `upstream_model`.

## Deploy

Run all commands in the `server/` folder. You need a Cloudflare account that has the `cuvette.ai` zone.

1. Install the packages: `npm install`
2. Log in to Cloudflare: `npx wrangler login`
3. Create the database: `npx wrangler d1 create cuvette-inference`
4. Copy the `database_id` from the output into `wrangler.toml`.
5. Apply the migrations to the remote database: `npx wrangler d1 migrations apply cuvette-inference --remote`
6. Set the three secrets. Wrangler asks for each value. Add one more secret for each other host (see "Add a host").
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
| `UPSTREAMS` | variable | the four Anthropic models | JSON table of public model names. See "Add a host". |
| `ANTHROPIC_API_KEY` | secret | none | Key that pays Anthropic. The default models use it. |
| `STRIPE_SECRET_KEY` | secret | none | Key that creates Checkout sessions. |
| `STRIPE_WEBHOOK_SECRET` | secret | none | Key that checks webhook signatures. |

## Add a host

`UPSTREAMS` is a JSON object. Each key is a public model name. The server adds each entry to the default table.
An entry with the name of a default model replaces that default model.
A key in the table is the only name that a client can use.

| Field | Meaning |
| --- | --- |
| `kind` | `anthropic` or `openai`. |
| `base_url` | Address of the API up to and including `/v1`. The server adds `/messages` or `/chat/completions`. |
| `key_secret_name` | Name of a Worker secret that holds the API key. The table never holds the key. |
| `upstream_model` | Model name that the server sends to the host. |
| `price` | USD for each million tokens: `input`, `output`, `cache_read`. |
| `max_output_tokens` | Largest output that the server allows. The server reserves credit for this size. |

`price.cache_read` is optional. The default is the input price.
For kind `anthropic`, `price.cache_write_5m` and `price.cache_write_1h` are optional. The defaults are 1.25 times and 2 times the input price.
For kind `openai`, cache writes cost 0.
The server reads `UPSTREAMS` on each request. A table that is not valid gives HTTP 500 and a log line.

To add an API host:

1. Get an API key from the host.
2. Set the key as a secret: `npx wrangler secret put HOST_API_KEY`
3. Add the entry to `[vars]` in `wrangler.toml`. Write the value as one line of JSON in single quotes:

   ```toml
   UPSTREAMS = '{"fast-model": {"kind": "openai", "base_url": "https://api.host.example/v1", "key_secret_name": "HOST_API_KEY", "upstream_model": "vendor/model-name", "price": {"input": 0.5, "output": 2, "cache_read": 0.05}, "max_output_tokens": 8000}}'
   ```

4. Deploy: `npx wrangler deploy`
5. Check the list: `curl -H "Authorization: Bearer <token>" https://api.cuvette.ai/v1/models`

Clients send `"model": "fast-model"` to `POST /v1/chat/completions`.

## Point a model at your own vLLM server

vLLM serves the OpenAI chat completions API. The move from a host to vLLM is a change of configuration only.

1. Start vLLM with an API key: `vllm serve <model> --api-key <key>`
   The server then checks `Authorization: Bearer <key>` on each request.
2. Make sure the Worker can reach the vLLM server over HTTPS or HTTP.
3. Set the key as a secret: `npx wrangler secret put VLLM_API_KEY`
4. In `UPSTREAMS`, change the entry of the model. Keep the public name. Change these fields:
   - `base_url`: `https://vllm.example.com/v1`
   - `key_secret_name`: `VLLM_API_KEY`
   - `upstream_model`: the name that vLLM shows at `/v1/models`
   - `price`: your own cost for each million tokens
   - `max_output_tokens`: a size that fits the context window of the model
5. Deploy: `npx wrangler deploy`

Clients keep the same public model name. They do not change.
If you start vLLM with no `--api-key`, vLLM ignores the key. The secret must still have a value.
vLLM reports cached prompt tokens in `prompt_tokens_details.cached_tokens` only if prefix caching is on.

## Tables

`schema.sql` is the migrations in order, joined with one empty line. A test checks this.

- `accounts`: id, token hash, balance in USD.
- `in_flight`: one row for each running request, with request id, account id and start time.
- `count_tokens_calls`: count of `count_tokens` calls for each account and minute.
- `payments`: one row for each Stripe session. The primary key stops a second credit for the same session.
- `usage`: one row for each request, with token counts, cost and status.
- `signups`: count of new accounts for each IP hash and hour.

## Develop

1. Run the tests: `npm test`
2. Check the types: `npm run typecheck`
3. Run the Worker on your computer: `npx wrangler d1 migrations apply cuvette-inference --local`, then `npm run dev`

## Known limits

- A balance can go a little below zero after one request. The server accepts this.
- A Worker that stops during a stream leaves an `in_flight` row. The account has fewer free slots for up to 15 minutes. The server keeps that reservation.
- `GET /v1/models` does not show the kind of a model. The client must know which route to use for each model.
- `count_tokens` forwards the body as it is. Anthropic rejects a field that `count_tokens` does not accept, for example `stream`.
- The Workers rate-limit binding accepts only a period of 10 or 60 seconds. The limit of five accounts each hour uses the `signups` table instead.
- A model with an unknown name in `message_start` costs the highest list price.
- A stream of kind `openai` that the client cuts before the usage chunk costs the full reservation.
