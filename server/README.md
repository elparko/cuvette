# Cuvette inference server

This server sells model access to Cuvette users who have no API key.
It is a Cloudflare Worker with a D1 database (the Cloudflare SQL database).
A user signs in with Google, Microsoft, ORCID or GitHub.
The user then buys a plan or a top-up with Stripe.
The server forwards each request to an upstream with the key of the owner.
An upstream is the Anthropic Messages API or a host with an OpenAI-compatible chat completions API.
The table in `UPSTREAMS` chooses the upstream for each public model name.

Hosted mode is off at launch. Set `HOSTED_ENABLED` to `"true"` to open it. See "Open hosted mode".

## Routes

| Route | Auth | Result |
| --- | --- | --- |
| `GET /v1/pricing` | none | Plans, top-up, model prices, the list of what the server records. This route works while hosted mode is off. |
| `GET /v1/auth/start` | none | Redirects to the sign-in provider. See "Sign-in". |
| `GET /v1/auth/callback/<provider>` | none | Receives the answer of the provider. Redirects to the app. |
| `POST /v1/auth/token` | none | Body `{code, verifier, device_name}`. Answer `{token, device_id, account_id}`. The limit is 10 calls each minute for each IP address. |
| `POST /v1/auth/link` | token | Body `{provider, port, challenge, state}`. Answer `{url}`. Adds a sign-in provider to the account. |
| `POST /v1/auth/logout` | token | 204. Revokes the device that makes the call. |
| `GET /v1/devices` | token | `{devices: [{id, name, created_at, last_used_at, current}]}` |
| `DELETE /v1/devices/<id>` | token | 204. Revokes a device of the account. 404 if the device is not in the account. |
| `GET /v1/account` | token | Identities, plan, allowance, top-ups, estimate of analyses left, models. |
| `GET /v1/usage` | token | Query `from`, `to` and `format` (`json` or `csv`). The range is 90 days or less. |
| `POST /v1/checkout` | token | Body `{plan, interval}` or `{topup: true}`. Answer `{url}` of a Stripe Checkout session. |
| `POST /v1/plan` | token | Body `{plan, interval}`. Answer `{status, effective_at}`. `status` is `changed` or `scheduled`. |
| `POST /v1/billing/portal` | token | Answer `{url}` of the Stripe Customer Portal. |
| `POST /v1/stripe/webhook` | Stripe signature | Applies the Stripe events in "Stripe events". |
| `POST /v1/messages` | token | Forwards to an upstream of kind `anthropic`. Accepts any query string. Only `beta=true` goes upstream. |
| `POST /v1/messages/count_tokens` | token | Forwards to Anthropic `count_tokens`. No charge. The limit is 60 calls each minute for each account. |
| `POST /v1/chat/completions` | token | Forwards to an upstream of kind `openai`. Uses the OpenAI chat completions format. |
| `GET /v1/models` | token | `{object: "list", data: [{id, object, owned_by}]}`. The list has the public model names and nothing else. |
| `GET /v1/admin/costs` | admin secret | Mean cost for each session and for each plan over 30 days. |

While `HOSTED_ENABLED` is not `"true"`, every route except `GET /v1/pricing` answers HTTP 503:
`{"type":"error","error":{"type":"hosted_off","message":"Cuvette hosted is not open yet."}}`

A model with kind `anthropic` on `/v1/chat/completions`, or kind `openai` on `/v1/messages`, gets HTTP 400.
There is no route that makes an account with no sign-in.

Every error has the form `{"type":"error","error":{"type":"<type>","message":"<text>"}}`.

| HTTP status | `error.type` | Meaning |
| --- | --- | --- |
| 401 | `authentication_error` | The token is missing or not valid. |
| 402 | `allowance_used_up` | The allowance and the top-ups are empty. The field `resets_at` shows the next reset, or null. |
| 403 | `model_not_in_plan` | The plan does not include the model. |
| 403 | `account_suspended` | A Stripe dispute suspended the account. |
| 403 | `no_plan` | The account has no plan and no top-up. |
| 409 | `already_subscribed` | The account has a subscription with the status `active`, `trialing` or `past_due`. |
| 409 | `trial_in_progress` | The plan cannot change during a trial. |
| 429 | `rate_limited` | The five-hour limit is reached. The field `retry_after` shows the seconds to wait. |
| 429 | `too_many_requests` | The account has four live requests, or a call limit is reached. |
| 503 | `hosted_off` | Hosted mode is off. |

