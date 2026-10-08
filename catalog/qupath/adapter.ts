import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAdapter, type AdapterModule, type LoadedAdapter } from "../../src/adapters/manifest.ts";
import type { Args } from "../../src/core/types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

let adapterCache: LoadedAdapter | undefined;
function adapter(): LoadedAdapter {
  adapterCache ??= loadAdapter(HERE);
  return adapterCache;
}

function manualRoute(tool: string, args: Args): string | undefined {
  const entry = adapter().mapEntry(tool, args);
  if (!entry) return undefined;
  const defaults = new Map(entry.params.map((p) => [p.arg, p.ui_default]));
  const fill = (s: string) =>
    s.replace(/\{([a-z_0-9]+)\}/g, (all, k: string) => {
      const v = args[k] ?? defaults.get(k);
      return v === undefined || v === "" ? "the default" : String(v);
    });
  return [entry.route, ...entry.steps.map((s) => `  ${fill(s)}`)].join("\n");
}

const mod: AdapterModule = { manualRoute };

export default mod;
