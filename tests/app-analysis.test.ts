import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { UI_DIST } from "../src/server/app.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!CHROME)("the analysis page in headless Chrome", () => {
  let proc: ChildProcess;
  let url = "";
  let page: Page;

  beforeAll(async () => {
    if (!existsSync(join(UI_DIST, "index.html"))) execFileSync("npx", ["vite", "build", "--config", "src/ui-web/vite.config.ts", "--logLevel", "warn"], { cwd: ROOT, stdio: "ignore" });
    const home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    const data = mkdtempSync(join(tmpdir(), "cuvette-data-"));
    writeFileSync(join(data, "a.csv"), "x,y\n1,2\n3,4\n");
    const script = join(home, "fake.json");
    writeFileSync(script, JSON.stringify([{ calls: [{ name: "ask_scientist", args: { question: "Which test?", options: ["t test", "Wilcoxon"] } }] }, { text: "Done." }]));
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
  }, 90000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
  });

  const toggle = `document.querySelector('header button[aria-label$="the side panel"]')`;

  test("the side panel button shows at phone width, so a hidden panel can come back", async () => {
    await page.size(390, 844);
    expect(await page.eval(`${toggle}.getClientRects().length > 0`)).toBe(true);
    await page.eval(`${toggle}.click()`);
    await until(page, `!document.querySelector('aside[aria-label="Analysis details"]')`);
    expect(await page.eval(`${toggle}.getClientRects().length > 0`)).toBe(true);
    await page.eval(`${toggle}.click()`);
    expect(await until(page, `document.querySelector('aside[aria-label="Analysis details"]')`)).toBe(true);
    const o = await page.eval<{ page: number; wide: string[] }>(`(() => ({ page: document.documentElement.scrollWidth, wide: [...document.querySelectorAll("#root *")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + "." + e.className).slice(0, 5) }))()`);
    expect(o).toEqual({ page: 390, wide: [] });
    await page.size(1280, 900);
  });

  test("a failed send removes the waiting message, puts the text back and shows the error", async () => {
    await page.eval(`(() => {
      const real = window.fetch;
      window.fetch = (u, o) => (String(u).includes("api/send") ? (window.fetch = real, Promise.resolve(new Response(JSON.stringify({ error: "The server refused it." }), { status: 500, headers: { "content-type": "application/json" } }))) : real(u, o));
      const ta = document.querySelector("#msg");
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, "Compare the groups");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await wait(50);
    await page.eval(`document.querySelector('button[type="submit"]').click()`);
    expect(await until(page, `document.body.textContent.includes("The server refused it.")`)).toBe(true);
    expect(await page.eval(`document.querySelector("#msg").value`)).toBe("Compare the groups");
    expect(await page.eval(`!!document.querySelector(".msg.agent.working")`)).toBe(false);
    expect(await page.eval(`[...document.querySelectorAll(".msg.user")].some((m) => m.textContent.includes("Compare the groups"))`)).toBe(false);
  });

  test("Enter on a header button does not answer the open question card", async () => {
    await page.eval(`(() => {
      const ta = document.querySelector("#msg");
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, "Compare the groups");
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await wait(50);
    await page.eval(`document.querySelector('button[type="submit"]').click()`);
    expect(await until(page, `document.querySelector("[data-card] .opts .btn")`)).toBe(true);
    const free = await page.eval<boolean>(`(() => {
      const b = ${toggle};
      b.focus();
      return b.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    })()`);
    expect(free).toBe(true);
    await wait(300);
    expect(await page.eval(`!!document.querySelector("[data-card] .opts .btn")`)).toBe(true);
  });

  test("the steps menu item follows the /details switch", async () => {
    const label = `(async () => {
      const t = document.querySelector('header button[aria-label="More"]');
      t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }));
      for (let i = 0; i < 200 && !document.querySelector('[role="menu"]'); i++) await new Promise((r) => setTimeout(r, 50));
      const text = [...document.querySelectorAll('[role="menuitem"]')].map((x) => x.textContent).find((x) => /every step|housekeeping/.test(x));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      document.querySelector('[role="menu"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return text;
    })()`;
    expect(await page.eval(label)).toContain("Show every step");
    const t = new URL(url).searchParams.get("t");
    await page.eval(`fetch("api/send?t=${t}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${t}" }, body: JSON.stringify({ text: "/details" }) })`);
    await wait(500);
    expect(await page.eval(label)).toBe("Hide the housekeeping steps");
  });
});
