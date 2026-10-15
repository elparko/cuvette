import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { folderTrusted, projectSettingFiles, safeOnly } from "./trust.ts";
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

export const MAX_CALLS_PER_REPLY = 16;
export const PARALLEL_CALL_LIMIT = 4;

export function xlsxOn(s: Pick<Settings, "export_xlsx">): boolean {
  return s.export_xlsx !== false && s.export_xlsx !== "off";
}

export function thinkingShown(s: Pick<Settings, "show_thinking">): boolean {
  return s.show_thinking !== false && s.show_thinking !== "off";
}

const ENUMS: Record<string, readonly string[]> = {
  mode: ["watch", "follow", "teach", "plan"],
  promptCache: ["off", "5m", "1h"],
  toolExposure: ["all", "search", "auto"],
  permissionMode: ["ask", "bypass"],
  messages: ["after-step", "queue"],
  effort: ["auto", "low", "medium", "high", "xhigh", "max"],
  input_keys: ["mac", "emacs", "vim", "classic"],
  text_style: ["ste", "plain"],
  referenceMode: ["compare", "blind"],
  openImages: ["on", "off"],
  animations: ["on", "off"],
  footer_hints: ["full", "short", "off"],
};
const SWITCHES = ["export_xlsx", "show_thinking", "phi_check", "planFirst", "pilot"];
const NUMBERS = ["maxSteps", "numCtx", "maxResultChars"];
const TEXTS = ["model", "referee", "figure_formats", "output_folder", "local_model"];
const enumOf = (name: string): readonly string[] | undefined => (Object.hasOwn(ENUMS, name) ? ENUMS[name] : undefined);
const RULES = ["allow", "ask", "deny"];

const defaultOf = (name: string): unknown => (Object.hasOwn(DEFAULTS, name) ? (DEFAULTS as unknown as Record<string, unknown>)[name] : undefined);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function expected(name: string): string | undefined {
  const d = defaultOf(name);
  const choices = enumOf(name);
  if (choices) return `one of: ${choices.join(", ")}`;
  if (SWITCHES.includes(name)) return "on, off, true or false";
  if (NUMBERS.includes(name)) return "a number above 0";
  if (TEXTS.includes(name)) return "a text that is not empty";
  if (typeof d === "boolean") return "true or false";
  if (Array.isArray(d)) return "a list of texts";
  if (typeof d === "object") return "an object";
  return undefined;
}

export function settingFits(name: string, v: unknown): boolean {
  if (v === undefined) return true;
  const choices = enumOf(name);
  if (choices) return typeof v === "string" && choices.includes(v);
  if (SWITCHES.includes(name)) return typeof v === "boolean" || v === "on" || v === "off";
  if (NUMBERS.includes(name)) return typeof v === "number" && Number.isFinite(v) && v > 0;
  if (TEXTS.includes(name)) return typeof v === "string" && v.trim() !== "";
  const d = defaultOf(name);
  if (d === undefined) return true;
  if (Array.isArray(d)) return Array.isArray(v) && v.every((x) => typeof x === "string");
  if (typeof d === "object") return isObject(v);
  return typeof v === typeof d;
}

function shown(v: unknown): string {
  const t = JSON.stringify(v) ?? String(v);
  return t.length > 40 ? `${t.slice(0, 39)}…` : t;
}

function readJson(path: string, notes?: string[]): Partial<Settings> {
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
    return wellTyped({ ...rest, permissionMode: permissions }, notes, path);
  }
  return wellTyped(s as Partial<Settings>, notes, path);
}

// The loader ignores a value of the wrong type or outside its choices, and uses the value of the layer before. It adds a note for each value that it ignores.
export function wellTyped(s: Partial<Settings>, notes?: string[], file = "a settings file"): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "__proto__") continue;
    if (k === "permissions" && isObject(v)) {
      const rules: Record<string, unknown> = {};
      for (const [pattern, rule] of Object.entries(v)) {
        if (typeof rule === "string" && RULES.includes(rule)) rules[pattern] = rule;
        else notes?.push(`${file}: the rule for ${pattern} must be allow, ask or deny, not ${shown(rule)}. Cuvette ignores this rule.`);
      }
      out[k] = rules;
    } else if (settingFits(k, v)) out[k] = v;
    else notes?.push(`${file}: ${k} must be ${expected(k)}, not ${shown(v)}. Cuvette ignores this value.`);
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

export function loadSettings(cwd: string, overrides: Partial<Settings> = {}, notes?: string[]): Settings {
  const userFile = join(cuvetteHome(), "settings.json");
  const user = readJson(userFile, notes);
  let s = merge(DEFAULTS, user);
  const trusted = folderTrusted(cwd);
  for (const f of projectSettingFiles(cwd)) s = merge(s, wellTyped((trusted ? f.layer : safeOnly(f.layer)) as Partial<Settings>, notes, f.path));
  s = { ...s, phi_check: user.phi_check ?? DEFAULTS.phi_check };
  return merge(s, Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)));
}
