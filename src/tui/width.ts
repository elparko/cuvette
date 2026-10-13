import stringWidth from "string-width";

// The terminal shows a wide character (CJK, most emoji) in two columns, and a combining mark or an ANSI code in none.
const ESC = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const SEG = new Intl.Segmenter("en", { granularity: "grapheme" });
const PLAIN = /^[\x20-\x7e]*$/;

interface Cell {
  s: string;
  w: number;
}

export function textWidth(s: string): number {
  return PLAIN.test(s) ? s.length : stringWidth(s);
}

function cells(line: string): Cell[] {
  const out: Cell[] = [];
  const add = (part: string) => {
    if (PLAIN.test(part)) for (const ch of part) out.push({ s: ch, w: 1 });
    else for (const g of SEG.segment(part)) out.push({ s: g.segment, w: stringWidth(g.segment) });
  };
  let at = 0;
  for (const m of line.matchAll(ESC)) {
    add(line.slice(at, m.index));
    out.push({ s: m[0], w: 0 });
    at = m.index + m[0].length;
  }
  add(line.slice(at));
  return out;
}

export function untab(s: string): string {
  return s.replace(/\t/g, "    ");
}

// Breaks one line into pieces of at most `room` columns, at a space if a space is late enough, else inside the word.
export function wrapLine(line: string, room: number): string[] {
  const c = cells(untab(line).trimEnd());
  const out: string[] = [];
  const join = (a: number, b: number) => c.slice(a, b).map((x) => x.s).join("");
  let start = 0;
  for (;;) {
    let w = 0;
    let i = start;
    let space = -1;
    let spaceW = 0;
    while (i < c.length && w + c[i]!.w <= room) {
      if (c[i]!.s === " ") (space = i), (spaceW = w);
      w += c[i]!.w;
      i++;
    }
    if (i >= c.length) {
      out.push(join(start, c.length));
      return out;
    }
    let at = c[i]!.s === " " ? i : space > start && spaceW > room / 3 ? space : i;
    if (at === start) at = start + 1;
    out.push(join(start, at).trimEnd());
    start = at;
    while (start < c.length && c[start]!.s === " ") start++;
    if (start >= c.length) return out;
  }
}

// The longest start of the text that fits in `room` columns.
export function fitStart(s: string, room: number): string {
  let w = 0;
  let out = "";
  for (const c of cells(s)) {
    if (w + c.w > room) break;
    w += c.w;
    out += c.s;
  }
  return out;
}

export function padTo(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - textWidth(s)));
}
