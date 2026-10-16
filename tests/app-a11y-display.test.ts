import { describe, expect, test } from "vitest";
import { CARD_CTX, CARD_FIXTURES } from "./a11y-cards.ts";
import { focusOrder, installAudit, layoutFindings, motionFindings, targetFindings } from "./a11y-audit.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";
import { cardHtml } from "../src/server/app-html.ts";
import { LONG, SCHEMES, WIDTHS, until, useApp, wait } from "./a11y-app.ts";

const a = useApp();
const page = new Proxy({} as Page, { get: (_, k) => (a.page as any)[k] });

describe.skipIf(!CHROME)("accessibility of the browser app: the display settings and the live regions", () => {
  const { setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck } = a;
  test("with reduced motion the animations and the smooth scroll stop", async () => {
    await openSession();
    await setView(1280, "light");
    await page.media([{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }]);
    const insert = `document.querySelector('[role="log"]').insertAdjacentHTML("beforeend", '<span id="mo" class="pulse-dot"></span><span class="caret working"></span><div class="runbar"></div><svg class="animate-spin" width="10" height="10"></svg>')`;
    const remove = `document.querySelectorAll("#mo, .pulse-dot, .caret, .runbar, svg.animate-spin").forEach((e) => e.remove())`;
    await page.eval(insert);
    await wait(200);
    expect((await motionFindings(page)).length).toBeGreaterThan(0);
    await page.eval(remove);
    await page.media([{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }]);
    await page.eval(insert);
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.offsetParent && b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(500);
    expect(await motionFindings(page)).toEqual([]);
    await page.press("Escape");
    for (const name of ["Sessions", "Programs", "Settings", "Analysis"]) {
      await goPage(name);
      await wait(300);
      expect(await motionFindings(page)).toEqual([]);
    }
  }, LONG);

  test("with forced colors the focus ring, the text and the controls stay visible", async () => {
    await openSession();
    await setView(1280, "light", [{ name: "forced-colors", value: "active" }]);
    expect(await page.eval<boolean>(`matchMedia("(forced-colors: active)").matches`)).toBe(true);
    const out: string[] = [];
    for (const name of ["Analysis", "Sessions", "Settings"]) {
      await goPage(name);
      if (name === "Analysis") await showCards(numbered(["question", "permission", "setup"]));
      const r = await focusOrder(page, 200);
      expect(r.seq.length).toBeGreaterThan(5);
      for (const s of r.seq) if (!s.ring.includes("outline")) out.push(`${name}: no outline on ${s.sel} [${s.ring}]`);
      out.push(...(await page.eval<string[]>(`[...document.querySelectorAll("button, a[href], input, select, textarea, h1, h2, h3")].filter((e) => e.checkVisibility({ checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 1).filter((e) => { const cs = getComputedStyle(e); const fg = __a11y.rgba(cs.color); const bg = __a11y.backdrop(e).bg; return __a11y.ratio(__a11y.mix(fg, fg[3], bg), bg) < 3; }).map((e) => ${JSON.stringify(name)} + ": hard to see in forced colors: " + __a11y.sel(e))`)));
    }
    expect(out).toEqual([]);
  }, LONG);

  test("at 200% zoom and at 320 px, no text is cut off and no control covers another", async () => {
    await openSession();
    const out: string[] = [];
    const states: [string, () => Promise<void>][] = [
      ["analysis", async () => await goPage("Analysis")],
      ["cards", async () => { await goPage("Analysis"); await showCards(numbered([])); }],
      ["sessions", async () => await goPage("Sessions")],
      ["programs", programsPage],
      ["settings", async () => { await goPage("Settings"); await wait(400); }],
    ];
    for (const width of [640, 384, 320]) {
      await page.size(width, 800);
      for (const [name, go] of states) {
        await go();
        await wait(200);
        for (const f of await layoutFindings(page)) if (!/\(ellipsis\) \(has a title\)/.test(f.detail)) out.push(`${name} ${width}: ${f.where}: ${f.detail}`);
      }
    }
    expect([...new Set(out)]).toEqual([]);
  }, LONG);

  test("a command of 100 KB in the permission card scrolls inside the card, and all of its text is in the page", async () => {
    await openSession();
    const tail = "END-OF-COMMAND";
    const argv = ["sh", "-c", `${"abcdefghij".repeat(10_000)}${tail}`];
    const html = cardHtml(CARD_CTX, { id: 1, card: { t: "permission", rid: "r9", tool: "run_command", args: { purpose: "Run", does: "Runs it.", argv }, touches: "Runs on this computer." } });
    for (const width of [1280, 320]) {
      await page.size(width, 800);
      await goPage("Analysis");
      await showCards(html);
      const r = await page.eval<{ full: boolean; client: number; scroll: number; page: number; focusable: boolean }>(`(() => { const li = document.querySelector("li.command"); return { full: li.textContent.includes(${JSON.stringify(tail)}) && li.textContent.length > 100000, client: li.clientHeight, scroll: li.scrollHeight, page: document.documentElement.scrollWidth, focusable: li.tabIndex === 0 }; })()`);
      expect(r.full).toBe(true);
      expect(r.client).toBeLessThanOrEqual(260);
      expect(r.scroll).toBeGreaterThan(r.client);
      expect(r.page).toBeLessThanOrEqual(width);
      expect(r.focusable).toBe(true);
    }
  }, LONG);

  test("with the wide text spacing of WCAG 1.4.12, no text is cut off and no control covers another", async () => {
    await openSession();
    const out: string[] = [];
    const states: [string, () => Promise<void>][] = [
      ["analysis", async () => await goPage("Analysis")],
      ["cards", async () => { await goPage("Analysis"); await showCards(numbered([])); }],
      ["sessions", async () => await goPage("Sessions")],
      ["programs", programsPage],
      ["settings", async () => await goPage("Settings")],
    ];
    await page.eval(`(() => { const s = document.createElement("style"); s.id = "wide-spacing"; s.textContent = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }"; document.head.append(s); })()`);
    try {
      for (const width of WIDTHS) {
        await setView(width, "light");
        for (const [name, go] of states) {
          await go();
          await wait(250);
          for (const f of await layoutFindings(page)) if (!/\(ellipsis\) \(has a title\)/.test(f.detail)) out.push(`${name} ${width}: ${f.where}: ${f.detail}`);
        }
      }
    } finally {
      await page.eval(`document.getElementById("wide-spacing").remove()`);
    }
    expect([...new Set(out)]).toEqual([]);
  }, LONG);

  test("with a browser minimum font size of 20 px, no text is cut off and no control covers another", async () => {
    await openSession();
    const big = await openChrome(["--blink-settings=minimumFontSize=20"]);
    const out: string[] = [];
    try {
      await big.size(1280, 900);
      await big.go(a.url);
      expect(await until(big, `document.querySelector("#msg")`)).toBe(true);
      await installAudit(big);
      const smallest = await big.eval<number>(`Math.min(...[...document.querySelectorAll("button, span, div, p")].filter((e) => e.offsetParent && [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())).map((e) => parseFloat(getComputedStyle(e).fontSize)))`);
      expect(smallest).toBeGreaterThanOrEqual(20);
      for (const width of [1280, 768, 390, 320]) {
        await big.size(width, 844);
        for (const name of ["Analysis", "Sessions", "Programs", "Settings"]) {
          await big.eval(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Pages"] button')].find((x) => x.offsetParent && (x.getAttribute("aria-label") || x.textContent) === ${JSON.stringify(name)}); b.click(); })()`);
          await wait(500);
          for (const f of await layoutFindings(big)) if (!/\(ellipsis\) \(has a title\)/.test(f.detail)) out.push(`${name} ${width}: ${f.where}: ${f.detail}`);
        }
      }
    } finally {
      await big.close();
    }
    expect([...new Set(out)]).toEqual([]);
  }, LONG);

  test("at 390 px every touch target is 24 px or has room around it", async () => {
    await openSession();
    const out: string[] = [];
    await page.size(390, 844);
    for (const name of ["Analysis", "Sessions", "Programs", "Settings"]) {
      await goPage(name);
      await wait(400);
      if (name === "Analysis") await showCards(numbered([]));
      for (const f of await targetFindings(page)) out.push(`${name}: ${f.where}: ${f.detail}`);
    }
    expect([...new Set(out)]).toEqual([]);
  }, LONG);

  test("the arrow keys on the divider do not move the selection of an open card", async () => {
    await openSession(freshFolder());
    expect(await until(page, `document.querySelector('[data-type="setup"]')`)).toBe(true);
    const html = CARD_FIXTURES.find((c) => c.name === "question")!.html;
    await showCards(html);
    expect(await until(page, `document.querySelector("[data-card]").dataset.sel !== undefined`)).toBe(true);
    const sep = '[role="separator"][aria-label="Resize the side panel"]';
    const now = () => page.eval<number>(`+document.querySelector(${JSON.stringify(sep)}).getAttribute("aria-valuenow")`);
    const sel = await page.eval<string>(`document.querySelector("[data-card]").dataset.sel`);
    await page.eval(`window.__acts = []; const real = window.fetch; window.fetch = (u, o) => (String(u).includes("api/act") && window.__acts.push(String(o?.body)), real(u, o)); document.querySelector(${JSON.stringify(sep)}).focus()`);
    const start = await now();
    await page.press("ArrowLeft");
    expect(await now()).toBe(start + 24);
    await page.press("ArrowRight");
    expect(await now()).toBe(start);
    expect(await page.eval<string>(`document.querySelector("[data-card]").dataset.sel`)).toBe(sel);
    expect(await page.eval<string[]>(`window.__acts`)).toEqual([]);
    expect(await page.eval<boolean>(`document.activeElement.matches(${JSON.stringify(sep)})`)).toBe(true);
  });

  test("a streamed reply sits in a region that is off for the screen reader, and the finished message goes in the log", async () => {
    await openSession(freshFolder());
    const send = sendStream;
    await page.eval(`(() => {
      window.__live = [];
      new MutationObserver((ms) => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (t?.closest(".msg.agent") && !t.closest(".item")) window.__live.push(t.closest("[aria-live]")?.getAttribute("aria-live") ?? "none"); } }).observe(document.querySelector('[role="log"]'), { childList: true, subtree: true, characterData: true });
    })()`);
    for (const word of ["The", " groups", " differ", " in", " size."]) {
      await send({ t: "live", text: word });
      await frames();
    }
    expect(await until(page, `document.querySelector(".msg.agent[aria-live=off]")?.textContent.includes("size.")`)).toBe(true);
    const marks = await page.eval<string[]>(`window.__live`);
    expect(marks.length).toBeGreaterThan(0);
    expect([...new Set(marks)]).toEqual(["off"]);
    await send({ t: "live", reset: true });
    await send({ t: "append", html: '<div class="msg agent"><p>The groups differ in size.</p></div>' });
    expect(await until(page, `document.querySelector('[role="log"] .item .msg.agent')?.textContent.includes("size.")`)).toBe(true);

    await send({ t: "status", state: "busy", text: "Running step 2", since: Date.now() - 3000 });
    expect(await until(page, `document.querySelector('[role="status"]')?.textContent.startsWith("Running step 2")`)).toBe(true);
    await page.eval(`(() => {
      window.__status = [];
      new MutationObserver((ms) => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (!t.closest("[aria-hidden=true]")) window.__status.push(t.textContent); } }).observe(document.querySelector('[role="status"]'), { childList: true, subtree: true, characterData: true });
      window.__think = [];
      new MutationObserver((ms) => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (t.closest("div.border-dashed")) window.__think.push(t.closest("[aria-live]")?.getAttribute("aria-live") ?? "none"); } }).observe(document.querySelector('[role="log"]'), { childList: true, subtree: true, characterData: true });
    })()`);
    for (const word of ["Let me", " look at", " the groups."]) {
      await send({ t: "think", text: word });
      await frames();
    }
    expect(await until(page, `document.querySelector("div.border-dashed")?.textContent.includes("groups.")`)).toBe(true);
    expect(await until(page, `document.querySelector("div.border-dashed button").textContent.includes("· 2s")`)).toBe(true);
    expect(await page.eval<string[]>(`window.__status`)).toEqual([]);
    const thought = await page.eval<string[]>(`window.__think`);
    expect(thought.length).toBeGreaterThan(0);
    expect([...new Set(thought)]).toEqual(["off"]);
  }, LONG);

  test("a page that cannot load shows its error as an alert", async () => {
    await openSession();
    await page.eval(`(() => {
      const real = window.fetch;
      window.fetch = (u, o) => /api\\/(programs|settings)\\.json/.test(String(u)) ? Promise.resolve(new Response(JSON.stringify({ error: "The list is not ready." }), { status: 500, headers: { "content-type": "application/json" } })) : real(u, o);
    })()`);
    for (const name of ["Programs", "Settings"]) {
      await goPage(name);
      expect(await until(page, `[...document.querySelectorAll('main [role="alert"]')].some((e) => e.textContent.includes("not ready"))`)).toBe(true);
    }
  });
});
