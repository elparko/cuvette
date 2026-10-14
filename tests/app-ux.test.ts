import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { UI_DIST } from "../src/server/app.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK = `(() => {
  if (window.__mocks) return;
  window.__mocks = [];
  window.__calls = [];
  const real = window.fetch;
  window.fetch = (u, o) => {
    window.__calls.push({ url: String(u), body: o && o.body });
    const m = window.__mocks.find((x) => String(u).includes(x.part));
    if (!m) return real(u, o);
    const r = m.reply(String(u), o && o.body ? JSON.parse(o.body) : undefined);
    return Promise.resolve(new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { "content-type": "application/json" } }));
  };
})()`;

const overflow = (page: Page, root = "#root") => page.eval<{ page: number; wide: string[] }>(`(() => ({ page: document.documentElement.scrollWidth, wide: [...document.querySelectorAll(${JSON.stringify(root + " *")})].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest("[data-sheet-scroll], .sheetwrap, .sheet, pre, .tablewrap")).map((e) => e.tagName + "." + e.className).slice(0, 5) }))()`);

describe.skipIf(!CHROME)("app keyboard and phone layout in headless Chrome", () => {
  let proc: ChildProcess;
  let url = "";
  let page: Page;

  const goPage = async (name: string) => {
    await page.eval(`[...document.querySelectorAll('aside nav[aria-label="Pages"] button')].find((b) => b.textContent === ${JSON.stringify(name)}).click()`);
    await wait(150);
  };
  const setText = (sel: string, v: string) =>
    page.eval(`(() => {
      const ta = document.querySelector(${JSON.stringify(sel)});
      ta.focus();
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, ${JSON.stringify(v)});
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);

  beforeAll(async () => {
    if (!existsSync(join(UI_DIST, "index.html"))) execFileSync("npx", ["vite", "build", "--config", "src/ui-web/vite.config.ts", "--logLevel", "warn"], { cwd: ROOT, stdio: "ignore" });
    const home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    const data = mkdtempSync(join(tmpdir(), "cuvette-data-"));
    writeFileSync(join(data, "a.csv"), "x,y\n1,2\n3,4\n");
    const script = join(home, "fake.json");
    const ask = (question: string) => ({ calls: [{ name: "ask_scientist", args: { question, options: ["t test", "Wilcoxon"] } }] });
    writeFileSync(script, JSON.stringify([ask("Which test?"), ask("Which second test?"), { text: "Done." }, { text: Array(60).fill("This is a line of the long note.").join("\n\n") }]));
    const project = join(home, "project");
    mkdirSync(project);
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: join(home, "spend.jsonl"), CUVETTE_NO_OPEN: "1", HOME: home };
    proc = spawn(process.execPath, [join(ROOT, "bin", "cuvette.js"), "app", "--no-open", "--model", "fake:" + script], { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });
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
    const t = new URL(url).searchParams.get("t");
    await page.go(url);
    await page.eval(`fetch("api/open?t=${t}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${t}" }, body: JSON.stringify({ folder: ${JSON.stringify(data)} }) })`);
    await page.go(url);
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    await page.eval(MOCK);
  }, 90000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
  });

  test("the command list closes when the focus leaves the message box", async () => {
    await setText("#msg", "/");
    expect(await until(page, `document.querySelector("#cmd-list")`)).toBe(true);
    await page.eval(`document.querySelector('header button[aria-label="More"]').focus()`);
    expect(await until(page, `!document.querySelector("#cmd-list")`)).toBe(true);
    await setText("#msg", "");
    await page.eval(`document.activeElement.blur()`);
  });

  test("a new question card does not take the focus from a header button", async () => {
    const notes = `document.querySelector('header button[aria-label$="the status notes"]')`;
    await page.eval(`${notes}.focus()`);
    const t = new URL(url).searchParams.get("t");
    await page.eval(`fetch("api/send?t=${t}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${t}" }, body: JSON.stringify({ text: "Compare the groups" }) })`);
    expect(await until(page, `document.querySelector("[data-card] .opts .btn")`)).toBe(true);
    await wait(200);
    expect(await page.eval(`document.activeElement === ${notes}`)).toBe(true);
  });

  test("a new question card takes the focus when the focus is on its old card", async () => {
    await page.eval(`(() => { const b = document.querySelector('[data-card][data-type="question"] .opts .btn'); b.focus(); b.click(); })()`);
    expect(await until(page, `document.querySelector('[data-card][data-type="question"]')?.textContent.includes("Which second test?")`)).toBe(true);
    expect(await until(page, `document.activeElement?.matches('[data-card][data-type="question"]')`)).toBe(true);
  });

  test("card keys: Enter on a focused card button is that button, arrows move the focus, Enter in Other answers", async () => {
    const q = `document.querySelector('[data-card][data-type="question"]')`;
    const key = (k: string) => page.eval<boolean>(`document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true }))`);
    await page.eval(`[...${q}.querySelectorAll(".btn")].find((b) => b.textContent === "Answer later").focus()`);
    expect(await page.eval(`document.activeElement.matches(":focus-visible") ? getComputedStyle(document.activeElement).outlineStyle + " " + getComputedStyle(document.activeElement).outlineWidth : "not visible"`)).toBe("solid 2px");
    expect(await key("Enter")).toBe(true);
    await wait(300);
    expect(await page.eval(`!!${q}`)).toBe(true);
    await page.eval(`${q}.querySelectorAll(".opts .btn")[1].focus()`);
    expect(await page.eval(`${q}.dataset.sel`)).toBe("1");
    expect(await key("ArrowLeft")).toBe(false);
    expect(await page.eval(`document.activeElement === ${q}.querySelectorAll(".opts .btn")[0]`)).toBe(true);
    expect(await page.eval(`${q}.dataset.sel`)).toBe("0");
    await setText(`[data-card][data-type="question"] input[name="other"]`, "Welch t test");
    expect(await key("Enter")).toBe(false);
    expect(await until(page, `!document.querySelector('[data-card][data-type="question"]')`)).toBe(true);
  });

  test("the side panel tabs on a phone fit the width, and each decision button names its decision", async () => {
    await page.size(390, 844);
    for (const tab of ["Analysis", "Results", "Record", "Decisions"]) {
      await page.eval(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent === ${JSON.stringify(tab)}).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
      expect(await until(page, `document.querySelector('[role="tabpanel"]')?.getAttribute("aria-label") === ${JSON.stringify(tab)} && document.querySelector('[role="tabpanel"]').textContent.length > 20`)).toBe(true);
      await wait(200);
      expect({ tab, ...(await overflow(page)) }).toEqual({ tab, page: 390, wide: [] });
    }
    const names = await page.eval<string[]>(`[...document.querySelectorAll('[role="tabpanel"] [data-decision-save]')].map((b) => b.getAttribute("aria-label"))`);
    expect(names.length).toBeGreaterThan(1);
    expect(new Set(names).size).toBe(names.length);
    await page.size(1280, 900);
  });

  test("the mode menu items include their help text and hold no extra tab stop", async () => {
    const r = await page.eval<{ texts: string[]; stops: number; shown: boolean }>(`(async () => {
      const t = document.querySelector('header button[aria-label^="Mode:"]');
      t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
      for (let i = 0; i < 200 && !document.querySelector('[role="menu"]'); i++) await new Promise((r) => setTimeout(r, 50));
      const items = [...document.querySelectorAll('[role="menuitemradio"]')];
      const out = { texts: items.map((x) => x.textContent), stops: document.querySelectorAll('[role="menu"] [tabindex="0"]').length, shown: [...items[0].querySelectorAll("span")].some((x) => x.textContent === "The agent runs the steps." && x.offsetHeight > 0) };
      document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return out;
    })()`);
    expect(r.texts[0]).toContain("The agent runs the steps.");
    expect(r.shown).toBe(true);
    expect(r.stops).toBe(0);
  });

  test("the image viewer: a double-click at 100% zooms in, and the arrow keys move the image", async () => {
    await page.eval(`(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 30;
      const x = c.getContext("2d");
      x.fillStyle = "#c33";
      x.fillRect(0, 0, 40, 30);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.dataset.full = c.toDataURL();
      b.title = "small.png";
      document.querySelector('[role="log"]').appendChild(b);
      b.click();
    })()`);
    expect(await until(page, `document.querySelector('[role="dialog"] img')?.naturalWidth > 0`)).toBe(true);
    await wait(100);
    const pct = () => page.eval<string>(`[...document.querySelectorAll('[role="dialog"] span')].find((s) => /^\\d+%$/.test(s.textContent)).textContent`);
    expect(await pct()).toBe("100%");
    const box = `document.querySelector('[role="dialog"] [aria-roledescription="image viewer"]')`;
    await page.eval(`(() => { const r = ${box}.getBoundingClientRect(); ${box}.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); })()`);
    await wait(100);
    expect(await pct()).toBe("200%");
    const pos = () => page.eval<string>(`document.querySelector('[role="dialog"] img').style.transform`);
    const before = await pos();
    await page.eval(`(() => { ${box}.focus(); ${box}.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })); })()`);
    await wait(100);
    expect(await pos()).not.toBe(before);
    await page.eval(`${box}.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true, cancelable: true }))`);
    await wait(100);
    expect(await pct()).toBe("100%");
    await page.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await page.eval(`document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
  });

  test("settings: an arrow key in a radio group selects the next choice and keeps the focus", async () => {
    await goPage("Settings");
    expect(await until(page, `[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].some((b) => b.textContent === "Session")`)).toBe(true);
    await page.eval(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === "Session").click()`);
    expect(await until(page, `document.querySelector('[data-setting="mode"]')`)).toBe(true);
    const row = `document.querySelector('[data-setting="mode"]')`;
    const checked = () => page.eval<string>(`${row}.querySelector('[role="radio"][aria-checked="true"]').textContent`);
    const first = await checked();
    await page.eval(`(() => { const r = ${row}.querySelector('[role="radio"][aria-checked="true"]'); r.focus(); r.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })); })()`);
    await wait(150);
    const second = await checked();
    expect(second).not.toBe(first);
    expect(await page.eval(`document.activeElement.textContent`)).toBe(second);
    expect(await page.eval(`!!${row}.querySelector('[role="group"][aria-label="Save for"]')`)).toBe(true);
    await page.eval(`document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }))`);
    await wait(150);
    expect(await checked()).toBe(first);
    expect(await page.eval(`!!${row}.querySelector('[role="group"][aria-label="Save for"]')`)).toBe(false);
  });

  test("settings on a phone: a long install command wraps, and the full-list button stays after a failure", async () => {
    await page.size(390, 844);
    await page.eval(`window.__mocks.push({ part: "api/doctor", reply: (_u, b) => b.all ? { status: 500, body: { error: "The check failed." } } : { body: { ready: true, counts: { ok: 0, missing: 1, old: 0 }, checks: [{ id: "x", group: "Python", name: "a-very-long-program-name-without-spaces-at-all", status: "missing", detail: "Not found.", command: "python3 -m pip install --user some-very-long-package-name-that-goes-on==1.2.3 another-long-package-name-here", link: "https://example.org/a/very/long/download/link/that/does/not/break/anywhere/at/all.zip", cite: "" }] } } })`);
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.textContent === "Check this computer").click()`);
    expect(await until(page, `document.body.textContent.includes("Install:")`)).toBe(true);
    expect(await overflow(page)).toEqual({ page: 390, wide: [] });
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.textContent === "Show the full list").click()`);
    expect(await until(page, `document.body.textContent.includes("The check failed.")`)).toBe(true);
    expect(await page.eval(`[...document.querySelectorAll("button")].some((b) => b.textContent === "Show the full list")`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/doctor")`);
    await page.size(1280, 900);
  });

  test("the sessions page shows an error when the list does not load", async () => {
    await page.eval(`window.__mocks.push({ part: "api/sessions.json", reply: () => ({ status: 500, body: { error: "The disk is full." } }) })`);
    await goPage("Sessions");
    expect(await until(page, `document.querySelector('main [role="alert"]')?.textContent.includes("The disk is full.")`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/sessions.json")`);
  });

  test("program dialog: a job that ends after the dialog closes does not change the next dialog", async () => {
    await page.eval(`(() => {
      window.__sources = [];
      window.EventSource = class {
        constructor(u) { this.url = u; this.readyState = 1; window.__sources.push(this); }
        close() { this.readyState = 2; }
      };
      window.__mocks.push({ part: "api/programs.json", reply: () => ({ body: { summary: "Two programs.", checking: false, groups: [{ title: "Imaging", rows: ["aaa", "bbb"].map((n) => ({ name: n, program: "Program " + n, state: "missing", tone: "bad", version: "", size: "", lastUse: "never", origin: "", detail: "Not installed.", warn: "", cite: "", off: false, path: "", tags: [], actions: [{ action: "install", label: "Install" }] })) }] } }) });
      window.__mocks.push({ part: "api/programs/plan", reply: (_u, b) => ({ body: { plan: { action: "install", name: b.name, title: "Install " + b.name, lines: ["Line"], runs: true, confirm: "Install" } } }) });
      window.__mocks.push({ part: "api/programs/run", reply: (_u, b) => ({ body: { job: "job-" + b.name, ok: true, text: "" } }) });
    })()`);
    await goPage("Programs");
    expect(await until(page, `document.querySelector('[data-prog="bbb"]')`)).toBe(true);
    const btnIn = (sel: string, label: string) => `[...document.querySelectorAll(${JSON.stringify(sel + " button")})].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
    await page.eval(`${btnIn('[data-prog="aaa"]', "Install")}.click()`);
    expect(await until(page, `${btnIn('[role="dialog"]', "Install")}`)).toBe(true);
    await page.eval(`${btnIn('[role="dialog"]', "Install")}.click()`);
    expect(await until(page, `window.__sources.length === 1`)).toBe(true);
    await page.eval(`${btnIn('[role="dialog"]', "Close")}.click()`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.eval(`${btnIn('[data-prog="bbb"]', "Install")}.click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')?.textContent.includes("Install bbb")`)).toBe(true);
    await page.eval(`window.__sources[0].onmessage({ data: JSON.stringify({ done: true, ok: true, text: "Program aaa is installed." }) })`);
    await wait(200);
    expect(await page.eval(`document.querySelector('[role="dialog"]').textContent.includes("Program aaa is installed.")`)).toBe(false);
    await page.eval(`window.__calls = []`);
    await page.eval(`${btnIn('[role="dialog"]', "Install")}.click()`);
    expect(await until(page, `window.__calls.some((c) => c.url.includes("api/programs/run"))`)).toBe(true);
    expect(await page.eval(`JSON.parse(window.__calls.find((c) => c.url.includes("api/programs/run")).body).name`)).toBe("bbb");
    await page.eval(`${btnIn('[role="dialog"]', "Close")}.click()`);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => !m.part.startsWith("api/programs"))`);
  });

  test("program dialog: a running install shows the time and a Stop button, keeps running after Close, and the row opens it again", async () => {
    await page.eval(`(() => {
      window.__sources = [];
      window.EventSource = class {
        constructor(u) { this.url = u; this.readyState = 1; window.__sources.push(this); }
        close() { this.readyState = 2; }
      };
      window.__jobs = [];
      window.__mocks.push({ part: "api/programs.json", reply: () => ({ body: { summary: "One program.", checking: false, jobs: window.__jobs, groups: [{ title: "Imaging", rows: [{ name: "ccc", program: "Program ccc", state: "missing", tone: "bad", version: "", size: "", lastUse: "never", origin: "", detail: "Not installed.", warn: "", cite: "", off: false, path: "", tags: [], actions: [{ action: "install", label: "Install" }, { action: "remove", label: "Remove" }] }] }] } }) });
      window.__mocks.push({ part: "api/programs/plan", reply: (_u, b) => ({ body: { plan: { action: "install", name: b.name, title: "Install " + b.name, lines: ["Line"], runs: true, confirm: "Install", command: "uv pip install ccc" } } }) });
      window.__mocks.push({ part: "api/programs/run", reply: () => ({ body: { job: "job-ccc" } }) });
      window.__mocks.push({ part: "api/programs/stop", reply: () => ({ body: { ok: true } }) });
    })()`);
    await goPage("Sessions");
    await goPage("Programs");
    expect(await until(page, `document.querySelector('[data-prog="ccc"]')`)).toBe(true);
    const btnIn = (sel: string, label: string) => `[...document.querySelectorAll(${JSON.stringify(sel + " button")})].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
    const dlg = `document.querySelector('[role="dialog"]')`;
    await page.eval(`${btnIn('[data-prog="ccc"]', "Install")}.click()`);
    expect(await until(page, `${btnIn('[role="dialog"]', "Install")}`)).toBe(true);
    await page.eval(`${btnIn('[role="dialog"]', "Install")}.click()`);
    expect(await until(page, `window.__sources.length === 1 && ${btnIn('[role="dialog"]', "Stop the install")}`)).toBe(true);
    expect(await page.eval(`!${btnIn('[role="dialog"]', "Install")} && !!${btnIn('[role="dialog"]', "Close")}`)).toBe(true);
    expect(await until(page, `/Working… [0-9]+ s/.test(${dlg}.querySelector('[role="status"]').textContent)`)).toBe(true);
    await page.eval(`window.__sources[0].onmessage({ data: JSON.stringify({ line: "Downloading torch" }) })`);
    expect(await until(page, `${dlg}.querySelector("pre[aria-live]")?.textContent.includes("Downloading torch")`)).toBe(true);
    await page.eval(`window.__calls = []; ${btnIn('[role="dialog"]', "Stop the install")}.click()`);
    expect(await until(page, `window.__calls.some((c) => c.url.includes("api/programs/stop") && JSON.parse(c.body).job === "job-ccc")`)).toBe(true);
    expect(await until(page, `${dlg}.querySelector('[role="status"]').textContent.includes("Stopping…")`)).toBe(true);
    await page.eval(`window.__sources[0].onmessage({ data: JSON.stringify({ done: true, ok: false, text: "You stopped the install." }) })`);
    expect(await until(page, `${dlg}.textContent.includes("You stopped the install.") && !${btnIn('[role="dialog"]', "Stop the install")}`)).toBe(true);
    await page.eval(`${btnIn('[role="dialog"]', "Try again")}.click()`);
    expect(await until(page, `window.__sources.length === 2 && ${btnIn('[role="dialog"]', "Stop the install")} && !${btnIn('[role="dialog"]', "Try again")}`)).toBe(true);
    await page.eval(`window.__jobs = [{ id: "job-ccc", name: "ccc", action: "install", started: Date.now() - 65000 }]; ${btnIn('[role="dialog"]', "Close")}.click()`);
    expect(await until(page, `!document.querySelector('[role="dialog"]') && document.body.textContent.includes("The install continues.")`)).toBe(true);
    expect(await until(page, `!!${btnIn('[data-prog="ccc"]', "Show the progress")} && document.querySelector('[data-prog="ccc"]').textContent.includes("installing")`)).toBe(true);
    expect(await page.eval(`!${btnIn('[data-prog="ccc"]', "Install")} && !document.querySelector('[data-prog="ccc"] [aria-label^="More actions"]')`)).toBe(true);
    await page.eval(`${btnIn('[data-prog="ccc"]', "Show the progress")}.click()`);
    expect(await until(page, `window.__sources.length === 3 && window.__sources[2].url.includes("job=job-ccc") && /Working… 1 min [0-9]+ s/.test(${dlg}.querySelector('[role="status"]').textContent)`)).toBe(true);
    await page.eval(`window.__jobs = []; window.__sources[2].onmessage({ data: JSON.stringify({ done: true, ok: true, text: "Installed ccc." }) })`);
    expect(await until(page, `${dlg}.textContent.includes("Installed ccc.")`)).toBe(true);
    await page.eval(`${btnIn('[role="dialog"]', "Close")}.click()`);
    expect(await until(page, `!!${btnIn('[data-prog="ccc"]', "Install")}`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => !m.part.startsWith("api/programs"))`);
  });

  test("a session list is one Tab stop; the arrow keys, Home and End move in it and skip a moved session", async () => {
    await page.eval(`(() => {
      const card = (i, moved) => ({ id: "s" + i, title: "Session " + i, text: "", folder: "/lab/f" + i, folderName: "f" + i, age: "1 h ago", status: "", moved, thumb: "" });
      window.__mocks.push({ part: "api/sessions.json", reply: () => ({ body: [card(1, false), card(2, true), card(3, false), card(4, false), card(5, false)] }) });
    })()`);
    await page.size(1280, 900);
    await goPage("Sessions");
    await page.eval(`document.querySelector('main button[aria-pressed]')?.click()`);
    expect(await until(page, `document.querySelectorAll('main ul[aria-label="Sessions"] button[data-rove]').length === 5`)).toBe(true);
    const stops = `[...document.querySelectorAll('main ul[aria-label="Sessions"] button[data-rove]')].filter((b) => b.tabIndex === 0 && !b.disabled).map((b) => b.dataset.rove)`;
    expect(await page.eval(stops)).toEqual(["s1"]);
    const key = (k: string) => page.eval(`document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true, cancelable: true }))`);
    const at = () => page.eval<string>(`document.activeElement.dataset.rove ?? ""`);
    await page.eval(`document.querySelector('main [data-rove="s1"]').focus()`);
    await key("ArrowRight");
    expect(await at()).toBe("s3");
    expect(await page.eval(stops)).toEqual(["s3"]);
    await key("ArrowDown");
    expect(await at()).toBe("s5");
    await key("ArrowLeft");
    expect(await at()).toBe("s4");
    await key("ArrowUp");
    expect(await at()).toBe("s1");
    await key("End");
    expect(await at()).toBe("s5");
    await key("Home");
    expect(await at()).toBe("s1");
    const side = `[...document.querySelectorAll('aside [role="group"] button[data-rove]')]`;
    expect(await until(page, `${side}.length === 4`)).toBe(true);
    expect(await page.eval(`${side}.filter((b) => b.tabIndex === 0).length`)).toBe(1);
    await page.eval(`${side}[0].focus()`);
    await key("ArrowDown");
    expect(await page.eval(`document.activeElement === ${side}[1]`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/sessions.json")`);
  });

  test("after a remove of the focused session, the focus goes to the session in its place", async () => {
    await page.eval(`(() => {
      const card = (i, moved) => ({ id: "s" + i, title: "Session " + i, text: "", folder: "/lab/f" + i, folderName: "f" + i, age: "1 h ago", status: "", moved, thumb: "" });
      window.__gone = [];
      window.__mocks.push({ part: "api/sessions.json", reply: () => ({ body: [1, 2, 3, 4].filter((i) => !window.__gone.includes("s" + i)).map((i) => card(i, false)) }) });
      window.__mocks.push({ part: "api/session-remove", reply: (_u, b) => (window.__gone.push(b.id), { body: { ok: true } }) });
    })()`);
    await page.size(1280, 900);
    await goPage("Programs");
    await goPage("Sessions");
    const side = `[...document.querySelectorAll('aside [role="group"] button[data-rove]')]`;
    expect(await until(page, `${side}.map((b) => b.dataset.rove).join() === "s1,s2,s3,s4"`)).toBe(true);
    await page.eval(`${side}[1].focus()`);
    await page.eval(`${side}[1].dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 50, clientY: 300 }))`);
    const item = (label: string) => `[...document.querySelectorAll('[role="menuitem"], [role="dialog"] button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
    expect(await until(page, `!!${item("Remove from the list")}`)).toBe(true);
    await page.eval(`${item("Remove from the list")}.click()`);
    expect(await until(page, `!!${item("Remove")}`)).toBe(true);
    await page.eval(`${item("Remove")}.click()`);
    expect(await until(page, `${side}.length === 3 && !document.querySelector('[role="dialog"]')`)).toBe(true);
    expect(await until(page, `document.activeElement?.dataset.rove === "s3"`)).toBe(true);
    expect(await page.eval(`${side}.filter((b) => b.tabIndex === 0).map((b) => b.dataset.rove)`)).toEqual(["s3"]);
    await page.eval(`document.activeElement.blur(); window.__gone.push("s3")`);
    await goPage("Programs");
    await goPage("Sessions");
    expect(await until(page, `${side}.map((b) => b.dataset.rove).join() === "s1,s4"`)).toBe(true);
    await wait(200);
    expect(await page.eval(`document.activeElement === document.body`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/sessions.json" && m.part !== "api/session-remove")`);
    await goPage("Programs");
    expect(await until(page, `!${side}.some((b) => b.dataset.rove === "s1")`)).toBe(true);
  });

  test("the conversation shows its end after a reload, the sidebar names the request, and on a phone the message box fits under the header", async () => {
    await goPage("Analysis");
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    expect(await page.eval(`document.querySelector('aside[aria-label="Navigation"]').textContent.includes("Compare the groups")`)).toBe(true);
    await page.eval(`(() => { const b = [...document.querySelectorAll('[data-card][data-type="setup"] .btn')].find((x) => x.textContent === "Close"); b.focus(); b.click(); })()`);
    expect(await until(page, `!document.querySelector("[data-card]") && document.activeElement?.id === "msg"`)).toBe(true);
    const t = new URL(url).searchParams.get("t");
    await page.eval(`fetch("api/send?t=${t}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${t}" }, body: JSON.stringify({ text: "Write a long note" }) })`);
    expect(await until(page, `document.querySelector('[role="log"]').textContent.includes("long note") && document.querySelector('[role="status"]').textContent.startsWith("Ready")`)).toBe(true);
    const gap = `(() => { const e = document.querySelector('[role="log"]').parentElement; return e.scrollHeight - e.scrollTop - e.clientHeight; })()`;
    await page.go(url);
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    await wait(600);
    expect(await page.eval<number>(gap)).toBeLessThan(5);
    await page.eval(`(() => { const e = document.querySelector('[role="log"]').parentElement; e.dispatchEvent(new WheelEvent("wheel", { deltaY: -400, bubbles: true })); e.scrollTop -= 400; })()`);
    await wait(300);
    await page.eval(`document.querySelector('[role="log"]').appendChild(document.createElement("p")).textContent = "more"`);
    await wait(300);
    expect(await page.eval<number>(gap)).toBeGreaterThan(300);
    await page.size(390, 844);
    await wait(300);
    const r = await page.eval<{ bottom: number; clamp: string }>(`({ bottom: document.querySelector("#msg").closest("form").getBoundingClientRect().bottom, clamp: getComputedStyle(document.querySelector('[role="status"] span.flex-1')).webkitLineClamp })`);
    expect(r.bottom).toBeLessThanOrEqual(844);
    expect(r.clamp).toBe("2");
    const head = await page.eval<number>(`document.querySelector("#msg").closest("main, body").querySelector("header:has([aria-label='More'])").getBoundingClientRect().height`);
    expect(head).toBeLessThanOrEqual(100);
    await page.size(1280, 900);
  });
  test("print: the whole conversation on white paper, without the sidebar, the side panel and the message box", async () => {
    await goPage("Analysis");
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    await page.eval(`document.documentElement.dataset.theme = "dark"`);
    await page.media([], "print");
    const r = await page.eval<{ bg: string; aside: boolean; form: boolean; scroll: string }>(`({ bg: getComputedStyle(document.body).backgroundColor, aside: [...document.querySelectorAll("aside")].some((a) => a.getClientRects().length), form: !!document.querySelector("#msg").closest("form").getClientRects().length, scroll: getComputedStyle(document.querySelector('[role="log"]').parentElement).overflowY })`);
    await page.media([]);
    await page.eval(`delete document.documentElement.dataset.theme`);
    expect(r).toEqual({ bg: "rgb(246, 246, 244)", aside: false, form: false, scroll: "visible" });
  });

  test("settings on a phone: a long model name in the model list wraps in its row", async () => {
    await page.size(390, 844);
    await goPage("Settings");
    expect(await until(page, `document.querySelector('[data-setting="model"] [role="radio"]')`)).toBe(true);
    expect(await overflow(page)).toEqual({ page: 390, wide: [] });
    await page.size(1280, 900);
  });

  test("a results sheet scrolls in its own box, and a thumb is as wide as its image", async () => {
    await page.eval(MOCK);
    await goPage("Analysis");
    const cols = Array.from({ length: 20 }, (_, i) => `column_${i}`);
    const head = cols.map((c) => `<th>${c}</th>`).join("");
    const body = Array.from({ length: 200 }, (_, r) => `<tr>${cols.map((c) => `<td data-label="${c}">${r}.123456</td>`).join("")}</tr>`).join("");
    const img = (w: number, h: number) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#c33"/></svg>`)}`;
    const html = `<details open><summary>Summary</summary><div class="sheet"><table class="stack wide"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></details><div class="images">${[img(300, 120), img(4000, 100), img(200, 200)].map((u) => `<button type="button" class="thumb" data-full="${u}"><img src="${u}" alt=""></button>`).join("")}</div>`;
    await page.eval(`window.__mocks.push({ part: "api/tab?name=results", reply: () => ({ body: ${JSON.stringify(html)} }) })`);
    await page.size(390, 844);
    await page.eval(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent === "Results").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    expect(await until(page, `document.querySelector('[role="tabpanel"] div.sheet')`)).toBe(true);
    await wait(300);
    const r = await page.eval<{ box: number; scroll: number; head: string; thumbs: number[][] }>(`(() => {
      const box = document.querySelector('[role="tabpanel"] div.sheet');
      return { box: box.getBoundingClientRect().height, scroll: box.scrollWidth - box.clientWidth, head: getComputedStyle(box.querySelector("thead")).display, thumbs: [...document.querySelectorAll('[role="tabpanel"] .thumb')].map((b) => [b.getBoundingClientRect().width - b.querySelector("img").getBoundingClientRect().width, b.getBoundingClientRect().height - b.querySelector("img").getBoundingClientRect().height]) };
    })()`);
    expect(r.box).toBeLessThanOrEqual(520);
    expect(r.scroll).toBeGreaterThan(0);
    expect(r.head).toBe("table-header-group");
    for (const [dw, dh] of r.thumbs) expect([dw, dh]).toEqual([2, 2]);
    expect(await overflow(page)).toEqual({ page: 390, wide: [] });
    await page.eval(`window.__mocks = window.__mocks.filter((m) => !m.part.startsWith("api/tab"))`);
    await page.eval(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent === "Analysis").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
    await page.size(1280, 900);
  });

  test("a file dragged over the conversation opens the folder dialog, and a drop does not leave the app", async () => {
    await goPage("Analysis");
    const ev = (type: string) => `(() => { const dt = new DataTransfer(); dt.items.add(new File(["x"], "a.csv")); const e = new DragEvent(${JSON.stringify(type)}, { bubbles: true, cancelable: true, dataTransfer: dt }); document.querySelector('[role="log"]').dispatchEvent(e); return e.defaultPrevented; })()`;
    await page.eval(ev("dragenter"));
    expect(await until(page, `document.querySelector('[role="dialog"]')?.textContent.includes("Open a folder")`)).toBe(true);
    expect(await page.eval(ev("dragover"))).toBe(true);
    expect(await page.eval(ev("drop"))).toBe(true);
    await page.eval(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.eval(ev("dragenter"));
    expect(await until(page, `!!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.eval(`(() => { const dt = new DataTransfer(); dt.items.add(new File(["x"], "a.csv")); document.body.dispatchEvent(new DragEvent("dragleave", { bubbles: true, dataTransfer: dt, clientX: 0, clientY: 0 })); })()`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.eval(`window.dispatchEvent(new CustomEvent("cuvette-drag", { detail: "enter" }))`);
    expect(await until(page, `!!document.querySelector('[role="dialog"]')`)).toBe(true);
    expect(await until(page, `document.querySelector('[role="dialog"]').textContent.includes("Drop a folder to open it")`)).toBe(true);
    await page.eval(`window.dispatchEvent(new CustomEvent("cuvette-drag", { detail: "leave" }))`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
  });

  test("with reduced motion, a dialog opens with no animation and a spinner turns slowly", async () => {
    await page.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.eval(`[...document.querySelectorAll("aside button")].find((b) => b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    const r = await page.eval<{ anim: string; trans: string; spin: string }>(`(() => {
      const s = document.createElement("span");
      s.className = "animate-spin";
      document.body.appendChild(s);
      const out = { anim: getComputedStyle(document.querySelector('[role="dialog"]')).animationDuration, trans: getComputedStyle(document.querySelector("aside nav button")).transitionDuration, spin: getComputedStyle(s).animationDuration };
      s.remove();
      return out;
    })()`);
    expect(parseFloat(r.anim)).toBeLessThanOrEqual(0.001);
    expect(parseFloat(r.trans)).toBeLessThanOrEqual(0.001);
    expect(r.spin).toBe("3s");
    await page.eval(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.media([]);
  });

  test("the model menu lists the Ollama models on this computer and saves the chosen one", async () => {
    await goPage("Analysis");
    await page.eval(`window.__mocks.push({ part: "api/firststart", reply: () => ({ body: { ollama: { reachable: true, models: ["qwen3:8b", "llama3.1:8b"] } } }) }); window.__mocks.push({ part: "api/setting", reply: (_u, b) => ({ body: { text: "Saved." } }) }); window.__calls = []`);
    await page.eval(`document.querySelector('header button[aria-label^="Model:"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }))`);
    expect(await until(page, `[...document.querySelectorAll('[role="menuitemradio"]')].some((x) => x.textContent === "llama3.1:8b")`)).toBe(true);
    expect(await page.eval(`document.querySelector('[role="menu"]').textContent.includes("Ollama on this computer")`)).toBe(true);
    await page.eval(`[...document.querySelectorAll('[role="menuitemradio"]')].find((x) => x.textContent === "llama3.1:8b").click()`);
    expect(await until(page, `window.__calls.some((c) => c.url.includes("api/setting") && c.body && JSON.parse(c.body).value === "ollama:llama3.1:8b")`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/firststart" && m.part !== "api/setting")`);
  });

  test("settings: Cancel puts back the value that a text box showed before the change", async () => {
    await goPage("Settings");
    expect(await until(page, `document.querySelector('nav[aria-label="Setting sections"]')`)).toBe(true);
    await page.eval(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === "Outputs").click()`);
    expect(await until(page, `document.querySelector('[data-setting="databook_author"] input')`)).toBe(true);
    await setText('[data-setting="databook_author"] input', "A. Scientist");
    await page.eval(`document.querySelector('[data-setting="databook_author"] input').blur()`);
    expect(await until(page, `document.querySelector('[data-setting="databook_author"] [aria-label="Save for"]')`)).toBe(true);
    await page.eval(`[...document.querySelectorAll('[data-setting="databook_author"] button')].find((b) => b.textContent === "Cancel").click()`);
    expect(await until(page, `!document.querySelector('[data-setting="databook_author"] [aria-label="Save for"]')`)).toBe(true);
    expect(await page.eval(`document.querySelector('[data-setting="databook_author"] input').value`)).toBe("");
  });

  test("the sessions page can remove a moved session from the list", async () => {
    await page.eval(`window.__mocks.push({ part: "api/sessions.json", reply: () => ({ body: [{ id: "gone-1", title: "Old analysis", text: "", folder: "/nowhere/old", folderName: "old", age: "3 days ago", status: "moved", moved: true, thumb: "" }] }) }); window.__mocks.push({ part: "api/session-remove", reply: () => ({ body: { ok: true } }) }); window.__calls = []`);
    await goPage("Sessions");
    expect(await until(page, `[...document.querySelectorAll("main button")].some((b) => b.textContent.startsWith("Show the moved sessions"))`)).toBe(true);
    await page.eval(`[...document.querySelectorAll("main button")].find((b) => b.textContent.startsWith("Show the moved sessions")).click()`);
    expect(await until(page, `document.querySelector('main button[aria-label="Remove Old analysis from the list"]')`)).toBe(true);
    await page.eval(`document.querySelector('main button[aria-label="Remove Old analysis from the list"]').click()`);
    expect(await until(page, `window.__calls.some((c) => c.url.includes("api/session-remove") && JSON.parse(c.body).id === "gone-1")`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/sessions.json" && m.part !== "api/session-remove")`);
  });

  test("a folder with no files asks before it opens", async () => {
    await page.eval(`window.__mocks.push({ part: "api/suggest", reply: () => ({ body: { scanned: 0, matches: [] } }) }); window.__calls = []`);
    await page.eval(`[...document.querySelectorAll("aside button")].find((b) => b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"] input[aria-label="Folder"]')`)).toBe(true);
    await page.eval(`[...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === "Analyze this folder").click()`);
    expect(await until(page, `document.querySelector('[role="dialog"] [aria-label="Empty folder"]')?.textContent.includes("Cuvette found no files")`)).toBe(true);
    expect(await page.eval(`window.__calls.some((c) => c.url.includes("api/open"))`)).toBe(false);
    await page.eval(`[...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === "Back").click()`);
    expect(await until(page, `!document.querySelector('[role="dialog"] [aria-label="Empty folder"]')`)).toBe(true);
    await page.eval(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/suggest")`);
  });

  test("first start: a saved local model shows the next steps and the new model, also if Ollama does not run", async () => {
    await page.eval(`(() => {
      window.__model = "claude";
      window.__mocks.push({ part: "api/firststart/local", reply: () => { window.__model = "ollama:qwen3:8b"; return { body: { ok: false, text: "Saved the model ollama:qwen3:8b. Ollama does not run on this computer yet.", model: "ollama:qwen3:8b" } }; } });
      window.__mocks.push({ part: "api/firststart", reply: () => ({ body: { needed: true, hasKey: false, model: "claude", ollama: { reachable: false, models: [] }, choices: [{ id: "claude", label: "Use Claude", help: "" }, { id: "local", label: "Use a local model", help: "" }], recommended: "qwen3:8b", sample: "/tmp/Cuvette sample", keyGuide: { title: "", intro: "", steps: [], notes: [] } } }) });
      window.__mocks.push({ part: "api/doctor", reply: () => ({ body: { ready: true, counts: { ok: 1, missing: 0, old: 0 }, checks: [] } }) });
      window.cuvetteApp.show("setup");
    })()`);
    expect(await until(page, `[...document.querySelectorAll("main button")].some((b) => b.textContent === "Use a local model")`)).toBe(true);
    await page.eval(`[...document.querySelectorAll("main button")].find((b) => b.textContent === "Use a local model").click()`);
    expect(await until(page, `[...document.querySelectorAll("main button")].some((b) => b.textContent === "Check Ollama again")`)).toBe(true);
    await page.eval(`[...document.querySelectorAll("main button")].find((b) => b.textContent === "Save qwen3:8b").click()`);
    expect(await until(page, `document.querySelector("main").textContent.includes("Check this computer") && document.querySelector("main").textContent.includes("Run the sample analysis")`)).toBe(true);
    expect(await page.eval(`document.querySelector("main [role=alert]").textContent`)).toContain("Ollama does not run");
    await page.eval(`window.__mocks = window.__mocks.filter((m) => !m.part.startsWith("api/firststart") && m.part !== "api/doctor")`);
    await goPage("Analysis");
  });
  test("on a 320 px phone, a title with no spaces, the Programs buttons and the Start page folder name stay in the window", async () => {
    await page.eval(`(() => {
      const card = (i, title) => ({ id: "s" + i, title, text: title, folder: "/lab/f" + i, folderName: title, age: "1 h ago", status: "answered", moved: false, thumb: "" });
      window.__mocks.push({ part: "api/sessions.json", reply: () => ({ body: [card(1, "C:/Users/lab/Documents/Experiment_12/Plate_3/results_" + "x".repeat(300) + ".xlsx"), card(2, "Short")] }) });
    })()`);
    await page.size(320, 640);
    await goPage("Sessions");
    expect(await until(page, `document.querySelectorAll('main ul[aria-label="Sessions"] li').length === 2`)).toBe(true);
    expect(await page.eval(`document.querySelector("main").scrollWidth <= document.querySelector("main").clientWidth`)).toBe(true);
    expect(await overflow(page, "main")).toEqual({ page: 320, wide: [] });
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/sessions.json")`);
    await goPage("Programs");
    expect(await until(page, `[...document.querySelectorAll("main button")].some((b) => b.textContent.includes("Check all again"))`)).toBe(true);
    expect(await page.eval(`document.querySelector("main").scrollWidth <= document.querySelector("main").clientWidth`)).toBe(true);
    expect(await overflow(page, "main")).toEqual({ page: 320, wide: [] });
    await page.eval(`window.__mocks.push({ part: "api/suggest", reply: () => ({ body: { scanned: 0, matches: [] } }) })`);
    await page.eval(`[...document.querySelectorAll("aside button")].find((b) => b.textContent.includes("Open a folder"))?.click()`);
    expect(await until(page, `document.querySelector('[role="dialog"] input[aria-label="Folder"]')`)).toBe(true);
    await page.eval(`(() => { const i = document.querySelector('[role="dialog"] input[aria-label="Folder"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, "/tmp/2024-10-12_Experiment12_Plate3_Replicate2_GFP_Day7_final_version_that_goes_on"); i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await page.eval(`[...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === "Analyze this folder").click()`);
    expect(await until(page, `document.querySelector('[role="dialog"] [aria-label="Empty folder"]')`)).toBe(true);
    expect(await page.eval(`(() => { const d = document.querySelector('[role="dialog"]'); return d.scrollWidth <= d.clientWidth && d.querySelector('[aria-label="Empty folder"] p').getBoundingClientRect().right <= innerWidth; })()`)).toBe(true);
    await page.eval(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/suggest")`);
    await page.size(1280, 900);
    await goPage("Analysis");
  });

  test("the message box follows a new window width, and the buttons under it stay inside it while the agent works", async () => {
    await page.size(1280, 900);
    await goPage("Analysis");
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    const height = () => page.eval<number>(`Math.round(document.querySelector("#msg").getBoundingClientRect().height)`);
    const wide = await height();
    await page.size(320, 640);
    await wait(200);
    const narrow = await height();
    expect(narrow).toBeGreaterThan(wide);
    const t = new URL(url).searchParams.get("t");
    await page.eval(`fetch("api/send?t=${t}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${t}" }, body: JSON.stringify({ text: "Write a long note" }) })`);
    await setText("#msg", "next");
    const buttons = await page.eval<{ right: number; box: number }[]>(`[...document.querySelectorAll("#msg")].flatMap((m) => [...m.closest("form").querySelectorAll("button")].map((b) => ({ right: Math.round(b.getBoundingClientRect().right), box: Math.round(m.closest("form").getBoundingClientRect().right) })))`);
    for (const b of buttons) expect(b.right).toBeLessThanOrEqual(b.box);
    expect(await until(page, `document.querySelector('[role="status"]').textContent.startsWith("Ready")`)).toBe(true);
    await page.size(1280, 900);
  });

  test("the model menu fits a short window and scrolls", async () => {
    await page.eval(`window.__mocks.push({ part: "api/firststart", reply: () => ({ body: { ollama: { reachable: true, models: ["a1:8b", "a2:8b", "a3:8b", "a4:8b", "a5:8b", "a6:8b"] } } }) })`);
    await page.size(720, 390);
    await page.eval(`document.querySelector('header button[aria-label^="Model:"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }))`);
    expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
    await wait(300);
    const menu = await page.eval<{ top: number; bottom: number; scroll: boolean }>(`(() => { const m = document.querySelector('[role="menu"]'); const r = m.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, scroll: m.scrollHeight > m.clientHeight }; })()`);
    expect(menu.bottom).toBeLessThanOrEqual(390);
    expect(menu.top).toBeGreaterThanOrEqual(0);
    expect(menu.scroll).toBe(true);
    await page.eval(`document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => m.part !== "api/firststart")`);
    await page.size(1280, 900);
  });

  test("the folder dialog on a 320 by 568 phone shows its whole list and the folder names", async () => {
    await page.size(320, 568);
    await page.eval(`[...document.querySelectorAll("aside button")].find((b) => b.textContent.includes("Open a folder"))?.click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]') && document.body.textContent.includes("Up one folder")`)).toBe(true);
    const r = await page.eval<{ fit: boolean; cut: string[] }>(`(() => { const d = document.querySelector('[role="dialog"]'); const rows = [...d.querySelectorAll("li button > span:nth-child(2)")]; return { fit: d.scrollHeight <= d.clientHeight + 1, cut: rows.filter((s) => s.scrollWidth > s.clientWidth + 1 && s.clientWidth < 40).map((s) => s.textContent) }; })()`);
    expect(r).toEqual({ fit: true, cut: [] });
    await page.eval(`document.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
    await page.size(1280, 900);
  });

  test("a copied table keeps its header and its columns when the table is stacked, and a pasted image shows a message", async () => {
    await page.size(1280, 900);
    await goPage("Analysis");
    const copied = (width: number) =>
      page.eval<{ text: string; html: string; stacked: boolean }>(`(() => {
        const log = document.querySelector('[role="log"]');
        log.style.maxWidth = "${width}px";
        const box = document.createElement("div");
        box.innerHTML = '<table class="stack" role="table"><thead><tr><th>Group</th><th>n</th><th>Mean</th></tr></thead><tbody><tr><td data-label="Group">Control</td><td data-label="n">12</td><td data-label="Mean">4.1</td></tr><tr><td data-label="Group">Treated</td><td data-label="n">11</td><td data-label="Mean">5.2</td></tr></tbody></table>';
        log.appendChild(box);
        const table = box.firstChild;
        const sel = getSelection();
        const range = document.createRange();
        range.selectNode(table);
        sel.removeAllRanges();
        sel.addRange(range);
        const data = new DataTransfer();
        table.dispatchEvent(new ClipboardEvent("copy", { bubbles: true, cancelable: true, clipboardData: data }));
        const out = { text: data.getData("text/plain"), html: data.getData("text/html"), stacked: getComputedStyle(table.querySelector("thead")).display === "none" };
        box.remove();
        log.style.maxWidth = "";
        return out;
      })()`);
    for (const width of [400, 768]) {
      const c = await copied(width);
      expect(c.text).toBe("Group\tn\tMean\nControl\t12\t4.1\nTreated\t11\t5.2");
      expect(c.html).toBe("<table><thead><tr><th>Group</th><th>n</th><th>Mean</th></tr></thead><tbody><tr><td>Control</td><td>12</td><td>4.1</td></tr><tr><td>Treated</td><td>11</td><td>5.2</td></tr></tbody></table>");
    }
    expect((await copied(400)).stacked).toBe(true);
    const before = await page.eval<string>(`document.querySelector("#msg").value`);
    await page.eval(`(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(["x"], "shot.png", { type: "image/png" }));
      document.querySelector("#msg").dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt }));
    })()`);
    expect(await until(page, `document.body.textContent.includes("Cuvette cannot take a pasted image.")`)).toBe(true);
    expect(await page.eval(`document.querySelector("#msg").value`)).toBe(before);
  });
});
