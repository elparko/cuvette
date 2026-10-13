import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { folderTrusted, projectSettings, safeOnly } from "./trust.ts";
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
  promptCache: "off" | "5m" | "1h";
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
  show_thinking: "on" | "off" | boolean;
  animations?: "on" | "off";
  footer_hints?: "full" | "short" | "off";
  figure_formats: string;
  output_folder: string;
  defaultAdapters: string[];
  input_keys: "mac" | "emacs" | "vim" | "classic";
  text_style: "ste" | "plain";
  phi_check: "on" | "off" | boolean;
  local_model?: string;
}

export const DEFAULTS: Settings = {
  model: "claude",
  referee: "same",
  mode: "watch",
  maxSteps: 40,
  guidance: true,
  autoResume: true,
  reviseOnFindings: true,
  effort: "auto",
  promptCache: "5m",
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
  show_thinking: "on",
  figure_formats: "png,svg",
  output_folder: "cuvette",
  defaultAdapters: ["tables"],
  input_keys: "mac",
  text_style: "ste",
  phi_check: "on",
};

export function xlsxOn(s: Pick<Settings, "export_xlsx">): boolean {
  return s.export_xlsx !== false && s.export_xlsx !== "off";
}

export function thinkingShown(s: Pick<Settings, "show_thinking">): boolean {
  return s.show_thinking !== false && s.show_thinking !== "off";
}

function readJson(path: string): Partial<Settings> {
  if (!existsSync(path)) return {};
  let s: Partial<Settings> & { permissions?: unknown };
  const text = readFileSync(path, "utf8");
  if (!text.trim()) return {};
  try {
    s = JSON.parse(text);
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error(`settings file ${path} must hold one JSON object, in braces { }`);
  if (typeof s.permissions === "string") {
    if (s.permissions !== "bypass" && s.permissions !== "ask") throw new Error(`settings file ${path}: "permissions" must be "bypass", "ask" or an object of rules`);
    const { permissions, ...rest } = s;
    return wellTyped({ ...rest, permissionMode: permissions });
  }
  return wellTyped(s as Partial<Settings>);
}

// The loader ignores a value of the wrong type (a number for a folder name, a list for the rules) and uses the default.
function wellTyped(s: Partial<Settings>): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    const d = (DEFAULTS as unknown as Record<string, unknown>)[k];
    const either = k === "export_xlsx" || k === "phi_check";
    const ok =
      d === undefined || v === undefined ? true
      : either ? typeof v === "string" || typeof v === "boolean"
      : Array.isArray(d) ? Array.isArray(v) && v.every((x) => typeof x === "string")
      : typeof d === "object" ? !!v && typeof v === "object" && !Array.isArray(v)
      : typeof v === typeof d;
    if (ok) out[k] = v;
  }
  return out as Partial<Settings>;
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
  let s = merge(DEFAULTS, readJson(join(cuvetteHome(), "settings.json")));
  const trusted = folderTrusted(cwd);
  for (const layer of projectSettings(cwd)) s = merge(s, wellTyped((trusted ? layer : safeOnly(layer)) as Partial<Settings>));
  s = { ...s, phi_check: readJson(join(cuvetteHome(), "settings.json")).phi_check ?? DEFAULTS.phi_check };
  return merge(s, Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)));
}
