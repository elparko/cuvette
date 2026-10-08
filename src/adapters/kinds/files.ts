import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import type { Args, Tool, ToolContext, ToolOutput } from "../../core/types.ts";
import type { AdapterRuntime } from "../runtime.ts";
import { decorate, inflight, makeRuntime, outputFile, tablePreview, validateArgs, type KindContext } from "./common.ts";

export function globToRegex(pattern: string): RegExp {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      re += ".*";
      i++;
    } else if (ch === "*") re += "[^/]*";
    else if (ch === "?") re += "[^/]";
    else re += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, "i");
}

export function matchFiles(folder: string, pattern: string): string[] {
  const re = globToRegex(pattern.replaceAll("\\", "/"));
  const deep = pattern.includes("**") || pattern.includes("/");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (deep) walk(p);
      } else if (e.isFile()) {
        const rel = relative(folder, p).split(/[\\/]/).join("/");
        if (re.test(deep ? rel : e.name)) out.push(p);
      }
    }
  };
  walk(folder);
  return out.sort();
}

function readAt(fd: number, pos: number, len: number): Buffer {
  const b = Buffer.alloc(len);
  const n = readSync(fd, b, 0, len, pos);
  return b.subarray(0, n);
}

export function imageInfo(path: string): Record<string, unknown> {
  const fd = openSync(path, "r");
  try {
    const head = readAt(fd, 0, 32);
    if (head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      const channels: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
      return { format: "PNG", width: head.readUInt32BE(16), height: head.readUInt32BE(20), bit_depth: head[24], channels: channels[head[25]] ?? 0 };
    }
    if (head[0] === 0xff && head[1] === 0xd8) {
      let pos = 2;
      for (let guard = 0; guard < 500; guard++) {
        const m = readAt(fd, pos, 10);
        if (m.length < 4 || m[0] !== 0xff) break;
        const marker = m[1];
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { format: "JPEG", width: m.readUInt16BE(7), height: m.readUInt16BE(5), bit_depth: m[4], channels: m[9] };
        }
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
          pos += 2;
          continue;
        }
        pos += 2 + m.readUInt16BE(2);
      }
      throw new Error("no frame header found in the JPEG file");
    }
    const le = head.toString("ascii", 0, 2) === "II";
    if ((le || head.toString("ascii", 0, 2) === "MM") && (le ? head.readUInt16LE(2) : head.readUInt16BE(2)) === 42) {
      const u16 = (b: Buffer, o: number) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
      const u32 = (b: Buffer, o: number) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
      const info: Record<string, unknown> = { format: "TIFF" };
      let pages = 0;
      let ifd = u32(head, 4);
      while (ifd && pages < 100000) {
        const count = u16(readAt(fd, ifd, 2), 0);
        const body = readAt(fd, ifd + 2, count * 12 + 4);
        if (pages === 0) {
          for (let i = 0; i < count; i++) {
            const o = i * 12;
            const tag = u16(body, o);
            const type = u16(body, o + 2);
            const n = u32(body, o + 4);
            const val = type === 3 ? u16(body, o + 8) : u32(body, o + 8);
            if (tag === 256) info.width = val;
            else if (tag === 257) info.height = val;
            else if (tag === 258) info.bit_depth = n === 1 ? val : u16(readAt(fd, u32(body, o + 8), 2), 0);
            else if (tag === 277) info.channels = val;
          }
          info.channels ??= 1;
        }
        pages++;
        ifd = u32(body, count * 12);
      }
      info.pages = pages;
      return info;
    }
    throw new Error("the file is not a PNG, JPEG or TIFF image");
  } finally {
    closeSync(fd);
  }
}

const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((done) => {
  const t = setTimeout(done, ms);
  signal.addEventListener("abort", () => { clearTimeout(t); done(); }, { once: true });
});

