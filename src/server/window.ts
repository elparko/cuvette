import { randomBytes } from "node:crypto";
import { createReadStream } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname } from "node:path";
import type { Bus } from "../core/bus.ts";
import type { AnalysisRecord } from "../core/record.ts";
import type { BusEvent, Mode, Question } from "../core/types.ts";
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
  ".csv": "text/csv",
  ".txt": "text/plain",
};
const MAX_BODY = 64 * 1024;

async function trailLines(session: WindowSession): Promise<unknown[]> {
  try {
    const spec = "../core/trail.ts";
    const mod = await import(spec);
    return mod.trail(session.record, 2);
  } catch {
    return session.record.entries(["tool_result"]).map((e, i) => ({
      n: i + 1,
      entry: e.id,
      icon: "step",
      line: String(e.data.summary || e.data.tool),
      stale: Boolean(e.node && session.record.stale().has(e.node)),
      details: e.data.manualRoute ? { "Manual route": e.data.manualRoute } : undefined,
    }));
  }
}

export async function stateOf(session: WindowSession) {
  const record = session.record;
  const imagesByNode: Record<string, string[]> = {};
  for (const e of record.entries(["tool_result"])) {
    if (e.node) imagesByNode[e.node] = (e.data.images as string[] | undefined) ?? [];
  }
  return {
    session: session.id,
    nodes: record.nodes().map((n) => ({ ...n, images: imagesByNode[n.id] ?? [] })),
    edges: record.edges(),
    stale: [...record.stale()],
    trail: await trailLines(session),
    questions: session.questions.open(),
    decisions: session.decisions.fields().map((f) => ({ key: f.key, label: f.label, value: f.value, owner: f.owner, set: f.set })),
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

export async function startWindow(
  session: WindowSession,
  opts: { port?: number } = {},
): Promise<{ url: string; close(): void }> {
  const token = randomBytes(18).toString("base64url");
  const clients = new Set<ServerResponse>();
  const permissions = new Map<string, Extract<BusEvent, { type: "permission" }>>();
  const instructions = new Map<number, Extract<BusEvent, { type: "instruction" }>>();

  const server = createServer(async (req, res) => {
    const { port } = server.address() as AddressInfo;
    const host = req.headers.host ?? "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(res, 403, '{"error":"bad host"}');
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/favicon.ico") return send(res, 204, "");
    const given = url.searchParams.get("t") ?? req.headers["x-token"];
    if (given !== token) return send(res, 401, '{"error":"missing or wrong token"}');
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
        res.writeHead(200, { "content-type": BLOB_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=3600" });
        createReadStream(path).pipe(res);
        return;
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
  });

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
      off();
      clearInterval(beat);
      setWindowUrl(undefined);
      for (const c of clients) c.end();
      server.close();
      server.closeAllConnections();
    },
  };
}