The device token has the form `cuv_` and 43 characters. Send it as `Authorization: Bearer <token>`.
The server stores only the SHA-256 hash of the token.
The server does not log or store request or response bodies.
The server stores token counts, model, time and session id for each request.

## Sign-in

The server is the OAuth client of each provider. It holds the client secrets.
Sign-in uses OpenID Connect (OIDC) for Google, Microsoft and ORCID, and OAuth 2 for GitHub.

1. The app makes a PKCE verifier (Proof Key for Code Exchange) and starts a listener on 127.0.0.1.
2. The app opens the system browser at `GET /v1/auth/start?provider=<p>&port=<port>&challenge=<S256 of verifier>&state=<app state>`.
3. The server stores the sign-in state for 10 minutes and redirects to the provider with its own state, nonce and PKCE.
4. The provider redirects to `/v1/auth/callback/<provider>`.
5. The server exchanges the code and checks the `id_token`: signature, issuer, audience, nonce and expiry.
6. The server finds or makes the account for the pair (provider, subject).
7. The server stores a one-time code for 60 seconds and redirects to `http://127.0.0.1:<port>/auth/cuvette?code=<c>&state=<app state>`.
8. The app posts the code, the verifier and the device name to `POST /v1/auth/token`. The server returns a device token.

Rules for the start request:

- `port` is a whole number from 1024 to 65535, or the word `paste`. Every other value gives HTTP 400.
- `challenge` has 43 characters of base64url.
- `state` has 16 to 64 characters of base64url. The server sends it back to the app unchanged.
- The server builds the loopback address. The app does not send an address.
- With `port=paste`, the last page shows the code and the text "Paste this code only into a terminal that you started." Use this mode on a machine with no browser.

Rules for the checks:

- Google: the issuer is `https://accounts.google.com` or `accounts.google.com`. The request uses `prompt=select_account`.
- Microsoft: the endpoint is `common`. The issuer must be `https://login.microsoftonline.com/<tid>/v2.0`, where `tid` comes from the token. The request uses `prompt=select_account`.
- ORCID: the issuer is `https://orcid.org`. The server uses PKCE only if the discovery document lists `S256`. ORCID often hides the email, so the server does not need it.
- GitHub: there is no `id_token`. The subject is the numeric `id` from `GET https://api.github.com/user`. The state is the check.
- The server keeps the signing keys of each provider for one hour. It reads them again for an unknown key id, but not more than once a minute.
- The server stores the one-time code as a SHA-256 hash. It deletes the code with `DELETE ... RETURNING`, so one code works once.
- A wrong verifier burns the code.

The server never links two sign-ins by email.
To add a provider, a signed-in app calls `POST /v1/auth/link`. The answer has a start address with a link id that works once for 5 minutes.
The address has no device token.
If the pair (provider, subject) belongs to another account, the callback page shows "This sign-in belongs to another Cuvette account." and links nothing.
After a link, the app gets a code as for a sign-in. Its exchange makes one new device on the same account.

## Plans and allowance

The variable `PLANS` holds the plans. See "Settings".

| Plan | Price each month | Price each year | Allowance each month | Models |
| --- | --- | --- | --- | --- |
| `basic` | $10 | $100 | $7 | Sonnet, Haiku |
| `standard` | $20 | $200 | $15 | all |
| `lab` | $60 | $600 | $46 | all |
| `lab_plus` | $150 | $1500 | $118 | all |

- A yearly plan has the same allowance each month. It resets once each month.
- A top-up costs $10, gives $8, and expires after 12 months.
- The trial is on `standard` only. It lasts 7 days, has an allowance of $2, and needs a card.
- The cost of a request is the list price of the model. The price has no extra factor. The margin is in the allowance.
- The `GET /v1/pricing` route shows the list prices.

