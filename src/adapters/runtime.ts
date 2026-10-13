import { mkdirSync } from "node:fs";
import type { Tool } from "../core/types.ts";
import type { LoadedAdapter } from "./manifest.ts";
import { locate, quickLocate, saveVersion, START_VERSION_TIMEOUT_MS, type Located } from "./locate.ts";
import { expand, placeholders, type Dirs, type KindContext } from "./kinds/common.ts";
import { startCli } from "./kinds/cli.ts";
import { startFiles } from "./kinds/files.ts";
import { startHttp } from "./kinds/http.ts";
import { startPython } from "./kinds/python.ts";
import { startScreen } from "./kinds/screen.ts";
import { startScript } from "./kinds/script.ts";

export interface AdapterRuntime {
  adapter: LoadedAdapter;
  programVersion: string;
  programPath?: string;
  interpreter?: string[];
  instructions: string;
  running: boolean;
  checked?: Promise<Located>;
  startPath?: string;
  tools(): Promise<Tool[]>;
  cancel(): Promise<void>;
  close(): Promise<void>;
  warm?(load: boolean): void;
}

// With quick, a Python adapter starts before its version command ends. The worker waits for the command.
export async function startAdapter(adapter: LoadedAdapter, dirs: { workDir: string; sessionDir: string }, opts: { quick?: boolean } = {}): Promise<AdapterRuntime> {
  mkdirSync(dirs.workDir, { recursive: true });
  mkdirSync(dirs.sessionDir, { recursive: true });
  const m = adapter.manifest;
  const quick = !!opts.quick && m.connection.kind === "python" && m.locate.version_command.length > 0;
  const found = quick ? quickLocate(m) : await locate(m, adapter.root);
  const c: KindContext = {
    adapter,
    dirs: dirs as Dirs,
    ph: placeholders(adapter, dirs, found.path),
    programPath: found.path,
    programVersion: found.version,
    how: found.how,
  };
  if (quick) {
    const checked = locate(m, adapter.root, undefined, START_VERSION_TIMEOUT_MS).catch((): Located => ({ path: found.path, version: found.version, how: found.how }));
    c.ready = checked.then((f) => {
      if (f.path !== c.programPath) Object.assign(c.ph, placeholders(adapter, dirs, f.path));
      Object.assign(c, { programPath: f.path, programVersion: f.version, how: f.how });
      if (f.path && f.measured) saveVersion(m, f.path, f.version);
    });
    const rt = startPython(c);
    rt.startPath = found.path;
    rt.checked = c.ready.then(async () => {
      const f = await checked;
      Object.assign(rt, { programPath: f.path, programVersion: f.version, interpreter: m.connection.interpreter.map((a) => expand(a, c.ph)) });
      return f;
    });
    return rt;
  }
  switch (m.connection.kind) {
    case "mcp": return (await import("./mcp.ts")).startMcp(c);
    case "cli": return startCli(c);
    case "python": return startPython(c);
    case "script": return startScript(c);
    case "http": return startHttp(c);
    case "files": return startFiles(c);
    case "screen": return startScreen(c);
    case "macro": {
      const mod = await import("./kinds/macro.ts");
      return mod.startMacro(adapter, dirs);
    }
  }
}
