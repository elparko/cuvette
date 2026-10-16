import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect } from "vitest";
import { ensureUiBuild } from "./ui-dist.ts";
import { CARD_FIXTURES } from "./a11y-cards.ts";
import { focusOrder, type Finding, contrastFindings, namesFindings, structureFindings } from "./a11y-audit.ts";
import { CHROME, openChrome, type Page } from "./chrome.ts";

const ROOT = join(__dirname, "..");
export const until = (page: Page, cond: string) => page.eval(`(async () => { for (let i = 0; i < 1200 && !(${cond}); i++) await new Promise((r) => setTimeout(r, 100)); return !!(${cond}); })()`);
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const WIDTHS = [1280, 768, 390] as const;
export const SCHEMES = ["light", "dark"] as const;
export const LONG = 900000;

export function useApp() {
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
    if (!CHROME) return;
    ensureUiBuild();
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
    if (!CHROME) return;
    await page?.close();
    if (proc && proc.exitCode === null) {
      const gone = new Promise((done) => proc.once("exit", done));
      proc.kill();
      await Promise.race([gone, wait(10000)]);
    }
    await wait(500);
    for (const d of dirs) rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  });

  return {
    get page() { return page; },
    get url() { return url; },
    set url(v: string) { url = v; },
    get token() { return token; },
    set token(v: string) { token = v; },
    get proc() { return proc; },
    set proc(v: ChildProcess) { proc = v; },
    startApp, setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck,
  };
}
