import { randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname } from "node:path";
import type { Bus } from "../core/bus.ts";
import type { AnalysisRecord } from "../core/record.ts";
import type { BusEvent, Mode, Question } from "../core/types.ts";
import { roleInRecord, stepNumbers } from "../core/housekeeping.ts";
import { planView } from "../core/plan.ts";
import { parseRoute, shortReason, trail } from "../core/trail.ts";
import { panelHtml } from "./panel-page.ts";
import { setWindowUrl } from "./notify.ts";
import { pageHtml } from "./page.ts";

export interface WindowSession {
  id: string;
  bus: Bus;
  record: AnalysisRecord;
  decisions: { fields(): { key: string; label: string; value: unknown; owner: string; set: boolean }[] };
  questions: { open(): Question[] };
  answer(qid: string, value: unknown, note?: string): Promise<void>;
  busy: boolean;
  mode: Mode;
  send(text: string): Promise<string>;
  interrupt(): void;
  respondPermission(rid: string, ok: boolean, note?: string, always?: boolean): void;
  followDone(step: number, note?: string, agentDoes?: boolean): Promise<void>;
  setMode(mode: Mode): void;
}

const MODES = new Set(["watch", "follow", "teach", "plan"]);
const FEED_KINDS = new Set(["user", "assistant", "tool_result", "question", "answer", "notice", "error", "follow_step", "permission"]);

function feedEntry(e: { id: number; kind: string; data: Record<string, unknown> }) {
  const d = e.data;
  const base = { id: e.id, kind: e.kind };
  switch (e.kind) {
    case "user":
    case "notice":
    case "error":
      return { ...base, text: String(d.text ?? d.message ?? "") };
    case "assistant":
      return d.final ? { ...base, text: String(d.text ?? "") } : undefined;
    case "tool_result":
      return { ...base, tool: String(d.tool ?? ""), ok: d.ok !== false, text: String(d.summary ?? d.tool ?? ""), route: d.manualRoute ? String(d.manualRoute) : undefined };
    case "question":
      return { ...base, qid: d.qid, title: d.title, text: d.text };
    case "answer":
      return { ...base, qid: d.qid, text: `${JSON.stringify(d.value)}${d.note ? ` (${d.note})` : ""}`, by: d.by };
    case "follow_step":
      return { ...base, step: d.step, tool: d.tool, status: d.status, text: String(d.instruction ?? "") };
    case "permission":
      return { ...base, rid: d.rid, tool: d.tool, text: `${d.tool}: ${d.decision}` };
  }
  return undefined;
}

const BLOB_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".ijm": "text/plain; charset=utf-8",
  ".py": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};
const MAX_BODY = 64 * 1024;

async function trailLines(session: WindowSession): Promise<unknown[]> {
  try {
    return trail(session.record, 2);
  } catch {
    return session.record.entries(["tool_result"]).map((e, i) => ({
      n: i + 1,
      entry: e.id,
      icon: "step",
      line: String(e.data.summary || e.data.tool),
      stale: Boolean(e.node && session.record.stale().has(e.node)),
      group: 0,
      badges: [],
      details: e.data.manualRoute ? { "Manual route": e.data.manualRoute } : undefined,
    }));
  }
}

const CODE_CAP = 20000;
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function codeOf(n: { args: unknown; result: unknown }, effective?: unknown): string {
  const data = asObj(asObj(n.result).data);
  const code = data.macro ?? asObj(effective).code ?? asObj(n.args).code ?? asObj(n.args).script ?? "";
  return String(code).slice(0, CODE_CAP);
}

function decisionRows(session: WindowSession) {
  const changes = new Map<string, { was: unknown; by: string; reason: string; count: number }>();
  const setBy = new Map<string, string>();
  for (const e of session.record.entries(["setup", "decision"])) {
    if (e.kind === "setup") {
      for (const k of Object.keys(asObj(e.data.values))) setBy.set(k, e.data.how ? `setup (${String(e.data.how)})` : "setup");
    } else {
      const k = String(e.data.key);
      const prev = changes.get(k);
      changes.set(k, { was: prev ? prev.was : e.data.old, by: String(e.data.by ?? "unknown"), reason: String(e.data.reason ?? ""), count: (prev?.count ?? 0) + 1 });
      setBy.set(k, String(e.data.by ?? "unknown"));
    }
  }
  return session.decisions.fields().map((f) => {
    const c = changes.get(f.key);
    return {
      key: f.key,
      label: f.label,
      value: f.value,
      owner: f.owner,
      set: f.set,
      setBy: f.set ? setBy.get(f.key) ?? "setup" : "not set",
      changed: c ? { was: c.was, by: c.by, reason: c.reason, count: c.count } : undefined,
    };
  });
}