export function startFiles(c: KindContext): AdapterRuntime {
  const live = inflight();
  const specs: { name: string; title: string; description: string; readOnly?: boolean; properties: Record<string, unknown>; required: string[]; run(a: Args, signal: AbortSignal): Promise<ToolOutput> | ToolOutput }[] = [
    {
      name: "list_files",
      title: "List files",
      description: "List the files in a folder that match a pattern. The pattern can use * and ?. Use ** to search sub-folders.",
      properties: { folder: { type: "string" }, pattern: { type: "string", default: "*" } },
      required: ["folder"],
      run(a) {
        const folder = resolve(String(a.folder));
        if (!existsSync(folder) || !statSync(folder).isDirectory()) return { ok: false, error: `${folder} is not a folder` };
        const files = matchFiles(folder, String(a.pattern));
        const rows = files.map((p) => {
          const s = statSync(p);
          return [relative(folder, p), s.size, s.mtime.toISOString()];
        });
        return {
          ok: true,
          summary: `${files.length} file(s) in ${folder} match ${a.pattern}.`,
          data: { files: files.map((p, i) => ({ path: p, size: rows[i][1], modified: rows[i][2] })) },
          table: { columns: ["name", "size", "modified"], rows: rows.slice(0, 12), n_rows: rows.length },
          metrics: { n_files: files.length },
          manualRoute: `Open the folder ${folder} and look for files that match ${a.pattern}`,
          fidelity: "close",
        };
      },
    },
    {
      name: "read_table",
      title: "Read a table",
      description: "Read a CSV or TSV file and show its columns and first rows.",
      properties: { path: { type: "string" }, max_rows: { type: "integer", minimum: 1, maximum: 1000, default: 12 } },
      required: ["path"],
      run(a) {
        const path = resolve(String(a.path));
        if (!existsSync(path)) return { ok: false, error: `${path} does not exist` };
        const table = tablePreview(readFileSync(path, "utf8"), path, Number(a.max_rows));
        return {
          ok: true,
          summary: `${basename(path)}: ${table.n_rows} rows, ${table.columns.length} columns.`,
          table,
          metrics: { n_rows: table.n_rows, n_columns: table.columns.length },
          outputs: [{ path, kind: "table", name: basename(path) }],
          manualRoute: `Open ${path} in a spreadsheet program`,
          fidelity: "close",
        };
      },
    },
    {
      name: "image_info",
      title: "Read image header",
      description: "Read the size and bit depth of a PNG, TIFF or JPEG image from its header.",
      properties: { path: { type: "string" } },
      required: ["path"],
      run(a) {
        const path = resolve(String(a.path));
        if (!existsSync(path)) return { ok: false, error: `${path} does not exist` };
        let info: Record<string, unknown>;
        try {
          info = imageInfo(path);
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
        const metrics: Record<string, number> = {};
        for (const [k, v] of Object.entries(info)) if (typeof v === "number") metrics[k] = v;
        return {
          ok: true,
          summary: `${basename(path)}: ${info.format} ${info.width} x ${info.height}, ${info.bit_depth}-bit, ${info.channels} channel(s).`,
          data: info,
          metrics,
          outputs: [outputFile(path)],
          manualRoute: `Open ${path} in an image viewer and read the image properties`,
          fidelity: "close",
        };
      },
    },
    {
      name: "wait_for_file",
      title: "Wait for a file",
      description: "Wait until a file that matches the pattern appears or changes in the folder after this call starts.",
      properties: { folder: { type: "string" }, pattern: { type: "string", default: "*" }, timeout_s: { type: "number", minimum: 0, maximum: 3600, default: 60 } },
      required: ["folder"],
      async run(a, signal) {
        const folder = resolve(String(a.folder));
        if (!existsSync(folder)) return { ok: false, error: `${folder} is not a folder` };
        const start = Date.now();
        const deadline = start + Number(a.timeout_s) * 1000;
        for (;;) {
          const hit = matchFiles(folder, String(a.pattern)).find((p) => statSync(p).mtimeMs >= start - 5);
          if (hit) {
            return {
              ok: true,
              summary: `Found ${basename(hit)} after ${((Date.now() - start) / 1000).toFixed(1)} s.`,
              data: { path: hit },
              outputs: [outputFile(hit)],
              manualRoute: `Wait in ${folder} for a file that matches ${a.pattern}`,
              fidelity: "close",
            };
          }
          if (signal.aborted) return { ok: false, error: "the wait was cancelled" };
          if (Date.now() >= deadline) return { ok: false, error: `no file that matches ${a.pattern} appeared in ${folder} within ${a.timeout_s} s` };
          await sleep(200, signal);
        }
      },
    },
  ];
  const tools: Tool[] = specs.map((s) => {
    const schema = { type: "object", properties: s.properties, required: s.required, additionalProperties: false };
    return decorate(c, { read_only: true, approval: false }, {
      name: s.name,
      title: s.title,
      description: s.description,
      inputSchema: schema,
      async execute(raw: Args, ctx: ToolContext) {
        const v = validateArgs(schema, raw);
        if (v.error) return { ok: false, error: v.error };
        try {
          return await live.track(ctx.signal, async (signal) => s.run(v.args, signal));
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
    });
  });
  return makeRuntime(c, { tools: () => tools, cancel: () => live.cancel(), close: () => live.cancel() });
}
