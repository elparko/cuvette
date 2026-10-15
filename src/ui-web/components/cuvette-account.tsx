import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AccountInfo, Device, Pricing } from "../../core/account.ts";
import { call } from "../lib/api.ts";
import { dateText, PLAN_NAMES, usd } from "../lib/usage.ts";
import { cn } from "../lib/utils.ts";
import { CuvettePricing } from "./cuvette-pricing.tsx";
import { CuvetteUsage } from "./cuvette-usage.tsx";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";

interface State {
  signedIn: boolean;
  account?: AccountInfo | null;
  notice: string;
  providers: { id: string; label: string }[];
  waiting: boolean;
  error: string;
}

const PROVIDER_TITLES: Record<string, string> = { orcid: "ORCID (Open Researcher and Contributor ID)" };
const POLL_MS = 2000;

export function Meter({ account }: { account: AccountInfo }) {
  const left = account.allowance_remaining_usd;
  const used = account.allowance_usd > 0 ? Math.min(1, Math.max(0, 1 - left / account.allowance_usd)) : 1;
  return (
    <div className="flex flex-col gap-1">
      <div role="progressbar" aria-label="Allowance used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)} className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", used > 0.9 ? "bg-bad" : used > 0.7 ? "bg-warn" : "bg-ok")} style={{ width: `${Math.round(used * 100)}%` }} />
      </div>
      <p className="text-sm">
        <span className="font-semibold tabular-nums">{usd(left)}</span> of <span className="tabular-nums">{usd(account.allowance_usd)}</span> left
        {account.resets_at ? `. It resets on ${dateText(account.resets_at)}.` : "."}
      </p>
    </div>
  );
}

