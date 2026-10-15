import { useState } from "react";
import type { Pricing } from "../../core/account.ts";
import { call } from "../lib/api.ts";
import { PLAN_NAMES, usd } from "../lib/usage.ts";

const price = (n: number) => (Number.isInteger(n) ? `$${n}` : usd(n));

export function CuvettePricing() {
  const [p, setP] = useState<Pricing | null>(null);
  const [msg, setMsg] = useState("");

  const load = (open: boolean) => {
    if (!open || p) return;
    call<Pricing>("api/cuvette/pricing", {})
      .then(setP)
      .catch((e: Error) => setMsg(e.message));
  };

  return (
    <details className="rounded-lg border bg-card px-3 py-2 text-[13px]" onToggle={(e) => load(e.currentTarget.open)}>
      <summary className="cursor-pointer font-medium">How we price</summary>
      {msg && <p role="alert" className="mt-2">{msg}</p>}
      {!p && !msg && <p className="mt-2 text-muted-foreground">Loading the prices…</p>}
      {p && (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-muted-foreground">Each request costs the list price of its tokens. Cuvette adds no hidden factor. The allowance of a plan pays for the requests.</p>
          <table className="w-full text-left">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-medium">Plan</th>
                <th className="py-1 pr-3 font-medium">Each month</th>
                <th className="py-1 pr-3 font-medium">Each year</th>
                <th className="py-1 pr-3 font-medium">Allowance each month</th>
                <th className="py-1 font-medium">Models</th>
              </tr>
            </thead>
            <tbody>
              {p.plans.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="py-1 pr-3 font-medium">{PLAN_NAMES[x.id] ?? x.id}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.price_usd_month)}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.price_usd_year)}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.allowance_usd)}</td>
                  <td className="py-1 font-mono text-xs">{x.models.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Top-up: pay {price(p.topup.price_usd)} and get {price(p.topup.allowance_usd)} of allowance. It expires after 12 months.
          </p>
          <table className="w-full text-left">
            <caption className="pb-1 text-left text-muted-foreground">Model prices for one million tokens</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-medium">Model</th>
                <th className="py-1 pr-3 font-medium">Input</th>
                <th className="py-1 pr-3 font-medium">Output</th>
                <th className="py-1 pr-3 font-medium">Cache write, 5 minutes</th>
                <th className="py-1 pr-3 font-medium">Cache write, 1 hour</th>
                <th className="py-1 font-medium">Cache read</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.model_prices_per_million).map(([m, x]) => (
                <tr key={m} className="border-t">
                  <td className="py-1 pr-3 font-mono text-xs">{m}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.input)}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.output)}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.cache_write_5m)}</td>
                  <td className="py-1 pr-3 tabular-nums">{price(x.cache_write_1h)}</td>
                  <td className="py-1 tabular-nums">{price(x.cache_read)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="font-medium">What the server records</h3>
              <ul className="list-disc pl-5 text-muted-foreground">
                {p.records.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">What the server never stores</h3>
              <ul className="list-disc pl-5 text-muted-foreground">
                {p.never_stored.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </details>
  );
}
