import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { trustFolder } from "../src/core/trust.ts";
import { ensureUiBuild } from "./ui-dist.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");

function writeJson(path: string, data: object) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
}

const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);

describe.skipIf(!CHROME)("the new app page in headless Chrome", () => {
  let proc: ChildProcess;
  let url = "";
  let page: Page;
  let proj = "";

  beforeAll(async () => {
    ensureUiBuild();
    const home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    proj = mkdtempSync(join(tmpdir(), "cuvette-proj-"));
    writeJson(join(home, "settings.json"), { model: "claude:claude-sonnet-5-5", budgetUsd: 50 });
    writeJson(join(proj, ".cuvette", "settings.local.json"), { mode: "plan" });
    const before = process.env.CUVETTE_HOME;
    process.env.CUVETTE_HOME = home;
    trustFolder(proj);
    if (before === undefined) delete process.env.CUVETTE_HOME;
    else process.env.CUVETTE_HOME = before;
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: join(home, "spend.jsonl"), ANTHROPIC_API_KEY: "sk-ant-api03-" + "x".repeat(90), CUVETTE_NO_OPEN: "1" };
    proc = spawn(process.execPath, [join(ROOT, "bin", "cuvette.js"), "app", "--no-open"], { cwd: proj, env, stdio: ["ignore", "pipe", "pipe"] });
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
    await page.go(url + "&page=settings");
    expect(await until(page, `document.querySelector("[data-setting]")`)).toBe(true);
  }, 90000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
  });

  const sections = () => page.eval<string[]>(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].map((b) => b.textContent)`);
  const openSection = (name: string) => page.eval(`(async () => { [...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === ${JSON.stringify(name)}).click(); await new Promise((r) => setTimeout(r, 60)); })()`);

  test("the page is the React app, with the sidebar and the settings rows", async () => {
    expect(await page.eval(`!!document.getElementById("root").firstElementChild`)).toBe(true);
    expect(await page.eval(`[...document.querySelectorAll('aside nav[aria-label="Pages"] button')].map((b) => b.textContent)`)).toEqual(["Analysis", "Sessions", "Programs", "Settings"]);
    expect((await sections()).length).toBeGreaterThan(3);
  });

  for (const [w, h] of [[1280, 900], [1024, 800], [390, 844]] as const)
    test(`no horizontal overflow at ${w} px`, async () => {
      await page.size(w, h);
      for (const sec of await sections()) {
        await openSection(sec);
        const o = await page.eval<{ page: number; wide: string[] }>(`(() => ({ page: document.documentElement.scrollWidth, wide: [...document.querySelectorAll("main *")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + "." + e.className).slice(0, 5) }))()`);
        expect({ sec, ...o }).toEqual({ sec, page: w, wide: [] });
      }
      await page.size(1280, 900);
    });

  test("the search filters the rows", async () => {
    const visible = (q: string) =>
      page.eval<string[]>(`(async () => {
        const s = document.querySelector('input[aria-label="Search the settings"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(s, ${JSON.stringify(q)});
        s.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 60));
        return [...document.querySelectorAll("[data-setting]")].map((r) => r.dataset.setting);
      })()`);
    expect(await visible("budget")).toEqual(["budgetUsd"]);
    expect(await visible("zzzz")).toEqual([]);
    expect(await page.eval(`document.body.textContent.includes("No setting matches the search.")`)).toBe(true);
    await visible("");
  });

  test("a click asks where to save, saves, and remembers the place", async () => {
    await openSection("Session");
    const row = `document.querySelector('[data-setting="mode"]')`;
    expect(await page.eval(`${row}.querySelector('[data-slot="badge"]').textContent`)).toBe("Project · .cuvette/settings.local.json");
    await page.eval(`[...${row}.querySelectorAll('[role="radio"]')].find((b) => b.textContent === "follow").click()`);
    expect(await until(page, `${row}.querySelector('[role="group"]')`)).toBe(true);
    expect(await page.eval(`[...${row}.querySelectorAll('[role="group"] button')].map((b) => b.textContent)`)).toEqual(["Me (all projects)", "This project", "Cancel"]);
    await page.eval(`${row}.querySelector('[data-scope="project"]').click()`);
    expect(await until(page, `document.querySelector('[data-setting="mode"] [role="status"]')`)).toBe(true);
    expect(await page.eval(`document.querySelector('[data-setting="mode"] [role="status"]').textContent`)).toContain("Saved for this project. Mode is now follow.");
    expect(JSON.parse(readFileSync(join(proj, ".cuvette", "settings.json"), "utf8"))).toEqual({ mode: "follow" });
    expect(await page.eval(`localStorage.getItem("cuvette.scope.mode")`)).toBe("project");
    await page.eval(`[...document.querySelector('[data-setting="mode"]').querySelectorAll('[role="radio"]')].find((b) => b.textContent === "teach").click()`);
    expect(await until(page, `document.querySelector('[data-setting="mode"] [data-primary]')`)).toBe(true);
    expect(await page.eval(`document.querySelector('[data-setting="mode"] [data-primary]').dataset.scope`)).toBe("project");
  });
});
