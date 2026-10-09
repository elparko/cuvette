export type InputKeys = "mac" | "emacs" | "vim" | "classic";
export const INPUT_KEYS: InputKeys[] = ["mac", "emacs", "vim", "classic"];

export function inputKeys(v: unknown): InputKeys {
  return INPUT_KEYS.includes(v as InputKeys) ? (v as InputKeys) : "mac";
}

export interface Stroke {
  key: string;
  text?: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  cmd?: boolean;
}

const CSI_LETTER: Record<string, string> = { A: "up", B: "down", C: "right", D: "left", H: "home", F: "end", Z: "tab" };
const CSI_TILDE: Record<string, string> = { "1": "home", "7": "home", "4": "end", "8": "end", "3": "delete", "2": "insert", "5": "pageup", "6": "pagedown" };
const CSI_U: Record<string, string> = {
  "13": "enter",
  "9": "tab",
  "27": "escape",
  "127": "backspace",
  "8": "backspace",
  "57414": "enter",
  "57417": "left",
  "57418": "right",
  "57419": "up",
  "57420": "down",
  "57423": "home",
  "57424": "end",
  "57426": "delete",
};

function mods(raw: string | undefined): Omit<Stroke, "key"> {
  const m = Math.max(0, Number(raw || 1) - 1);
  const out: Omit<Stroke, "key"> = {};
  if (m & 1) out.shift = true;
  if (m & 34) out.alt = true;
  if (m & 4) out.ctrl = true;
  if (m & 8) out.cmd = true;
  return out;
}

