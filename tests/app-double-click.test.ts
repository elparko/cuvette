import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ensureUiBuild } from "./ui-dist.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);

describe.skipIf(!CHROME)("a double click in the app", () => {
  let proc: ChildProcess;
  let url = "";
  let page: Page;
  let home = "";
  let data = "";
  let project = "";

  beforeAll(async () => {
    ensureUiBuild();
    home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    data = mkdtempSync(join(tmpdir(), "cuvette-data-"));
    writeFileSync(join(data, "a.csv"), "x,y\n1,2\n3,4\n");
    project = join(home, "project");
    mkdirSync(project);
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: join(home, "spend.jsonl"), CUVETTE_NO_OPEN: "1", HOME: home };
    proc = spawn(process.execPath, [join(ROOT, "bin", "cuvette.js"), "app", "--no-open", "--model", "fake:"], { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });
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
  }, 90000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
  });

  const token = () => new URL(url).searchParams.get("t");
  const api = (path: string, body?: unknown) =>
    page.eval<any>(`fetch(${JSON.stringify(path + (path.includes("?") ? "&" : "?") + "t=" + token())}, ${JSON.stringify(body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-token": token() }, body: JSON.stringify(body) })}).then((r) => r.json())`);
  const sessions = async () => (await api("api/sessions.json")).length as number;

  test("the start page fits a phone when the folder list has a long folder name", async () => {
    mkdirSync(join(project, "cuvette-long-folder-name-" + "x".repeat(70)), { recursive: true });
    await page.size(390, 844);
    await page.go(url + "&page=start");
    expect(await until(page, `document.querySelector('input[aria-label="Folder"]') && document.body.textContent.includes("Up one folder")`)).toBe(true);
    const wide = await page.eval<string[]>(`[...document.querySelectorAll("#root *")].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + "." + e.className).slice(0, 5)`);
    expect(wide).toEqual([]);
    await page.size(1280, 900);
  });

  test("a second click on the sample button after the first request ends does not open a second session", async () => {
    await page.go(url + "&page=start");
    expect(await until(page, `document.body.textContent.includes("Run the sample analysis")`)).toBe(true);
    const before = await sessions();
    await page.eval(`(async () => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Run the sample analysis"));
      b.click();
      for (let i = 0; i < 300; i++) {
        await new Promise((r) => setTimeout(r, 5));
        const s = await fetch("api/state?t=${token()}").then((r) => r.json());
        if (s.session) break;
      }
      b.click();
    })()`);
    await new Promise((r) => setTimeout(r, 4000));
    expect(await sessions()).toBe(before + 1);
    expect(await page.eval(`document.querySelectorAll(".msg.user").length`)).toBe(1);
  }, 60000);

  test("the server opens the same folder once when it gets the request twice", async () => {
    await api("api/close", {});
    const before = await sessions();
    expect((await api("api/open", { folder: data })).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 2500));
    expect((await api("api/open", { folder: data })).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 2500));
    expect(await sessions()).toBe(before + 1);
  }, 60000);
});