export function CuvetteAccount({ use, onSignedIn }: { use?: boolean; onSignedIn?: () => void | Promise<void> }) {
  const [st, setSt] = useState<State | null>(null);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [interval, setInterval_] = useState<"month" | "year">("month");
  const [plans, setPlans] = useState(false);
  const [usage, setUsage] = useState(false);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [sure, setSure] = useState(false);
  const was = useRef(false);

  const load = useCallback(async () => {
    try {
      const s = await call<State>("api/cuvette", {});
      setSt(s);
      setMsg(s.error);
      return s;
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!st) return;
    if (st.signedIn && !was.current) void onSignedIn?.();
    was.current = st.signedIn;
  }, [st, onSignedIn]);

  useEffect(() => {
    if (!link || st?.signedIn) return;
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [link, st?.signedIn, load]);

  const run = async <T,>(path: string, body: unknown, done?: (r: T) => void) => {
    try {
      const r = await call<T>(path, body);
      setMsg("");
      done?.(r);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const signIn = (provider: string) =>
    run<{ url: string }>("api/cuvette/signin", { provider, use }, (r) => {
      setLink(r.url);
      setMsg("The browser is open. Finish the sign-in there. This page updates by itself.");
    });

  const showPlans = async () => {
    setPlans(!plans);
    if (!pricing) await run<Pricing>("api/cuvette/pricing", {}, setPricing);
  };

  const choosePlan = (plan: string) => {
    const a = st?.account;
    const subscribed = a && a.plan !== "none" && ["active", "trialing", "past_due"].includes(a.sub_status);
    if (!subscribed) return run<{ url: string }>("api/cuvette/checkout", { plan, interval }, (r) => setMsg(`The payment page is open. After you pay, select Refresh. If it did not open, use this link: ${r.url}`));
    return run<{ status: string; effective_at: string }>("api/cuvette/plan", { plan, interval }, async (r) => {
      setMsg(r.status === "scheduled" ? `The plan changes on ${dateText(r.effective_at)}.` : "The plan changed.");
      await load();
    });
  };

  const showDevices = async () => {
    if (devices) return setDevices(null);
    await run<{ devices: Device[] }>("api/cuvette/devices", {}, (r) => setDevices(r.devices));
  };

  const signOut = async () => {
    if (!sure) return setSure(true);
    setSure(false);
    await run<{ revoked: boolean }>("api/cuvette/logout", {}, (r) => {
      setDevices(null);
      setLink("");
      setMsg(r.revoked ? "Signed out." : "Signed out on this computer. Cuvette could not revoke the device. Revoke it on another device.");
    });
    await load();
  };

  const a = st?.account;
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {st && <p className="text-[13px] text-muted-foreground">{st.notice}</p>}
      {st && !st.signedIn && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Sign in</p>
          <div className="flex flex-wrap gap-2">
            {st.providers.map((p) => (
              <Button key={p.id} variant="outline" title={PROVIDER_TITLES[p.id]} onClick={() => signIn(p.id)}>
                Sign in with {p.label}
              </Button>
            ))}
          </div>
          {link && (
            <p className="text-[13px] text-muted-foreground">
              The browser did not open?{" "}
              <a className="text-accent-brand underline" href={link} target="_blank" rel="noopener noreferrer">
                Open the sign-in page
              </a>
              .
            </p>
          )}
        </div>
      )}
      {st?.signedIn && !a && (
        <Button variant="outline" size="sm" onClick={signOut} className="self-start">
          {sure ? "Click again to sign out" : "Sign out"}
        </Button>
      )}
      {a && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={["active", "trialing"].includes(a.sub_status) ? "ok" : "warn"}>{PLAN_NAMES[a.plan] ?? a.plan}</Badge>
            <span className="text-muted-foreground">
              {a.sub_status === "none" ? "No subscription" : `Status: ${a.sub_status}`}
              {a.period_end ? `. Period ends ${dateText(a.period_end)}` : ""}
            </span>
            <span className="text-muted-foreground">Signed in with {a.identities.map((i) => (i.email ? `${i.provider} (${i.email})` : i.provider)).join(", ") || "one identity"}.</span>
          </div>
          <Meter account={a} />
          <p className="text-sm">
            Top-up: <span className="font-semibold tabular-nums">{usd(a.topup_remaining_usd)}</span>. <span className="font-semibold">About {a.analyses_left_estimate} {a.analyses_left_estimate === 1 ? "analysis" : "analyses"} left</span>
            <span className="text-muted-foreground"> (an analysis costs {usd(a.mean_cost_per_analysis_usd)} on average).</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={showPlans}>{a.plan === "none" ? "Choose a plan" : "Change the plan"}</Button>
            <Button variant="outline" onClick={() => run<{ url: string }>("api/cuvette/checkout", { topup: true }, (r) => setMsg(`The payment page is open. After you pay, select Refresh. If it did not open, use this link: ${r.url}`))}>
              Buy a top-up
            </Button>
            <Button variant="outline" onClick={() => run<{ url: string }>("api/cuvette/portal", {}, (r) => setMsg(`The billing page is open. If it did not open, use this link: ${r.url}`))}>
              Manage billing
            </Button>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCwIcon className="size-3.5" /> Refresh
            </Button>
          </div>
          {plans && pricing && (
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
              <div role="radiogroup" aria-label="Billing period" className="inline-flex self-start rounded-lg bg-muted p-[3px]">
                {(["month", "year"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={v === interval}
                    onClick={() => setInterval_(v)}
                    className={cn("h-7 rounded-md px-3 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40", v === interval && "bg-card font-medium text-foreground shadow-sm")}
                  >
                    {v === "month" ? "Each month" : "Each year"}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {pricing.plans.map((p) => (
                  <div key={p.id} className="flex flex-col gap-1 rounded-md border p-2 text-[13px]">
                    <span className="font-medium">{PLAN_NAMES[p.id] ?? p.id}</span>
                    <span className="tabular-nums">
                      ${interval === "month" ? p.price_usd_month : p.price_usd_year} each {interval}
                    </span>
                    <span className="text-muted-foreground">Allowance: ${p.allowance_usd} each month</span>
                    <Button size="sm" variant={p.id === a.plan && a.interval === interval ? "outline" : "default"} disabled={p.id === a.plan && a.interval === interval} onClick={() => choosePlan(p.id)}>
                      {p.id === a.plan && a.interval === interval ? "Your plan" : `Choose ${PLAN_NAMES[p.id] ?? p.id}`}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setUsage(!usage)} aria-expanded={usage}>
              {usage ? "Hide usage" : "Show usage"}
            </Button>
            <Button variant="outline" size="sm" onClick={showDevices} aria-expanded={!!devices}>
              {devices ? "Hide devices" : "Show devices"}
            </Button>
            <Button variant={sure ? "destructive" : "ghost"} size="sm" onClick={signOut}>
              {sure ? "Click again to sign out" : "Sign out"}
            </Button>
          </div>
          {usage && <CuvetteUsage />}
          {devices && (
            <ul className="flex flex-col gap-1 text-[13px]">
              {devices.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  {d.current && <Badge tone="info">This device</Badge>}
                  <span className="text-muted-foreground">{d.last_used_at ? `Last used ${dateText(d.last_used_at)}` : "Never used"}</span>
                  {!d.current && (
                    <Button variant="ghost" size="sm" onClick={() => run("api/cuvette/devices/remove", { id: d.id }, () => setDevices(devices.filter((x) => x.id !== d.id)))}>
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <CuvettePricing />
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
