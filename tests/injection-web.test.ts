import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import { cardHtml, decisionsHtml, doctorHtml, fileLink, programsHtml, imageHtml, resultsHtml, runHtml, sessionsHtml, sheetHtml, statusHtml, type Ctx, type Slot } from "../src/server/app-html.ts";
import { planInit, type Card } from "../src/ui/cards.ts";
import { sessionsJson } from "../src/server/app-json.ts";
import { WebView } from "../src/server/app-view.ts";
import { FakeSession } from "../src/ui/fake-session.ts";
import { folderChoices } from "../src/ui-web/lib/folders.ts";

const BIDI = /[\u202a-\u202e\u2066-\u2069]/;
import type { Item } from "../src/ui/items.ts";
import type { Question } from "../src/core/types.ts";

const BENIGN = "plain [ok](https://example.com/a) text [again](https://example.com/b) more";
const EVIL = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(2)>`,
  `"><svg onload=alert(3)>`,
  `' onmouseover='alert(4)`,
  `</div><iframe src="http://127.0.0.1:1/steal"></iframe>`,
  `[click](javascript:alert(5)) [ok](https://example.com/a?x=1&y="2") ![pic](http://127.0.0.1:1/steal?d=1)`,
  `<a href="javascript:alert(6)">go</a>`,
  `</textarea></pre><style>body{display:none}</style>`,
].join(" ");

const question = (EVIL: string): Question => ({
  qid: "q1",
  session: "s1",
  decisionKey: "test",
  title: EVIL,
  text: EVIL,
  options: [{ label: EVIL, value: EVIL }],
  recommendation: { value: EVIL, reason: EVIL },
  evidence: EVIL,
  status: "open",
  created: "2026-01-01T00:00:00Z",
});

const ctxFor = (t: string) => ({ token: "tok", session: { decisions: { fields: () => [] }, questions: { open: () => [question(t)] }, adapterInfo: [{ title: t }], adapters: [], record: { entries: () => [], live: () => [], nodes: () => [], rewound: () => new Set(), setAside: () => false, comparisons: () => [], stale: () => new Set(), citations: () => [] } } }) as unknown as Ctx;

const slot = (card: Card, plan?: Partial<ReturnType<typeof planInit>>): Slot => {
  const s: Slot = { id: 1, card };
  if (card.t === "plan") s.plan = { ...planInit(card), ...plan };
  return s;
};

const planFor = (EVIL: string) => ({ t: "plan", stage: "plan", version: 1, text: `1. ${EVIL}\n2. [1] ${EVIL}`, update: false, qids: [], programs: [{ part: EVIL, adapter: "imagej", alternatives: [EVIL] }], mode: "watch", restatement: EVIL, definitions: [{ measure: EVIL, definition: EVIL }], pilot: EVIL }) as unknown as Card;

const cardsFor = (EVIL: string): [string, Card][] => [
  ["question", { t: "question", q: question(EVIL) }],
  ["permission", { t: "permission", rid: "r1", tool: EVIL, args: { purpose: EVIL, does: EVIL, path: EVIL, code: EVIL }, code: EVIL, touches: EVIL }],
  ["search permission", { t: "permission", rid: "r1", tool: "run_script", args: { purpose: EVIL }, touches: EVIL, search: { root: EVIL, purpose: EVIL } }],
  ["instruction", { t: "instruction", step: 1, tool: EVIL, text: EVIL }],
  ["findings", { t: "findings", list: [{ fid: EVIL, source: "rule", status: "open", severity: "warning", check: EVIL, message: EVIL, nodes: [EVIL] } as never] }],
  ["key", { t: "key", reason: EVIL }],
  ["plan", planFor(EVIL)],
  ["clarify", { t: "clarify", found: EVIL, qids: ["q1"], skipped: [EVIL], check: EVIL, notes: [EVIL] }],
  ["phi", { t: "phi", rid: "r2", model: EVIL, hits: [{ kind: "name", label: EVIL, masked: EVIL, where: EVIL }], more: 0 }],
  ["phi local", { t: "phi", rid: "r3", model: EVIL, hits: [{ kind: "name", label: EVIL, masked: EVIL, where: EVIL }], more: 2, local: EVIL }],
  ["setup", { t: "setup", profiles: [{ name: EVIL, version: 1 }], proposed: { alpha: EVIL }, proposedFrom: EVIL }],
  ["rewind", { t: "rewind", points: [{ n: 1, kind: "message", entry: 1, upTo: 2, label: EVIL, ts: "2026-01-01T10:00:00Z" }] }],
  ["programs", { t: "programs", name: EVIL }],
  ["eln", { t: "eln" }],
];

