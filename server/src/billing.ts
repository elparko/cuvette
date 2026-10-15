import type { Env } from "./env.ts";
import { loadAccount, type Account } from "./money.ts";
import { TOPUP_MONTHS, loadPlans, priceMatch, type Interval, type PlansConfig } from "./plans.ts";
import { StripeError, stripeCall, verifySignature } from "./stripe.ts";
import { addMonths, fail, logError, reply } from "./util.ts";

const SUBSCRIBED = ["active", "trialing", "past_due"];
const STATUS_MAP: Record<string, string> = { active: "active", trialing: "trialing", past_due: "past_due", canceled: "canceled", unpaid: "unpaid", paused: "unpaid", incomplete: "none", incomplete_expired: "none" };
const PAYMENT_DOWN = () => fail(502, "api_error", "The payment service did not answer. Try again later.");

const isInterval = (v: unknown): v is Interval => v === "month" || v === "year";

async function ensureCustomer(env: Env, account: Account): Promise<string> {
  if (account.stripe_customer_id) return account.stripe_customer_id;
  const email = await env.DB.prepare("SELECT email FROM identities WHERE account_id = ?1 AND email IS NOT NULL ORDER BY provider LIMIT 1").bind(account.id).first<{ email: string }>();
  const params: Record<string, string> = { "metadata[account_id]": account.id };
  if (email) params.email = email.email;
  const customer = await stripeCall(env.STRIPE_SECRET_KEY, "POST", "/customers", params, account.id);
  await env.DB.prepare("UPDATE accounts SET stripe_customer_id = ?1 WHERE id = ?2 AND stripe_customer_id IS NULL").bind(customer.id, account.id).run();
  return ((await loadAccount(env, account.id))?.stripe_customer_id as string | null) ?? customer.id;
}

async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export async function checkout(req: Request, env: Env, account: Account): Promise<Response> {
  const body = await readJson(req);
  const cfg = loadPlans(env.PLANS);
  const form: Record<string, string> = {
    client_reference_id: account.id,
    success_url: `${env.SITE_URL}/account?checkout=done`,
    cancel_url: `${env.SITE_URL}/account?checkout=cancelled`,
    "line_items[0][quantity]": "1",
    "metadata[account_id]": account.id,
  };
  if (body?.topup === true) {
    form.mode = "payment";
    form["line_items[0][price]"] = cfg.topup.stripePrice;
    form["metadata[kind]"] = "topup";
    form["payment_intent_data[metadata][account_id]"] = account.id;
    form["payment_intent_data[metadata][kind]"] = "topup";
  } else {
    const plan = typeof body?.plan === "string" ? cfg.plans.get(body.plan) : undefined;
    const interval: unknown = body?.interval;
    if (!plan || !isInterval(interval)) return fail(400, "invalid_request_error", "Send a plan and an interval (month or year), or send topup as true.");
    if (SUBSCRIBED.includes(account.sub_status)) return fail(409, "already_subscribed", "This account has a subscription already. Use the billing page to change it.");
    form.mode = "subscription";
    form["line_items[0][price]"] = plan.stripePrice[interval];
    form["metadata[kind]"] = "plan";
    form["subscription_data[metadata][account_id]"] = account.id;
    if (plan.id === cfg.trial.plan && !account.stripe_subscription_id) {
      form["subscription_data[trial_period_days]"] = String(cfg.trial.days);
      form.payment_method_collection = "always";
      form["payment_method_types[0]"] = "card";
      form["metadata[trial]"] = "1";
    }
  }
  try {
    form.customer = await ensureCustomer(env, account);
    const session = await stripeCall(env.STRIPE_SECRET_KEY, "POST", "/checkout/sessions", form);
    if (typeof session?.url !== "string") throw new Error("Stripe sent no checkout URL");
    return reply(200, { url: session.url });
  } catch (e) {
    logError("checkout", e);
    return PAYMENT_DOWN();
  }
}

export async function billingPortal(env: Env, account: Account): Promise<Response> {
  try {
    const customer = await ensureCustomer(env, account);
    const session = await stripeCall(env.STRIPE_SECRET_KEY, "POST", "/billing_portal/sessions", { customer, return_url: `${env.SITE_URL}/account` });
    if (typeof session?.url !== "string") throw new Error("Stripe sent no portal URL");
    return reply(200, { url: session.url });
  } catch (e) {
    logError("portal", e);
    return PAYMENT_DOWN();
  }
}

