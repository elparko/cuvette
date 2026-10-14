import { execFile, spawn } from "node:child_process";
import { noBidi } from "../core/markdown.ts";
import { randomBytes } from "node:crypto";
import { accessSync, constants, existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { adapterIndex } from "../adapters/catalog.ts";
import { suggestPrograms } from "../core/suggest.ts";
import { loadSettings } from "../core/config.ts";
import { claudeKey, isCredentialsFile } from "../core/credentials.ts";
import { canStart, runDoctor, type Check } from "../core/doctor.ts";
import { KEY_GUIDE } from "../core/keyhelp.ts";
import { CHOICES, chooseClaude, chooseLocal, copySample, firstStartState, needsFirstStart, RECOMMENDED_LOCAL, sampleFolder } from "../core/firststart.ts";
import { deviationHtml } from "../core/freeze.ts";
import { planView } from "../core/plan.ts";
import { buildWorkbook, copyFigures } from "../core/results.ts";
import { listSessions, openLock } from "../core/sessions.ts";
import { findPlace, removeIndexRow, renameIndexRow } from "../core/places.ts";
import { find, recordSetting, type SettingCtx, type SettingSession } from "../core/settings.ts";
import type { Mode } from "../core/types.ts";
import { commands, decisionRows, freshStatus, noOpen, openWithOs } from "../ui/commands.ts";
import { removeSecret, resetRow, saveSetting } from "../ui/config.ts";
import type { SessionLike } from "../ui/types.ts";
import { decisionsHtml, doctorHtml, planTextHtml, programsHtml, resultsHtml, sessionsHtml, statusHtml, stepsHtml, type Ctx } from "./app-html.ts";
import { settingsHtml } from "./app-settings.ts";
import { isProgramAction, listPrograms, planByInstall } from "../core/programs.ts";
import { scaledCopy } from "../core/thumbs.ts";
import { dropInstall } from "../ui/programs.ts";
import { addFor, planFor, reviewFor, runFor, type ProgramHooks } from "../ui/programs.ts";
import { appPageHtml } from "./app-page.ts";
import { doctorJson, programsJson, sessionsJson, settingsJson } from "./app-json.ts";
import { WebView } from "./app-view.ts";
import { FILE_HEADERS, hostAllowed, pipeFile, push, tokenOk, windowRoutes, type WindowSession } from "./window.ts";
import { ROOT } from "../root.ts";

export interface AppOptions {
  folder?: string;
  trustFolder?: boolean;
  start?: string;
  resume?: string;
  session?: SessionLike;
  model?: string;
  adapters?: string[];
  env?: Record<string, string | undefined>;
  port?: number;
  makeSession?: (o: { folder?: string; resume?: string; model?: string; adapter?: string }) => Promise<SessionLike>;
  checkKey?: (key: string) => Promise<{ ok: boolean; text: string }>;
  doctor?: () => Promise<Check[]>;
  fetch?: typeof fetch;
  onQuit?: () => void;
  programs?: ProgramHooks;
  registry?: string;
  review?: { model?: string; provider?: import("../core/types.ts").Provider };
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
  ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".woff2": "font/woff2",
};

export const UI_DIST = join(ROOT, "ui-dist");

function newUiPage(): string | undefined {
  try {
    return readFileSync(join(UI_DIST, "index.html"), "utf8");
  } catch {
    return undefined;
  }
}

function sendAsset(res: ServerResponse, p: string): boolean {
  let f: string;
  try {
    f = resolve(UI_DIST, "." + decodeURIComponent(p));
  } catch {
    return false;
  }
  if (!f.startsWith(resolve(UI_DIST, "assets") + sep) || !existsSync(f) || !statSync(f).isFile()) return false;
  pipeFile(res, f, { "content-type": TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" }, { sandbox: false });
  return true;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const TOO_LONG = `The message is too long. The limit is ${MAX_BODY / 1024} KB. Save the text in a file in the data folder instead.`;

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((done, fail) => {
    let size = 0;
    const parts: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new HttpError(413, TOO_LONG));
        parts.length = 0;
      } else parts.push(c);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(parts).toString("utf8");
        const body = text ? JSON.parse(text) : {};
        if (body === null || typeof body !== "object" || Array.isArray(body)) return fail(new HttpError(400, "The request body must be a JSON object."));
        done(body);
      } catch {
        fail(new HttpError(400, "The request body is not valid JSON."));
      }
    });
    req.on("error", () => fail(new HttpError(400, "The request body did not arrive.")));
  });
}

