import { describe, expect, test } from "vitest";
import { plainText } from "../src/core/plain.ts";
import { linear as once, Rng, runs } from "./fuzz-rng.ts";

function linear(make: (n: number) => string, run: (s: string) => void, n: number) {
  let res = once(make, run, n);
  for (let k = 0; k < 2 && !res.ok; k++) res = once(make, run, n);
  return res;
}

const BAD = new RegExp("[\\x00-\\x08\\x0b-\\x1f\\x7f-\\x9f\\u202a-\\u202e\\u2066-\\u2069]");
const ESC = "\x1b";
const PRINTABLE = "abcXYZ 019.,:;!?()[]{}<>/\\|'\"-_=+*&^%$#@~`日本é🧪\n\t";

function text(r: Rng, min = 0, max = 12): string {
  return r.string(PRINTABLE, min, max);
}

function csi(r: Rng): string {
  const params = r.string("0123456789;:<=>?", 0, 6);
  const inter = r.string(" !\"#$%&'()*+,-./", 0, 2);
  return `${r.pick([`${ESC}[`, "\x9b"])}${params}${inter}${r.pick([..."@ABCDHJKLMPSTfhlmnsu`~"])}`;
}

function oscLike(r: Rng): string {
  const payload = r.string("0123456789;abcXYZ :/.-_?=&%日", 0, 30);
  const form = r.int(0, 6);
  if (form === 0) return `${ESC}]${payload}\x07`;
  if (form === 1) return `${ESC}]${payload}${ESC}\\`;
  if (form === 2) return `\x9d${payload}\x07`;
  if (form === 3) return `\x9d${payload}\x9c`;
  if (form === 4) return `${ESC}${r.pick(["P", "^", "_", "X"])}${payload}${ESC}\\`;
  if (form === 5) return `${r.pick(["\x90", "\x98", "\x9e", "\x9f"])}${payload}\x9c`;
  return `${ESC}]${payload}\x9c`;
}

function simple(r: Rng): string {
  return `${ESC}${r.string(" !\"#$%&'()*+,-./", 0, 2)}${r.pick([..."0123456789=>78cDEHMNOZ\\"])}`;
}

describe("fuzz: the plain text of a terminal output", () => {
  test("a complete sequence between two texts is removed and the texts stay", () => {
    const r = new Rng(91001);
    for (let i = 0; i < runs(2500); i++) {
      const a = text(r).replace(/[\n\t]/g, " ");
      const b = text(r).replace(/[\n\t]/g, " ");
      const seq = r.pick([csi, oscLike, simple])(r);
      const got = plainText(a + seq + b);
      expect(got, JSON.stringify(a + seq + b)).toBe(a + b);
    }
  });

  test("several sequences and controls between texts leave only the texts", () => {
    const r = new Rng(91002);
    for (let i = 0; i < runs(1200); i++) {
      let input = "";
      let want = "";
      for (let k = r.int(1, 8); k > 0; k--) {
        const t = text(r, 1, 6).replace(/[\n\t]/g, "_");
        input += t;
        want += t;
        input += r.pick([csi, oscLike, simple, (x: Rng) => x.pick(["\x00", "\x07", "\x08", "\x0b", "\x0c", "\r", "\x7f", "\x85", "\u202e", "\u2066"])])(r);
      }
      expect(plainText(input), JSON.stringify(input)).toBe(want);
    }
  });

  test("any input gives an output with no control character, and a text without them does not change", () => {
    const r = new Rng(91003);
    const pieces = [ESC, "\x9b", "\x9d", "\x9c", "\x90", "\x07", "[", "]", "P", "\\", "0", ";", "m", "\x00", "\r", "\u202e", "\u2067", "\u200b", "a", "日", " ", "\n", "\t", "\u0085", "\u009f", "_", "^", "X"];
    for (let i = 0; i < runs(4000); i++) {
      const input = Array.from({ length: r.int(0, 40) }, () => r.pick(pieces)).join("");
      const got = plainText(input);
      expect(BAD.test(got), JSON.stringify(input)).toBe(false);
      expect(plainText(got)).toBe(got);
      if (!BAD.test(input)) expect(got).toBe(input);
    }
  });

  test("an unterminated sequence keeps the text after it", () => {
    const r = new Rng(91004);
    for (let i = 0; i < runs(1500); i++) {
      const a = text(r, 0, 6).replace(/[\n\t]/g, " ");
      const payload = r.string("abcXYZ日", 1, 12);
      const intro = r.pick([`${ESC}]`, "\x9d", `${ESC}P`, `${ESC}_`, "\x90", `${ESC}^`, "\x9e"]);
      const got = plainText(a + intro + payload);
      expect(BAD.test(got), JSON.stringify(a + intro + payload)).toBe(false);
      expect(got.startsWith(a)).toBe(true);
      expect(got.endsWith(payload), JSON.stringify([a, intro, payload, got])).toBe(true);
    }
  });

  test("an introducer inside a complete sequence does not hide the text after the sequence", () => {
    expect(plainText(`x${ESC}]0;title\x07y`)).toBe("xy");
    expect(plainText(`x${ESC}]0;t${ESC}]0;u\x07y`)).toBe("x0;t" + "y");
    expect(plainText(`x\x9d0;title\x9cy`)).toBe("xy");
    expect(plainText(`x\x9dabc\x9dtitle\x07y`)).toBe("xabcy");
    expect(plainText(`x\x90abc\x90def\x9cy`)).toBe("xabcy");
  });

  test("the function takes linear time", () => {
    const cases: [string, (n: number) => string][] = [
      ["text", (n) => "abc ".repeat(n / 4)],
      ["OSC starts", (n) => `${ESC}]`.repeat(n / 2)],
      ["OSC starts with text", (n) => `${ESC}]abc`.repeat(n / 5)],
      ["one long OSC", (n) => `${ESC}]${"a".repeat(n)}`],
      ["8-bit OSC starts", (n) => "\x9d".repeat(n)],
      ["8-bit OSC starts with text", (n) => "\x9dab".repeat(n / 3)],
      ["8-bit string starts", (n) => "\x90".repeat(n)],
      ["mixed 8-bit starts", (n) => "\x90\x98\x9d\x9e\x9f".repeat(n / 5)],
      ["DCS starts", (n) => `${ESC}P`.repeat(n / 2)],
      ["DCS starts with text", (n) => `${ESC}Pab`.repeat(n / 4)],
      ["CSI starts", (n) => `${ESC}[`.repeat(n / 2)],
      ["CSI parameters", (n) => `${ESC}[${"1;".repeat(n / 2)}`],
      ["escape and spaces", (n) => `${ESC}${" ".repeat(n)}`],
      ["escapes", (n) => ESC.repeat(n)],
      ["bell", (n) => "\x07".repeat(n)],
    ];
    for (const [name, make] of cases) {
      const res = linear(make, (s) => void plainText(s), 20000);
      expect(res.ok, `${name}: ${res.small} ms and ${res.big} ms`).toBe(true);
    }
  });
});
