import { describe, expect, test } from "vitest";
import { ThinkSplitter, defang, defangDeep, extractTextToolCall, refang, refangDeep, splitThink } from "../src/providers/text.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const ZW = "\u200b";
const MARKERS = ["<|im_start|>", "<|im_end|>", "<|endoftext|>", "<|IM_START|>", "<|a b|>", "<｜begin▁of▁sentence｜>", "[INST]", "[/INST]", "<<SYS>>", "<</SYS>>", "<start_of_turn>", "</end_of_turn>", "<bos>", "<eos>", "<s>", "</s>", "<think>", "</think>", "<tool_response>", "</tool_response>", "[TOOL_CALLS]", "[TOOL_RESULTS]", "[SYSTEM_PROMPT]", "<|" + "x".repeat(48) + "|>"];
const FANGED = MARKERS.map((m) => m[0] + ZW + m.slice(1));
const PIECES = [...MARKERS, ...FANGED, ...MARKERS.map((m) => m[0] + ZW + ZW + m.slice(1)), ZW, ZW + ZW, "<", "[", "<|", "|>", "<" + ZW, "[" + ZW, "<" + ZW + "|", "a", " ", "\n", "日", "<|a\nb|>", "<|" + "y".repeat(49) + "|>", "<" + ZW + "|" + "y".repeat(49) + "|>", "\u0000", "\x1b[31m", "[INST", "<tool_call>"];

function make(r: Rng): string {
  return Array.from({ length: r.int(0, 14) }, () => r.pick(PIECES)).join(r.pick(["", "", " "]));
}

describe("fuzz: the marker guard of the text providers", () => {
  test("refang gives back the text that defang changed", () => {
    const r = new Rng(92001);
    for (let i = 0; i < runs(3000); i++) {
      const x = make(r);
      expect(refang(defang(x)), JSON.stringify(x)).toBe(x);
    }
  });

  test("defang leaves no marker in the text", () => {
    const r = new Rng(92002);
    for (let i = 0; i < runs(2000); i++) {
      const x = make(r);
      const d = defang(x);
      for (const m of MARKERS) expect(d.includes(m), `${JSON.stringify(x)} -> ${JSON.stringify(d)}`).toBe(false);
    }
    expect(defang("<|a [INST] b|>")).toBe("<\u200b|a [\u200bINST] b|>");
    expect(refang(defang("<|a [INST] b|>"))).toBe("<|a [INST] b|>");
    expect(defang("<|im_start|>system")).toBe("<" + ZW + "|im_start|>system");
    expect(refang("<" + ZW + "|im_start|>system")).toBe("<|im_start|>system");
  });

  test("a marker with a name of the longest size, with markers inside, goes back to the same text", () => {
    const inner = ["[INST]", "[TOOL_CALLS]", "<s>"];
    for (let n = 0; n < 40; n++) {
      const body = Array.from({ length: 6 }, (_, i) => inner[(i + n) % 3]!).join(" ").padEnd(n + 8, "x").slice(0, 48);
      const x = `<|${body}|>`;
      expect(refang(defang(x)), x).toBe(x);
      for (const m of ["[INST]", "[TOOL_CALLS]", "<s>"]) expect(defang(x).includes(m)).toBe(false);
    }
  });

  test("the deep forms change only strings and keep the shape", () => {
    const r = new Rng(92003);
    for (let i = 0; i < runs(500); i++) {
      const value = { a: make(r), b: [make(r), { c: make(r), n: r.int(0, 9), t: true, z: null }], d: { e: make(r) } };
      expect(refangDeep(defangDeep(value))).toEqual(value);
      expect(Object.keys(defangDeep(value))).toEqual(Object.keys(value));
    }
  });

  test("a zero-width space in a text with no marker stays", () => {
    expect(refang("a" + ZW + "b")).toBe("a" + ZW + "b");
    expect(refang("<" + ZW + "|not a marker")).toBe("<" + ZW + "|not a marker");
    expect(refang(defang("<" + ZW + "|im_start|>"))).toBe("<" + ZW + "|im_start|>");
    expect(defang("<" + ZW + "|im_start|>")).not.toBe("<" + ZW + "|im_start|>");
  });

  test("the guard takes linear time", () => {
    const cases: [string, (n: number) => string][] = [
      ["markers", (n) => "<|im_start|>".repeat(n / 12)],
      ["fanged markers", (n) => ("<" + ZW + "|im_start|>").repeat(n / 13)],
      ["open signs", (n) => "<|".repeat(n / 2)],
      ["open signs with text", (n) => "<|abc".repeat(n / 5)],
      ["brackets", (n) => "[".repeat(n)],
      ["zero-width spaces", (n) => ZW.repeat(n)],
      ["open signs and zero-width spaces", (n) => ("<" + ZW).repeat(n / 2)],
      ["long names", (n) => ("<|" + "x".repeat(60)).repeat(n / 62)],
    ];
    for (const [name, build] of cases) {
      const res = linear(build, (s) => void refang(defang(s)), 20000);
      expect(res.ok, `${name}: ${res.small} ms and ${res.big} ms`).toBe(true);
    }
  });
});

