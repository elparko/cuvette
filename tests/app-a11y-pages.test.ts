import { describe, expect, test } from "vitest";

import { contrastFindings, focusOrder, installAudit, namesFindings, structureFindings, targetFindings } from "./a11y-audit.ts";
import { CHROME, type Page } from "./chrome.ts";

import { LONG, SCHEMES, WIDTHS, until, useApp, wait } from "./a11y-app.ts";

const a = useApp();
const page = new Proxy({} as Page, { get: (_, k) => (a.page as any)[k] });

describe.skipIf(!CHROME)("accessibility of the browser app: the start page, the analysis page and the setup page", () => {
  const { setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck } = a;
  test("the checks find a page with a known defect", async () => {
    await installAudit(page);
    await page.eval(`document.body.insertAdjacentHTML("beforeend", '<div id="bad" style="position:fixed;top:0;left:0;z-index:99;background:#fff"><p style="color:#bbb;font-size:14px">Pale text</p><button style="width:10px;height:10px;padding:0;border:0"></button><button style="width:10px;height:10px;padding:0;border:0;margin-left:2px">x</button><input style="border:1px solid #ddd"><h4>Skipped</h4><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div>')`);
    const found = [...(await contrastFindings(page)), ...(await namesFindings(page)), ...(await structureFindings(page)), ...(await targetFindings(page))];
    const text = found.map((f) => f.detail).join("\n");
    expect(text).toContain("text 1.");
    expect(text).toContain("no accessible name");
    expect(text).toContain("field edge");
    expect(text).toContain("image without alt");
    expect(text).toContain("another target is closer");
    await page.eval(`document.getElementById("bad").remove()`);
  });

  test("the start page and the folder dialog: contrast, names and headings", async () => {
    expect(await audit("start")).toEqual([]);
    await setView(1280, "light");
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.offsetParent && b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(300);
    expect(await audit("folder dialog")).toEqual([]);
    await page.press("Escape");
    await wait(300);
  }, LONG);

  test("the analysis page, the side panel tabs and the menus: contrast, names and headings", async () => {
    await openSession();
    const out = await audit("analysis");
    await post("api/send", { text: "Compare the groups" });
    expect(await until(page, `document.querySelector("[data-card] .opts .btn")`)).toBe(true);
    await wait(300);
    out.push(...(await audit("analysis question")));
    for (const tab of ["Analysis", "Results", "Record", "Decisions"]) {
      await setView(1280, "light");
      await page.eval(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent === ${JSON.stringify(tab)}).dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))`);
      await wait(400);
      out.push(...(await audit("tab " + tab)));
    }
    for (const [name, sel] of [["mode menu", 'header button[aria-label^="Mode:"]'], ["model menu", 'header button[aria-label^="Model:"]'], ["more menu", 'header button[aria-label="More"]']] as const) {
      await setView(1280, "light");
      await pointerOpen(sel);
      expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
      await wait(200);
      out.push(...(await audit(name)));
      await page.press("Escape");
      await wait(300);
    }
    expect(out).toEqual([]);
  }, LONG);

  test("a new agent message, a card and an error are announced without a change of focus", async () => {
    await openSession(freshFolder());
    await installAudit(page);
    const regions = await page.eval<string[]>(`[...document.querySelectorAll("[role=log], [role=status], [role=alert], [aria-live]")].map((e) => (e.getAttribute("role") ?? "") + "/" + (e.getAttribute("aria-live") ?? ""))`);
    expect(regions).toContain("log/");
    expect(regions).toContain("status/");
    const typeText = (text: string) => page.eval(`(() => { const ta = document.querySelector("#msg"); ta.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, ${JSON.stringify(text)}); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await page.eval(`(() => {
      window.__added = [];
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) window.__added.push({ name: n.nodeType === 1 ? (n.dataset?.type ? "card " + n.dataset.type : String(n.className)) : "text", log: !!(n.parentElement ?? n.parentNode)?.closest?.("[role=log]"), off: (n.parentElement ?? n.parentNode)?.closest?.("[aria-live]")?.getAttribute("aria-live") === "off" }); }).observe(document.querySelector('[role="log"]'), { childList: true, subtree: true });
    })()`);
    await typeText("x");
    await post("api/send", { text: "Compare the groups" });
    expect(await until(page, `document.querySelector('[data-card][data-type="question"]')`)).toBe(true);
    await wait(300);
    const added = await page.eval<{ name: string; log: boolean; off: boolean }[]>(`window.__added`);
    const card = added.filter((a) => a.name === "card question");
    expect(card.length).toBe(1);
    expect(card.every((a) => a.log && !a.off)).toBe(true);
    expect(added.filter((a) => a.name === "card setup" || a.name.startsWith("card ")).length).toBe(1);
    expect(await page.eval<boolean>(`document.activeElement === document.querySelector("#msg")`)).toBe(true);

    await page.eval(`(() => {
      const real = window.fetch;
      window.fetch = (u, o) => String(u).includes("api/send") ? Promise.resolve(new Response(JSON.stringify({ error: "The agent could not start." }), { status: 500, headers: { "content-type": "application/json" } })) : real(u, o);
    })()`);
    await typeText("A message that fails");
    await page.press("Enter");
    expect(await until(page, `document.querySelector("[data-sonner-toast]")`)).toBe(true);
    const toast = await page.eval<{ live: string; focus: boolean }>(`(() => { const t = document.querySelector("[data-sonner-toast]"); return { live: t.closest("[aria-live]")?.getAttribute("aria-live") ?? "none", focus: document.activeElement === document.querySelector("#msg") }; })()`);
    expect(toast).toEqual({ live: "polite", focus: true });
  }, LONG);

  test("the setup page and the collapsed sidebar: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    await page.eval(`document.querySelector('aside button[aria-label="Hide the sidebar"]').click()`);
    expect(await until(page, `document.querySelector('aside button[aria-label="Show the sidebar"]')`)).toBe(true);
    out.push(...(await audit("collapsed sidebar")));
    await setView(1280, "light");
    await page.eval(`document.querySelector('aside button[aria-label="Show the sidebar"]').click()`);
    await page.go(a.url + "&page=setup");
    expect(await until(page, `[...document.querySelectorAll("h1")].some((h) => h.textContent.includes("Welcome"))`)).toBe(true);
    await wait(500);
    out.push(...(await audit("setup page")));
    expect(out).toEqual([]);
  }, LONG);

  test("the start page with recent sessions: contrast, names, headings and Tab order", async () => {
    a.proc.kill();
    await wait(800);
    ({ proc: a.proc, url: a.url } = await a.startApp());
    a.token = new URL(a.url).searchParams.get("t")!;
    await page.go(a.url);
    expect(await until(page, `[...document.querySelectorAll("h2")].some((h) => h.textContent.includes("Recent sessions"))`)).toBe(true);
    await wait(500);
    const out = await audit("start with recent sessions");
    for (const scheme of SCHEMES)
      for (const width of WIDTHS) {
        await setView(width, scheme);
        out.push(...orderProblems(`start ${scheme} ${width}`, await focusOrder(page, 100), scheme === "light"));
      }
    expect(out).toEqual([]);
  }, LONG);
});