Rules for the allowance:

- The allowance counts if the status is `active`, `trialing` or `past_due`, and the reset time is in the future.
- The server resets the allowance when a request comes after the reset time. The status must be `active` or `trialing`, and the period end must be in the future.
  The new value is the allowance of the plan, with no carry-over.
  The new reset time is one calendar month later, and never after the period end.
- A reset does not change a hold. A hold is a separate row.
- The server spends the allowance first. It then spends the top-ups, the oldest expiry first.
- The allowance can go below zero by one request. The server accepts this.
- A plan that does not include the model gives 403 `model_not_in_plan`. The server checks this before it reserves anything.
- An account with only top-ups can use every model.

## How the server charges

1. The server reserves money before it forwards a request.
   The reservation is the input estimate plus `max_tokens`, at the list price of the model.
   The input estimate is the body size in bytes divided by two.
   The server limits `max_tokens` to 64000.
2. One SQL statement (`INSERT INTO holds ... SELECT ... WHERE`) makes the hold. It makes the hold only if all of these are true:
   - The allowance and the top-ups, minus the live holds, cover the reservation.
   - The account has fewer than four live holds.
   - The five-hour limit holds. The cost of the last five hours, plus the live holds, plus the reservation, is at most the limit.
     The limit is 30 percent of the plan allowance, or $3 if that is more.
   - The account has no suspension.
3. A live hold is a hold that is younger than 15 minutes.
4. If the statement makes no hold, the server finds the reason:
   - 429 `too_many_requests` for four live holds.
   - 402 `allowance_used_up` for too little money.
   - 429 `rate_limited` for the five-hour limit. The field `retry_after` is the time until enough old cost leaves the five-hour window.
   - 400 if one request alone is above the five-hour limit. Lower `max_tokens`.
5. After the final usage, one SQL batch deletes the hold, debits the real cost and adds a row to `usage`.
6. If an `anthropic` stream ends with no final usage, the server charges the input cost plus the full output reservation.
   If an `openai` response has no usage, the server charges the full reservation.
7. If the upstream returns an HTTP error before any token, the server charges 0.
8. At the start of each request, the server debits each hold of that account that is 15 minutes old or older. It debits the full amount and deletes the hold.
   The `usage` row has the status `expired`.
   If a hold is 15 minutes old at settle, the server also charges the full amount.
   If the hold is gone at settle, the server charges nothing more.

A Worker that stops during a stream leaves its hold. The next request of the account settles it.

For kind `anthropic`, the server prices a request by the model in the `message_start` event, not by the model that the client asked for.
For kind `openai`, the server prices a request by the public model name.
The server prices 5-minute and 1-hour cache writes separately.
For kind `openai`, the server reads `prompt_tokens`, `completion_tokens` and `prompt_tokens_details.cached_tokens`.
It charges `prompt_tokens` minus `cached_tokens` at the input price and `cached_tokens` at the cache read price.
For a stream, the server reads the last chunk that has `usage`.
`src/pricing.ts` must match the `PRICES` table in `src/core/spend.ts` of the Cuvette app.
A test fails if the two tables differ.

The app sends the header `x-cuvette-session`. A value has 1 to 64 characters from `A-Z a-z 0-9 . _ : -`. The server ignores any other value.
The server groups requests with the same value into one session.

## Account answer

`GET /v1/account` shows dollar amounts to the user. It has these fields:

- `account_id`, `identities` (`provider` and `email`), `plan`, `interval`, `sub_status`, `period_end`.
- `allowance_usd`: the allowance that the account got for the period. In a trial this is $2.
- `allowance_remaining_usd`, `topup_remaining_usd`, `resets_at`, `models`.
- `analyses_left_estimate`: the allowance and the top-ups that remain, divided by `mean_cost_per_analysis_usd`.
- `mean_cost_per_analysis_usd`: the mean cost of a session over the last 20 sessions. It is $0.62 if the account has fewer than 3 sessions.

`GET /v1/usage` shows `rows` and `sessions`. Each row has `paid_from`.
The value is `topup` if a top-up paid any part of the request. The value is `allowance` in all other cases.

