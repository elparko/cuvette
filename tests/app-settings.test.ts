import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { saveClaudeKey } from "../src/core/credentials.ts";
import { describe as rows, settingsPath } from "../src/core/settings.ts";
import { startApp, type AppHandle } from "../src/server/app.ts";
import { trustFolder } from "../src/core/trust.ts";
import { settingsHtml } from "../src/server/app-settings.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const KEY = "sk-ant-api03-viewsecretview-LMNO";
const oldHome = process.env.CUVETTE_HOME;
let cwd = "";
let app: AppHandle | undefined;

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-home-"));
  cwd = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
});
afterEach(async () => {
  await app?.close();
  app = undefined;
  if (oldHome === undefined) delete process.env.CUVETTE_HOME;
  else process.env.CUVETTE_HOME = oldHome;
});

function writeJson(path: string, data: object) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

const row = (html: string, name: string) => {
  const i = html.indexOf(`data-setting="${name}"`);
  return html.slice(i, html.indexOf('<p class="sdone"', i));
};

async function serve(env: Record<string, string> = {}) {
  const s = new FakeSession();
  s.cwd = cwd;
  app = await startApp({ session: s, env });
  const base = `http://127.0.0.1:${app.port}`;
  const t = app.token;
  return {
    s,
    html: async () => (await fetch(`${base}/api/settings?t=${t}`)).text(),
    post: async (p: string, body: unknown) => {
      const r = await fetch(`${base}/${p}`, { method: "POST", headers: { "content-type": "application/json", "x-token": t }, body: JSON.stringify(body) });
      return { status: r.status, body: await r.json() };
    },
  };
}

test("the page shows every setting and every section of the registry", async () => {
  const c = await serve();
  const html = await c.html();
  const ctx = { cwd, env: {}, session: c.s as never, ui: { details: () => false, toggleDetails() {} } };
  for (const r of rows(ctx)) {
    expect(html).toContain(`data-setting="${r.def.name}"`);
    expect(html).toContain(`data-cfg-sec="${r.def.group}"`);
  }
  expect(html).toContain('data-cfg-search');
  expect(html).toContain('class="cfg-pick"');
});

test("each value gets a control that fits it", async () => {
  const html = settingsHtml({ settings: { cwd, env: {} } });
  const kind = (name: string) => new RegExp(`data-setting="${name}"[^>]*data-control="([a-z]+)"`).exec(html)?.[1];
  expect(kind("model")).toBe("options");
  expect(kind("mode")).toBe("segmented");
  expect(kind("effort")).toBe("segmented");
  expect(kind("planFirst")).toBe("toggle");
  expect(kind("figure_formats")).toBe("select");
  expect(kind("budgetUsd")).toBe("number");
  expect(kind("output_folder")).toBe("path");
  expect(kind("databook_author")).toBe("text");
  expect(kind("claude_key")).toBe("secret");
  expect(kind("elabftw_url")).toBe("card");
  expect(kind("permissions")).toBe("info");
  expect(row(html, "planFirst")).toContain('role="switch" aria-checked="true"');
  expect(row(html, "budgetUsd")).toMatch(/type="number"[^>]*min="0.01"/);
  expect(row(html, "budgetUsd")).toContain("US dollars");
  expect(row(html, "output_folder")).toContain("Choose…");
  expect(row(html, "model")).toContain("Claude Opus 5.5");
  expect(row(html, "model")).toContain("$4 in, $20 out per million tokens");
  expect(row(html, "model")).toContain("$0.1 in, $0.5 out per million tokens");
});

test("a local model is free, on this computer", () => {
  writeJson(settingsPath("user", cwd), { model: "ollama:qwen3:8b" });
  const html = settingsHtml({ settings: { cwd, env: {} } });
  expect(row(html, "model")).toMatch(/ollama:qwen3:8b<\/span><span class="onote">free, on this computer/);
});

