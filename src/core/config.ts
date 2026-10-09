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
  headless: boolean;
  planFirst?: boolean | "on" | "off";
  pilot?: boolean | "on" | "off";
  referenceMode?: "compare" | "blind";
  openImages?: "on" | "off";
  permissions: Record<string, "allow" | "ask" | "deny">;
  permissionMode: "ask" | "bypass";
  messages: "after-step" | "queue";
  hooks: Partial<Record<HookEvent, { matcher?: string; command: string[] }[]>>;
  notify: { ntfy?: string };
  export_xlsx: "on" | "off" | boolean;
  animations?: "on" | "off";
  footer_hints?: "full" | "short" | "off";
  figure_formats: string;
  output_folder: string;
  defaultAdapters: string[];
  input_keys: "mac" | "emacs" | "vim" | "classic";
  text_style: "ste" | "plain";
}

export const DEFAULTS: Settings = {
  model: "claude",
  referee: "same",
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
  headless: false,
  permissions: {},
  permissionMode: "ask",
  messages: "after-step",
  hooks: {},
  notify: {},
  export_xlsx: "on",
  figure_formats: "png,svg",
  output_folder: "cuvette",
  defaultAdapters: ["tables"],
  input_keys: "mac",
  text_style: "ste",
};

export function xlsxOn(s: Pick<Settings, "export_xlsx">): boolean {
  return s.export_xlsx !== false && s.export_xlsx !== "off";
}

function readJson(path: string): Partial<Settings> {
  if (!existsSync(path)) return {};
  let s: Partial<Settings> & { permissions?: unknown };
  try {
    s = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
  if (typeof s.permissions === "string") {
    if (s.permissions !== "bypass" && s.permissions !== "ask") throw new Error(`settings file ${path}: "permissions" must be "bypass", "ask" or an object of rules`);
    const { permissions, ...rest } = s;
    return { ...rest, permissionMode: permissions };
  }
  return s as Partial<Settings>;
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
