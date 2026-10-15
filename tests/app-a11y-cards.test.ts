import { describe, expect, test } from "vitest";
import { CARD_FIXTURES, ITEM_FIXTURES, ITEM_LIVE_FIXTURE, STATUS_FIXTURE } from "./a11y-cards.ts";

import { CHROME, type Page } from "./chrome.ts";

import { LONG, until, useApp, wait } from "./a11y-app.ts";

const a = useApp();
const page = new Proxy({} as Page, { get: (_, k) => (a.page as any)[k] });

describe.skipIf(!CHROME)("accessibility of the browser app: the cards, the messages and the step graph", () => {
  const { setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck } = a;
  test("each card type: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const c of CARD_FIXTURES) {
      await showCards(c.html);
      out.push(...(await audit("card " + c.name)));
    }
    expect(out).toEqual([]);
  }, LONG);

  test("the messages, the steps and the status notes: contrast, names and headings", async () => {
    await openSession();
    const notes = 'header button[aria-label$="the status notes"]';
    if (await page.eval<boolean>(`document.querySelector(${JSON.stringify(notes)}).getAttribute("aria-pressed") === "false"`)) await page.eval(`document.querySelector(${JSON.stringify(notes)}).click()`);
    const html = [...ITEM_FIXTURES.map((f) => f.html), ITEM_LIVE_FIXTURE, STATUS_FIXTURE].map((h) => `<div class="item">${h}</div>`).join("");
    await page.eval(`document.querySelector('[role="log"]').lastElementChild.insertAdjacentHTML("beforebegin", ${JSON.stringify(html)})`);
    await page.eval(`document.querySelectorAll("details").forEach((d) => (d.open = true))`);
    expect(await page.eval<number>(`document.querySelectorAll('[role="log"] .item .step.bad, [role="log"] .item .line.red').length`)).toBeGreaterThan(1);
    expect(await audit("items")).toEqual([]);
  }, LONG);

  test("the step graph and the panel page: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const path of ["graph/", "graph/panel"]) {
      const u = new URL(path, a.url);
      u.searchParams.set("t", a.token);
      await page.go(u.toString());
      expect(await until(page, path === "graph/" ? `document.querySelector("#tabs button")` : `document.getElementById("state").textContent !== "Connecting"`)).toBe(true);
      out.push(...(await audit(path)));
      if (path === "graph/") {
        for (const tab of await page.eval<string[]>(`[...document.querySelectorAll('[role="tab"]')].map((t) => t.id)`)) {
          await setView(1280, "light");
          await page.eval(`document.getElementById(${JSON.stringify(tab)}).click()`);
          await wait(300);
          out.push(...(await audit(path + " " + tab)));
        }
      }
    }
    expect(out).toEqual([]);
  }, LONG);
});
