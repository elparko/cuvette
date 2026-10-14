import { planInit, type Card } from "../src/ui/cards.ts";
import { cardHtml, runHtml, statusHtml, type Ctx, type Slot } from "../src/server/app-html.ts";
import type { Item } from "../src/ui/items.ts";
import type { Question } from "../src/core/types.ts";
import { pathRefusalReason } from "../src/core/refusals.ts";
import { TRUST_OPTIONS, TRUST_TITLE, trustEvidence, trustText } from "../src/core/trust.ts";

const question = (qid: string, extra: Partial<Question> = {}): Question => ({
  qid,
  session: "s1",
  decisionKey: "test",
  title: "Which test?",
  text: "Which test compares the two groups?",
  options: [
    { label: "t test", value: "t" },
    { label: "Wilcoxon", value: "w" },
  ],
  recommendation: { value: "t", reason: "The data look normal." },
  evidence: "Shapiro p = 0.4",
  status: "open",
  created: "2026-01-01T00:00:00Z",
  ...extra,
});

const fields = [
  { key: "alpha", label: "Alpha", kind: "float", essential: true, owner: "human", value: 0.05, set: false, help: "The cut-off for a result." },
  { key: "test", label: "Test", kind: "str", choices: ["t test", "Wilcoxon"], essential: true, owner: "human", value: "t test", set: true },
  { key: "paired", label: "Paired", kind: "bool", essential: false, owner: "agent", value: false, set: false },
  { key: "title", label: "Title", kind: "str", essential: false, owner: "fixed", value: "Fixed", set: true },
  { key: "unit", label: "Unit", kind: "str", essential: false, owner: "human", value: "", set: false },
];

const longReason = "Because the objects under 20 px are noise 😀 日本語. ".repeat(40);
const linkedScan = { folder: "/Users/someone/Documents/a very long project folder name/with/many/parts/and-more", linked: [".cuvette/adapters"], incomplete: [], lab: "Use Welch.", files: {}, keys: [], values: {}, hooks: [], adapters: [], methods: [], hash: "", layers: [], bypass: false } as never;
const linked = { state: "changed", scan: linkedScan, changes: [] } as never;

const qs = [question("q1"), question("q2", { title: "Which second test?", table: { columns: ["sample", "group"], rows: [["a", "x"], ["b", "y"]] } })];

const ctx = {
  token: "tok",
  session: {
    decisions: { fields: () => fields },
    questions: { open: () => qs },
    adapterInfo: [{ title: "ImageJ" }],
  },
} as unknown as Ctx;

const planBase = { stage: "plan" as const, version: 1, text: "1. Count the cells.\n2. [1] Compare the groups.", update: false, qids: [], programs: [{ part: "counting", adapter: "imagej", alternatives: ["cellpose"] }], mode: "watch" as const, restatement: "You want: the cell count in each image.", definitions: [{ measure: "cell", definition: "A nucleus with a clear edge" }], pilot: "image 1" };

const slot = (card: Card, seq?: Slot["seq"], plan?: Partial<ReturnType<typeof planInit>>, msg?: string): Slot => {
  const s: Slot = { id: 1, card, seq, msg };
  if (card.t === "plan") s.plan = { ...planInit(card), ...plan };
  return s;
};

