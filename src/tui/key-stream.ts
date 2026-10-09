import { appendFileSync } from "node:fs";
import { Readable } from "node:stream";

export const ESC_WAIT_MS = 40;

export function partialTail(s: string): number {
  const i = s.lastIndexOf("\x1b");
  if (i < 0) return 0;
  const t = s.slice(i);
  const open = t === "\x1b" || /^\x1b\[[\x30-\x3f]*[\x20-\x2f]*$/.test(t) || /^\x1bO[\d;]*$/.test(t);
  if (!open) return 0;
  return s.length - (i > 0 && s[i - 1] === "\x1b" ? i - 1 : i);
}

type Tty = NodeJS.ReadStream & { setRawMode(on: boolean): unknown };

export function keyStream(real: Tty, logPath?: string, waitMs = ESC_WAIT_MS): NodeJS.ReadStream {
  const t0 = Date.now();
  let held = "";
  let timer: NodeJS.Timeout | undefined;
  const out = new Readable({ read() {} }) as unknown as NodeJS.ReadStream & { setRawMode(on: boolean): unknown };
  const log = (tag: string, s: string) => {
    if (!logPath) return;
    try {
      appendFileSync(logPath, `${Date.now() - t0} ${tag} ${JSON.stringify(s)}\n`);
    } catch {}
  };
  const flush = () => {
    timer = undefined;
    if (held) out.push(held);
    held = "";
  };
  const onData = (data: string | Buffer) => {
    const chunk = String(data);
    log("in", chunk);
    clearTimeout(timer);
    const s = held + chunk;
    const n = partialTail(s);
    held = s.slice(s.length - n);
    if (s.length > n) out.push(s.slice(0, s.length - n));
    if (held) timer = setTimeout(flush, waitMs);
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
