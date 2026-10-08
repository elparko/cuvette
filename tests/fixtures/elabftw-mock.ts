import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface MockExperiment {
  id: number;
  title: string;
  body: string;
  metadata: unknown;
  tags: string[];
  uploads: { name: string; size: number; comment: string }[];
  revisions: string[];
  items: number[];
}

export interface MockItem {
  id: number;
  title: string;
  body: string;
  metadata: unknown;
}

export interface Mock {
  url: string;
  key: string;
  experiments: Map<number, MockExperiment>;
  items: Map<number, MockItem>;
  requests: { method: string; path: string; auth: string | undefined }[];
  imports: { name: string; size: number; entityType: string }[];
  close(): Promise<void>;
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

function multipart(body: Buffer, contentType: string): { fields: Record<string, string>; file?: { name: string; size: number } } {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
  const fields: Record<string, string> = {};
  let file: { name: string; size: number } | undefined;
  if (!boundary) return { fields };
  for (const part of body.toString("latin1").split(`--${boundary}`)) {
    const m = /^\r\nContent-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]*)")?[^\r]*\r\n(?:[^\r]+\r\n)*\r\n([\s\S]*)\r\n$/.exec(part);
    if (!m) continue;
    if (m[2] !== undefined) file = { name: m[2], size: Buffer.byteLength(m[3]!, "latin1") };
    else fields[m[1]!] = m[3]!;
  }
  return { fields, file };
}

export async function startMock(key = "mock-key-123"): Promise<Mock> {
  const experiments = new Map<number, MockExperiment>();
  const items = new Map<number, MockItem>();
  const requests: Mock["requests"] = [];
  const imports: Mock["imports"] = [];
  let next = 1;
  let origin = "";

  const send = (res: ServerResponse, status: number, json?: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers });
    res.end(json === undefined ? undefined : JSON.stringify(json));
  };

  const server: Server = createServer(async (req, res) => {
    const path = (req.url ?? "").split("?")[0]!;
    requests.push({ method: req.method ?? "", path, auth: req.headers.authorization });
    if (req.headers.authorization !== key) return send(res, 401, { description: "Unauthorized" });
    const raw = await readBody(req);
    const ctype = req.headers["content-type"] ?? "";
    const json = ctype.includes("application/json") && raw.length ? JSON.parse(raw.toString()) : {};
    const m = /^\/api\/v2\/(experiments|items)(?:\/(\d+))?(?:\/(tags|uploads|revisions|items_links))?$/.exec(path);
    const location = (p: string) => ({ Location: `${origin}/api/v2/${p}` });

    if (req.method === "POST" && path === "/api/v2/experiments") {
      if (typeof json.title !== "string") return send(res, 400, { description: "title is required" });
      const id = next++;
      experiments.set(id, { id, title: json.title, body: json.body ?? "", metadata: null, tags: [], uploads: [], revisions: [json.body ?? ""], items: [] });
      return send(res, 201, undefined, location(`experiments/${id}`));
    }
    if (req.method === "POST" && path === "/api/v2/import") {
      const p = multipart(raw, ctype);
      if (!p.file || !p.fields.entity_type) return send(res, 400, { description: "file and entity_type are required" });
      imports.push({ name: p.file.name, size: p.file.size, entityType: p.fields.entity_type });
      return send(res, 201, undefined, location("experiments/1"));
    }
    if (!m) return send(res, 404, { description: "Not found" });
    const id = Number(m[2]);
    if (m[1] === "items") {
      const item = items.get(id);
      if (!item || req.method !== "GET" || m[3]) return send(res, 404, { description: "Not found" });
      return send(res, 200, { ...item, metadata: item.metadata === null ? null : JSON.stringify(item.metadata) });
    }
    const exp = experiments.get(id);
    if (!exp) return send(res, 404, { description: "Not found" });
    const sub = m[3];
    if (!sub && req.method === "GET") {
      return send(res, 200, {
        id: exp.id,
        title: exp.title,
        body: exp.body,
        metadata: exp.metadata === null ? null : JSON.stringify(exp.metadata),
        tags: exp.tags.join("|"),
        items_links: exp.items.map((i) => ({ entityid: i, title: items.get(i)?.title ?? "" })),
        uploads: exp.uploads,
      });
    }
    if (!sub && req.method === "PATCH") {
      if (typeof json.title === "string") exp.title = json.title;
      if (typeof json.body === "string") exp.body = json.body;
      if (typeof json.bodyappend === "string") exp.body += json.bodyappend;
      if (json.metadata !== undefined) exp.metadata = json.metadata;
      if (json.body !== undefined || json.bodyappend !== undefined) exp.revisions.push(exp.body);
      return send(res, 200, { id: exp.id, title: exp.title, body: exp.body });
    }
    if (sub === "tags" && req.method === "POST") {
      const list: string[] = json.tags ?? (json.tag ? [json.tag] : []);
      exp.tags.push(...list);
      return send(res, 201, undefined, location(`experiments/${id}/tags/1`));
    }
    if (sub === "uploads" && req.method === "POST") {
      const p = multipart(raw, ctype);
      if (!p.file) return send(res, 400, { description: "file is required" });
      exp.uploads.push({ name: p.file.name, size: p.file.size, comment: p.fields.comment ?? "" });
      return send(res, 201, undefined, location(`experiments/${id}/uploads/${exp.uploads.length}`));
    }
    if (sub === "revisions" && req.method === "GET") return send(res, 200, exp.revisions.map((_, i) => ({ id: i + 1, content_type: 1, created_at: "2026-10-08 10:00:00", fullname: "Mock User" })));
    if (sub === "items_links" && req.method === "GET") return send(res, 200, exp.items.map((i) => ({ entityid: i, title: items.get(i)?.title ?? "" })));
    return send(res, 404, { description: "Not found" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url: origin, key, experiments, items, requests, imports, close: () => new Promise((r) => server.close(() => r())) };
}