export const CARD_FIXTURES: { name: string; html: string }[] = (
  [
    ["question", slot({ t: "question", q: qs[0]! }, { progress: "Question 1 of 2", back: true, next: true })],
    ["question sheet", slot({ t: "question", q: qs[1]! })],
    ["question change", slot({ t: "question", q: qs[0]!, act: { kind: "change", current: "t", note: "The answer changes the plan." } as never })],
    ["permission", slot({ t: "permission", rid: "r1", tool: "run_python", args: { path: "a.csv" }, code: "print(1)", touches: "Reads a.csv in the project folder." })],
    ["permission long command", slot({ t: "permission", rid: "r4", tool: "run_command", args: { purpose: "Count the lines", does: "Counts the lines of a file.", argv: ["sh", "-c", `${"abcdefghij".repeat(200)}; echo ${"é😀".repeat(30)}`, "line1\nline2", "esc\u001b[31m"] }, touches: "Runs on this computer with your user permissions." })],
    ["trust linked folder", slot({ t: "question", q: question("q3", { decisionKey: "", title: TRUST_TITLE, text: trustText(linked), options: TRUST_OPTIONS.filter((o) => o.value === "no"), recommendation: undefined, evidence: trustEvidence(linked) }) })],
    ["change a setting", slot({ t: "question", q: question("q4", { decisionKey: "min_size", title: "Change Smallest particle?", text: `The agent asks to change "Smallest particle" from 5 to 20. Your message did not name this value. Reason: ${longReason}`, options: [{ value: 20, label: "Change to 20" }, { value: 5, label: "Keep 5" }], recommendation: undefined, default: 5, evidence: "" }) })],
    ["phi", slot({ t: "phi", rid: "r2", model: "claude", hits: [{ kind: "name", label: "Name", masked: "J*** D**", where: "a.csv row 2" }], more: 3 })],
    ["phi local", slot({ t: "phi", rid: "r3", model: "claude", hits: [{ kind: "name", label: "Name", masked: "J*** D**", where: "a.csv row 2" }], more: 0, local: "llama" })],
    ["instruction", slot({ t: "instruction", step: 2, tool: "imagej", text: "1. Open the image.\n2. Run Analyze Particles." })],
    ["findings", slot({ t: "findings", list: [{ fid: "f1", source: "rule", status: "open", severity: "warn", check: "n", message: "n is 2 per group.", nodes: ["s1"] } as never] })],
    ["findings none", slot({ t: "findings", list: [] })],
    ["rewind", slot({ t: "rewind", points: [{ n: 1, kind: "message", entry: 1, upTo: 2, label: "Compare the groups", ts: "2026-01-01T10:00:00Z" }] })],
    ["key", slot({ t: "key", reason: "There is no Claude API key." })],
    ["eln", slot({ t: "eln" })],
    ["programs", slot({ t: "programs", name: "imagej" })],
    ["setup", slot({ t: "setup", profiles: [{ name: "Lab A", version: 1 }], proposed: { alpha: 0.01 }, proposedFrom: "eLabFTW" })],
    ["plan actions", slot({ ...planBase, t: "plan", qids: [] }, undefined, { step: "actions" })],
    ["plan restate", slot({ ...planBase, t: "plan" }, undefined, { step: "restate" })],
    ["plan decisions", slot({ ...planBase, t: "plan", qids: ["q1"] })],
    ["plan change", slot({ ...planBase, t: "plan" }, undefined, { step: "change" })],
    ["plan program", slot({ ...planBase, t: "plan" }, undefined, { step: "program" })],
    ["plan pilot", slot({ ...planBase, stage: "pilot", t: "plan", settings: [{ index: 1, step: 1, label: "Smallest particle", value: 5 }] })],
    ["clarify", slot({ t: "clarify", found: "I see 20 animals in 2 groups.", qids: ["q1"], skipped: ["The alpha is 0.05. The request says: use 0.05."], check: "Check: no missing values.", notes: ["The groups differ in size."] })],
    ["card message", slot({ t: "key" }, undefined, undefined, "The key is not valid.")],
  ] as [string, Slot][]
).map(([name, s]) => ({ name, html: cardHtml(ctx, s) }));

const step = (n: number, ok: boolean, extra: Partial<Extract<Item, { t: "step" }>> = {}): Item => ({ key: `s${n}`, t: "step", n, ok, tool: "run_python", summary: ok ? "Counted 12 cells in a.tif" : "The script stopped", settings: "threshold 40", outputs: [], why: "Count cells: a.tif", ...(ok ? {} : { error: "ValueError: bad value\nTraceback (most recent call last):\n  File x.py, line 2\nValueError: bad value" }), ...extra });

const ITEMS: Item[][] = [
  [{ key: "u", t: "user", text: "Compare the groups with a t test." }],
  [{ key: "a", t: "assistant", text: "## Result\n\nThe groups differ (p = 0.01).\n\n- one **bold** item with `code`\n- see [the paper](https://example.com)\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```\nprint(1)\n```\n\n> A quote." }],
  [{ key: "a2", t: "assistant", text: "Intro.\n\nDefinitions, from the confirmed analysis:\n\n- cell: a nucleus" }],
  ["red", "green", "yellow", "cyan", "magenta", ""].map((color, i) => ({ key: `l${i}`, t: "line" as const, sym: ["✗", "✓", "⚠", "→", "?", "·"][i]!, color, text: `A ${color || "plain"} line: it has text · /change x${i}`, change: i % 2 ? `x${i}` : undefined })),
  [{ key: "ld", t: "line", sym: "·", dim: true, text: "A dim line." }],
  [{ key: "bl", t: "line", sym: "⚠", color: "yellow", text: `Blocked read file: ${pathRefusalReason("private", `/Users/someone/.cuvette/sessions/${"é😀".repeat(60)}/log.jsonl`)}` }],
  [{ key: "b", t: "block", title: "Tests in this session", text: "Test   p value\nt test  0.01\nWilcoxon  0.03" }],
  [step(1, true), step(2, false)],
  [1, 2, 3, 4, 5].map((n) => step(n, n !== 4, { why: "Segment cells: " + n + ".tif" })),
];

export const ITEM_FIXTURES: { name: string; html: string }[] = ITEMS.map((list, i) => ({ name: `items ${i + 1}`, html: runHtml(ctx, list, false) }));
export const ITEM_LIVE_FIXTURE = runHtml(ctx, [1, 2, 3].map((n) => step(n, true, { why: "Segment cells: " + n + ".tif" })), true);
export const STATUS_FIXTURE = statusHtml([
  { step: 3, current: false, reasons: [{ text: "The data file changed." }] },
  { step: 4, current: true, reasons: [] },
] as never);