function findingRows(session: WindowSession) {
  const status = new Map<string, string>();
  for (const e of session.record.entries(["finding_resolution"])) status.set(String(e.data.fid), String(e.data.action));
  return session.record.entries(["finding"]).map((e) => ({
    fid: String(e.data.fid ?? e.id),
    entry: e.id,
    severity: String(e.data.severity ?? "info"),
    check: String(e.data.check ?? ""),
    message: String(e.data.message ?? ""),
    nodes: (e.data.nodes as string[] | undefined) ?? [],
    status: status.get(String(e.data.fid)) ?? String(e.data.status ?? "open"),
  }));
}

export async function stateOf(session: WindowSession) {
  const record = session.record;
  const compare = record.comparisons();
  const stale = record.stale();
  const questions = session.questions.open();
  const waitingKeys = new Set(questions.map((q) => q.decisionKey).filter(Boolean));
  const resultByNode = new Map<string, Record<string, unknown>>();
  const nodeByCall = new Map<string, string>();
  const failed: { id: string; entry: number; tool: string; reason: string; error: string; housekeeping: boolean }[] = [];
  const all = record.entries();
  for (const e of record.entries(["tool_result"])) {
    if (e.node) {
      resultByNode.set(e.node, e.data);
      if (e.data.callId) nodeByCall.set(String(e.data.callId), e.node);
    } else if (e.data.ok === false) {
      const error = String(e.data.error ?? e.data.text ?? "");
      failed.push({ id: `x${e.id}`, entry: e.id, tool: String(e.data.tool ?? ""), reason: shortReason(error), error, housekeeping: roleInRecord(all, e) !== "failed" });
    }
  }
  const steps = stepNumbers(record.nodes());
  const deviations = new Map<string, unknown[]>();
  for (const e of record.entries(["deviation"])) {
    const id = nodeByCall.get(String(e.data.callId));
    if (id) deviations.set(id, [...(deviations.get(id) ?? []), ...((e.data.deviations as unknown[] | undefined) ?? [])]);
  }
  const nodes = record.nodes().map((n) => {
    const r = resultByNode.get(n.id);
    const data = asObj(asObj(n.result).data);
    const { macro: _macro, ...restData } = data;
    return {
      ...n,
      result: n.result && typeof n.result === "object" ? { ...asObj(n.result), data: restData } : n.result,
      images: (r?.images as string[] | undefined) ?? [],
      route: parseRoute(n.manualRoute || String(r?.manualRoute ?? "")),
      code: codeOf(n, r?.effectiveArgs),
      compare: compare.get(n.id) ?? null,
      waiting: Object.keys(n.decisions ?? {}).some((k) => waitingKeys.has(k)),
      deviations: deviations.get(n.id) ?? [],
      step: steps.get(n.id) ?? null,
    };
  });
  const setup = record.entries(["setup"]).at(-1);
  return {
    session: session.id,
    question: String(asObj(setup?.data.values).question ?? ""),
    nodes,
    edges: record.edges(),
    stale: [...stale],
    failed,
    trail: await trailLines(session),
    questions,
    decisions: decisionRows(session),
    findings: findingRows(session),
    plan: planView(record) ?? null,
    busy: session.busy,
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
      } else parts.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: string, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

export function windowRoutes(session: WindowSession, token: string): { handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void>; close(): void } {
  const clients = new Set<ServerResponse>();
  const permissions = new Map<string, Extract<BusEvent, { type: "permission" }>>();
  const instructions = new Map<number, Extract<BusEvent, { type: "instruction" }>>();

  const handle = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    try {
      if (req.method === "GET" && url.pathname === "/") return send(res, 200, pageHtml(token), "text/html; charset=utf-8");
      if (req.method === "GET" && url.pathname === "/panel") return send(res, 200, panelHtml(token), "text/html; charset=utf-8");
      if (req.method === "GET" && url.pathname === "/api/feed") {
        const since = Number(url.searchParams.get("since") ?? 0) || 0;
        const all = session.record.entries();
        const entries = all.filter((e) => e.id > since && FEED_KINDS.has(e.kind) && !(e.kind === "tool_result" && (e.data.sensitivityOf || (!e.data.adapter && e.data.ok)))).map(feedEntry).filter(Boolean);
        return send(res, 200, JSON.stringify({
          entries,
          next: all.reduce((m, e) => Math.max(m, e.id), since),
          busy: session.busy,
          mode: session.mode,
          openQuestions: session.questions.open(),
          pendingPermissions: [...permissions.values()].map((p) => ({ rid: p.rid, tool: p.tool, code: p.code, touches: p.touches })),
          pendingFollow: [...instructions.values()].map((i) => ({ step: i.step, tool: i.tool, text: i.text })),
        }));
      }
      if (req.method === "POST" && url.pathname === "/api/send") {
        const body = JSON.parse(await readBody(req)) as { text?: string };
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) return send(res, 400, '{"error":"text is empty"}');
        if (session.busy) return send(res, 409, '{"error":"the agent is busy"}');
        session.send(text).catch(() => {});
        return send(res, 200, '{"ok":true}');
      }
      if (req.method === "POST" && url.pathname === "/api/permission") {
        const body = JSON.parse(await readBody(req)) as { rid?: string; ok?: boolean; note?: string; always?: boolean };
        if (typeof body.rid !== "string" || !permissions.has(body.rid)) return send(res, 404, '{"error":"no such permission request"}');
        session.respondPermission(body.rid, Boolean(body.ok), body.note ?? "", Boolean(body.always));
        permissions.delete(body.rid);
        return send(res, 200, '{"ok":true}');
      }
      if (req.method === "POST" && url.pathname === "/api/follow") {
        const body = JSON.parse(await readBody(req)) as { step?: number; note?: string; agentDoes?: boolean };
        if (typeof body.step !== "number" || !instructions.has(body.step)) return send(res, 404, '{"error":"no such step"}');
        instructions.delete(body.step);
        await session.followDone(body.step, body.note ?? "", Boolean(body.agentDoes));
        return send(res, 200, '{"ok":true}');
      }
      if (req.method === "POST" && url.pathname === "/api/mode") {
        const body = JSON.parse(await readBody(req)) as { mode?: string };
        if (!body.mode || !MODES.has(body.mode)) return send(res, 400, '{"error":"unknown mode"}');
        session.setMode(body.mode as Mode);
        return send(res, 200, '{"ok":true}');
      }
      if (req.method === "POST" && url.pathname === "/api/stop") {
        session.interrupt();
        return send(res, 200, '{"ok":true}');
      }
      if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, JSON.stringify(await stateOf(session)));
      if (req.method === "GET" && url.pathname.startsWith("/api/blob/")) {
        const sha = url.pathname.slice("/api/blob/".length);
        const path = /^[0-9a-f]{64}$/.test(sha) ? session.record.blobPath(sha) : undefined;
        if (!path) return send(res, 404, '{"error":"no such blob"}');
        return pipeFile(res, path, { "content-type": BLOB_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=3600" });
      }
      if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/answer") {
        const body = JSON.parse(await readBody(req)) as { qid?: string; value?: unknown; note?: string };
        if (typeof body.qid !== "string" || !session.questions.open().some((q) => q.qid === body.qid)) {
          return send(res, 404, '{"error":"no open question with that id"}');
        }
        await session.answer(body.qid, body.value, body.note);
        return send(res, 200, '{"ok":true}');
      }
      send(res, 404, '{"error":"not found"}');
    } catch (e) {
      send(res, 400, JSON.stringify({ error: (e as Error).message }));
    }
  };

  const off = session.bus.on((e) => {
    if (e.type === "permission") permissions.set(e.rid, e);
    else if (e.type === "instruction") instructions.set(e.step, e);
    else if (e.type === "entry" && e.entry.kind === "permission") permissions.delete(String(e.entry.data.rid));
    else if (e.type === "entry" && e.entry.kind === "follow_step" && e.entry.data.status !== "waiting") instructions.delete(Number(e.entry.data.step));
    const data = `data: ${JSON.stringify(e)}\n\n`;
    for (const c of clients) c.write(data);
  });
  const beat = setInterval(() => {
    for (const c of clients) c.write(": keep-alive\n\n");
  }, 20000);
  beat.unref();
  return {
    handle,
    close() {
      off();
      clearInterval(beat);
      for (const c of clients) c.end();
    },
  };
}

