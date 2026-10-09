import { PassThrough, Writable } from "node:stream";

export interface Harness {
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  type(text: string): void;
  resize(columns: number, rows: number): void;
  frames: string[];
  all(): string;
  last(): string;
  reset(): void;
  term: Term;
}

export class Term {
  scrollback: string[] = [];
  screen: string[][];
  x = 0;
  y = 0;
  wraps = 0;
  painted: string[] = [];
  private shown: string[] = [];

  constructor(
    public cols: number,
    public rows: number,
  ) {
    this.screen = Array.from({ length: rows }, () => []);
  }

  private feed() {
    this.y++;
    if (this.y < this.rows) return;
    const top = this.row(0);
    if (top && top !== this.shown[0]) this.painted.push(top);
    this.scrollback.push(top);
    this.screen.shift();
    this.shown.shift();
    this.screen.push([]);
    this.y = this.rows - 1;
  }

  row(i: number): string {
    return (this.screen[i] ?? []).map((c) => c ?? " ").join("").trimEnd();
  }

  write(data: string) {
    this.parse(data);
    this.screen.forEach((_, i) => {
      const r = this.row(i);
      if (r !== this.shown[i] && r) this.painted.push(r);
      this.shown[i] = r;
    });
  }

  private parse(data: string) {
    const re = /\x1b\[([?0-9;]*)([A-Za-z])|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[78=>]|\n|\r|[^\x1b\n\r]/gsu;
    for (const m of data.matchAll(re)) {
      const t = m[0];
      if (t === "\n") {
        this.x = 0;
        this.feed();
      } else if (t === "\r") this.x = 0;
      else if (m[2]) this.csi(m[1] ?? "", m[2]);
      else if (!t.startsWith("\x1b")) {
        if (this.x >= this.cols) {
          this.wraps++;
          this.x = 0;
          this.feed();
        }
        this.screen[this.y]![this.x++] = t;
      }
    }
  }

  private csi(args: string, op: string) {
    if (args.startsWith("?")) return;
    const n = args === "" ? 1 : Number(args.split(";")[0]) || 1;
    const line = this.screen[this.y]!;
    if (op === "A") this.y = Math.max(0, this.y - n);
    else if (op === "B") this.y = Math.min(this.rows - 1, this.y + n);
    else if (op === "C") this.x = Math.min(this.cols - 1, this.x + n);
    else if (op === "D") this.x = Math.max(0, this.x - n);
    else if (op === "E") (this.y = Math.min(this.rows - 1, this.y + n)), (this.x = 0);
    else if (op === "F") (this.y = Math.max(0, this.y - n)), (this.x = 0);
    else if (op === "G") this.x = Math.min(this.cols - 1, n - 1);
    else if (op === "H" || op === "f") {
      const [r, c] = args.split(";").map((v) => Number(v) || 1);
      this.y = Math.min(this.rows - 1, (r ?? 1) - 1);
      this.x = Math.min(this.cols - 1, (c ?? 1) - 1);
    } else if (op === "K") {
      const mode = Number(args || 0);
      if (mode === 0) line.length = Math.min(line.length, this.x);
      else if (mode === 1) for (let i = 0; i <= this.x; i++) line[i] = " ";
      else this.screen[this.y] = [];
    } else if (op === "J") {
      const mode = Number(args || 0);
      if (mode === 3) this.scrollback = [];
      else if (mode === 2) {
        this.screen = Array.from({ length: this.rows }, () => []);
        this.wraps = 0;
      }
      else if (mode === 0) {
        line.length = Math.min(line.length, this.x);
        for (let i = this.y + 1; i < this.rows; i++) this.screen[i] = [];
      }
    }
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    for (const r of this.screen) if (r.length > cols) r.length = cols;
    while (this.screen.length > rows) {
      if (this.y > 0 && this.screen.length - 1 > this.y) this.screen.pop();
      else {
        this.scrollback.push(this.screen.shift()!.join("").trimEnd());
        this.y--;
      }
    }
    while (this.screen.length < rows) this.screen.push([]);
    this.rows = rows;
    this.y = Math.max(0, Math.min(this.y, rows - 1));
    this.x = Math.min(this.x, cols - 1);
  }

  lines(): string[] {
    const out = [...this.scrollback, ...this.screen.map((_, i) => this.row(i))];
    while (out.length && out[out.length - 1] === "") out.pop();
    return out;
  }

  view(): string {
    return this.screen.map((_, i) => this.row(i)).join("\n");
  }
}

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

export const plain = (s: string) => s.replace(ANSI, "");

export function makeHarness(columns = 100, rows = 40): Harness {
  const input = new PassThrough() as unknown as NodeJS.ReadStream & PassThrough;
  Object.assign(input, { isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input });
  const frames: string[] = [];
  const term = new Term(columns, rows);
  const out = new Writable({
    write(chunk, _enc, cb) {
      frames.push(chunk.toString());
      term.write(chunk.toString());
      cb();
    },
  }) as unknown as NodeJS.WriteStream;
  Object.assign(out, { isTTY: true, columns, rows });
  return {
    stdin: input,
    stdout: out,
    type: (t) => void setTimeout(() => input.write(t), 25),
    resize: (c, r) => {
      Object.assign(out, { columns: c, rows: r });
      term.resize(c, r);
      out.emit("resize");
    },
    frames,
    all: () => term.painted.join("\n"),
    last: () => term.view(),
    reset: () => {
      frames.length = 0;
      term.painted = [];
    },
    term,
  };
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function until(cond: () => boolean, ms = 15000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("timeout waiting for condition");
    await sleep(20);
  }
}