export async function changePlan(req: Request, env: Env, account: Account): Promise<Response> {
  const body = await readJson(req);
  const cfg = loadPlans(env.PLANS);
  const target = typeof body?.plan === "string" ? cfg.plans.get(body.plan) : undefined;
  if (!target || !isInterval(body?.interval)) return fail(400, "invalid_request_error", "Send a plan and an interval (month or year).");
  const current = cfg.plans.get(account.plan);
  if (account.sub_status === "trialing") return fail(409, "trial_in_progress", "The plan cannot change during the trial. Change it after the trial ends.");
  if (!current || !account.stripe_subscription_id || account.sub_status !== "active") return fail(403, "no_plan", "This account has no active plan to change. Choose a plan first.");
  const interval = body.interval as Interval;
  if (current.id === target.id && account.plan_interval === interval) return fail(400, "invalid_request_error", "The account is on this plan already.");
  const upgrade = target.allowanceUsd > current.allowanceUsd || (target.id === current.id && account.plan_interval === "month" && interval === "year");
  const price = target.stripePrice[interval];
  const key = env.STRIPE_SECRET_KEY;
  const subId = account.stripe_subscription_id;
  try {
    const sub = await stripeCall(key, "GET", `/subscriptions/${subId}`);
    const scheduleId: string | null = typeof sub.schedule === "string" ? sub.schedule : (sub.schedule?.id ?? null);
    if (upgrade) {
      if (scheduleId) await stripeCall(key, "POST", `/subscription_schedules/${scheduleId}/release`);
      const item = sub.items?.data?.[0]?.id;
      if (typeof item !== "string") throw new Error("Stripe sent no subscription item");
      await stripeCall(key, "POST", `/subscriptions/${subId}`, { "items[0][id]": item, "items[0][price]": price, proration_behavior: "always_invoice", payment_behavior: "error_if_incomplete" });
      return reply(200, { status: "changed", effective_at: new Date().toISOString() });
    }
    const schedule = scheduleId ? await stripeCall(key, "GET", `/subscription_schedules/${scheduleId}`) : await stripeCall(key, "POST", "/subscription_schedules", { from_subscription: subId });
    const now = schedule.phases?.[0];
    const currentPrice = typeof now?.items?.[0]?.price === "string" ? now.items[0].price : now?.items?.[0]?.price?.id;
    if (!now || typeof currentPrice !== "string") throw new Error("Stripe sent no schedule phase");
    await stripeCall(key, "POST", `/subscription_schedules/${schedule.id}`, {
      end_behavior: "release",
      proration_behavior: "none",
      "phases[0][start_date]": String(now.start_date),
      "phases[0][end_date]": String(now.end_date),
      "phases[0][items][0][price]": currentPrice,
      "phases[0][items][0][quantity]": "1",
      "phases[1][items][0][price]": price,
      "phases[1][items][0][quantity]": "1",
    });
    return reply(200, { status: "scheduled", effective_at: new Date(Number(now.end_date) * 1000).toISOString() });
  } catch (e) {
    logError("plan", e);
    if (e instanceof StripeError && e.status < 500) return fail(502, "api_error", "The payment service did not accept the change. Check the card on the billing page.");
    return PAYMENT_DOWN();
  }
}

type Statement = D1PreparedStatement;
interface Effect {
  statements: Statement[];
}

const seconds = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v * 1000 : undefined);

async function byCustomer(env: Env, customer: unknown): Promise<Account | undefined> {
  if (typeof customer !== "string") return undefined;
  return (await env.DB.prepare("SELECT * FROM accounts WHERE stripe_customer_id = ?1").bind(customer).first<Account>()) ?? undefined;
}

async function byId(env: Env, id: unknown): Promise<Account | undefined> {
  return typeof id === "string" ? loadAccount(env, id) : undefined;
}

async function cardFingerprint(env: Env, session: any): Promise<string | undefined> {
  const key = env.STRIPE_SECRET_KEY;
  let method: any;
  if (typeof session.setup_intent === "string") method = (await stripeCall(key, "GET", `/setup_intents/${session.setup_intent}`, { "expand[]": "payment_method" })).payment_method;
  else if (typeof session.subscription === "string") method = (await stripeCall(key, "GET", `/subscriptions/${session.subscription}`, { "expand[]": "default_payment_method" })).default_payment_method;
  const fingerprint = method?.card?.fingerprint;
  return typeof fingerprint === "string" && fingerprint ? fingerprint : undefined;
}