test("the source badges name the scope, and a project value names its file", async () => {
  writeJson(settingsPath("user", cwd), { referee: "none" });
  writeJson(join(cwd, ".cuvette", "settings.local.json"), { openImages: "off" });
  writeJson(settingsPath("project", cwd), { export_xlsx: "off" });
  trustFolder(cwd);
  const c = await serve();
  await c.post("api/setting", { name: "mode", value: "teach", scope: "session" });
  const html = await c.html();
  expect(row(settingsHtml({ settings: { cwd, env: {} } }), "referee")).toMatch(/class="sbadge user"[^>]*>User</);
  expect(row(html, "referee")).toContain(">This session<");
  expect(row(html, "openImages")).toContain("Project · .cuvette/settings.local.json");
  expect(row(html, "export_xlsx")).toContain("Project · .cuvette/settings.json");
  expect(row(html, "mode")).toContain(">This session<");
  expect(row(html, "pilot")).toContain(">Default<");
});

test("a change saves for this session, for me or for this project, and goes in the record", async () => {
  const c = await serve();
  const html = await c.html();
  expect(row(html, "mode")).toMatch(/Save for:.*This session.*Me \(all projects\).*This project/);
  const a = await c.post("api/setting", { name: "mode", value: "follow", scope: "session" });
  expect(a.body.text).toBe("Saved for this session. Mode is now follow.");
  expect(c.s.mode).toBe("follow");
  const b = await c.post("api/setting", { name: "pilot", value: "off", scope: "user" });
  expect(b.body.text).toBe("Saved for me (all projects). Pilot is now off.");
  expect(JSON.parse(readFileSync(settingsPath("user", cwd), "utf8"))).toEqual({ pilot: "off" });
  const p = await c.post("api/setting", { name: "effort", value: "max", scope: "project" });
  expect(p.body.text).toBe("Saved for this project. Effort is now max.");
  expect(JSON.parse(readFileSync(settingsPath("project", cwd), "utf8"))).toEqual({ effort: "max" });
  expect(c.s.record.entries(["setting"]).map((e) => e.data)).toEqual([
    { name: "mode", old: "watch", new: "follow", scope: "session" },
    { name: "pilot", old: "on", new: "off", scope: "user" },
    { name: "effort", old: "high", new: "max", scope: "project" },
  ]);
  const bad = await c.post("api/setting", { name: "mode", value: "fast", scope: "session" });
  expect(bad.status).toBe(400);
});

test("reset to default removes the value from its file and goes in the record", async () => {
  writeJson(join(cwd, ".cuvette", "settings.local.json"), { openImages: "off", pilot: "off" });
  const c = await serve();
  expect(row(await c.html(), "openImages")).toContain("Reset to default");
  expect(row(await c.html(), "animations")).not.toContain("Reset to default");
  const r = await c.post("api/setting/reset", { name: "openImages" });
  expect(r.body.text).toBe("Reset to default. Open QC images is now on.");
  expect(JSON.parse(readFileSync(join(cwd, ".cuvette", "settings.local.json"), "utf8"))).toEqual({ pilot: "off" });
  expect(c.s.record.entries(["setting"]).at(-1)!.data).toEqual({ name: "openImages", old: "off", new: "on", scope: "project" });
  expect((await c.post("api/setting/reset", { name: "openImages" })).status).toBe(400);
  await c.post("api/setting", { name: "mode", value: "plan", scope: "session" });
  expect((await c.post("api/setting/reset", { name: "mode" })).body.text).toBe("Reset to default. Mode is now watch.");
  expect(c.s.mode).toBe("watch");
});

test("a reset that leaves a value from a wider scope says that it removed the change, not that it reset to default", async () => {
  writeJson(join(process.env.CUVETTE_HOME!, "settings.json"), { mode: "follow" });
  writeJson(join(cwd, ".cuvette", "settings.local.json"), { mode: "teach" });
  const c = await serve();
  expect((await c.post("api/setting/reset", { name: "mode" })).body.text).toBe("Removed the change. Mode is now follow. The user value applies.");
  writeJson(join(process.env.CUVETTE_HOME!, "settings.json"), {});
});

test("a row locked during a turn says why", () => {
  const html = settingsHtml({ settings: { cwd, env: {} }, busy: true });
  expect(row(html, "model")).toContain("Model cannot change until the turn ends. A change applies to the next message.");
  expect(row(html, "model")).toMatch(/data-sv="[^"]+" disabled/);
  expect(row(html, "mode")).not.toContain("locked");
});

