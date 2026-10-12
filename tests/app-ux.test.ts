import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { UI_DIST } from "../src/server/app.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 80 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);
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
    writeFileSync(script, JSON.stringify([ask("Which test?"), ask("Which second test?"), { text: "Done." }]));
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: join(home, "spend.jsonl"), CUVETTE_NO_OPEN: "1", HOME: home };
    proc = spawn(process.execPath, [join(ROOT, "bin", "cuvette.js"), "app", "--no-open", "--model", "fake:" + script], { cwd: tmpdir(), env, stdio: ["ignore", "pipe", "pipe"] });
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
    await until(page, `document.querySelector("#msg")`);
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
    expect(await page.eval(`document.activeElement.matches(":focus-visible") ? getComputedStyle(document.activeElement).boxShadow : "not visible"`)).not.toBe("none");
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
    const r = await page.eval<{ texts: string[]; stops: number }>(`(async () => {
      const t = document.querySelector('header button[aria-label^="Mode:"]');
      t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
      for (let i = 0; i < 30 && !document.querySelector('[role="menu"]'); i++) await new Promise((r) => setTimeout(r, 50));
      const items = [...document.querySelectorAll('[role="menuitemradio"]')];
      const out = { texts: items.map((x) => x.textContent), stops: document.querySelectorAll('[role="menu"] [tabindex="0"]').length };
      document.querySelector('[role="menu"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return out;
    })()`);
    expect(r.texts[0]).toContain("The agent runs the steps.");
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
    await until(page, `document.querySelector('[data-setting="mode"]')`);
    await page.eval(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === "Session").click()`);
    await wait(100);
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
    await page.eval(`${btnIn('[role="dialog"]', "Cancel")}.click()`);
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
    await page.eval(`${btnIn('[role="dialog"]', "Cancel")}.click()`);
    await page.eval(`window.__mocks = window.__mocks.filter((m) => !m.part.startsWith("api/programs"))`);
  });
});