async function topupPaid(env: Env, cfg: PlansConfig, session: any): Promise<Effect | undefined> {
  if (session?.mode !== "payment" || session.metadata?.kind !== "topup" || session.payment_status !== "paid" || session.currency !== "usd" || typeof session.id !== "string") return undefined;
  const account = await byId(env, session.client_reference_id);
  if (!account) return undefined;
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : null;
  return {
    statements: [
      env.DB.prepare("INSERT OR IGNORE INTO topups (id, account_id, remaining_usd, expires_at, stripe_payment_intent) VALUES (?1, ?2, ?3, ?4, ?5)").bind(`tu_${session.id}`, account.id, cfg.topup.allowanceUsd, addMonths(Date.now(), TOPUP_MONTHS), intent),
    ],
  };
}

function hasOtherLiveSubscription(account: Account, subscription: string | null): boolean {
  return !!subscription && !!account.stripe_subscription_id && account.stripe_subscription_id !== subscription && SUBSCRIBED.includes(account.sub_status);
}

async function paymentOf(env: Env, invoice: any): Promise<{ payment_intent?: string; charge?: string } | undefined> {
  const intent = typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.payment_intent?.id;
  if (typeof intent === "string") return { payment_intent: intent };
  if (typeof invoice.charge === "string") return { charge: invoice.charge };
  if (typeof invoice.id !== "string") return undefined;
  const payments = await stripeCall(env.STRIPE_SECRET_KEY, "GET", "/invoice_payments", { invoice: invoice.id, status: "paid" });
  const paid = payments.data?.[0]?.payment;
  return typeof paid?.payment_intent === "string" ? { payment_intent: paid.payment_intent } : typeof paid?.charge === "string" ? { charge: paid.charge } : undefined;
}

async function cancelAndRefund(env: Env, eventId: string, subscription: string): Promise<void> {
  const key = env.STRIPE_SECRET_KEY;
  const sub = await stripeCall(key, "GET", `/subscriptions/${subscription}`, { "expand[]": "latest_invoice" });
  await stripeCall(key, "DELETE", `/subscriptions/${subscription}`, {}, `${eventId}:cancel`);
  const invoice = sub.latest_invoice;
  if (!invoice || typeof invoice !== "object" || !(Number(invoice.amount_paid) > 0)) return;
  const payment = await paymentOf(env, invoice);
  if (payment) await stripeCall(key, "POST", "/refunds", payment, `${eventId}:refund`);
}

async function subscriptionStarted(env: Env, eventId: string, session: any): Promise<Effect | undefined> {
  if (session?.mode !== "subscription" || typeof session.subscription !== "string") return undefined;
  const account = (await byId(env, session.client_reference_id)) ?? (await byCustomer(env, session.customer));
  if (!account) return undefined;
  if (hasOtherLiveSubscription(account, session.subscription)) {
    await cancelAndRefund(env, eventId, session.subscription);
    return { statements: [] };
  }
  const statements: Statement[] = [env.DB.prepare("UPDATE accounts SET stripe_subscription_id = ?1, stripe_customer_id = COALESCE(stripe_customer_id, ?2) WHERE id = ?3").bind(session.subscription, typeof session.customer === "string" ? session.customer : null, account.id)];
  if (session.metadata?.trial === "1") {
    const fingerprint = await cardFingerprint(env, session);
    const used = fingerprint ? await env.DB.prepare("SELECT account_id FROM card_trials WHERE fingerprint = ?1").bind(fingerprint).first<{ account_id: string }>() : null;
    if (!fingerprint || (used && used.account_id !== account.id)) {
      await stripeCall(env.STRIPE_SECRET_KEY, "POST", `/subscriptions/${session.subscription}`, { trial_end: "now" }, `${eventId}:trial_end`);
    } else if (!used) {
      statements.push(env.DB.prepare("INSERT OR IGNORE INTO card_trials (fingerprint, account_id) VALUES (?1, ?2)").bind(fingerprint, account.id));
    }
  }
  return { statements };
}

function invoiceSubscription(invoice: any): string | null {
  const direct = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  return typeof direct === "string" ? direct : (direct?.id ?? null);
}

function linePriceId(line: any): string | undefined {
  const price = line?.price?.id ?? line?.pricing?.price_details?.price;
  return typeof price === "string" ? price : undefined;
}

