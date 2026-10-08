import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gaHome } from "../adapters/manifest.ts";
import type { HookEvent, Mode } from "./types.ts";

export interface Settings {
  model: string;
  referee: string;
  mode: Mode;
  maxSteps: number;
  guidance: boolean;
  autoResume: boolean;
  reviseOnFindings: boolean;
  effort: string;
  numCtx: number;
  think: boolean;
  maxResultChars: number;
  toolExposure: "all" | "search" | "auto";
  networkForScripts: boolean;
  askWaits: boolean;
  permissions: Record<string, "allow" | "ask" | "deny">;
  hooks: Partial<Record<HookEvent, { matcher?: string; command: string[] }[]>>;
  notify: { ntfy?: string };
}

export const DEFAULTS: Settings = {
  model: "claude",
  referee: "",
  mode: "watch",
  maxSteps: 40,
  guidance: true,
  autoResume: true,
  reviseOnFindings: true,
  effort: "high",
  numCtx: 32768,
  think: false,
  maxResultChars: 20000,
  toolExposure: "auto",
  networkForScripts: false,
  askWaits: true,
  permissions: {},
  hooks: {},
  notify: {},
};

function readJson(path: string): Partial<Settings> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
}

function merge(a: Settings, b: Partial<Settings>): Settings {
  return {
    ...a,
    ...b,
    permissions: { ...a.permissions, ...(b.permissions ?? {}) },
    hooks: { ...a.hooks, ...(b.hooks ?? {}) },
    notify: { ...a.notify, ...(b.notify ?? {}) },
  };
}

export function loadSettings(cwd: string, overrides: Partial<Settings> = {}): Settings {
  let s = DEFAULTS;
  for (const p of [join(gaHome(), "settings.json"), join(cwd, ".ga", "settings.json"), join(cwd, ".ga", "settings.local.json")])
    s = merge(s, readJson(p));
  return merge(s, Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)));
}
