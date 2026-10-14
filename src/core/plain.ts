const SEQUENCE = new RegExp(
  [
    "\\x1b\\][^\\x07\\x1b\\x9c]*(?:\\x07|\\x1b\\\\|\\x9c)",
    "\\x1b[P^_X][^\\x1b\\x9c]*(?:\\x1b\\\\|\\x9c)",
    "\\x9d[^\\x07\\x1b\\x9c]*(?:\\x07|\\x1b\\\\|\\x9c)",
    "[\\x90\\x98\\x9e\\x9f][^\\x1b\\x9c]*(?:\\x1b\\\\|\\x9c)",
    "\\x1b\\[[0-?]*[ -/]*[@-~]?",
    "\\x9b[0-?]*[ -/]*[@-~]?",
    "\\x1b[ -/]*[0-~]?",
  ].join("|"),
  "g",
);
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]/g;

export function plainText(s: string): string {
  return s.replace(SEQUENCE, "").replace(CONTROL, "");
}


const WRITTEN_OUT = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u061c\u180e\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\u3164\ufe00-\ufe0f\ufeff\u{e0000}-\u{e007f}\u{e0100}-\u{e01ef}]/gu;

export function visibleText(text: string): string {
  return text.replace(WRITTEN_OUT, (c) => {
    const n = c.codePointAt(0)!;
    return n < 256 ? `\\x${n.toString(16).padStart(2, "0")}` : n < 0x10000 ? `\\u${n.toString(16).padStart(4, "0")}` : `\\u{${n.toString(16).toUpperCase()}}`;
  });
}

export function commandText(argv: unknown[]): string {
  return argv.map((a) => {
    const s = String(a);
    return /^[\w@%+=:,./-]+$/.test(s) ? s : visibleText(JSON.stringify(s));
  }).join(" ");
}