## Stripe events

The webhook checks the signature and rejects a time that is more than 5 minutes off.
The server inserts the event id and applies the effect in one SQL batch. A repeated event id does nothing.

| Event | Effect |
| --- | --- |
| `checkout.session.completed` (payment) | Adds a top-up of the allowance in `PLANS`. It expires after 12 months. |
| `checkout.session.async_payment_succeeded` | The same as a paid top-up. |
| `checkout.session.completed` (subscription) | Saves the subscription id. For a trial, reads the card fingerprint. If another trial used the card, the server ends the trial now with `trial_end=now`. Otherwise it saves the fingerprint. |
| `invoice.paid` | Acts only if `billing_reason` is `subscription_create`, `subscription_cycle` or `subscription_update`. Reads the plan from the price id of the invoice line. |
| `invoice.payment_failed` | Sets the status to `past_due`. Requests continue until Stripe sets `unpaid` or `canceled`. |
| `customer.subscription.updated` | Copies the status and the period end. The status `canceled` or `unpaid` sets the allowance to 0. |
| `customer.subscription.deleted` | Sets the status to `canceled`, the plan to `none`, and the allowance to 0. |
| `charge.refunded` | A full refund of a top-up sets its remaining value to 0. A full refund of a subscription charge sets the allowance to 0. |
| `charge.dispute.created` | Suspends the account. |

Details for `invoice.paid`:

- `subscription_create`: sets the plan, the period end, the full allowance and the reset time. If the amount paid is 0 (a trial), the allowance is the trial allowance.
- `subscription_cycle`: sets the allowance to the plan allowance with no carry-over. It ignores an invoice with a period end older than the stored one.
- `subscription_update` (an upgrade): adds the new allowance minus the allowance already granted, if the invoice has a charge.

Plan changes go only through `POST /v1/plan`.
An upgrade changes the subscription now with `proration_behavior=always_invoice`.
A downgrade uses a Stripe subscription schedule. The change happens at the period end, with no credit.
`POST /v1/plan` answers 409 `trial_in_progress` during a trial.
Set the Customer Portal to allow only cancel, card change and invoices. See "Stripe setup".

Checkout rules:

- An account with the status `active`, `trialing` or `past_due` gets 409 `already_subscribed`.
- Only `standard` has a trial. Only an account with no earlier subscription gets it. The trial takes a card.
- The server reads the price id from `PLANS`. It never uses an amount from the client.
- Each account has one Stripe customer. The server makes it with the account id as the idempotency key.

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
5. Do the provider and Stripe steps in "Provider setup" and "Stripe setup". Keep the client ids, the client secrets, the price ids and the webhook secret.
6. Put the Stripe price ids in the `PLANS` value in `wrangler.toml`. Replace each `price_REPLACE_*` text.
7. Warning: migration `0003_plans.sql` deletes the tables of the old balance model. Make sure that the database has no data that you need.
   Apply the migrations to the remote database: `npx wrangler d1 migrations apply cuvette-inference --remote`
8. Set the secrets. Wrangler asks for each value. See "Secrets" for the list.
   Run `npx wrangler secret put <NAME>` once for each name.
9. Deploy the Worker: `npx wrangler deploy`
   The `routes` entry in `wrangler.toml` attaches the custom domain `api.cuvette.ai`. Cloudflare creates the DNS record and the certificate.
10. Check the Worker: `curl https://api.cuvette.ai/v1/pricing`. The answer must be HTTP 200 with the plans.
11. Check that hosted mode is off: `curl https://api.cuvette.ai/v1/models`. The answer must be HTTP 503 with `hosted_off`.

Use a Stripe test key, a test webhook secret and test price ids first. Replace them with live values when the test purchase works.

## Open hosted mode

1. Set `HOSTED_ENABLED = "true"` in `wrangler.toml`.
2. Deploy: `npx wrangler deploy`
3. Add the Stripe webhook endpoint. See "Stripe setup". While hosted mode is off, the webhook answers 503 and Stripe tries again later.
4. Sign in from the app. Buy a test plan. Make sure that `GET /v1/account` shows the allowance.