test("a secret shows only its state, and Remove deletes it", async () => {
  saveClaudeKey(KEY);
  const c = await serve();
  const html = await c.html();
  expect(html).not.toContain("viewsecret");
  expect(html).not.toContain("LMNO");
  expect(row(html, "claude_key")).toMatch(/<span class="sstate ">saved<\/span>.*Change.*Remove/);
  const r = await c.post("api/setting/remove", { name: "claude_key" });
  expect(r.body.text).toBe("Removed the Claude API key.");
  expect(row(await c.html(), "claude_key")).toContain(">not set<");
  expect(row(await c.html(), "claude_key")).not.toContain("Remove");
  expect(c.s.record.entries(["setting"]).at(-1)!.data).toEqual({ name: "claude_key", scope: "user", change: "removed" });
  expect(settingsHtml({ settings: { cwd, env: { ANTHROPIC_API_KEY: KEY } } })).toContain(">set by environment<");
  expect(settingsHtml({ settings: { cwd, env: { ANTHROPIC_API_KEY: KEY } } })).not.toContain("LMNO");
});

test("the spend this month shows as a bar against the budget", () => {
  appendFileSync(process.env.CUVETTE_SPEND_FILE!, JSON.stringify({ t: new Date().toISOString(), model: "claude-opus-5-5", usd: 12.5 }) + "\n");
  writeJson(settingsPath("user", cwd), { budgetUsd: 50 });
  const html = settingsHtml({ settings: { cwd, env: {} } });
  const spent = row(html, "spend_month");
  const pct = Number(/aria-valuenow="(\d+)"/.exec(spent)![1]);
  expect(pct).toBeGreaterThanOrEqual(25);
  expect(spent).toMatch(/\$[\d.]+ of \$50\.00 this month/);
  expect(row(html, "budgetUsd")).toContain('value="50"');
});