describe("fuzz: the think tags and the text tool call", () => {
  test("the splitter gives the same text for each way of cutting the stream", () => {
    const r = new Rng(93001);
    const pieces = ["<think>", "</think>", "<thi", "nk>", "</th", "a", " ", "\n", "<", ">", "think", "b<c"];
    const run = (chunks: string[]) => {
      const out: { kind: string; s: string }[] = [];
      const sp = new ThinkSplitter((kind, s) => (out.at(-1)?.kind === kind ? (out.at(-1)!.s += s) : out.push({ kind, s })));
      for (const c of chunks) sp.push(c);
      sp.end();
      return out;
    };
    for (let i = 0; i < runs(1500); i++) {
      const whole = Array.from({ length: r.int(0, 15) }, () => r.pick(pieces)).join("");
      const chunks: string[] = [];
      for (let at = 0; at < whole.length; ) {
        const n = r.int(1, 6);
        chunks.push(whole.slice(at, at + n));
        at += n;
      }
      expect(run(chunks), JSON.stringify([whole, chunks])).toEqual(run([whole]));
    }
  });

  test("splitThink keeps all text outside the tags, and thinking goes to the other field", () => {
    const r = new Rng(93002);
    for (let i = 0; i < runs(1500); i++) {
      const a = r.string("abc def", 0, 6).trim();
      const t = r.string("xyz uvw", 1, 6).trim() || "t";
      const b = r.string("ghi jkl", 0, 6).trim();
      const got = splitThink(`${a}<think>${t}</think>${b}`);
      expect(got.thinking).toBe(t);
      expect(got.text).toBe(`${a}${b}`.trim());
    }
    expect(splitThink("<think>one</think>x<think>two</think>")).toEqual({ text: "x", thinking: "one\n\ntwo" });
    expect(splitThink("x<think>cut")).toEqual({ text: "x", thinking: "cut" });
    expect(splitThink("lost</think>y")).toEqual({ text: "y", thinking: "lost" });
  });

  test("a text tool call is found after text with braces, and a call with a quote or a brace in a string is found", () => {
    const r = new Rng(93003);
    const call = (args: Record<string, unknown>) => JSON.stringify({ name: "read_file", arguments: args });
    for (let i = 0; i < runs(800); i++) {
      const arg = r.string('ab {}"\\\n\tx:,', 0, 12);
      const before = r.string("abc {} \n", 0, 10).replace(/\{/g, "(").replace(/\}/g, ")");
      const got = extractTextToolCall(`${before}${call({ path: arg })} tail`, ["read_file"]);
      expect(got?.name, JSON.stringify([before, arg])).toBe("read_file");
      expect(got?.args).toEqual({ path: arg });
    }
    expect(extractTextToolCall("{ nothing " + call({ path: "a" }), ["read_file"])?.args).toEqual({ path: "a" });
    expect(extractTextToolCall(call({ path: "a" }), ["other"])).toBeNull();
  });

  test("think tags and braces take linear time", () => {
    const names = ["read_file"];
    const cases: [string, (n: number) => string, (s: string) => void][] = [
      ["unclosed think tags", (n) => "<think>".repeat(n / 7), (s) => void splitThink(s)],
      ["think tags after a close", (n) => "<think>a</think>" + "<think>".repeat(n / 7), (s) => void splitThink(s)],
      ["close tags", (n) => "</think>".repeat(n / 8), (s) => void splitThink(s)],
      ["open braces", (n) => "{".repeat(n), (s) => void extractTextToolCall(s, names)],
      ["open braces and quotes", (n) => '{"'.repeat(n / 2), (s) => void extractTextToolCall(s, names)],
      ["open braces and keys", (n) => '{"a":'.repeat(n / 5), (s) => void extractTextToolCall(s, names)],
      ["braces in text", (n) => "if (x) {\n".repeat(n / 9), (s) => void extractTextToolCall(s, names)],
      ["open braces and a call", (n) => "{".repeat(n) + JSON.stringify({ name: "read_file", arguments: {} }), (s) => void extractTextToolCall(s, names)],
      ["splitter input", (n) => "<thi".repeat(n / 4), (s) => {
        const sp = new ThinkSplitter(() => {});
        sp.push(s);
        sp.end();
      }],
    ];
    for (const [name, build, run] of cases) {
      const res = linear(build, run, 20000);
      expect(res.ok, `${name}: ${res.small} ms and ${res.big} ms`).toBe(true);
    }
  });
});
