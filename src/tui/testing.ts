import { PassThrough, Writable } from "node:stream";

export interface Harness {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  type(text: string): void;
  frames: string[];
  all(): string;
  last(): string;
}

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

export const plain = (s: string) => s.replace(ANSI, "");

export function makeHarness(columns = 100): Harness {
  const input = new PassThrough() as unknown as NodeJS.ReadStream & PassThrough;
  Object.assign(input, { isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input });
  const frames: string[] = [];
  const out = new Writable({
    write(chunk, _enc, cb) {
      frames.push(chunk.toString());
      cb();
    },
  }) as unknown as NodeJS.WriteStream;
  Object.assign(out, { isTTY: true, columns, rows: 40 });
  return {
    stdin: input,
    stdout: out,
    type: (t) => void input.write(t),
    frames,
    all: () => plain(frames.join("")),
    last: () => plain([...frames].reverse().find((f) => plain(f).trim().length > 20) ?? ""),
  };
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function until(cond: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("timeout waiting for condition");
    await sleep(20);
  }
}