const step = (EVIL: string, extra: Partial<Extract<Item, { t: "step" }>> = {}): Item => ({ key: "s1", t: "step", n: 1, ok: false, tool: EVIL, summary: EVIL, error: EVIL, route: EVIL, settings: EVIL, outputs: [{ n: 1, path: `/tmp/${EVIL.replace(/\//g, "-")}.png`, kind: "image" }, { n: 2, path: `/tmp/${EVIL.replace(/\//g, "-")}.csv`, kind: "file" }], purpose: EVIL, code: EVIL, why: EVIL, ...extra });

const itemsFor = (EVIL: string): Item[] => [
  { key: "u", t: "user", text: EVIL },
  { key: "a", t: "assistant", text: EVIL },
  { key: "a2", t: "assistant", text: `## ${EVIL}\n\n- ${EVIL}\n\n| ${EVIL} | B |\n|---|---|\n| ${EVIL} | 2 |\n\n\`\`\`\n${EVIL}\n\`\`\`\n\n> ${EVIL}` },
  step(EVIL),
  step(EVIL, { ok: true, error: undefined }),
  { key: "l", t: "line", sym: EVIL, color: "red", text: EVIL, change: EVIL },
  { key: "b", t: "block", title: EVIL, text: EVIL },
];

const TAG = /<([a-z][a-z0-9]*)((?:\s+[a-z_:@-][\w:.@-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/gi;
const NAME = /\s+([a-z_:@-][\w:.@-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?/gi;
const BAD_URL = /\s(?:href|src|action|formaction|xlink:href|srcdoc)\s*=\s*["']?\s*(?:javascript|data|vbscript):/i;

function shape(html: string): string[] {
  return [...html.matchAll(TAG)].map((m) => `${m[1]!.toLowerCase()} ${[...m[2]!.matchAll(NAME)].map((a) => a[1]!.toLowerCase()).sort().join(" ")}`).sort();
}

function same(evil: string, benign: string) {
  expect(shape(evil)).toEqual(shape(benign));
  expect(BAD_URL.test(evil)).toBe(false);
  expect(evil).not.toMatch(/<\/?(script|iframe|style)\b[^>]*>(?!\s*$)(?=[^]*alert)/i);
}

test.each(cardsFor(BENIGN).map(([name]) => name))("the web app shows the hostile text of the %s card as escaped data", (name) => {
  const evil = cardHtml(ctxFor(EVIL), slot(cardsFor(EVIL).find(([n]) => n === name)![1]));
  const benign = cardHtml(ctxFor(BENIGN), slot(cardsFor(BENIGN).find(([n]) => n === name)![1]));
  expect(evil.length).toBeGreaterThan(50);
  if (name !== "eln") expect(evil).toContain("&lt;script&gt;");
  same(evil, benign);
});

test("the web app shows hostile text in the items of the run as escaped data", () => {
  for (const live of [false, true]) same(runHtml(ctxFor(EVIL), itemsFor(EVIL), live), runHtml(ctxFor(BENIGN), itemsFor(BENIGN), live));
});

test("the web app never makes a link or an image from a link with a script address", () => {
  const html = runHtml(ctxFor(EVIL), [{ key: "a", t: "assistant", text: "[click](javascript:alert(5)) ![pic](http://127.0.0.1:1/steal?d=1) [ok](https://example.com/a)" }], false);
  expect(html).not.toMatch(/href="javascript/i);
  expect(html).not.toMatch(/<img/i);
  expect(html).toContain('href="https://example.com/a"');
});

const dirs: string[] = [];
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const SHORT_EVIL = `<img src=x onerror=alert(1)>"><svg onload=alert(3)>'`;
const SHORT_BENIGN = "plain [ok](a) text";

test.skipIf(process.platform === "win32")("the web app shows hostile names of files, sheets and sessions as escaped data", () => {
  const make = (t: string) => {
    const short = t === EVIL ? SHORT_EVIL : SHORT_BENIGN;
    const out = mkdtempSync(join(tmpdir(), "cuvette-inject-web-"));
    dirs.push(out);
    mkdirSync(join(out, "figures"));
    writeFileSync(join(out, `${short}.csv`), "a");
    writeFileSync(join(out, `${short}.png`), "a");
    writeFileSync(join(out, "figures", `${short}.png`), "a");
    const c = ctxFor(t);
    const sheet = sheetHtml(question(t) && ({ ...question(t), table: { columns: [t, "b"], rows: [[t, t], [t, t]] } } as never));
    const results = resultsHtml(c, out, [{ name: t, columns: [t, "b"], rows: [[t, t]] }]);
    const sessions = sessionsHtml([{ id: "s1", cwd: `/data/${t.replace(/\//g, "_")}`, used: Date.now(), ask: t, name: t, description: t, status: "done" } as never], "tok");
    const links = fileLink(c, `/tmp/${t.replace(/\//g, "_")}`, t) + imageHtml(c, `/tmp/${t.replace(/\//g, "_")}.png`, t);
    const status = statusHtml([{ step: 1, current: false, reasons: [{ text: t }] }] as never);
    return { sheet, results: results.split(out).join("OUT"), sessions, links, status };
  };
  const evil = make(EVIL);
  const benign = make(BENIGN);
  for (const k of Object.keys(evil) as (keyof typeof evil)[]) same(evil[k], benign[k]);
});

test("the web app shows hostile decision labels and values as escaped data", () => {
  const field = (t: string) => ({ key: "alpha", label: t, kind: "str", choices: undefined, essential: true, owner: "human", value: t, set: true, help: t });
  const make = (t: string) => decisionsHtml({ token: "tok", session: { decisions: { fields: () => [field(t)] }, record: { entries: () => [], nodes: () => [] }, labels: () => ({}) } } as never, [["alpha", t, "human", "agent"]], []);
  same(make(EVIL), make(BENIGN));
});

test("the web app removes text direction controls that reorder the code in a card", () => {
  const code = "print('safe')\u202e ; import os; os.remove('x')\u2066";
  const html = cardHtml(ctxFor(BENIGN), slot({ t: "permission", rid: "r1", tool: "run_script", args: { purpose: "p", does: "d", code }, code, touches: "t" }));
  expect(html).toContain("print(&#39;safe&#39;) ; import os; os.remove(&#39;x&#39;)");
  expect(html).not.toMatch(/[\u202a-\u202e\u2066-\u2069]/);
});

test("the web app shows hostile program names and program messages as escaped data", () => {
  const checks = (t: string) => [{ id: "a", group: "Programs", name: t, status: "warn", detail: t, fix: { label: t, command: t } }, { id: "b", group: "Programs", name: t, status: "ok", detail: t }] as never;
  const doctor = doctorHtml(checks(EVIL), false, checks(EVIL));
  expect(doctor).toContain("&lt;script&gt;");
  same(doctor, doctorHtml(checks(BENIGN), false, checks(BENIGN)));
  const row = (t: string) => ({ name: t, program: t, field: t, root: t, adapterStatus: t, state: "installed", version: t, tested: [t], path: t, how: t, detail: t, access: { off: false }, codeTools: [t], trust: "checked", trustDetail: t, codePending: false, codeFiles: [t] }) as never;
  const programs = programsHtml([row(EVIL)]);
  expect(programs).toContain("&lt;script&gt;");
  same(programs, programsHtml([row(BENIGN)]));
});

test("the Show in folder button keeps a path that holds a text direction control, and the session list drops the control", () => {
  const path = "/data/run‮1/plot⁦.png";
  const html = fileLink(ctxFor(BENIGN), path);
  const attr = /data-reveal="([^"]*)"/.exec(html)![1]!;
  expect(attr).not.toMatch(/[‪-‮⁦-⁩]/);
  expect(decodeURIComponent(attr)).toBe(path);
  const out = mkdtempSync(join(tmpdir(), "cuvette-inject-web-"));
  dirs.push(out);
  const results = resultsHtml(ctxFor(BENIGN), out, undefined);
  expect(decodeURIComponent(/data-reveal="([^"]*)"/.exec(results)![1]!)).toBe(out);
  const path0 = "/data/a\u202eb";
  const list = sessionsJson([{ id: "s1", cwd: path0, used: Date.now(), ask: "x‮y", name: "n⁧m", description: "d‮e" } as never], "tok");
  expect(list[0]!.folder).toBe(path0);
  expect(JSON.stringify({ ...list[0], folder: "" })).not.toMatch(/[\u202a-\u202e\u2066-\u2069]/);
  expect(list[0]!.folderShown).toBe("/data/ab");
  expect(list[0]!.folderName).toBe("ab");
});

test("the folder filter, the header and the tooltip show a folder name without text direction controls, and the actions keep the real path", async () => {
  const real = "/data/run‮1/plots";
  const s = new FakeSession();
  (s as { cwd: string }).cwd = real;
  (s as { folderLine?: string }).folderLine = "~/run‮1/plots";
  const view = new WebView(s as never, { token: "t", env: {}, url: (p: string) => p, quit: async () => {} });
  const header = view.header() as { folder: string; folderShown: string; folderLine: string };
  expect(header.folder).toBe(real);
  expect(header.folderShown).toBe("/data/run1/plots");
  expect(header.folderLine).not.toMatch(BIDI);
  expect((view.statusMsg() as { where: string }).where).not.toMatch(BIDI);
  view.close();
  const list = sessionsJson([{ id: "a", cwd: real, used: Date.now(), ask: "x" }, { id: "b", cwd: "/other/run‮1", used: Date.now(), ask: "y" }] as never, "t");
  const options = folderChoices(list);
  expect(options.map((o) => o.value).sort()).toEqual([real, "/other/run‮1"].sort());
  for (const o of options) expect(o.label).not.toMatch(BIDI);
  expect(options.map((o) => o.label).join("|")).toContain("plots");
});
