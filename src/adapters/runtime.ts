import { mkdirSync } from "node:fs";
import type { Tool } from "../core/types.ts";
import type { LoadedAdapter } from "./manifest.ts";
import { locate } from "./locate.ts";
import { placeholders, type Dirs, type KindContext } from "./kinds/common.ts";
import { startCli } from "./kinds/cli.ts";
import { startFiles } from "./kinds/files.ts";
import { startHttp } from "./kinds/http.ts";
import { startPython } from "./kinds/python.ts";
import { startScreen } from "./kinds/screen.ts";
import { startScript } from "./kinds/script.ts";
import { startMcp } from "./mcp.ts";

export interface AdapterRuntime {
  adapter: LoadedAdapter;
  programVersion: string;
  instructions: string;
  running: boolean;
  tools(): Promise<Tool[]>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}

export async function startAdapter(adapter: LoadedAdapter, dirs: { workDir: string; sessionDir: string }): Promise<AdapterRuntime> {
  mkdirSync(dirs.workDir, { recursive: true });
  mkdirSync(dirs.sessionDir, { recursive: true });
  const found = await locate(adapter.manifest);
  const c: KindContext = {
    adapter,
    dirs: dirs as Dirs,
    ph: placeholders(adapter, dirs, found.path),
    programPath: found.path,
    programVersion: found.version,
    how: found.how,
  };
  switch (adapter.manifest.connection.kind) {
    case "mcp": return startMcp(c);
    case "cli": return startCli(c);
    case "python": return startPython(c);
    case "script": return startScript(c);
    case "http": return startHttp(c);
    case "files": return startFiles(c);
    case "screen": return startScreen(c);
    case "macro": {
      const spec = "./kinds/macro.ts";
      const mod = await import(spec);
      return mod.startMacro(adapter, dirs);
    }
  }
}
