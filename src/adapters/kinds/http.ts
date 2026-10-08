import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Args, ToolContext, ToolOutput } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { cap, defTool, expand, failSummary, inflight, lookup, makeRuntime, makeSummary, outputFile, readFields, renderString, scopeFor, type CallDir, type KindContext, type Scope } from "./common.ts";

function renderDeep(v: unknown, s: Scope): unknown {
  if (typeof v === "string") {
    const whole = /^\{([A-Za-z_][\w.]*)\}$/.exec(v);
    if (whole) {
      const got = lookup(s.args, whole[1]);
      if (got !== undefined) return got;
      if (s.declared.has(whole[1].split(".")[0])) return undefined;
    }
    return renderString(v, s);
  }
  if (Array.isArray(v)) return v.map((x) => renderDeep(x, s));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const r = renderDeep(x, s);
      if (r !== undefined) out[k] = r;
    }
    return out;
  }
  return v;
}

export function startHttp(c: KindContext): AdapterRuntime {
  const conn = c.adapter.manifest.connection;
  const live = inflight();
  const tools = c.adapter.manifest.tools.map((def) =>
    defTool(c, def, async ({ args, ctx, call }: { args: Args; ctx: ToolContext; call: CallDir }): Promise<ToolOutput> => {
      if (!conn.network) return { ok: false, error: "network access is off for this adapter. Set connection.network to true in adapter.yaml to allow HTTP calls" };
      const scope = scopeFor(c, def, args, call);
      const req = def.request as { method?: string; path?: string; query?: Record<string, unknown>; body?: unknown; headers?: Record<string, string> };
      const method = (req.method ?? "GET").toUpperCase();
      const rawPath = req.path ?? "";
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawPath)) return { ok: false, error: "request.path must be a path on connection.base_url, not a full URL" };
      const encoded: Scope = { ...scope, args: Object.fromEntries(Object.entries(args).map(([k, v]) => [k, typeof v === "object" ? v : encodeURIComponent(String(v))])) };
      const base = expand(conn.base_url, c.ph).replace(/\/+$/, "");
      const url = new URL(base + (rawPath.startsWith("/") || !rawPath ? "" : "/") + renderString(rawPath, encoded));
      for (const [k, v] of Object.entries((renderDeep(req.query ?? {}, scope) ?? {}) as Record<string, unknown>)) url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(conn.headers)) headers[k] = expand(v, c.ph);
      for (const [k, v] of Object.entries(req.headers ?? {})) headers[k] = renderString(v, scope);
      const body = req.body === undefined || method === "GET" || method === "HEAD" ? undefined : renderDeep(req.body, scope);
      let payload: string | undefined;
      if (body !== undefined) {
        payload = typeof body === "string" ? body : JSON.stringify(body);
        if (typeof body !== "string" && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) headers["content-type"] = "application/json";
      }
      const route = `${method} ${url.toString()}${payload ? ` with body ${payload}` : ""}`;
      const res = await live
        .track(ctx.signal, async (signal) => {
          const r = await fetch(url, { method, headers, body: payload, signal: AbortSignal.any([signal, AbortSignal.timeout(conn.call_timeout_s * 1000)]) });
          return { status: r.status, ok: r.ok, type: r.headers.get("content-type") ?? "", bytes: Buffer.from(await r.arrayBuffer()) };
        })
        .catch((e: Error) => ({ error: e.name === "TimeoutError" ? `the request timed out after ${conn.call_timeout_s} s` : e.name === "AbortError" ? "the request was cancelled" : `the request failed: ${e.message}` }));
      if ("error" in res) return { ok: false, error: res.error, manualRoute: route };
      const isText = /json|text|xml|javascript|csv|yaml/i.test(res.type) || res.type === "";
      if (!isText) {
        const key = Object.keys(call.outputs)[0];
        const path = key ? call.outputs[key] : join(call.dir, "response");
        writeFileSync(path, res.bytes);
        return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}`, summary: `${def.title || def.name}: saved ${res.bytes.length} bytes.`, outputs: [outputFile(path, key)], manualRoute: route, fidelity: "exact" };
      }
      const text = res.bytes.toString("utf8");
      let data: unknown = text;
      if (/json/i.test(res.type) || /^\s*[[{]/.test(text)) {
        try {
          data = JSON.parse(text);
        } catch {}
      }
      const f = readFields(data);
      const entry = c.adapter.mapEntry(def.name, args);
      const out: ToolOutput = {
        ok: res.ok && f.ok !== false,
        data,
        text: cap(text, 20000),
        metrics: f.metrics,
        table: f.table,
        outputs: f.outputs,
        manualRoute: f.manualRoute ?? route,
        fidelity: f.fidelity ?? entry?.fidelity ?? "exact",
      };
      if (!res.ok) out.error = `HTTP ${res.status}: ${cap(text, 1000)}`;
      else if (f.error) out.error = f.error;
      else if (!out.ok) out.error = f.summary ?? "the tool reported a failure";
      out.summary = !out.ok
        ? failSummary(def.title || def.name, out.error)
        : entry?.summary || !f.summary ? makeSummary(entry, def.title || def.name, args, { metrics: f.metrics, data, table: f.table }) : f.summary;
      return out;
    }),
  );
  return makeRuntime(c, { tools: () => tools, cancel: () => live.cancel(), close: () => live.cancel() });
}
