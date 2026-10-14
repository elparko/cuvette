import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { UI_DIST } from "../src/server/app.ts";
import { CARD_FIXTURES, ITEM_FIXTURES, ITEM_LIVE_FIXTURE, STATUS_FIXTURE } from "./a11y-cards.ts";
import { contrastFindings, focusOrder, installAudit, layoutFindings, motionFindings, namesFindings, structureFindings, targetFindings, type Finding } from "./a11y-audit.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 300 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WIDTHS = [1280, 768, 390] as const;
const SCHEMES = ["light", "dark"] as const;
const LONG = 900000;

describe.skipIf(!CHROME)("accessibility of the browser app in headless Chrome", () => {
  let proc: ChildProcess;
  let url = "";
  let token = "";
  let page: Page;
  let data = "";
  let home = "";
  const dirs: string[] = [];

  const startApp = async () => {
    const project = join(home, "project");
    mkdirSync(project, { recursive: true });
    const env = { ...process.env, CUVETTE_HOME: home, CUVETTE_SPEND_FILE: join(home, "spend.jsonl"), CUVETTE_NO_OPEN: "1", HOME: home };
    const child = spawn(process.execPath, [join(ROOT, "bin", "cuvette.js"), "app", "--no-open", "--model", "fake:" + join(home, "fake.json")], { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });
    const where = await new Promise<string>((done, fail) => {
      let out = "";
      child.stdout!.on("data", (b) => {
        out += b;
        const m = /Cuvette app: (\S+)/.exec(out);
        if (m) done(m[1]!);
      });
      child.on("exit", (code) => fail(new Error(`cuvette app stopped: ${code}`)));
    });
    return { proc: child, url: where };
  };

  const setView = async (width: number, scheme: (typeof SCHEMES)[number], extra: { name: string; value: string }[] = []) => {
    await page.size(width, width < 600 ? 844 : 900);
    await page.media([{ name: "prefers-color-scheme", value: scheme }, ...extra]);
    await page.eval(`(() => { if (document.getElementById("no-transition")) return; const s = document.createElement("style"); s.id = "no-transition"; s.textContent = "*, *::before, *::after { transition: none !important; } .srv .item { content-visibility: visible !important; }"; document.head.append(s); })()`);
    await frames();
  };
  const frames = () => page.eval(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  const post = (path: string, body: object) => page.eval(`fetch("${path}?t=${token}", { method: "POST", headers: { "content-type": "application/json", "x-token": "${token}" }, body: JSON.stringify(${JSON.stringify(body)}) }).then((r) => r.status)`);
  const freshFolder = () => {
    const d = mkdtempSync(join(tmpdir(), "cuvette-data-"));
    dirs.push(d);
    writeFileSync(join(d, "a.csv"), "x,y\n1,2\n3,4\n");
    return d;
  };
  const openSession = async (folder = data) => {
    await post("api/open", { folder });
    await page.go(url);
    expect(await until(page, `document.querySelector("#msg")`)).toBe(true);
    await setView(1280, "light");
  };
  const goPage = async (name: string) => {
    await page.eval(`(() => { const b = [...document.querySelectorAll('nav[aria-label="Pages"] button')].find((x) => x.offsetParent && (x.getAttribute("aria-label") || x.textContent) === ${JSON.stringify(name)}); b.click(); })()`);
    expect(await until(page, `[...document.querySelectorAll('nav[aria-label="Pages"] button')].some((x) => x.offsetParent && (x.getAttribute("aria-label") || x.textContent) === ${JSON.stringify(name)} && x.getAttribute("aria-current") === "page")`)).toBe(true);
    await frames();
  };
  const programsPage = async () => {
    await goPage("Programs");
    expect(await until(page, `document.querySelector("[data-prog]") && !document.querySelector("main .animate-spin")`)).toBe(true);
    await frames();
  };
  const sendStream = (m: object) => page.eval(`window.__sources.at(-1).onmessage(new MessageEvent("message", { data: ${JSON.stringify(JSON.stringify(m))} }))`);
  const showCards = async (html: string) => {
    await sendStream({ t: "cards", html });
    const first = /data-type="(\w+)"/.exec(html)?.[1];
    expect(await until(page, `document.querySelector('[role="log"]').lastElementChild.children.length === ${(html.match(/<section class="card/g) ?? []).length}${first ? ` && document.querySelector('[data-type="${first}"]')` : ""}`)).toBe(true);
  };
  const numbered = (names: string[]) => CARD_FIXTURES.filter((c) => !names.length || names.includes(c.name)).map((c, i) => c.html.replace('data-card="1"', `data-card="${i + 1}"`)).join("");

  const everywhere = async (label: string, run: () => Promise<Finding[]>) => {
    const all: string[] = [];
    for (const scheme of SCHEMES)
      for (const width of WIDTHS) {
        await setView(width, scheme);
        for (const f of await run()) all.push(`${label} ${scheme} ${width}: ${f.where}: ${f.detail}`);
      }
    return [...new Set(all)];
  };
  const audit = (label: string) => everywhere(label, async () => [...(await contrastFindings(page)), ...(await namesFindings(page)), ...(await structureFindings(page))]);

  const orderProblems = (label: string, r: Awaited<ReturnType<typeof focusOrder>>, order = true) => {
    const out: string[] = [];
    if (r.seq.length >= 400) out.push(`${label}: Tab did not come back to the first stop after 400 keys`);
    for (const [i, s] of r.seq.entries()) {
      if (s.ratio < 3) out.push(`${label}: weak focus ring ${s.ratio.toFixed(2)} on ${s.sel} [${s.ring}]`);
      const p = r.seq[i - 1];
      if (order && p && p.region === s.region && s.top < p.top - 6 && s.left <= p.left + 6) out.push(`${label}: Tab goes up from ${p.sel} to ${s.sel}`);
    }
    for (const m of r.missed) out.push(`${label}: Tab does not reach ${m}`);
    return out;
  };

  const pointerOpen = (sel: string) => page.eval(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" }))`);
  const contextOpen = (sel: string) => page.eval(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 50, clientY: 300 }))`);
  const trapCheck = async (name: string, opener: string, box: string, open: () => Promise<unknown>) => {
    const out: string[] = [];
    await page.eval(`(() => { const o = document.querySelector(${JSON.stringify(opener)}); o.focus(); window.__opener = o; })()`);
    if (!(await page.eval<boolean>(`document.activeElement === window.__opener`))) return [`${name}: the opener does not take the focus`];
    await open();
    if (!(await until(page, `document.querySelector(${JSON.stringify(box)})`))) return [`${name}: did not open`];
    await until(page, `document.activeElement?.closest(${JSON.stringify(box)})`);
    const inside = () => page.eval<boolean>(`!!document.activeElement && !!document.activeElement.closest(${JSON.stringify(box)})`);
    if (!(await inside())) out.push(`${name}: the focus is not inside after the box opens`);
    for (let i = 0; i < 14; i++) {
      await page.press("Tab", i % 4 === 3);
      if (!(await inside())) {
        out.push(`${name}: the focus leaves the box after ${i + 1} ${i % 4 === 3 ? "Shift+" : ""}Tab keys`);
        break;
      }
    }
    await page.press("Escape");
    if (!(await until(page, `!document.querySelector(${JSON.stringify(box)})`))) out.push(`${name}: Esc does not close the box`);
    else if (!(await until(page, `document.activeElement === window.__opener`))) out.push(`${name}: the focus does not return to the opener (it is on ${await page.eval<string>(`__a11y.sel(document.activeElement)`)})`);
    return out;
  };

  beforeAll(async () => {
    if (!existsSync(join(UI_DIST, "index.html"))) execFileSync("npx", ["vite", "build", "--config", "src/ui-web/vite.config.ts", "--logLevel", "warn"], { cwd: ROOT, stdio: "ignore" });
    home = mkdtempSync(join(tmpdir(), "cuvette-home-"));
    data = mkdtempSync(join(tmpdir(), "cuvette-data-"));
    dirs.push(home, data);
    writeFileSync(join(data, "a.csv"), "x,y\n1,2\n3,4\n");
    const script = join(home, "fake.json");
    const ask = (question: string) => ({ calls: [{ name: "ask_scientist", args: { question, options: ["t test", "Wilcoxon"] } }] });
    writeFileSync(script, JSON.stringify([ask("Which test?"), { text: "Done." }, { text: "A second note." }, { text: "A third note." }]));
    ({ proc, url } = await startApp());
    token = new URL(url).searchParams.get("t")!;
    page = await openChrome();
    await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `window.__sources = []; const E = window.EventSource; window.EventSource = class extends E { constructor(...a) { super(...a); window.__sources.push(this); } };` });
    await page.size(1280, 900);
    await page.go(url);
    expect(await until(page, `document.querySelector("main")`)).toBe(true);
  }, 90000);
  afterAll(async () => {
    await page?.close();
    proc?.kill();
    await wait(500);
    for (const d of dirs) rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });

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

  test("each card type: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const c of CARD_FIXTURES) {
      await showCards(c.html);
      out.push(...(await audit("card " + c.name)));
    }
    expect(out).toEqual([]);
  }, LONG);

  test("the sessions, programs and settings pages: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const name of ["Sessions", "Programs", "Settings"]) {
      await setView(1280, "light");
      if (name === "Programs") await programsPage();
      else await goPage(name);
      await wait(300);
      out.push(...(await audit("page " + name)));
    }
    const sections = await page.eval<string[]>(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].map((b) => b.textContent)`);
    expect(sections.length).toBeGreaterThan(3);
    for (const sec of sections) {
      await setView(1280, "light");
      await page.eval(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === ${JSON.stringify(sec)}).click()`);
      await wait(300);
      out.push(...(await audit("settings " + sec)));
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

  test("the dialogs, the tooltip, the toast and the command list: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    const recent = "aside [data-rove]";
    const closeDialog = async () => {
      await page.press("Escape");
      expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    };
    await contextOpen(recent);
    expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
    out.push(...(await audit("session menu")));
    await page.eval(`[...document.querySelectorAll('[role="menuitem"]')].find((x) => x.textContent.includes("Rename")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(300);
    out.push(...(await audit("rename dialog")));
    await closeDialog();

    await page.eval(`(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 30;
      c.getContext("2d").fillRect(0, 0, 40, 30);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.dataset.full = c.toDataURL();
      b.title = "small.png";
      b.innerHTML = '<img alt="small.png" width="40" height="30" src="' + c.toDataURL() + '">';
      document.querySelector('[role="log"]').appendChild(b);
      b.click();
    })()`);
    expect(await until(page, `document.querySelector('[role="dialog"] img')?.naturalWidth > 0`)).toBe(true);
    await wait(300);
    out.push(...(await audit("image viewer")));
    await closeDialog();

    await setView(1280, "light");
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.offsetParent && b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await closeDialog();

    await programsPage();
    await page.eval(`[...document.querySelectorAll("main button")].find((b) => b.textContent.includes("Add an adapter")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(300);
    out.push(...(await audit("add an adapter dialog")));
    await closeDialog();
    await goPage("Analysis");

    await setView(1280, "light");
    await page.eval(`document.querySelector('aside button[aria-label="Hide the sidebar"]').focus()`);
    expect(await until(page, `document.querySelector('[role="tooltip"]')`)).toBe(true);
    out.push(...(await audit("tooltip")));
    await page.eval(`document.activeElement.blur()`);

    await page.eval(`window.toast("A notice for the scientist")`);
    expect(await until(page, `document.querySelector("[data-sonner-toast]")`)).toBe(true);
    out.push(...(await audit("toast")));

    await page.eval(`(() => { const ta = document.querySelector("#msg"); ta.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, "/"); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    expect(await until(page, `document.querySelector("#cmd-list")`)).toBe(true);
    out.push(...(await audit("command list")));
    expect(out).toEqual([]);
  }, LONG);

  test("the setup page and the collapsed sidebar: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    await page.eval(`document.querySelector('aside button[aria-label="Hide the sidebar"]').click()`);
    expect(await until(page, `document.querySelector('aside button[aria-label="Show the sidebar"]')`)).toBe(true);
    out.push(...(await audit("collapsed sidebar")));
    await setView(1280, "light");
    await page.eval(`document.querySelector('aside button[aria-label="Show the sidebar"]').click()`);
    await page.go(url + "&page=setup");
    expect(await until(page, `[...document.querySelectorAll("h1")].some((h) => h.textContent.includes("Welcome"))`)).toBe(true);
    await wait(500);
    out.push(...(await audit("setup page")));
    expect(out).toEqual([]);
  }, LONG);

  test("the step graph and the panel page: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const path of ["graph/", "graph/panel"]) {
      const u = new URL(path, url);
      u.searchParams.set("t", token);
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

  test("with reduced motion the animations and the smooth scroll stop", async () => {
    await openSession();
    await setView(1280, "light");
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
      await big.go(url);
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

  test("the start page with recent sessions: contrast, names, headings and Tab order", async () => {
    proc.kill();
    await wait(800);
    ({ proc, url } = await startApp());
    token = new URL(url).searchParams.get("t")!;
    await page.go(url);
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
});