export const FILE_HEADERS = { "x-content-type-options": "nosniff", "content-security-policy": "sandbox" };

export function pipeFile(res: ServerResponse, path: string, headers: Record<string, string>, o: { sandbox?: boolean } = {}): void {
  const stream = createReadStream(path);
  stream.once("open", () => {
    res.writeHead(200, { ...(o.sandbox === false ? { "x-content-type-options": "nosniff" } : FILE_HEADERS), ...headers });
    stream.pipe(res);
  });
  stream.once("error", () => {
    if (!res.headersSent) send(res, 404, '{"error":"cannot read the file"}');
    else res.destroy();
  });
  res.once("close", () => stream.destroy());
}

export function tokenOk(given: unknown, token: string): boolean {
  if (typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hostAllowed(host: string, port: number): boolean {
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

export async function startWindow(
  session: WindowSession,
  opts: { port?: number } = {},
): Promise<{ url: string; close(): void }> {
  const token = randomBytes(18).toString("base64url");
  const routes = windowRoutes(session, token);
  const server = createServer(async (req, res) => {
    const { port } = server.address() as AddressInfo;
    const host = req.headers.host ?? "";
    if (!hostAllowed(host, port)) return send(res, 403, '{"error":"bad host"}');
    if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(res, 403, '{"error":"bad origin"}');
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/favicon.ico") return send(res, 204, "");
    if (!tokenOk(url.searchParams.get("t") ?? req.headers["x-token"], token)) return send(res, 401, '{"error":"missing or wrong token"}');
    await routes.handle(req, res, url);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, "127.0.0.1", resolve);
  });
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/?t=${token}`;
  setWindowUrl(url);

  return {
    url,
    close() {
      routes.close();
      setWindowUrl(undefined);
      server.close();
      server.closeAllConnections();
    },
  };
}