export const WRONG_LINK = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cuvette</title>
<body style="font: 16px/1.5 system-ui, sans-serif; max-width: 40em; margin: 3em auto; padding: 0 16px"><h1>This link does not open the app</h1>
<p>The link is old or not complete. Cuvette makes a new link each time the app starts.</p>
<p>Use the link that <code>cuvette app</code> shows in the terminal. If the app does not run, start it again with <code>cuvette app</code>.</p></body></html>`;

function send(res: ServerResponse, status: number, body: unknown, type = "application/json; charset=utf-8", extra: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...extra });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

export const attachment = (name: string) => `attachment; filename="${name.replace(/[^\x20-\x7e]|["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name.replace(/[\ud800-\udfff]/gu, "_")).replace(/['()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase())}`;

const readable = (dir: string) => {
  try {
    accessSync(dir, constants.R_OK | constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const cannotRead = (dir: string) => `Cuvette cannot read the folder ${dir}. Give your user read access to it, or choose another folder.`;

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

export function chooseFolder(start: string): Promise<string> {
  const at = existsSync(start) ? `default location (POSIX file ${JSON.stringify(start)})` : "";
  const script = [`tell me to activate`, `POSIX path of (choose folder with prompt "Choose the folder with your data" ${at})`];
  return new Promise((done, fail) =>
    execFile("osascript", script.flatMap((l) => ["-e", l]), { encoding: "utf8" }, (err, out, errOut) => {
      if (err && /-128/.test(String(errOut))) return done("");
      if (err) return fail(new Error(String(errOut).trim() || err.message));
      done(out.trim().replace(/(.)\/$/, "$1"));
    }),
  );
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
  let lastOpen = { key: "", at: 0 };
  let lastError = "";
  const idle = new Set<ServerResponse>();
  let port = 0;

  const base = () => `http://127.0.0.1:${port}/`;
  const model = () => opts.model ?? loadSettings(current?.session.cwd ?? opts.folder ?? process.cwd()).model;

  const makeSession =
    opts.makeSession ??
    (async (o: { folder?: string; resume?: string; model?: string; adapter?: string }) => {
      const { Session } = await import("../core/session.ts");
      const trustFolder = !!opts.trustFolder && resolve(o.folder ?? process.cwd()) === resolve(opts.folder ?? process.cwd());
      if (o.resume) return (await Session.resume(o.resume, { model: o.model, interactive: true, trustFolder, settings: {} })) as unknown as SessionLike;
      return (await Session.create({ adapters: o.adapter ? [o.adapter] : opts.adapters ?? [], model: o.model, cwd: o.folder, defaults: true, interactive: true, trustFolder, settings: {} })) as unknown as SessionLike;
    });

  const broadcastIdle = (msg: unknown) => {
    for (const c of idle) push(c, `data: ${JSON.stringify(msg)}\n\n`);
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

  const TERMINAL_SESSION = "This session belongs to the terminal. Open another session there.";

  const open = (o: { folder?: string; resume?: string; first?: string; adapter?: string }) => {
    opening = (async () => {
      lastError = "";
      try {
        await detach();
        const s = await makeSession({ folder: o.folder, resume: o.resume, model: opts.model, adapter: o.adapter });
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
    const real = (x: string) => {
      try {
        return realpathSync(x);
      } catch {
        return resolve(x);
      }
    };
    return !isCredentialsFile(p) && [s.dir, s.workDir, s.outputDir, s.cwd].filter(Boolean).some((root) => inside(root!, p) && inside(real(root!), real(p)));
  };

  const outDir = () => {
    const s = current?.session as (SessionLike & { outputDir?: string }) | undefined;
    return s?.outputDir ?? s?.workDir ?? "";
  };

  const sheets = () => {
    const s = current?.session as unknown as { record: never; adapters?: never[]; decisions: { fields(): never[] }; adapterInfo: { name: string; title: string; version: string; programVersion: string }[]; citationStyle?(): "apa" | "vancouver" };
    const dir = outDir();
    if (!existsSync(join(dir, "results.xlsx")) && !(s.record as unknown as { nodes(): unknown[] }).nodes().length) return undefined;
    try {
      return buildWorkbook({ record: s.record, adapters: s.adapters ?? [], fields: s.decisions.fields(), programs: s.adapterInfo.map((a) => ({ name: a.title || a.name, version: a.version, programVersion: a.programVersion })), dir, figures: copyFigures(s.record, dir), citationStyle: s.citationStyle?.() });
    } catch {
      return undefined;
    }
  };

  const tab = async (name: string): Promise<string> => {
    const c = current!;
    const s = c.session;
    if (name === "analysis") {
      const states = await freshStatus(s);
      const v = planView(s.record);
      const plan = v ? `<h4>${v.approved ? "Confirmed analysis" : "Proposed analysis"}, version ${v.version}</h4><div class="plantext">${planTextHtml(v.text)}</div>` : `<p class="empty">No proposed analysis yet. Type your question. The agent proposes the analysis first.</p>`;
      return `${plan}${deviationHtml(s.record, "h4")}<h4>Steps</h4>${statusHtml(states)}${stepsHtml(ctx())}<p class="dim small"><a href="graph/?t=${encodeURIComponent(token)}" target="_blank" rel="noopener">Open the step graph</a></p>`;
    }
    if (name === "results") return resultsHtml(ctx(), outDir(), sheets());
    if (name === "decisions") return decisionsHtml(ctx(), decisionRows(s), await freshStatus(s));
    if (name === "record") return `<p class="dim small">Every step, with the housekeeping steps and the code. This is the same as /details.</p>${c.view.recordHtml()}`;
    return "";
  };

  interface Job {
    key: string;
    command?: string;
    action: string;
    started: number;
    lines: string[];
    done?: { ok: boolean; text: string };
    subs: Set<ServerResponse>;
    abort: AbortController;
    ended?: Promise<unknown>;
  }
  const jobs = new Map<string, Job>();
  const runningJob = (name: string, command?: string) => [...jobs].find(([, j]) => !j.done && (j.key === name || (!!command && j.command === command)));
  const JOB_LINES = 500;
  const progHooks = (): ProgramHooks => ({ cwd: settingCtx().cwd, env, ...opts.programs });
  const jobSend = (j: { subs: Set<ServerResponse> }, msg: unknown) => {
    for (const r of j.subs) push(r, `data: ${JSON.stringify(msg)}\n\n`);
  };

  const fsCtx = () => ({ cwd: current?.session.cwd ?? opts.folder ?? process.cwd(), env, fetch: opts.fetch });

  const route = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    const p = url.pathname;
    const get = req.method === "GET";
    const post = req.method === "POST";
    const c = current;
    if (get && p === "/") {
      const page = url.searchParams.get("ui") === "old" ? undefined : newUiPage();
      return send(res, 200, page ?? appPageHtml(token), "text/html; charset=utf-8");
    }
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
        finder: process.platform === "darwin" && !noOpen(),
        owned: c ? c.owned : true,
      });
    }
    if (get && p === "/api/commands") return send(res, 200, commands.map((x) => ({ name: x.name, args: x.args ?? "", help: x.help })));
    if (get && p === "/api/sessions") return send(res, 200, sessionsHtml(listSessions().slice(0, 200), token), "text/html; charset=utf-8");
    if (get && p === "/api/sessions.json") return send(res, 200, sessionsJson(listSessions().slice(0, 200), token));
    if (get && p === "/api/settings.json") return send(res, 200, settingsJson(settingCtx(), !!current?.view.busy));
    if (get && p === "/api/programs.json") {
      const quick = url.searchParams.get("quick") === "1";
      const running = [...jobs].filter(([, j]) => !j.done).map(([id, j]) => ({ id, name: j.key, action: j.action, started: j.started }));
      return send(res, 200, { ...programsJson(await listPrograms({ ...progHooks(), quick }), { checking: quick }), jobs: running });
    }
    if (get && p === "/api/thumb") {
      const f = listSessions().find((s) => s.id === url.searchParams.get("id"))?.figure;
      if (!f || !existsSync(f)) return send(res, 404, { error: "no figure" });
      return pipeFile(res, f, { "content-type": TYPES[extname(f).toLowerCase()] ?? "application/octet-stream", "cache-control": "private, max-age=300" });
    }
    if (get && p === "/api/settings") return send(res, 200, settingsHtml(ctx()), "text/html; charset=utf-8");
    if (get && p === "/api/programs") {
      const quick = url.searchParams.get("quick") === "1";
      return send(res, 200, programsHtml(await listPrograms({ ...progHooks(), quick }), { checking: quick }), "text/html; charset=utf-8");
    }
    if (get && p === "/api/programs/progress") {
      const j = jobs.get(url.searchParams.get("job") ?? "");
      if (!j) return send(res, 404, { error: "no such job" });
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      for (const line of j.lines) res.write(`data: ${JSON.stringify({ line })}\n\n`);
      if (j.done) return res.end(`data: ${JSON.stringify({ done: true, ...j.done })}\n\n`);
      j.subs.add(res);
      res.on("close", () => j.subs.delete(res));
      return;
    }
    if (get && p === "/api/dirs") {
      const at = resolve(url.searchParams.get("p") || opts.folder || homedir());
      if (!existsSync(at) || !statSync(at).isDirectory()) return send(res, 404, { error: `No folder ${at}` });
      let dirs: string[] = [];
      try {
        dirs = readdirSync(at, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name).sort((a, b) => a.localeCompare(b));
      } catch {
        return send(res, 403, { error: cannotRead(at) });
      }
      const recent = [...new Set(listSessions().map((s) => s.cwd).filter((x) => x && existsSync(x)))].slice(0, 8);
      return send(res, 200, { path: at, parent: dirname(at) === at ? null : dirname(at), parentShown: dirname(at) === at ? null : noBidi(dirname(at)), dirs, shown: dirs.map(noBidi), recent, recentShown: recent.map(noBidi), home: homedir() });
    }
    if (get && p === "/api/suggest") {
      const at = resolve((url.searchParams.get("p") || "").replace(/^~(?=\/|$)/, homedir()));
      if (!existsSync(at) || !statSync(at).isDirectory()) return send(res, 404, { error: `No folder ${at}` });
      if (!readable(at)) return send(res, 403, { error: cannotRead(at) });
      return send(res, 200, suggestPrograms(at, adapterIndex(at)));
    }
    if (get && p === "/api/file") {
      const f = resolve(url.searchParams.get("p") ?? "");
      if (!allowedFile(f) || !existsSync(f) || !statSync(f).isFile()) return send(res, 404, { error: "no such file" });
      const w = Number(url.searchParams.get("w"));
      const thumb = w > 0 && /\.(png|jpe?g|gif|webp|tiff?)$/i.test(f) ? await scaledCopy(f, Math.min(w, 4000), "jpeg") : null;
      const headers: Record<string, string> = { "content-type": thumb ? "image/jpeg" : (TYPES[extname(f).toLowerCase()] ?? "application/octet-stream"), "cache-control": "no-store", ...FILE_HEADERS };
      if (url.searchParams.get("download")) headers["content-disposition"] = attachment(basename(f));
      return pipeFile(res, thumb ?? f, headers);
    }
    if (get && p === "/api/tab") {
      if (!c) return send(res, 409, { error: "no session" });
      return send(res, 200, await tab(url.searchParams.get("name") ?? ""), "text/html; charset=utf-8");
    }
    if (!post) return send(res, 404, { error: "not found" });
    const body = await readBody(req);
    const text = typeof body.text === "string" ? body.text : "";
    if (p === "/api/open") {
      if (c && !c.owned) return send(res, 409, { error: TERMINAL_SESSION });
      const key = body.sample ? "sample" : typeof body.id === "string" ? "id:" + body.id : typeof body.folder === "string" ? "folder:" + resolve(body.folder.trim().replace(/^~(?=\/|$)/, homedir())) + "\n" + String(body.adapter ?? "") : "";
      if (key && key === lastOpen.key && (current || opening) && Date.now() - lastOpen.at < 5000) return send(res, 200, { ok: true });
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
        if (!readable(f)) return send(res, 403, { error: cannotRead(f) });
        const adapter = typeof body.adapter === "string" && body.adapter ? body.adapter : undefined;
        void open({ folder: f, adapter });
      } else return send(res, 400, { error: "Give a folder or a session." });
      lastOpen = { key, at: Date.now() };
      return send(res, 200, { ok: true });
    }
    if (p === "/api/firststart") return send(res, 200, { ...(await firstStartState(fsCtx())), choices: CHOICES, keyGuide: KEY_GUIDE, recommended: RECOMMENDED_LOCAL, sample: sampleFolder() });
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
      if (body.json) return send(res, 200, { ...doctorJson(shown, ready), counts: doctorJson(checks, ready).counts });
      return send(res, 200, doctorHtml(shown, ready, checks), "text/html; charset=utf-8");
    }
    if (p === "/api/setting") {
      const def = find(String(body.name ?? ""));
      if (!def) return send(res, 404, { error: "no such setting" });
      const scope = (def.scopes.includes(body.scope as never) ? body.scope : def.scopes[0]) as never;
      if (!scope) return send(res, 400, { error: `${def.label} cannot change here.` });
      const r = await saveSetting(settingCtx(), def, String(body.value ?? ""), scope, body.confirm === true);
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
    if (p === "/api/adapters/plan") {
      const r = await addFor(String(body.source ?? ""), { registry: opts.registry });
      return r.plan ? send(res, 200, { plan: r.plan }) : send(res, 400, { error: r.error });
    }
    if (p === "/api/adapters/review") {
      const r = await reviewFor(String(body.install ?? ""), opts.review);
      return r.plan ? send(res, 200, { plan: r.plan }) : send(res, 400, { error: r.error });
    }
    if (p === "/api/adapters/drop") {
      dropInstall(String(body.install ?? ""));
      return send(res, 200, { ok: true });
    }
    if (p === "/api/programs/plan" || p === "/api/programs/run") {
      const name = String(body.name ?? "");
      const action = String(body.action ?? "");
      const staged = typeof body.install === "string" && body.install ? planByInstall(body.install) : undefined;
      if (!staged && !isProgramAction(action)) return send(res, 400, { error: "unknown action" });
      const hooks = progHooks();
      const r = staged ? { plan: staged } : await planFor(name, action as never, { ...hooks, path: typeof body.path === "string" ? body.path : undefined });
      if (!r.plan) return send(res, 404, { error: (r as { error?: string }).error });
      if (p === "/api/programs/plan") return send(res, 200, { plan: r.plan });
      const run = { ...hooks, confirmed: body.confirmed === true, record: current?.session.record as ProgramHooks["record"] };
      const long = (r.plan.action === "install" || r.plan.action === "update") && r.plan.runs && !r.plan.refused && run.confirmed;
      const key = r.plan.name || name;
      // A second install or an update of the same program while the first runs shows the first one.
      const running = runningJob(key, r.plan.command);
      if (running && run.confirmed && (r.plan.action === "install" || r.plan.action === "update")) return send(res, 200, { job: running[0] });
      if (running && r.plan.action !== "check" && run.confirmed) return send(res, 409, { error: `${key}: an ${running[1].action === "update" ? "update" : "install"} runs now. Wait for it to end, or stop it. Nothing changed.` });
      if (!long) return send(res, 200, await runFor(r.plan, "app", run));
      const id = randomBytes(8).toString("hex");
      const job: Job = { key, command: r.plan.command, action: r.plan.action, started: Date.now(), lines: [], subs: new Set(), abort: new AbortController() };
      jobs.set(id, job);
      const onLine = (line: string) => {
        job.lines.push(line);
        if (job.lines.length > JOB_LINES) job.lines.splice(0, job.lines.length - JOB_LINES);
        jobSend(job, { line });
      };
      job.ended = runFor(r.plan, "app", { ...run, onLine, signal: job.abort.signal }).then((d) => {
        job.done = { ok: d.ok, text: d.text };
        jobSend(job, { done: true, ...job.done });
        for (const x of job.subs) x.end();
        job.subs.clear();
        setTimeout(() => jobs.delete(id), 600_000).unref();
      });
      return send(res, 200, { job: id });
    }
    if (p === "/api/programs/stop") {
      const j = jobs.get(String(body.job ?? ""));
      if (!j) return send(res, 404, { error: "No such job." });
      if (!j.done) j.abort.abort();
      return send(res, 200, { ok: true });
    }
    if (p === "/api/choose-folder") {
      if (process.platform !== "darwin" || noOpen()) return send(res, 501, { error: "The Finder dialog works only on a Mac." });
      return send(res, 200, { path: await chooseFolder(resolve(String(body.start || opts.folder || homedir()))) });
    }
    if (p === "/api/session-rename") {
      if (typeof body.id !== "string" || !renameIndexRow(body.id, String(body.name ?? ""))) return send(res, 404, { error: "No such session." });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/session-remove") {
      if (typeof body.id !== "string" || c?.session.id === body.id) return send(res, 409, { error: "Close this session before you remove it." });
      if (!removeIndexRow(body.id)) return send(res, 404, { error: "No such session." });
      return send(res, 200, { ok: true });
    }
    if (p === "/api/session-reveal") {
      const place = typeof body.id === "string" ? findPlace(body.id) : undefined;
      if (!place || !existsSync(place.outDir)) return send(res, 404, { error: "The session folder is not here." });
      reveal(place.outDir);
      return send(res, 200, { ok: true });
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
    let url: URL;
    try {
      url = new URL(req.url ?? "/", `http://${host}`);
    } catch {
      return send(res, 400, { error: "bad request" });
    }
    if (url.pathname === "/favicon.ico") return send(res, 204, "");
    if (req.method === "GET" && url.pathname.startsWith("/assets/") && sendAsset(res, url.pathname)) return;
    if (!tokenOk(url.searchParams.get("t") ?? req.headers["x-token"], token)) return req.method === "GET" && url.pathname === "/" ? send(res, 401, WRONG_LINK, "text/html; charset=utf-8") : send(res, 401, { error: "missing or wrong token" });
    try {
      await route(req, res, url);
    } catch (e) {
      if (!res.headersSent) send(res, e instanceof HttpError ? e.status : 400, { error: (e as Error).message }, undefined, e instanceof HttpError && e.status === 413 ? { connection: "close" } : {});
      else res.destroy();
    }
  });

  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(opts.port ?? 0, "127.0.0.1", () => done());
  });
  port = (server.address() as AddressInfo).port;
  const beat = setInterval(() => {
    current?.view.beat();
    for (const c of idle) push(c, ": keep-alive\n\n");
    for (const j of jobs.values()) for (const r of j.subs) push(r, ": keep-alive\n\n");
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
      // An install runs in its own process group, so Ctrl+C in the terminal does not stop it. Stop it here, and let it release its lock.
      const open = [...jobs.values()].filter((j) => !j.done);
      for (const j of open) j.abort.abort();
      if (open.length) await Promise.race([Promise.all(open.map((j) => j.ended?.catch(() => {}))), new Promise((r) => setTimeout(r, 6000).unref())]);
      await detach();
      for (const c of idle) c.end();
      server.close();
      server.closeAllConnections();
    },
  };
}