function periodShare(invoice: any, interval: Interval, periodEnd: number, now: number): number {
  const nominalStart = addMonths(periodEnd, interval === "year" ? -12 : -1, new Date(periodEnd).getUTCDate());
  const given = seconds(invoice.period_start);
  const start = given !== undefined && Math.abs(given - nominalStart) <= 2 * 86_400_000 ? given : nominalStart;
  return Math.min(1, Math.max(0, (periodEnd - now) / (periodEnd - start)));
}

async function invoicePaid(env: Env, cfg: PlansConfig, invoice: any): Promise<Effect | undefined> {
  const reason = invoice?.billing_reason;
  if (reason !== "subscription_create" && reason !== "subscription_cycle" && reason !== "subscription_update") return undefined;
  const account = await byCustomer(env, invoice.customer);
  if (!account) return undefined;
  const lines: any[] = Array.isArray(invoice.lines?.data) ? invoice.lines.data : [];
  const known = lines.map((line) => ({ line, match: priceMatch(cfg, linePriceId(line) ?? "") })).filter((x) => x.match);
  const chosen = known.find((x) => Number(x.line.amount) >= 0) ?? known[0];
  if (!chosen) return undefined;
  const { plan, interval } = chosen.match!;
  const periodEnd = seconds(chosen.line.period?.end);
  if (periodEnd === undefined) return undefined;
  const subscription = invoiceSubscription(invoice);
  if (hasOtherLiveSubscription(account, subscription)) return undefined;
  const now = Date.now();
  const resets = Math.min(addMonths(now, 1), periodEnd);
  const paid = Number(invoice.amount_paid ?? 0);
  if (reason === "subscription_cycle" && account.period_end !== null && account.stripe_subscription_id === subscription && periodEnd < account.period_end) return undefined;
  if (reason === "subscription_update") {
    const total = Number(invoice.total ?? invoice.amount_paid ?? 0);
    const share = periodShare(invoice, interval, periodEnd, now);
    const delta = total > 0 ? Math.max(0, plan.allowanceUsd - account.allowance_granted_usd) * share : 0;
    const inTrial = account.sub_status === "trialing" || account.allowance_granted_usd === cfg.trial.allowanceUsd;
    const keepWindow = !inTrial && account.allowance_resets_at !== null && account.allowance_resets_at > now + 60_000;
    return {
      statements: [
        env.DB
          .prepare(
            "UPDATE accounts SET plan = ?1, plan_interval = ?2, period_end = ?3, stripe_subscription_id = COALESCE(?4, stripe_subscription_id), allowance_remaining_usd = allowance_remaining_usd + ?5, allowance_granted_usd = allowance_granted_usd + ?5, allowance_resets_at = ?6 WHERE id = ?7",
          )
          .bind(plan.id, interval, periodEnd, subscription, delta, keepWindow ? account.allowance_resets_at : resets, account.id),
      ],
    };
  }
  const trial = reason === "subscription_create" && paid === 0;
  const level = trial ? cfg.trial.allowanceUsd : plan.allowanceUsd;
  return {
    statements: [
      env.DB
        .prepare(
          "UPDATE accounts SET plan = ?1, plan_interval = ?2, sub_status = ?3, period_end = ?4, stripe_subscription_id = COALESCE(?5, stripe_subscription_id), allowance_remaining_usd = ?6, allowance_granted_usd = ?6, allowance_resets_at = ?7 WHERE id = ?8",
        )
        .bind(plan.id, interval, trial ? "trialing" : "active", periodEnd, subscription, level, resets, account.id),
    ],
  };
}

async function subscriptionChanged(env: Env, sub: any, deleted: boolean): Promise<Effect | undefined> {
  const account = await byCustomer(env, sub?.customer);
  if (!account || typeof sub?.id !== "string") return undefined;
  if (account.stripe_subscription_id && account.stripe_subscription_id !== sub.id) return undefined;
  const status = deleted ? "canceled" : STATUS_MAP[String(sub.status)];
  if (!status) return undefined;
  const end = seconds(sub.current_period_end) ?? seconds(sub.items?.data?.[0]?.current_period_end);
  const gone = status === "canceled";
  const zero = gone || status === "unpaid";
  return {
    statements: [
      env.DB
        .prepare(
          `UPDATE accounts SET sub_status = ?1, period_end = COALESCE(?2, period_end), stripe_subscription_id = ?3${zero ? ", allowance_remaining_usd = 0" : ""}${gone ? ", plan = 'none', plan_interval = NULL" : ""} WHERE id = ?4`,
        )
        .bind(status, end ?? null, sub.id, account.id),
    ],
  };
}