## Secrets

| Name | Use |
| --- | --- |
| `ANTHROPIC_API_KEY` | Key that pays Anthropic. The default models use it. |
| `STRIPE_SECRET_KEY` | Key that calls the Stripe API. |
| `STRIPE_WEBHOOK_SECRET` | Key that checks webhook signatures. It starts with `whsec_`. |
| `ADMIN_SECRET` | Key for `GET /v1/admin/costs`. Use a long random value. |
| `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` | Google OAuth client. |
| `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` | Microsoft Entra app. Use the value of the secret, not the secret id. |
| `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET` | ORCID public API client. |
| `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` | GitHub OAuth app. |

A provider with no client id or no client secret answers 503 on `GET /v1/auth/start`. The other providers keep working.
Add one more secret for each other host (see "Add a host").

## Settings

| Name | Kind | Default | Use |
| --- | --- | --- | --- |
| `HOSTED_ENABLED` | variable | `"false"` | Hosted mode is on only if the value is `"true"`. |
| `PLANS` | variable | in `wrangler.toml` | JSON object with the plans, the top-up and the trial. See below. |
| `SITE_URL` | variable | `https://cuvette.ai` | Base of the Stripe success, cancel and portal return URLs. |
| `UPSTREAMS` | variable | the four Anthropic models | JSON table of public model names. See "Add a host". |

`PLANS` has three keys:

- `plans`: an object. Each key is a plan id. Each value has `price_usd_month`, `price_usd_year`, `allowance_usd`, `models` and the Stripe price ids `stripe_price_month` and `stripe_price_year`.
  `models` is `"all"` or a list of public model names.
- `topup`: `price_usd`, `allowance_usd` and `stripe_price`.
- `trial`: `plan`, `days` and `allowance_usd`.

The server reads `PLANS` on each request. A value that is not valid gives HTTP 500 and a log line.
The server never trusts an amount or a price id from a client.

## Provider setup

These are the steps for Parker. Do them in each provider console.
The redirect address of each provider is `https://api.cuvette.ai/v1/auth/callback/<provider>`, with the provider name `google`, `microsoft`, `orcid` or `github`.

### Google

1. Open the Google Cloud Console. Make a project.
2. Open the OAuth consent screen. Choose the type External.
3. Enter the app name, the support email and the domain `cuvette.ai`.
4. Add the scopes `openid` and `email`. The server needs no other scope.
5. Publish the app to production. Follow the verification steps that Google shows.
6. Open Credentials. Make an OAuth client ID of the type Web application.
7. Add the authorized redirect URI `https://api.cuvette.ai/v1/auth/callback/google`.
8. Save the client ID and the client secret as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Microsoft Entra

1. Open the Microsoft Entra admin center. Open App registrations. Choose New registration.
2. Enter the name Cuvette.
3. For the account type, choose "Accounts in any organizational directory and personal Microsoft accounts".
4. Add the redirect URI of the platform Web: `https://api.cuvette.ai/v1/auth/callback/microsoft`.
5. Open Certificates and secrets. Make a client secret. Copy the Value at once. Entra shows it one time.
6. Write down the date when the secret expires. Make a new secret before that date.
7. Open Token configuration. Add the optional claim `email` to the ID token. The server then shows the email in the app.
8. Save the Application (client) ID and the secret Value as `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.

### ORCID

1. Sign in to ORCID. Open Developer tools. Turn on the developer tools if ORCID asks.
2. Register a public API client.
3. Enter the app name, the website `https://cuvette.ai` and a short description.
4. Add the redirect URI `https://api.cuvette.ai/v1/auth/callback/orcid`.
5. Save the client ID (it starts with `APP-`) and the client secret as `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET`.

The server uses the production ORCID address `https://orcid.org`. It does not use the sandbox.

### GitHub

1. Open GitHub Settings. Open Developer settings. Open OAuth Apps. Choose New OAuth App.
2. Enter the name Cuvette and the homepage URL `https://cuvette.ai`.
3. Enter the authorization callback URL `https://api.cuvette.ai/v1/auth/callback/github`.
4. Make a client secret.
5. Save the client ID and the client secret as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

