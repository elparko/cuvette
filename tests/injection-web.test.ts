import { expect, test } from "vitest";
import { cardHtml, runHtml, type Ctx, type Slot } from "../src/server/app-html.ts";
import { planInit, type Card } from "../src/ui/cards.ts";
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

const ctxFor = (t: string) => ({ token: "tok", session: { decisions: { fields: () => [] }, questions: { open: () => [question(t)] }, adapterInfo: [{ title: t }] } }) as unknown as Ctx;

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
