import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { loadSettings } from "../core/config.ts";
import { claudeKey } from "../core/credentials.ts";
import { canStart, runDoctor, type Check } from "../core/doctor.ts";
import { CHOICES, chooseClaude, chooseLocal, copySample, firstStartState, needsFirstStart, RECOMMENDED_LOCAL, sampleFolder } from "../core/firststart.ts";
import { planView } from "../core/plan.ts";
import { buildWorkbook, copyFigures } from "../core/results.ts";
import { listSessions, openLock } from "../core/sessions.ts";
import { findPlace } from "../core/places.ts";
import { find, recordSetting, type SettingCtx, type SettingSession } from "../core/settings.ts";
import type { Mode } from "../core/types.ts";
import { commands, decisionRows, noOpen, openWithOs } from "../ui/commands.ts";
import { removeSecret, resetRow, saveSetting } from "../ui/config.ts";
import type { SessionLike } from "../ui/types.ts";
import { decisionsHtml, doctorHtml, planTextHtml, resultsHtml, sessionsHtml, stepsHtml, type Ctx } from "./app-html.ts";
import { settingsHtml } from "./app-settings.ts";
import { appPageHtml } from "./app-page.ts";
import { WebView } from "./app-view.ts";
import { hostAllowed, windowRoutes, type WindowSession } from "./window.ts";

export interface AppOptions {
  folder?: string;
  start?: string;
  resume?: string;
  session?: SessionLike;
  model?: string;
  adapters?: string[];
  env?: Record<string, string | undefined>;
  port?: number;
  makeSession?: (o: { folder?: string; resume?: string; model?: string }) => Promise<SessionLike>;
  checkKey?: (key: string) => Promise<{ ok: boolean; text: string }>;
  doctor?: () => Promise<Check[]>;
  fetch?: typeof fetch;
  onQuit?: () => void;
}

export interface AppHandle {
  url: string;
  port: number;
  token: string;
  close(): Promise<void>;
}

interface Current {
  session: SessionLike;
  view: WebView;
  graph: ReturnType<typeof windowRoutes>;
  owned: boolean;
}

const MAX_BODY = 256 * 1024;
const MODES = new Set(["watch", "follow", "teach", "plan"]);
const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".csv": "text/csv; charset=utf-8", ".tsv": "text/tab-separated-values; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
  ".json": "application/json", ".jsonl": "application/json", ".pdf": "application/pdf", ".html": "text/html; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".tif": "image/tiff", ".tiff": "image/tiff",
};

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((done, fail) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new Error("body too large"));
        req.destroy();
      } else parts.push(c);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(parts).toString("utf8");
        done(text ? JSON.parse(text) : {});
      } catch (e) {
        fail(e);
      }
    });
    req.on("error", fail);
  });
}

