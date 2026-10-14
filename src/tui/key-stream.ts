import { appendFileSync } from "node:fs";
import { Readable } from "node:stream";

export const ESC_WAIT_MS = 40;
export const PASTE_WAIT_MS = 5000;
const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";
const MOUSE_X10 = /\x1b\[M[\s\S]{3}/g;

export function partialTail(s: string): number {
  const i = s.lastIndexOf("\x1b");
  if (i < 0) return 0;
  const t = s.slice(i);
  const open = t === "\x1b" || /^\x1b\[[\x30-\x3f]*[\x20-\x2f]*$/.test(t) || /^\x1bO[\d;]*$/.test(t) || /^\x1b\[M[\s\S]{0,2}$/.test(t);
  if (!open) return 0;
  return s.length - (i > 0 && s[i - 1] === "\x1b" ? i - 1 : i);
}

type Tty = NodeJS.ReadStream & { setRawMode(on: boolean): unknown };

export function keyStream(real: Tty, logPath?: string, waitMs = ESC_WAIT_MS, pasteWaitMs = PASTE_WAIT_MS): NodeJS.ReadStream {
  const t0 = Date.now();
  let held = "";
  let timer: NodeJS.Timeout | undefined;
  let pasteTimer: NodeJS.Timeout | undefined;
  let inPaste = false;
  const out = new Readable({ read() {} }) as unknown as NodeJS.ReadStream & { setRawMode(on: boolean): unknown };
  const log = (tag: string, s: string) => {
    if (!logPath) return;
    try {
      appendFileSync(logPath, `${Date.now() - t0} ${tag} ${JSON.stringify(s)}\n`);
    } catch {}
  };
  const flush = () => {
    timer = undefined;
    const rest = held;
    held = "";
    if (!rest) return;
    track(rest);
    out.push(rest);
    if (inPaste && !pasteTimer) pasteTimer = setTimeout(endPaste, pasteWaitMs);
  };
  const endPaste = () => {
    pasteTimer = undefined;
    inPaste = false;
    out.push(PASTE_END);
  };
  const track = (s: string) => {
    const start = s.lastIndexOf(PASTE_START);
    const end = s.lastIndexOf(PASTE_END);
    if (start > end) inPaste = true;
    else if (end > start) inPaste = false;
  };
  const onData = (data: string | Buffer) => {
    const chunk = String(data);
    log("in", chunk);
    clearTimeout(timer);
    clearTimeout(pasteTimer);
    pasteTimer = undefined;
    const s = held + chunk;
    const n = partialTail(s);
    held = s.slice(s.length - n);
    if (s.length > n) {
      const ready = inPaste || s.includes(PASTE_START) ? s.slice(0, s.length - n) : s.slice(0, s.length - n).replace(MOUSE_X10, "");
      track(ready);
      if (ready) out.push(ready);
    }
    if (held) timer = setTimeout(flush, waitMs);
    if (inPaste) pasteTimer = setTimeout(endPaste, pasteWaitMs);
  };
  Object.assign(out, {
    isTTY: true,
    setRawMode(on: boolean) {
      real.setRawMode(on);
      if (on) {
        real.setEncoding("utf8");
        if (!real.listeners("data").includes(onData as never)) real.on("data", onData);
        real.resume();
      } else {
        clearTimeout(timer);
        clearTimeout(pasteTimer);
        held = "";
        inPaste = false;
        real.off("data", onData);
        real.pause();
      }
      return out;
    },
    ref: () => (real.ref(), out),
    unref: () => (real.unref(), out),
  });
  return out;
}

export function terminalStdin(env: Record<string, string | undefined> = process.env): NodeJS.ReadStream {
  const stdin = process.stdin as Tty;
  if (!stdin.isTTY) return stdin;
  return keyStream(stdin, env.CUVETTE_KEYLOG);
}
