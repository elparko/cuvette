# How we price

Cuvette hosted runs Claude for you. You pay with a plan or with a top-up.
This page shows the prices, what the server records, and what it never stores.
The app shows the same information in Settings, under "How we price". The app reads the live prices from the Cuvette server.
If this page and the app differ, the app is right.

## What a request costs

Each request costs the list price of its tokens. The list price is the price of the model for one million tokens.
Cuvette adds no hidden factor to the token price.
The app shows every cost in dollars. It shows the cost of each analysis in the usage view.

## Plans

| Plan | Each month | Each year | Allowance each month | Models |
| --- | --- | --- | --- | --- |
| Basic | $10 | $100 | $7 | Sonnet and Haiku |
| Standard | $20 | $200 | $15 | All models |
| Lab | $60 | $600 | $46 | All models |
| Lab Plus | $150 | $1,500 | $118 | All models |

A yearly plan costs 10 times the monthly price. It has the same allowance each month.

The allowance is the token cost that your plan pays for each month. The allowance is less than the price of the plan.
The difference pays for the service.
The allowance resets each month. An unused allowance does not carry over.

Standard has a 7-day trial for an account that never had a subscription. The trial allowance is $2.

## Top-up

A top-up costs $10 and adds $8 of allowance. The top-up expires after 12 months.
Cuvette spends the plan allowance first. Then it spends the top-ups, oldest first.

## Limits

A limit for five hours stops a runaway loop. The limit is a part of the monthly allowance.
If you reach it, the app shows how long to wait.
If you use all of your allowance, the app shows the date when it resets.

## What the server records

For each request, the server records:

- the token counts
- the model
- the time
- the session id

For your account, the server keeps:

- the sign-in provider, and the email address if the provider gives one
- your plan and the state of your subscription
- the name of each device with a sign-in, and the time of its last use
- a card fingerprint from Stripe, to allow one trial for each card

The server does not keep your card number. Stripe handles the payment page.

## What the server never stores

The server never stores:

- your prompts
- your images
- your results

The server passes each request to Anthropic and returns the reply. It does not keep the data.

## How to check your cost

1. Open Settings and find the Cuvette account.
2. Select "Show usage". The app lists each analysis with its date, model, tokens and cost.
3. Select "Export CSV" to save the rows in a file.

Use "Manage billing" to cancel, to change your card, or to read your invoices.