async function paymentFailed(env: Env, invoice: any): Promise<Effect | undefined> {
  const account = await byCustomer(env, invoice?.customer);
  if (!account) return undefined;
  return { statements: [env.DB.prepare("UPDATE accounts SET sub_status = 'past_due' WHERE id = ?1 AND sub_status IN ('active', 'trialing', 'past_due')").bind(account.id)] };
}

async function chargeRefunded(env: Env, charge: any): Promise<Effect | undefined> {
  if (charge?.refunded !== true) return undefined;
  if (typeof charge.payment_intent === "string") {
    const topup = await env.DB.prepare("SELECT id FROM topups WHERE stripe_payment_intent = ?1").bind(charge.payment_intent).first<{ id: string }>();
    if (topup) return { statements: [env.DB.prepare("UPDATE topups SET remaining_usd = 0 WHERE id = ?1").bind(topup.id)] };
  }
  if (!charge.invoice) return undefined;
  const account = await byCustomer(env, charge.customer);
  if (!account) return undefined;
  return { statements: [env.DB.prepare("UPDATE accounts SET allowance_remaining_usd = 0 WHERE id = ?1").bind(account.id)] };
}

async function disputeOpened(env: Env, dispute: any): Promise<Effect | undefined> {
  let accountId: string | undefined;
  if (typeof dispute?.payment_intent === "string") {
    const topup = await env.DB.prepare("SELECT account_id FROM topups WHERE stripe_payment_intent = ?1").bind(dispute.payment_intent).first<{ account_id: string }>();
    accountId = topup?.account_id;
  }
  if (!accountId && typeof dispute?.charge === "string") {
    const charge = await stripeCall(env.STRIPE_SECRET_KEY, "GET", `/charges/${dispute.charge}`);
    accountId = (await byCustomer(env, charge.customer))?.id;
  }
  if (!accountId) return undefined;
  return { statements: [env.DB.prepare("UPDATE accounts SET suspended = 1 WHERE id = ?1").bind(accountId)] };
}

const HANDLED = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "invoice.paid", "invoice.payment_failed", "customer.subscription.updated", "customer.subscription.deleted", "charge.refunded", "charge.dispute.created"];

async function effectOf(env: Env, cfg: PlansConfig, event: any): Promise<Effect | undefined> {
  const object = event.data?.object;
  switch (event.type) {
    case "checkout.session.completed":
      return object?.mode === "subscription" ? subscriptionStarted(env, event.id, object) : topupPaid(env, cfg, object);
    case "checkout.session.async_payment_succeeded":
      return topupPaid(env, cfg, object);
    case "invoice.paid":
      return invoicePaid(env, cfg, object);
    case "invoice.payment_failed":
      return paymentFailed(env, object);
    case "customer.subscription.updated":
      return subscriptionChanged(env, object, false);
    case "customer.subscription.deleted":
      return subscriptionChanged(env, object, true);
    case "charge.refunded":
      return chargeRefunded(env, object);
    case "charge.dispute.created":
      return disputeOpened(env, object);
    default:
      return undefined;
  }
}

export async function webhook(req: Request, env: Env): Promise<Response> {
  const raw = new Uint8Array(await req.arrayBuffer());
  if (!(await verifySignature(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), raw))) return fail(400, "invalid_request_error", "The signature is not valid.");
  let event: any;
  try {
    event = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail(400, "invalid_request_error", "The body is not JSON.");
  }
  if (typeof event?.id !== "string" || !event.id || typeof event.type !== "string") return fail(400, "invalid_request_error", "The event is not valid.");
  const seen = () => env.DB.prepare("SELECT event_id FROM stripe_events WHERE event_id = ?1").bind(event.id).first();
  if (await seen()) return reply(200, { received: true, duplicate: true });
  const effect = await effectOf(env, loadPlans(env.PLANS), event);
  if (!effect) {
    if (HANDLED.includes(event.type)) console.error("webhook ignored", event.type, event.id);
    return reply(200, { received: true, ignored: true });
  }
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO stripe_events (event_id) VALUES (?1)").bind(event.id), ...effect.statements]);
  } catch (e) {
    if (!(await seen())) throw e;
    return reply(200, { received: true, duplicate: true });
  }
  return reply(200, { received: true });
}

