import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startWindow, type WindowSession } from "../src/server/window.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);

describe.skipIf(!CHROME)("the step graph page in headless Chrome", () => {
  let page: Page;
  let win: { url: string; close(): void };

  beforeAll(async () => {
    const s = new FakeSession({ delayMs: 0 });
    const run = (s as unknown as { runTool(tool: string, args: object, out: object): Promise<string | undefined> }).runTool.bind(s);
    let prev: string | undefined;
    for (let i = 1; i <= 6; i++) prev = await run("threshold", { input: `/data/a${i}.tif` }, { summary: `Found ${i * 10} objects`, parents: i === 4 ? ["n6"] : i === 6 ? ["n4"] : prev ? [prev] : [] });
    s.record.append("assistant", { text: "The result:\n\n| Group | Mean |\n|---|---|\n| control | 5.1 |\n| treated | 5.9 |", final: true });
    win = await startWindow(s as unknown as WindowSession);
    page = await openChrome();
    await page.size(1280, 900);
    await page.go(win.url);
    await until(page, `document.querySelectorAll("#canvas button.card").length === 6`);
  }, 60000);
  afterAll(async () => {
    await page?.close();
    win?.close();
  });

  test("a cycle in the steps draws every step, and the arrow keys move between the steps", async () => {
    expect(await page.eval(`document.querySelectorAll("#canvas button.card").length`)).toBe(6);
    await page.eval(`document.querySelector("#canvas button.card").focus()`);
    const right = await page.eval<string>(`(() => { document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); return document.activeElement.getAttribute("aria-label"); })()`);
    expect(right).toMatch(/^step 2 /);
    const left = await page.eval<string>(`(() => { document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); return document.activeElement.getAttribute("aria-label"); })()`);
    expect(left).toMatch(/^step 1 /);
  });

  test("a table in an answer of the agent shows as a table in the trail", async () => {
    expect(await until(page, `document.querySelector(".mdtable table")`)).toBe(true);
    expect(await page.eval(`[...document.querySelectorAll(".mdtable td")].map((c) => c.textContent)`)).toEqual(["control", "5.1", "treated", "5.9"]);
  });
});