function single(s: string): Stroke {
  if (s === "\r") return { key: "enter" };
  if (s === "\n") return { key: "enter", shift: true };
  if (s === "\t") return { key: "tab" };
  if (s === "\x7f" || s === "\b") return { key: "backspace" };
  if (s === "\x1b") return { key: "escape" };
  if (s === "\x00") return { key: "char", text: " ", ctrl: true };
  const c = s.charCodeAt(0);
  if (s.length === 1 && c < 32) return { key: "char", text: String.fromCharCode(c <= 26 ? c + 96 : c + 64), ctrl: true };
  let m = /^\x1b\[(\d+)(?::[\d:]*)?(?:;(\d*)(?::(\d+))?)?(?:;[\d:]*)?u$/.exec(s);
  if (m) {
    if (m[3] === "3") return { key: "none" };
    const named = CSI_U[m[1]!];
    const cp = Number(m[1]);
    const k = mods(m[2]);
    if (named) return { key: named, ...k };
    if (cp === 32) return { key: "char", text: " ", ...k };
    if (cp > 32 && cp < 57344) return { key: "char", text: String.fromCodePoint(k.shift && !k.ctrl && !k.alt && !k.cmd ? String.fromCodePoint(cp).toUpperCase().codePointAt(0)! : cp), ...k };
    return { key: "none" };
  }
  m = /^\x1b\[(\d*)(?:;(\d+)(?::\d+)?)?([A-Za-z~])$/.exec(s);
  if (m) {
    const name = m[3] === "~" ? CSI_TILDE[m[1]!] : !m[1] || m[1] === "1" ? CSI_LETTER[m[3]!] : undefined;
    if (!name) return { key: "none" };
    return { key: name, ...mods(m[2]), ...(m[3] === "Z" ? { shift: true } : {}) };
  }
  m = /^\x1bO([A-DHFM])$/.exec(s);
  if (m) return { key: m[1] === "M" ? "enter" : CSI_LETTER[m[1]!]! };
  if (s.includes("\x1b") || !s) return { key: "none" };
  return [...s].length === 1 ? { key: "char", text: s } : { key: "text", text: s };
}

export function decodeKey(seq: string): Stroke {
  if (seq === "\x1b\x1b") return { key: "escape", alt: true };
  if (seq.length > 1 && seq[0] === "\x1b" && (seq[1] === "\x1b" || (seq[1] !== "[" && seq[1] !== "O"))) {
    const k = single(seq.slice(1));
    return k.key === "none" || k.key === "text" ? { key: "none" } : { ...k, alt: true };
  }
  return single(seq);
}

type Act =
  | "left"
  | "right"
  | "wordLeft"
  | "wordRight"
  | "vimWordLeft"
  | "vimWordRight"
  | "lineStart"
  | "lineEnd"
  | "docStart"
  | "docEnd"
  | "up"
  | "down"
  | "back"
  | "fwd"
  | "wordBack"
  | "wordFwd"
  | "spaceWordBack"
  | "lineBack"
  | "lineFwd"
  | "yank"
  | "undo"
  | "newline"
  | "submit"
  | "escape"
  | "normal"
  | "insert"
  | "append"
  | "appendEnd"
  | "insertStart"
  | "openBelow"
  | "openAbove"
  | "pendDelete"
  | "deleteLine"
  | "deleteVimWord"
  | "charLeft";

type Action = Act | { insert: string };

const MAC_CTRL: Record<string, Act> = { a: "lineStart", e: "lineEnd", b: "left", f: "right", d: "fwd", k: "lineFwd", u: "lineBack", w: "wordBack", y: "yank", z: "undo", _: "undo", p: "up", n: "down" };
const EMACS_CTRL: Record<string, Act> = { a: "lineStart", e: "lineEnd", b: "left", f: "right", d: "fwd", k: "lineFwd", u: "lineBack", w: "spaceWordBack", y: "yank", _: "undo", p: "up", n: "down" };
const ALT: Record<string, Act> = { b: "wordLeft", f: "wordRight", d: "wordFwd" };
const VIM_INSERT_CTRL: Record<string, Act> = { w: "spaceWordBack", u: "lineBack", h: "back" };
const VIM_NORMAL: Record<string, Act> = {
  h: "left",
  l: "right",
  j: "down",
  k: "up",
  w: "vimWordRight",
  b: "vimWordLeft",
  "0": "lineStart",
  $: "lineEnd",
  x: "fwd",
  d: "pendDelete",
  i: "insert",
  a: "append",
  A: "appendEnd",
  I: "insertStart",
  o: "openBelow",
  O: "openAbove",
  u: "undo",
};

function common(k: Stroke, cmdKeys: boolean): Action | undefined {
  const { ctrl, alt, shift } = k;
  const cmd = cmdKeys && k.cmd;
  if (k.cmd && !cmdKeys) return undefined;
  switch (k.key) {
    case "text":
      return { insert: k.text! };
    case "left":
      return cmd ? "lineStart" : alt || ctrl ? "wordLeft" : "left";
    case "right":
      return cmd ? "lineEnd" : alt || ctrl ? "wordRight" : "right";
    case "up":
      return cmd ? "docStart" : "up";
    case "down":
      return cmd ? "docEnd" : "down";
    case "home":
      return ctrl || cmd ? "docStart" : "lineStart";
    case "end":
      return ctrl || cmd ? "docEnd" : "lineEnd";
    case "backspace":
      return cmd ? "lineBack" : alt || ctrl ? "wordBack" : "back";
    case "delete":
      return cmd ? "lineFwd" : alt || ctrl ? "wordFwd" : "fwd";
    case "enter":
      return ctrl || alt || shift || cmd ? "newline" : "submit";
    case "escape":
      return "escape";
  }
  return undefined;
}

function action(style: InputKeys, k: Stroke, vim: VimMode): Action | undefined {
  if (k.key === "char") {
    const t = k.text!;
    if (style === "mac" && k.cmd) return t === "z" && !k.shift ? "undo" : undefined;
    if (k.cmd) return undefined;
    if (k.ctrl) return (style === "mac" ? MAC_CTRL : style === "emacs" ? EMACS_CTRL : vim === "insert" ? VIM_INSERT_CTRL : {})[t];
    if (k.alt) return style === "vim" && vim === "normal" ? undefined : ALT[t];
    if (style === "vim" && vim === "normal") return VIM_NORMAL[t];
    return { insert: t };
  }
  if (style === "vim") {
    if (vim === "insert") return k.key === "escape" ? "normal" : common(k, false);
    if (k.key === "backspace") return "charLeft";
    if (k.key === "enter") return "submit";
    if (k.key === "text") return undefined;
    return common(k, false);
  }
  return common(k, style === "mac");
}

export type VimMode = "insert" | "normal";

export interface Ed {
  text: string;
  cur: number;
  vim: VimMode;
  pending?: string;
  kill: string;
  undo: { text: string; cur: number }[];
  last?: string;
  goal?: number;
}

export type EdOut = "submit" | "escape" | "up" | "down";

export const emptyEd = (text = ""): Ed => ({ text, cur: text.length, vim: "insert", kill: "", undo: [] });

const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c);
const isSpace = (c: string | undefined) => !!c && /\s/.test(c);
const vimClass = (c: string | undefined) => (c === undefined || isSpace(c) ? 0 : isWord(c) ? 1 : 2);

export const lineStartOf = (t: string, p: number) => t.lastIndexOf("\n", p - 1) + 1;
export function lineEndOf(t: string, p: number): number {
  const i = t.indexOf("\n", p);
  return i < 0 ? t.length : i;
}

export function wordLeft(t: string, p: number): number {
  while (p > 0 && !isWord(t[p - 1])) p--;
  while (p > 0 && isWord(t[p - 1])) p--;
  return p;
}

export function wordRight(t: string, p: number): number {
  while (p < t.length && !isWord(t[p])) p++;
  while (p < t.length && isWord(t[p])) p++;
  return p;
}

function spaceWordLeft(t: string, p: number): number {
  while (p > 0 && isSpace(t[p - 1])) p--;
  while (p > 0 && !isSpace(t[p - 1])) p--;
  return p;
}

function vimWordRight(t: string, p: number): number {
  const c = vimClass(t[p]);
  if (c) while (p < t.length && vimClass(t[p]) === c) p++;
  while (p < t.length && isSpace(t[p])) p++;
  return p;
}

function vimWordLeft(t: string, p: number): number {
  while (p > 0 && isSpace(t[p - 1])) p--;
  if (p === 0) return 0;
  const c = vimClass(t[p - 1]);
  while (p > 0 && vimClass(t[p - 1]) === c) p--;
  return p;
}

export interface Row {
  start: number;
  end: number;
  last: boolean;
}

export function layout(t: string, w: number): Row[] {
  const rows: Row[] = [];
  let s = 0;
  for (const line of t.split("\n")) {
    for (let i = 0; i <= line.length; i += w) rows.push({ start: s + i, end: s + Math.min(i + w, line.length), last: i + w > line.length });
    s += line.length + 1;
  }
  return rows;
}

export function rowOf(rows: Row[], p: number): number {
  const i = rows.findIndex((r) => p >= r.start && (p < r.end || (p === r.end && r.last)));
  return i < 0 ? rows.length - 1 : i;
}

function clampNormal(st: Ed): Ed {
  if (st.vim !== "normal") return st;
  const ls = lineStartOf(st.text, st.cur);
  if (st.cur > ls && st.cur === lineEndOf(st.text, st.cur)) return { ...st, cur: st.cur - 1 };
  return st;
}

const EDITS = new Set<Act>(["back", "fwd", "wordBack", "wordFwd", "spaceWordBack", "lineBack", "lineFwd", "yank", "newline", "openBelow", "openAbove", "deleteLine", "deleteVimWord"]);
const KILLS = new Set<Act>(["wordBack", "wordFwd", "spaceWordBack", "lineBack", "lineFwd", "deleteLine", "deleteVimWord"]);

function snapshot(st: Ed, kind: string, text?: string): Ed {
  const coalesce = kind === "insert" && st.last === "insert" && text?.length === 1 && !(isSpace(st.text[st.cur - 1]) && !isSpace(text));
  if (coalesce) return st;
  return { ...st, undo: [...st.undo.slice(-99), { text: st.text, cur: st.cur }] };
}

function cut(st: Ed, from: number, to: number, a: Act): Ed {
  if (from === to) return st;
  const [a0, b0] = from < to ? [from, to] : [to, from];
  return { ...st, text: st.text.slice(0, a0) + st.text.slice(b0), cur: a0, kill: KILLS.has(a) ? st.text.slice(a0, b0) : st.kill };
}

function insertAt(st: Ed, s: string): Ed {
  return { ...st, text: st.text.slice(0, st.cur) + s + st.text.slice(st.cur), cur: st.cur + s.length };
}

export function cleanPaste(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
}

function vertical(st: Ed, dir: -1 | 1, width: number): Ed | undefined {
  const rows = layout(st.text, width);
  const r = rowOf(rows, st.cur);
  const target = rows[r + dir];
  if (!target) return undefined;
  const col = st.goal ?? st.cur - rows[r]!.start;
  const max = target.end - target.start - (target.last ? 0 : 1);
  return { ...st, cur: target.start + Math.min(col, max), goal: col };
}

export function step(st: Ed, a: Action, width: number): { st: Ed; out?: EdOut } {
  if (typeof a === "object") {
    const text = cleanPaste(a.insert);
    if (!text) return { st };
    return { st: { ...insertAt(snapshot(st, "insert", text), text), last: "insert", goal: undefined } };
  }
  if (st.pending === "d") {
    if (a === "pendDelete") a = "deleteLine";
    else if (a === "vimWordRight") a = "deleteVimWord";
    else return { st: { ...st, pending: undefined } };
  } else if (a === "pendDelete") return { st: { ...st, pending: "d" } };
  const t = st.text;
  const p = st.cur;
  if (a === "up" || a === "down") {
    const next = vertical(st, a === "up" ? -1 : 1, width);
    return next ? { st: clampNormal({ ...next, last: "move" }) } : { st, out: a };
  }
  if (a === "submit") {
    if (p > 0 && t[p - 1] === "\\" && st.vim === "insert") return step({ ...st, text: t.slice(0, p - 1) + t.slice(p), cur: p - 1 }, "newline", width);
    return { st: { ...st, vim: "insert", pending: undefined }, out: "submit" };
  }
  if (a === "escape") return { st, out: "escape" };
  if (a === "undo") {
    const prev = st.undo.at(-1);
    if (!prev) return { st };
    return { st: clampNormal({ ...st, ...prev, undo: st.undo.slice(0, -1), last: "undo", goal: undefined }) };
  }
  const base: Ed = { ...(EDITS.has(a) ? snapshot(st, a) : st), last: a, goal: undefined, pending: undefined };
  const ls = lineStartOf(t, p);
  const le = lineEndOf(t, p);
  let next: Ed;
  switch (a) {
    case "left":
      next = { ...base, cur: st.vim === "normal" ? Math.max(ls, p - 1) : Math.max(0, p - 1) };
      break;
    case "charLeft":
      next = { ...base, cur: Math.max(0, p - 1) };
      break;
    case "right":
      next = { ...base, cur: st.vim === "normal" ? Math.min(Math.max(ls, le - 1), p + 1) : Math.min(t.length, p + 1) };
      break;
    case "wordLeft":
      next = { ...base, cur: wordLeft(t, p) };
      break;
    case "wordRight":
      next = { ...base, cur: wordRight(t, p) };
      break;
    case "vimWordLeft":
      next = { ...base, cur: vimWordLeft(t, p) };
      break;
    case "vimWordRight":
      next = { ...base, cur: vimWordRight(t, p) };
      break;
    case "lineStart":
      next = { ...base, cur: ls };
      break;
    case "lineEnd":
      next = { ...base, cur: le };
      break;
    case "docStart":
      next = { ...base, cur: 0 };
      break;
    case "docEnd":
      next = { ...base, cur: t.length };
      break;
    case "back":
      next = cut(base, p, Math.max(0, p - 1), a);
      break;
    case "fwd":
      next = st.vim === "normal" && p === le ? base : cut(base, p, Math.min(t.length, p + 1), a);
      break;
    case "wordBack":
      next = cut(base, p, wordLeft(t, p), a);
      break;
    case "wordFwd":
      next = cut(base, p, wordRight(t, p), a);
      break;
    case "spaceWordBack":
      next = cut(base, p, spaceWordLeft(t, p), a);
      break;
    case "lineBack":
      next = cut(base, p, p === ls ? Math.max(0, p - 1) : ls, a);
      break;
    case "lineFwd":
      next = cut(base, p, p === le ? Math.min(t.length, p + 1) : le, a);
      break;
    case "deleteLine": {
      const from = le < t.length ? ls : Math.max(0, ls - 1);
      next = cut(base, from, Math.min(t.length, le + 1), a);
      next = { ...next, cur: lineStartOf(next.text, Math.min(next.cur + (le < t.length ? 0 : 1), next.text.length)) };
      break;
    }
    case "deleteVimWord": {
      const end = vimWordRight(t, p);
      next = cut(base, p, end > le && le > p ? le : end, a);
      break;
    }
    case "yank":
      next = insertAt(base, st.kill);
      break;
    case "newline":
      next = insertAt(base, "\n");
      break;
    case "normal":
      next = { ...base, vim: "normal", cur: p > ls ? p - 1 : p };
      break;
    case "insert":
      next = { ...base, vim: "insert" };
      break;
    case "append":
      next = { ...base, vim: "insert", cur: Math.min(le, p + 1) };
      break;
    case "appendEnd":
      next = { ...base, vim: "insert", cur: le };
      break;
    case "insertStart": {
      let q = ls;
      while (q < le && isSpace(t[q])) q++;
      next = { ...base, vim: "insert", cur: q };
      break;
    }
    case "openBelow":
      next = { ...base, vim: "insert", text: t.slice(0, le) + "\n" + t.slice(le), cur: le + 1 };
      break;
    case "openAbove":
      next = { ...base, vim: "insert", text: t.slice(0, ls) + "\n" + t.slice(ls), cur: ls };
      break;
    default:
      next = base;
  }
  return { st: clampNormal(next) };
}

export function press(st: Ed, k: Stroke, style: InputKeys, width: number): { st: Ed; out?: EdOut } {
  if (style === "vim" && st.vim === "normal" && k.key === "text") {
    let cur: { st: Ed; out?: EdOut } = { st };
    for (const ch of k.text!) {
      cur = press(cur.st, { key: "char", text: ch }, style, width);
      if (cur.out) return cur;
    }
    return cur;
  }
  if (k.key === "escape" && k.alt) {
    const once = press(st, { key: "escape" }, style, width);
    return once.out ? once : press(once.st, { key: "escape" }, style, width);
  }
  const a = action(style, k, st.vim);
  if (!a) return st.pending ? { st: { ...st, pending: undefined } } : { st };
  return step(st, a, width);
}

export interface KeyRow {
  keys: string;
  does: string;
}

const STYLE_ROWS: Record<InputKeys, KeyRow[]> = {
  mac: [
    { keys: "Enter", does: "Send the message." },
    { keys: "Shift+Enter, Option+Enter", does: "New line. A \\ at the end of the line, then Enter, also makes a new line." },
    { keys: "Option+Left, Option+Right", does: "Move one word." },
    { keys: "Cmd+Left, Cmd+Right, Home, End", does: "Go to the start or end of the line." },
    { keys: "Option+Backspace", does: "Delete the word before the cursor." },
    { keys: "Fn+Option+Backspace", does: "Delete the word after the cursor." },
    { keys: "Cmd+Backspace", does: "Delete to the start of the line." },
    { keys: "Up, Down", does: "Move between lines. On the first or last line: past messages." },
    { keys: "Ctrl+Z, Cmd+Z", does: "Undo." },
    { keys: "Ctrl+A, Ctrl+E, Ctrl+K, Ctrl+Y", does: "Line start, line end, delete to line end, put back the deleted text." },
  ],
  emacs: [
    { keys: "Enter", does: "Send the message." },
    { keys: "Alt+Enter, Shift+Enter", does: "New line. A \\ at the end of the line, then Enter, also makes a new line." },
    { keys: "Ctrl+A, Ctrl+E", does: "Go to the start or end of the line." },
    { keys: "Ctrl+B, Ctrl+F", does: "Move one character." },
    { keys: "Alt+B, Alt+F", does: "Move one word." },
    { keys: "Ctrl+D, Alt+D", does: "Delete the character or the word after the cursor." },
    { keys: "Alt+Backspace", does: "Delete the word before the cursor." },
    { keys: "Ctrl+W", does: "Delete back to the previous space." },
    { keys: "Ctrl+K, Ctrl+U", does: "Delete to the end or the start of the line." },
    { keys: "Ctrl+Y", does: "Put back the deleted text." },
    { keys: "Ctrl+_", does: "Undo." },
    { keys: "Ctrl+P, Ctrl+N, Up, Down", does: "Move between lines. On the first or last line: past messages." },
  ],
  vim: [
    { keys: "Esc (insert mode)", does: "Go to normal mode." },
    { keys: "i, a, A, I, o", does: "Go to insert mode: at the cursor, after it, at line end, at line start, on a new line." },
    { keys: "h, l, w, b, 0, $", does: "Move: character, word, line start, line end." },
    { keys: "j, k", does: "Move between lines. On the first or last line: past messages." },
    { keys: "x, dw, dd", does: "Delete the character, the word or the line." },
    { keys: "u", does: "Undo." },
    { keys: "Enter", does: "Send the message. In insert mode, Shift+Enter or Option+Enter makes a new line." },
    { keys: "Esc (normal mode)", does: "Stop the agent." },
  ],
  classic: [
    { keys: "Enter", does: "Send the message." },
    { keys: "Left, Right", does: "Move one character." },
    { keys: "Backspace", does: "Delete the character before the cursor." },
    { keys: "Up, Down", does: "Past messages." },
  ],
};

export function keyRows(style: InputKeys): KeyRow[] {
  const esc = style === "vim" ? "Esc twice in insert mode, once in normal mode" : "Esc";
  return [
    ...STYLE_ROWS[style],
    { keys: esc, does: "Stop the agent. If the agent is idle, Esc clears the input." + (style === "vim" ? " In vim style it does not clear." : "") },
    { keys: "Tab", does: "Complete a / command." },
    { keys: "Shift+Tab", does: "Change the mode." },
    { keys: "Ctrl+O", does: "Show or hide the housekeeping steps." },
    { keys: "Ctrl+C twice", does: "Quit." },
    { keys: "! at the start", does: "Send the message now, while the agent works." },
  ];
}

export function footerKeys(style: InputKeys, vim: VimMode, busy: boolean): string {
  if (style === "mac") return "Shift+Enter: new line · Option+←→: word · Cmd+←→: line · /help: all keys";
  if (style === "emacs") return "Alt+Enter: new line · Ctrl+A/E: line · Alt+B/F: word · /help: all keys";
  if (style === "vim")
    return vim === "insert"
      ? `-- INSERT -- · Esc: normal mode${busy ? " · Esc again: stop the agent" : ""}`
      : `-- NORMAL -- · i: insert${busy ? " · Esc: stop the agent" : ""}`;
  return "";
}