describe.skipIf(!CHROME)("the page in headless Chrome", () => {
  let proc: ChildProcess;
  let url = "";
  let page: Page;
  let proj = "";
  let home = "";
  const shots = process.env.CUVETTE_SHOTS || mkdtempSync(join(tmpdir(), "cuvette-settings-shots-"));

  beforeAll(async () => {
    home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    proj = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
    writeJson(join(home, "settings.json"), { model: "claude:claude-sonnet-5-5", budgetUsd: 50 });
    writeJson(join(proj, ".cuvette", "settings.local.json"), { mode: "plan" });
    const before = process.env.CUVETTE_HOME;
    process.env.CUVETTE_HOME = home;
    trustFolder(proj);
    if (before === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = before;
    const spend = join(home, "spend.jsonl");
    writeFileSync(spend, JSON.stringify({ t: new Date().toISOString(), model: "claude-sonnet-5-5", usd: 12.4 }) + "\n");
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: spend, ANTHROPIC_API_KEY: "sk-ant-api03-" + "x".repeat(90), CUVETTE_NO_OPEN: "1" };
    proc = spawn(process.execPath, [join(__dirname, "..", "bin", "cuvette.js"), "app", "--no-open"], { cwd: proj, env, stdio: ["ignore", "pipe", "pipe"] });
    url = await new Promise<string>((done, fail) => {
      let out = "";
      proc.stdout!.on("data", (b) => {
        out += b;
        const m = /Cuvette app: (\S+)/.exec(out);
        if (m) done(m[1]!);
      });
      proc.on("exit", (code) => fail(new Error(`cuvette app stopped: ${code}`)));
    });
    page = await openChrome();
    await page.size(1280, 900);
    await page.go(url + "&ui=old");
    await page.eval(`(async () => { for (let i = 0; i < 300 && !state; i++) await new Promise((r) => setTimeout(r, 100)); document.querySelector('nav.pages [data-page="settings"]').click(); for (let i = 0; i < 50 && !document.querySelector("#settingsbody .cfg"); i++) await new Promise((r) => setTimeout(r, 100)); })()`);
  }, 60000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
  });

  const overflow = () =>
    page.eval<{ page: number; inner: number; wide: string[]; scrollers: string[] }>(`(() => {
      const box = document.getElementById("p-settings");
      const wide = [...box.querySelectorAll("*")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.className || e.tagName);
      const scrollers = [...box.querySelectorAll("*")].filter((e) => { const s = getComputedStyle(e); return /auto|scroll/.test(s.overflowY + s.overflowX) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1); }).map((e) => e.className || e.tagName);
      return { page: document.documentElement.scrollWidth, inner: innerWidth, wide, scrollers };
    })()`);

  for (const [w, h] of [[1280, 900], [1024, 800], [390, 844]] as const)
    test(`no horizontal overflow and no nested scroll area at ${w} px`, async () => {
      await page.size(w, h);
      for (const sec of await page.eval<string[]>(`[...document.querySelectorAll("#settingsbody [data-cfg-sec]")].map((b) => b.dataset.cfgSec)`)) {
        await page.eval(`(() => { cfg.sec = ${JSON.stringify(sec)}; cfg.q = ""; cfgApply(); })()`);
        const o = await overflow();
        expect({ sec, ...o }).toEqual({ sec, page: w, inner: w, wide: [], scrollers: [] });
      }
      const nav = await page.eval<{ nav: string; pick: string }>(`({ nav: getComputedStyle(document.querySelector("#settingsbody .cfg-nav")).display, pick: getComputedStyle(document.querySelector("#settingsbody .cfg-pick")).display })`);
      expect(nav).toEqual(w < 700 ? { nav: "none", pick: "block" } : { nav: "flex", pick: "none" });
      for (const [sec, name] of [["Model", ""], ["Account and spend", "-account"]]) {
        await page.eval(`(() => { cfg.sec = ${JSON.stringify(sec)}; cfgApply(); })()`);
        await page.size(w, h);
        await page.size(w, await page.eval<number>(`document.documentElement.scrollHeight`));
        writeFileSync(join(shots, `settings-${w}${name}.png`), await page.shot());
      }
      await page.size(w, h);
    });

  test("the search filters the rows by label and help text", async () => {
    await page.size(1280, 900);
    const visible = (q: string) =>
      page.eval<string[]>(`(() => { const s = document.querySelector("#settingsbody [data-cfg-search]"); s.value = ${JSON.stringify(q)}; s.dispatchEvent(new Event("input", { bubbles: true })); return [...document.querySelectorAll("#settingsbody .srow")].filter((r) => r.offsetParent).map((r) => r.dataset.setting); })()`);
    expect(await visible("budget")).toEqual(["budgetUsd"]);
    expect(await visible("spinner")).toEqual(["animations"]);
    expect(await visible("zzzz")).toEqual([]);
    expect(await page.eval(`!document.querySelector("#settingsbody .cfg-none").classList.contains("hidden")`)).toBe(true);
    expect((await visible("")).length).toBe(3);
  });

  test("a click asks where to save, saves, and shows the source", async () => {
    await page.eval(`(() => { cfg.sec = "Session"; cfgApply(); })()`);
    expect(await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] .sbadge').textContent`)).toBe("Project · .cuvette/settings.local.json");
    await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] [data-sv="follow"]').click()`);
    const ask = await page.eval<string[]>(`[...document.querySelectorAll('#settingsbody [data-setting="mode"] .sask:not(.hidden) button')].map((b) => b.textContent)`);
    expect(ask).toEqual(["Me (all projects)", "This project", "Cancel"]);
    await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] [data-sx-scope="project"]').click()`);
    await page.eval(`(async () => { for (let i = 0; i < 300 && !document.querySelector('#settingsbody [data-setting="mode"] .sdone').textContent; i++) await new Promise((r) => setTimeout(r, 100)); })()`);
    expect(await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] .sdone').textContent`)).toBe("Saved for this project. Mode is now follow. The project setting (plan) still wins in new sessions in this folder.");
    expect(JSON.parse(readFileSync(join(proj, ".cuvette", "settings.json"), "utf8"))).toEqual({ mode: "follow" });
    expect(await page.eval(`localStorage.getItem("cuvette.scope.mode")`)).toBe("project");
    await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] [data-sv="teach"]').click()`);
    expect(await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] .sask .primary').dataset.sxScope`)).toBe("project");
    await page.eval(`document.querySelector('#settingsbody [data-setting="mode"] [data-sx-cancel]').click()`);
    expect(existsSync(join(proj, ".cuvette", "settings.json"))).toBe(true);
  });
});
