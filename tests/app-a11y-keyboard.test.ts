import { describe, expect, test } from "vitest";
import { CARD_FIXTURES, ITEM_FIXTURES, ITEM_LIVE_FIXTURE, STATUS_FIXTURE } from "./a11y-cards.ts";
import { focusOrder, installAudit } from "./a11y-audit.ts";
import { CHROME, type Page } from "./chrome.ts";

import { LONG, SCHEMES, WIDTHS, until, useApp, wait } from "./a11y-app.ts";

const a = useApp();
const page = new Proxy({} as Page, { get: (_, k) => (a.page as any)[k] });

describe.skipIf(!CHROME)("accessibility of the browser app: the keyboard", () => {
  const { setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck } = a;
  test("every control is reachable with Tab, in the visual order, with a visible focus ring", async () => {
    await openSession();
    const out: string[] = [];
    const where: [string, () => Promise<void>][] = [
      ["analysis", async () => await goPage("Analysis")],
      ["cards", async () => {
        await goPage("Analysis");
        await showCards(numbered([]));
      }],
      ["items", async () => {
        await goPage("Analysis");
        await showCards("");
        await page.eval(`(() => {
          document.querySelectorAll('[role="log"] > .item').forEach((e) => e.remove());
          const log = document.querySelector('[role="log"]');
          const c = document.createElement("canvas");
          c.width = 40;
          c.height = 30;
          c.getContext("2d").fillRect(0, 0, 40, 30);
          log.lastElementChild.insertAdjacentHTML("beforebegin", ${JSON.stringify([...ITEM_FIXTURES.map((f) => f.html), ITEM_LIVE_FIXTURE, STATUS_FIXTURE].map((h) => `<div class="item">${h}</div>`).join(""))});
          log.lastElementChild.insertAdjacentHTML("beforebegin", '<div class="item"><button type="button" class="thumb" data-full="x" title="small.png"><img alt="small.png" width="40" height="30" src="' + c.toDataURL() + '"></button></div>');
          document.querySelectorAll("details").forEach((d) => (d.open = true));
        })()`);
      }],
      ["sessions", async () => await goPage("Sessions")],
      ["programs", programsPage],
      ["settings", async () => { await goPage("Settings"); await wait(500); }],
    ];
    for (const scheme of SCHEMES)
      for (const width of WIDTHS) {
        await setView(width, scheme);
        for (const [name, go] of where) {
          await go();
          out.push(...orderProblems(`${name} ${scheme} ${width}`, await focusOrder(page, 400), scheme === "light"));
        }
      }
    expect([...new Set(out)]).toEqual([]);
  }, LONG);

  test("a skip link, if the page has one, moves the focus to the content", async () => {
    await openSession();
    await page.eval(`document.activeElement?.blur()`);
    await page.press("Tab");
    const first = await page.eval<{ skip: boolean; href: string }>(`(() => { const a = document.activeElement; return { skip: a?.tagName === "A" && /skip/i.test(a.textContent), href: a?.getAttribute("href") ?? "" }; })()`);
    if (!first.skip) return;
    await page.press("Enter");
    await wait(200);
    expect(await page.eval<boolean>(`!!document.activeElement.closest(${JSON.stringify(first.href)}) || document.activeElement.id === ${JSON.stringify(first.href.slice(1))}`)).toBe(true);
  });

  test("the page title names the page", async () => {
    await openSession();
    for (const name of ["Sessions", "Programs", "Settings", "Analysis"]) {
      await goPage(name);
      expect(await until(page, `document.title === ${JSON.stringify(name + " - Cuvette")}`)).toBe(true);
    }
  });

  test("a card that did not change keeps the focus when another card changes", async () => {
    await openSession(freshFolder());
    expect(await until(page, `document.querySelector('[data-type="setup"]')`)).toBe(true);
    const one = CARD_FIXTURES.find((c) => c.name === "question")!.html;
    const two = (note: string) => CARD_FIXTURES.find((c) => c.name === "key")!.html.replace('data-card="1"', 'data-card="2"').replace("</section>", `<p>${note}</p></section>`);
    await showCards(one + two("first"));
    await page.eval(`(() => { const b = document.querySelector('[data-card="1"] .opts .btn:nth-child(2)'); b.focus(); window.__kept = b; })()`);
    await sendStream({ t: "cards", html: one + two("second") });
    expect(await until(page, `document.querySelector('[data-card="2"]').textContent.includes("second")`)).toBe(true);
    await frames();
    expect(await page.eval<boolean>(`document.activeElement === window.__kept`)).toBe(true);
  });

  test("the divider of the side panel moves with the arrow keys", async () => {
    await openSession();
    const sep = '[role="separator"][aria-label="Resize the side panel"]';
    const now = () => page.eval<number>(`+document.querySelector(${JSON.stringify(sep)}).getAttribute("aria-valuenow")`);
    const column = () => page.eval<number>(`parseFloat(getComputedStyle(document.querySelector(${JSON.stringify(sep)}).closest("aside").parentElement).gridTemplateColumns.split(" ").at(-1))`);
    await page.eval(`document.querySelector(${JSON.stringify(sep)}).focus()`);
    expect(await page.eval<boolean>(`document.activeElement.matches(${JSON.stringify(sep)})`)).toBe(true);
    const start = await now();
    await page.press("ArrowLeft");
    expect(await now()).toBe(start + 24);
    expect(await column()).toBe(start + 24);
    await page.press("ArrowRight");
    expect(await now()).toBe(start);
    await page.press("Home");
    expect(await now()).toBe(300);
    expect(await column()).toBe(300);
    await page.eval(`document.querySelector(${JSON.stringify(sep)}).dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))`);
    expect(await now()).toBe(480);
  });

  test("a menu or a dialog traps the focus, closes with Esc and gives the focus back", async () => {
    await openSession();
    await installAudit(page);
    const out: string[] = [];
    out.push(...(await trapCheck("mode menu", 'header button[aria-label^="Mode:"]', '[role="menu"]', () => pointerOpen('header button[aria-label^="Mode:"]'))));
    out.push(...(await trapCheck("model menu", 'header button[aria-label^="Model:"]', '[role="menu"]', () => pointerOpen('header button[aria-label^="Model:"]'))));
    out.push(...(await trapCheck("more menu", 'header button[aria-label="More"]', '[role="menu"]', () => pointerOpen('header button[aria-label="More"]'))));
    out.push(...(await trapCheck("folder dialog", "aside button.w-full", '[role="dialog"]', () => page.eval(`window.__opener.click()`))));
    const recent = "aside [data-rove]";
    out.push(...(await trapCheck("session menu", recent, '[role="menu"]', () => contextOpen(recent))));
    out.push(
      ...(await trapCheck("rename dialog", recent, '[role="dialog"]', async () => {
        await contextOpen(recent);
        await until(page, `document.querySelector('[role="menu"]')`);
        await wait(200);
        await page.eval(`[...document.querySelectorAll('[role="menuitem"]')].find((x) => x.textContent.includes("Rename")).click()`);
      })),
    );
    await page.eval(`(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 30;
      c.getContext("2d").fillRect(0, 0, 40, 30);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.id = "thumbtest";
      b.dataset.full = c.toDataURL();
      b.title = "small.png";
      b.innerHTML = '<img alt="small.png" width="40" height="30" src="' + c.toDataURL() + '">';
      document.querySelector('[role="log"]').appendChild(b);
    })()`);
    out.push(...(await trapCheck("image viewer", "#thumbtest", '[role="dialog"]', () => page.eval(`window.__opener.click()`))));
    await page.eval(`(() => { const ta = document.querySelector("#msg"); ta.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, "/"); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    expect(await until(page, `document.querySelector("#cmd-list")`)).toBe(true);
    await page.press("Escape");
    if (!(await until(page, `!document.querySelector("#cmd-list")`))) out.push("command list: Esc does not close it");
    if (!(await page.eval<boolean>(`document.activeElement === document.querySelector("#msg")`))) out.push("command list: the focus leaves the message box after Esc");
    expect(out).toEqual([]);
  }, LONG);

  test("the item that has the focus in a menu, a select and the command list shows a ring", async () => {
    await openSession();
    await installAudit(page);
    const out: string[] = [];
    const ring = (what: string) =>
      page.eval<string>(`(() => { const e = document.querySelector('[data-highlighted], [role="option"][aria-selected="true"]') ?? document.activeElement; const i = __a11y.focusInfo(e); const best = i.cands.length ? Math.max(...i.cands.map((c) => c.ratio)) : 0; return best >= 3 ? "" : ${JSON.stringify(what)} + ": weak ring " + best.toFixed(2) + " on " + __a11y.sel(e); })()`);
    for (const scheme of SCHEMES) {
      await setView(1280, scheme);
      for (const [name, sel] of [["mode menu", 'header button[aria-label^="Mode:"]'], ["more menu", 'header button[aria-label="More"]']] as const) {
        await pointerOpen(sel);
        expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
        await wait(200);
        await page.press("ArrowDown");
        out.push(await ring(`${name} ${scheme}`));
        await page.press("Escape");
        await wait(300);
      }
      await contextOpen("aside [data-rove]");
      expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
      await wait(200);
      await page.press("ArrowDown");
      out.push(await ring(`session menu ${scheme}`));
      await page.press("Escape");
      await wait(300);

      await page.eval(`(() => { const ta = document.querySelector("#msg"); ta.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, "/"); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
      expect(await until(page, `document.querySelector("#cmd-list")`)).toBe(true);
      out.push(await ring(`command list ${scheme}`));
      await page.press("Escape");
      await page.eval(`(() => { const ta = document.querySelector("#msg"); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, ""); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    }
    await goPage("Sessions");
    expect(await until(page, `document.querySelector('button[role="combobox"]')`)).toBe(true);
    for (const scheme of SCHEMES) {
      await setView(1280, scheme);
      await pointerOpen('button[role="combobox"]');
      expect(await until(page, `document.querySelector('[role="listbox"]')`)).toBe(true);
      await wait(200);
      await page.press("ArrowDown");
      out.push(await ring(`select ${scheme}`));
      await page.press("Escape");
      await wait(300);
    }
    expect(out.filter(Boolean)).toEqual([]);
  }, LONG);
});