## Stripe setup

These are the steps for Parker. Do them in the Stripe Dashboard. Start in test mode.

1. Make four products: Basic, Standard, Lab and Lab Plus.
2. Give each product two recurring prices in USD: one each month and one each year. Use the prices in "Plans and allowance".
3. Do not set a trial on any price. The server sets the trial in Checkout.
4. Make a product named Top-up with one one-time price of $10 in USD.
5. Copy the price ids into the `PLANS` value in `wrangler.toml`.
6. Open Settings, Billing, Customer portal. Turn the portal on. Allow only these actions:
   - Cancel subscriptions. Choose "at the end of the billing period".
   - Update the payment method.
   - Show the invoice history.
7. In the portal, turn off "Update subscriptions". The server changes plans through `POST /v1/plan`.
8. Open Developers, Webhooks. Add the endpoint `https://api.cuvette.ai/v1/stripe/webhook`.
9. Select these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`
   - `charge.dispute.created`
10. Copy the signing secret of the endpoint. Set it as `STRIPE_WEBHOOK_SECRET`.
11. Open Settings, Payments, Payment methods. Make sure that cards are on. The trial check needs a card.

The server reads both the older and the newer shape of the Stripe invoice object.

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
| `max_output_tokens` | Largest output that the server allows. The server reserves money for this size. |

`price.cache_read` is optional. The default is the input price.
For kind `anthropic`, `price.cache_write_5m` and `price.cache_write_1h` are optional. The defaults are 1.25 times and 2 times the input price.
For kind `openai`, cache writes cost 0.
The server reads `UPSTREAMS` on each request. A table that is not valid gives HTTP 500 and a log line.
A model that a plan does not list is not available on that plan. Add the model name to `models` of the plans that must include it.
A plan with `"models": "all"` includes each new model.

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

- `accounts`: id, plan, interval, subscription status, Stripe ids, allowance remaining, allowance granted, reset time, period end, suspended flag.
- `devices`: one row for each device token, with the token hash, name and last use.
- `identities`: one row for each sign-in, with provider, subject and email. The pair (provider, subject) is the primary key.
- `topups`: one row for each top-up, with remaining value, expiry and Stripe payment intent.
- `holds`: one row for each running request, with request id, account id, amount, start time, model and session id.
- `usage`: one row for each request, with session id, token counts, cost, the part paid from a top-up, and status.
- `stripe_events`: the id of each Stripe event that the server applied.
- `card_trials`: the card fingerprint of each trial and the account that used it.
- `auth_states`, `auth_codes`, `auth_links`: sign-in state, one-time codes and link ids. The server deletes expired rows.
- `auth_token_calls`: count of `POST /v1/auth/token` calls for each IP hash and minute.
- `count_tokens_calls`: count of `count_tokens` calls for each account and minute.

## Develop

1. Run the tests: `npm test`
2. Check the types: `npm run typecheck`
3. Run the Worker on your computer: `npx wrangler d1 migrations apply cuvette-inference --local`, then `npm run dev`

## Known limits

- The allowance can go a little below zero after one request. The server accepts this.
- A Worker that stops during a stream leaves a hold. The account has fewer free slots for up to 15 minutes. The next request debits the full amount of that hold.
- `GET /v1/models` does not show the kind of a model. The client must know which route to use for each model.
- `count_tokens` forwards the body as it is. Anthropic rejects a field that `count_tokens` does not accept, for example `stream`.
- A model with an unknown name in `message_start` costs the highest list price.
- A stream of kind `openai` that the client cuts before the usage chunk costs the full reservation.
- A request that can cost more than the five-hour limit never starts. The reply is HTTP 400. This can happen with `claude-fable-5-1` and a large `max_tokens` on a small plan.
- `GET /v1/auth/start` has no call limit for each IP address. The server deletes its rows after 10 minutes.
- A partial refund changes nothing. Only a full refund sets a top-up or an allowance to 0.
- The estimate of analyses left includes the top-ups.