function send(res: ServerResponse, status: number, body: unknown, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

const inside = (root: string, p: string) => {
  const r = relative(resolve(root), resolve(p));
  return r === "" || (!r.startsWith("..") && !r.startsWith(sep) && !/^[A-Za-z]:/.test(r));
};

function reveal(path: string) {
  if (noOpen()) return;
  if (process.platform === "darwin") {
    const child = spawn("open", ["-R", path], { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } else openWithOs(statSync(path).isDirectory() ? path : dirname(path));
}

export function needsFirstSetup(model: string, env: Record<string, string | undefined>): boolean {
  return model.startsWith("claude") && claudeKey(env).from === "none";
}

const HIDE_WHEN_READY = new Set(["claude-key", "ollama"]);

export async function startApp(opts: AppOptions = {}): Promise<AppHandle> {
  const token = randomBytes(24).toString("base64url");
  const env = opts.env ?? process.env;
  let current: Current | undefined;
  let opening: Promise<void> | undefined;
  let lastError = "";
  const idle = new Set<ServerResponse>();
  let port = 0;

  const base = () => `http://127.0.0.1:${port}/`;
  const model = () => opts.model ?? loadSettings(current?.session.cwd ?? opts.folder ?? process.cwd()).model;

  const makeSession =
    opts.makeSession ??
    (async (o: { folder?: string; resume?: string; model?: string }) => {
      const { Session } = await import("../core/session.ts");
      if (o.resume) return (await Session.resume(o.resume, { model: o.model, interactive: true, settings: {} })) as unknown as SessionLike;
      return (await Session.create({ adapters: opts.adapters ?? [], model: o.model, cwd: o.folder, defaults: true, interactive: true, settings: {} })) as unknown as SessionLike;
    });

  const broadcastIdle = (msg: unknown) => {
    for (const c of idle) c.write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  const detach = async () => {
    const c = current;
    if (!c) return;
    current = undefined;
    if (!c.owned) c.session.markOpen?.({ app: undefined });
    c.view.close();
    c.graph.close();
    if (c.owned) await c.session.close().catch(() => {});
  };

  const attach = (session: SessionLike, owned: boolean) => {
    const view = new WebView(session, { token, env, url: (p) => `${base()}${p}?t=${token}`, quit: () => quit() });
    current = { session, view, graph: windowRoutes(session as unknown as WindowSession, token), owned };
    session.markOpen?.({ app: `${base()}?t=${token}` });
    broadcastIdle({ t: "switch" });
  };

  const quit = async () => {
    if (current && !current.owned) return;
    await detach();
    broadcastIdle({ t: "switch" });
    opts.onQuit?.();
  };

  const open = (o: { folder?: string; resume?: string; first?: string }) => {
    opening = (async () => {
      lastError = "";
      const old = current;
      if (old && !old.owned) throw new Error("This session belongs to the terminal. Open another session there.");
      await detach();
      try {
        const s = await makeSession({ folder: o.folder, resume: o.resume, model: opts.model });
        attach(s, true);
        if (o.first) s.send(o.first).catch(() => {});
      } catch (e) {
        lastError = (e as Error).message;
        broadcastIdle({ t: "switch" });
      }
    })().finally(() => (opening = undefined));
    return opening;
  };

  const settingCtx = (): SettingCtx => {
    const s = current?.session;
    return { cwd: s?.cwd ?? opts.folder ?? process.cwd(), env, session: s as unknown as SettingSession, ui: current ? { details: () => current!.view.details, toggleDetails: () => void current!.view.toggleDetails() } : undefined };
  };
  const ctx = (): Ctx => ({ token, session: current?.session as SessionLike, settings: settingCtx(), busy: current?.view.busy });

  const allowedFile = (p: string) => {
    const s = current?.session as (SessionLike & { outputDir?: string }) | undefined;
    if (!s) return false;
    return [s.dir, s.workDir, s.outputDir, s.cwd].filter(Boolean).some((root) => inside(root!, p));
  };

  const outDir = () => {
    const s = current?.session as (SessionLike & { outputDir?: string }) | undefined;
    return s?.outputDir ?? s?.workDir ?? "";
  };

  const sheets = () => {
    const s = current?.session as unknown as { record: never; adapters?: never[]; decisions: { fields(): never[] }; adapterInfo: { name: string; title: string; version: string; programVersion: string }[] };
    const dir = outDir();
    if (!existsSync(join(dir, "results.xlsx"))) return undefined;
    try {
      return buildWorkbook({ record: s.record, adapters: s.adapters ?? [], fields: s.decisions.fields(), programs: s.adapterInfo.map((a) => ({ name: a.title || a.name, version: a.version, programVersion: a.programVersion })), dir, figures: copyFigures(s.record, dir) });
    } catch {
      return undefined;
    }
  };

  const tab = (name: string): string => {
    const c = current!;
    const s = c.session;
    if (name === "analysis") {
      const v = planView(s.record);
      const plan = v ? `<h4>${v.approved ? "Confirmed analysis" : "Proposed analysis"}, version ${v.version}</h4><div class="plantext">${planTextHtml(v.text)}</div>` : `<p class="empty">No proposed analysis yet. Type your question. The agent proposes the analysis first.</p>`;
      return `${plan}<h4>Steps</h4>${stepsHtml(ctx())}<p class="dim small"><a href="graph/?t=${encodeURIComponent(token)}" target="_blank" rel="noopener">Open the step graph</a></p>`;
    }
    if (name === "results") return resultsHtml(ctx(), outDir(), sheets());
    if (name === "decisions") return decisionsHtml(ctx(), decisionRows(s), s.record.stale().size);
    if (name === "record") return `<p class="dim small">Every step, with the housekeeping steps and the code. This is the same as /details.</p>${c.view.recordHtml()}`;
    return "";
  };

  const fsCtx = () => ({ cwd: current?.session.cwd ?? opts.folder ?? process.cwd(), env, fetch: opts.fetch });

  const route = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    const p = url.pathname;
    const get = req.method === "GET";
    const post = req.method === "POST";
    const c = current;
    if (get && p === "/") return send(res, 200, appPageHtml(token), "text/html; charset=utf-8");
    if (p.startsWith("/graph/")) {
      if (!c) return send(res, 404, { error: "no session" });
      url.pathname = p.slice("/graph".length);
      return c.graph.handle(req, res, url);
    }
    if (get && p === "/events") {
      if (c) return c.view.attach(res);
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ t: "none" })}\n\n`);
      idle.add(res);
      res.on("close", () => idle.delete(res));
      return;
    }
    if (get && p === "/api/state") {
      return send(res, 200, {
        session: c ? c.view.header() : null,
        opening: !!opening,
        error: lastError,
        setup: !c && (opts.model ? needsFirstSetup(opts.model, env) : needsFirstStart(fsCtx())),
        model: model(),
        folder: opts.folder ? resolve(opts.folder) : "",
        start: resolve(opts.folder ?? opts.start ?? homedir()),
        home: homedir(),
        owned: c ? c.owned : true,
      });
    }
    if (get && p === "/api/commands") return send(res, 200, commands.map((x) => ({ name: x.name, args: x.args ?? "", help: x.help })));
    if (get && p === "/api/sessions") return send(res, 200, sessionsHtml(listSessions().slice(0, 200), token), "text/html; charset=utf-8");
    if (get && p === "/api/thumb") {
      const f = listSessions().find((s) => s.id === url.searchParams.get("id"))?.figure;
      if (!f || !existsSync(f)) return send(res, 404, { error: "no figure" });
      res.writeHead(200, { "content-type": TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=300", "x-content-type-options": "nosniff" });
      createReadStream(f).pipe(res);
      return;
    }
    if (get && p === "/api/settings") return send(res, 200, settingsHtml(ctx()), "text/html; charset=utf-8");
    if (get && p === "/api/dirs") {
      const at = resolve(url.searchParams.get("p") || opts.folder || homedir());
      if (!existsSync(at) || !statSync(at).isDirectory()) return send(res, 404, { error: `No folder ${at}` });
      let dirs: string[] = [];
      try {
        dirs = readdirSync(at, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name).sort((a, b) => a.localeCompare(b));
      } catch {}
      const recent = [...new Set(listSessions().map((s) => s.cwd).filter((x) => x && existsSync(x)))].slice(0, 8);
      return send(res, 200, { path: at, parent: dirname(at) === at ? null : dirname(at), dirs, recent, home: homedir() });
    }
    if (get && p === "/api/file") {
      const f = resolve(url.searchParams.get("p") ?? "");
      if (!allowedFile(f) || !existsSync(f) || !statSync(f).isFile()) return send(res, 404, { error: "no such file" });
      const headers: Record<string, string> = { "content-type": TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox" };
      if (url.searchParams.get("download")) headers["content-disposition"] = `attachment; filename="${basename(f).replace(/["\\\r\n]/g, "_")}"`;
      res.writeHead(200, headers);
      createReadStream(f).pipe(res);
      return;
    }
    if (get && p === "/api/tab") {
      if (!c) return send(res, 409, { error: "no session" });
      return send(res, 200, tab(url.searchParams.get("name") ?? ""), "text/html; charset=utf-8");
    }
    if (!post) return send(res, 404, { error: "not found" });
    const body = await readBody(req);
    const text = typeof body.text === "string" ? body.text : "";
    if (p === "/api/open") {
      if (opening) return send(res, 409, { error: "A session is opening." });
      if (body.sample) {
        const sm = copySample();
        void open({ folder: sm.folder, first: sm.request });
      }
      else if (typeof body.id === "string") {
        const place = findPlace(body.id);
        const lock = place ? openLock(place.recordDir) : undefined;
        if (lock && lock.pid !== process.pid) return send(res, 409, { error: lock.app ? `This session is open in another app window: ${lock.app}` : "This session is open in a terminal. Type /app there to show it here." });
        void open({ resume: body.id });
      }
      else if (typeof body.folder === "string" && body.folder.trim()) {
        const f = resolve(body.folder.trim().replace(/^~(?=\/|$)/, homedir()));
        if (!existsSync(f) || !statSync(f).isDirectory()) return send(res, 404, { error: `No folder ${f}` });
        void open({ folder: f });
      } else return send(res, 400, { error: "Give a folder or a session." });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/firststart") return send(res, 200, { ...(await firstStartState(fsCtx())), choices: CHOICES, recommended: RECOMMENDED_LOCAL, sample: sampleFolder() });
    if (p === "/api/firststart/claude") {
      const r = await chooseClaude(String(body.key ?? ""), { ...fsCtx(), check: opts.checkKey });
      if (r.ok) recordSetting(c?.session as unknown as SettingSession, find("claude_key")!, undefined, undefined, "user");
      return send(res, r.ok ? 200 : 400, r.ok ? r : { error: r.text });
    }
    if (p === "/api/firststart/local") return send(res, 200, await chooseLocal(String(body.model ?? ""), fsCtx()));
    if (p === "/api/doctor") {
      const checks = await (opts.doctor ?? (() => runDoctor({ env })))();
      const ready = canStart(checks);
      const shown = body.all ? checks : checks.filter((x) => x.status !== "ok" && !(ready && HIDE_WHEN_READY.has(x.id)));
      return send(res, 200, doctorHtml(shown, ready, checks), "text/html; charset=utf-8");
    }
    if (p === "/api/setting") {
      const def = find(String(body.name ?? ""));
      if (!def) return send(res, 404, { error: "no such setting" });
      const scope = (def.scopes.includes(body.scope as never) ? body.scope : def.scopes[0]) as never;
      if (!scope) return send(res, 400, { error: `${def.label} cannot change here.` });
      const r = await saveSetting(settingCtx(), def, String(body.value ?? ""), scope);
      if (c) c.view.ctx.refresh();
      return send(res, r.color === "red" ? 400 : 200, r);
    }
    if (p === "/api/setting/reset" || p === "/api/setting/remove") {
      const def = find(String(body.name ?? ""));
      if (!def) return send(res, 404, { error: "no such setting" });
      if (p.endsWith("remove") && !def.secret) return send(res, 400, { error: `${def.label} is not a key.` });
      const r = p.endsWith("reset") ? await resetRow(settingCtx(), def) : removeSecret(settingCtx(), def);
      if (c) c.view.ctx.refresh();
      return send(res, r.color === "red" ? 400 : 200, r);
    }
    if (p === "/api/reveal") {
      const f = resolve(String(body.path ?? ""));
      if (!allowedFile(f) || !existsSync(f)) return send(res, 404, { error: "no such file" });
      reveal(f);
      return send(res, 200, { ok: true });
    }
    if (!c) return send(res, 409, { error: "Open a folder or a session first." });
    if (p === "/api/send") {
      await c.view.submit(text, !!body.now);
      return send(res, 200, { ok: true });
    }
    if (p === "/api/stop") {
      c.view.stop();
      return send(res, 200, { ok: true });
    }
    if (p === "/api/mode") {
      if (!MODES.has(String(body.mode))) return send(res, 400, { error: "unknown mode" });
      c.view.setMode(body.mode as Mode);
      return send(res, 200, { ok: true });
    }
    if (p === "/api/act") {
      const r = await c.view.act(Number(body.id), body as never);
      return send(res, r.ok ? 200 : 404, r);
    }
    if (p === "/api/close") {
      await quit();
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "not found" });
  };

  const server = createServer(async (req, res) => {
    const host = req.headers.host ?? "";
    if (!hostAllowed(host, port)) return send(res, 403, { error: "bad host" });
    const origin = req.headers.origin;
    if (origin && origin !== `http://${host}`) return send(res, 403, { error: "bad origin" });
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/favicon.ico") return send(res, 204, "");
    const given = url.searchParams.get("t") ?? req.headers["x-token"];
    if (given !== token) return send(res, 401, { error: "missing or wrong token" });
    try {
      await route(req, res, url);
    } catch (e) {
      if (!res.headersSent) send(res, 400, { error: (e as Error).message });
    }
  });

  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(opts.port ?? 0, "127.0.0.1", () => done());
  });
  port = (server.address() as AddressInfo).port;
  const beat = setInterval(() => {
    current?.view.beat();
    for (const c of idle) c.write(": keep-alive\n\n");
  }, 20000);
  beat.unref();

  if (opts.session) attach(opts.session, false);
  else if (opts.resume) await open({ resume: opts.resume });
  else if (opts.folder && !(opts.model ? needsFirstSetup(opts.model, env) : needsFirstStart(fsCtx()))) await open({ folder: resolve(opts.folder) });

  return {
    url: `${base()}?t=${token}`,
    port,
    token,
    async close() {
      clearInterval(beat);
      await detach();
      for (const c of idle) c.end();
      server.close();
      server.closeAllConnections();
    },
  };
}

