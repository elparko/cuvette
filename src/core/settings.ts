import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CATALOG_DIR, gaHome } from "../adapters/manifest.ts";
import { CLAUDE_MODELS } from "../providers/index.ts";
import { DEFAULTS } from "./config.ts";
import { claudeKey, elabftwConfig } from "./credentials.ts";
import { budgetUsd, monthStart, totalSpend } from "./spend.ts";

export type Scope = "session" | "user" | "project";
export type Source = "default" | "user" | "project" | "session" | "env" | "";

export interface SettingSession {
  mode: string;
  permissionMode?: string;
  setPermissionMode?(m: never): void;
  busy: boolean;
  settings?: Record<string, unknown>;
  adapterInfo: { name: string; version: string }[];
  record: { append(kind: "setting", data: Record<string, unknown>): unknown };
  setMode(mode: never): void;
  applySetting?(name: string, value: unknown): Promise<void> | void;
}

export interface SettingCtx {
  cwd: string;
  env?: Record<string, string | undefined>;
  session?: SettingSession;
  ui?: { details(): boolean; toggleDetails(): void };
}

export interface SettingDef {
  name: string;
  group: string;
  label: string;
  help: string;
  scopes: Scope[];
  choices?: () => string[];
  free?: boolean;
  number?: boolean;
  list?: boolean;
  def?: unknown;
  lockedInTurn?: boolean;
  secret?: boolean;
  edit?: "key" | "eln";
  shown?: (ctx: SettingCtx) => boolean;
  read?: (ctx: SettingCtx) => { value: string; source: Source };
  details?: (ctx: SettingCtx) => string[];
}

export interface SettingRow {
  def: SettingDef;
  value: string;
  source: Source;
  locked: boolean;
}

const ALL: Scope[] = ["session", "user", "project"];
const MODELS = () => CLAUDE_MODELS.map((m) => m.spec);
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export type Paper = "a4" | "letter";
const LETTER_REGIONS = new Set(["US", "CA", "MX", "PH", "CL", "CO", "VE", "GT", "CR", "PR", "PA", "DO", "SV", "NI", "BZ"]);

export function localePaper(env: Record<string, string | undefined> = process.env): Paper {
  const raw = env.LC_PAPER || env.LC_ALL || env.LANG || Intl.DateTimeFormat().resolvedOptions().locale;
  const region = /[-_]([A-Z]{2})\b/.exec(raw ?? "")?.[1];
  return region && LETTER_REGIONS.has(region) ? "letter" : "a4";
}

export const SETTINGS: SettingDef[] = [
  {
    name: "model",
    group: "Model",
    label: "Model",
    help: "The model that does the analysis. The change starts with the next message.",
    scopes: ALL,
    choices: MODELS,
    free: true,
    lockedInTurn: true,
  },
  {
    name: "referee",
    group: "Model",
    label: "Referee model",
    help: "The model that checks each final answer. \"same\" uses the analysis model. \"none\" stops the check.",
    scopes: ALL,
    choices: () => ["same", "none", ...MODELS()],
    free: true,
    lockedInTurn: true,
  },
  {
    name: "effort",
    group: "Model",
    label: "Effort",
    help: "How much the Claude model thinks before it acts. More effort costs more.",
    scopes: ALL,
    choices: () => EFFORTS,
    lockedInTurn: true,
    shown: (ctx) => String(resolve(find("model")!, ctx).value).startsWith("claude"),
  },
  {
    name: "mode",
    group: "Session",
    label: "Mode",
    help: "watch: the agent runs the steps. follow: you run each step. teach: you run the steps and the agent explains. plan: the agent plans only.",
    scopes: ALL,
    choices: () => ["watch", "follow", "teach", "plan"],
  },
  {
    name: "planFirst",
    group: "Session",
    label: "Plan first",
    help: "on: in an interactive session the agent writes a proposed analysis, and you confirm it before any step runs. off: the agent starts at once; /plan <request> still plans one request.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "pilot",
    group: "Session",
    label: "Pilot",
    help: "on: a step that processes many files waits until you approve the method on one sample. Bypass permissions does not skip it. off: batch steps run at once.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "openImages",
    group: "Session",
    label: "Open QC images",
    help: "on: the demonstration on a sample opens its QC images on screen. off: it only saves them in figures/. GA_NO_OPEN=1 also turns it off.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "referenceMode",
    group: "Session",
    label: "Reference",
    help: "What the agent sees of an earlier analysis or hand count. compare: the pilot compares with it. blind: the harness hides it until the batch is done, then compares every sample.",
    scopes: ALL,
    choices: () => ["compare", "blind"],
    def: "compare",
  },
  {
    name: "details",
    group: "Session",
    label: "Show details",
    help: "on: the transcript shows each housekeeping step, such as a file read. off: these steps collapse into one dim line. Ctrl+O does the same.",
    scopes: ["session"],
    choices: () => ["on", "off"],
    shown: (ctx) => !!ctx.ui,
    read: (ctx) => (ctx.ui!.details() ? { value: "on", source: "session" } : { value: "off", source: "default" }),
  },
  {
    name: "messages",
    group: "Session",
    label: "Messages during a turn",
    help: "after-step: a message that you type while the agent works goes to the agent after the current step. queue: the message waits until the turn ends. A message that starts with ! stops the current step and goes at once.",
    scopes: ALL,
    choices: () => ["after-step", "queue"],
  },
  {
    name: "input_keys",
    group: "Session",
    label: "Input keys",
    help: "The keys of the terminal input box and of every text field on the cards. mac: Option and Cmd keys as in a Mac text field, for example Option+Backspace deletes a word. emacs: the readline keys. vim: a normal mode and an insert mode. classic: a one-line box with the plain keys. The change applies at once. /help shows the keys.",
    scopes: ALL,
    choices: () => ["mac", "emacs", "vim", "classic"],
  },
  {
    name: "output_folder",
    group: "Session",
    label: "Save results in",
    help: "Where each session saves its results, report and record. A name, such as cuvette, is a folder in the project folder. An absolute path, such as a lab share, is used as given. A project setting wins over a user setting. The change applies to the next session.",
    scopes: ["user", "project"],
    free: true,
    def: "cuvette",
  },
  {
    name: "animations",
    group: "Display",
    label: "Animations",
    help: "on: the status line shows a spinner while the agent thinks or runs a step. off: the status line does not move. A terminal that is not interactive never shows the spinner.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "export_xlsx",
    group: "Outputs",
    label: "Save results.xlsx",
    help: "on: at the end of each turn with results, the harness writes results.xlsx in the output folder, with a summary, one sheet for each table, the steps and the files.",
    scopes: ALL,
    choices: () => ["on", "off"],
  },
  {
    name: "figure_formats",
    group: "Outputs",
    label: "Figure formats",
    help: "The file types for each figure in figures/. PNG is always at 300 dpi. SVG, PDF or EPS adds a vector copy of each matplotlib figure.",
    scopes: ALL,
    choices: () => ["png,svg", "png,pdf", "png,svg,pdf", "png"],
    free: true,
  },
  {
    name: "permissionMode",
    group: "Permissions",
    label: "Permission mode",
    help: "ask: a card asks before each tool call that needs permission. bypass: the harness allows these calls without a card. Deny rules still deny.",
    scopes: ALL,
    choices: () => ["ask", "bypass"],
  },
  {
    name: "permissions",
    group: "Permissions",
    label: "Allow and deny rules",
    help: "Rules that allow, ask for or deny a tool. Edit them in the settings file.",
    scopes: [],
    read: (ctx) => {
      const rules = permissionRules(ctx.cwd);
      const n = (r: string) => rules.filter((x) => x.rule === r).length;
      const parts = [`${n("allow")} allow`, `${n("deny")} deny`, ...(n("ask") ? [`${n("ask")} ask`] : [])];
      const from = [...new Set(rules.map((r) => r.source))];
      return { value: parts.join(", "), source: from.length === 1 ? from[0]! : from.length ? "project" : "default" };
    },
    details: (ctx) => [
      ...permissionRules(ctx.cwd).map((r) => `${r.rule.padEnd(6)}${r.pattern}  (${scopeLabel(r.source)})`),
      `Edit: ${settingsPath("project", ctx.cwd)} or ${settingsPath("user", ctx.cwd)}`,
    ],
  },
  {
    name: "adapters",
    group: "Adapters",
    label: "Loaded adapters",
    help: "The programs that this session controls. Load more with --adapter, or the agent asks to load one.",
    scopes: [],
    shown: (ctx) => !!ctx.session,
    read: (ctx) => ({ value: ctx.session!.adapterInfo.map((a) => `${a.name} ${a.version}`).join(", ") || "none", source: "session" }),
  },
  {
    name: "defaultAdapters",
    group: "Adapters",
    label: "Adapters in every session",
    help: "Adapters that each new session loads at the start, separated by commas. Type none for no adapter. The benchmark does not use this setting.",
    scopes: ["user", "project"],
    free: true,
    list: true,
  },
  {
    name: "adapter_folders",
    group: "Adapters",
    label: "Adapter folders",
    help: "The folders where the harness looks for adapters, in this order.",
    scopes: [],
    read: (ctx) => ({ value: `${adapterFolders(ctx.cwd).filter((f) => existsSync(f)).length} of ${adapterFolders(ctx.cwd).length} folders exist`, source: "default" }),
    details: (ctx) => adapterFolders(ctx.cwd).map((f) => `${f}${existsSync(f) ? "" : "  (missing)"}`),
  },
  {
    name: "claude_key",
    group: "Account and spend",
    label: "Claude API key",
    help: "The key for the Claude API. The screen never shows it. Enter opens the key card. On the command line: ga key.",
    scopes: [],
    secret: true,
    edit: "key",
    read: (ctx) => {
      const k = claudeKey(ctx.env ?? process.env);
      return k.from === "env" ? { value: "set in ANTHROPIC_API_KEY", source: "env" } : k.from === "file" ? { value: "saved", source: "user" } : { value: "not set", source: "" };
    },
  },
  {
    name: "budgetUsd",
    group: "Account and spend",
    label: "Budget per month",
    help: "The harness stops Claude requests when the spend this month reaches this limit, in US dollars. GA_BUDGET_USD wins over the setting. Type off to remove it.",
    scopes: ["user"],
    number: true,
    read: (ctx) => {
      const env = ctx.env ?? process.env;
      const b = budgetUsd(env);
      if (b === undefined) return { value: "no limit", source: "" };
      return { value: `$${b.toFixed(2)}`, source: Number(env.GA_BUDGET_USD) > 0 ? "env" : "user" };
    },
  },
  {
    name: "spend_month",
    group: "Account and spend",
    label: "Spent this month",
    help: "Claude spend since the first day of this month, at list prices. ga spend shows each day.",
    scopes: [],
    read: () => ({ value: `$${totalSpend(monthStart()).toFixed(2)}`, source: "" }),
  },
  {
    name: "databook_author",
    group: "Data book",
    label: "Data book author",
    help: "The name on the title page of each data book. If it is not set, the data book uses the name in git config user.name.",
    scopes: ["user", "project"],
    free: true,
  },
  {
    name: "databook_paper",
    group: "Data book",
    label: "Data book paper size",
    help: "a4 or letter. The default follows the system locale.",
    scopes: ["user", "project"],
    choices: () => ["a4", "letter"],
    def: localePaper(),
  },
  {
    name: "elabftw_url",
    group: "Lab notebook",
    label: "eLabFTW address",
    help: "The address of your eLabFTW server. Enter opens the eLabFTW card. On the command line: ga eln setup.",
    scopes: [],
    edit: "eln",
    read: () => ({ value: elabftwConfig()?.url ?? "not set", source: elabftwConfig() ? "user" : "" }),
  },
  {
    name: "elabftw_key",
    group: "Lab notebook",
    label: "eLabFTW API key",
    help: "The key for eLabFTW. The screen never shows it. Enter opens the eLabFTW card.",
    scopes: [],
    secret: true,
    edit: "eln",
    read: () => ({ value: elabftwConfig() ? "saved" : "not set", source: elabftwConfig() ? "user" : "" }),
  },
];

export function find(name: string): SettingDef | undefined {
  return SETTINGS.find((d) => d.name === name);
}

export function settingsPath(scope: "user" | "project", cwd: string): string {
  return scope === "user" ? join(gaHome(), "settings.json") : join(cwd, ".ga", "settings.json");
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
}

function layers(cwd: string): [Source, Record<string, unknown>][] {
  const paths = [settingsPath("user", cwd), settingsPath("project", cwd), join(cwd, ".ga", "settings.local.json")];
  return paths.map((p, i) => {
    const { permissions, ...rest } = readJson(p);
    const layer = typeof permissions === "string" ? { ...rest, permissionMode: permissions } : permissions === undefined ? rest : { ...rest, permissions };
    return [i ? "project" : "user", layer];
  });
}

export function adapterFolders(cwd: string): string[] {
  return [join(cwd, ".ga", "adapters"), join(gaHome(), "adapters"), CATALOG_DIR];
}

export function permissionRules(cwd: string): { pattern: string; rule: string; source: Source }[] {
  const out = new Map<string, { pattern: string; rule: string; source: Source }>();
  for (const [source, layer] of layers(cwd))
    for (const [pattern, rule] of Object.entries((layer.permissions as Record<string, string>) ?? {})) out.set(pattern, { pattern, rule, source });
  return [...out.values()];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "not set";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "none";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function fileValue(d: SettingDef, cwd: string): { value: unknown; source: Source } {
  let value = d.def ?? (DEFAULTS as unknown as Record<string, unknown>)[d.name];
  let source: Source = "default";
  for (const [s, layer] of layers(cwd))
    if (d.name in layer) {
      value = layer[d.name];
      source = s;
    }
  return { value, source };
}

export function resolve(d: SettingDef, ctx: SettingCtx): { value: unknown; source: Source } {
  if (d.read) return d.read(ctx);
  const f = fileValue(d, ctx.cwd);
  const s = ctx.session;
  const live = !s ? undefined : d.name === "mode" || d.name === "permissionMode" ? s[d.name] : s.settings && d.name in s.settings ? s.settings[d.name] : undefined;
  if (live !== undefined && !same(live, f.value)) return { value: live, source: "session" };
  return f;
}

export function describe(ctx: SettingCtx): SettingRow[] {
  return SETTINGS.filter((d) => !d.shown || d.shown(ctx)).map((d) => {
    const r = resolve(d, ctx);
    return { def: d, value: show(r.value), source: r.source, locked: !!(d.lockedInTurn && ctx.session?.busy) };
  });
}

export function parseValue(d: SettingDef, raw: unknown): unknown {
  if (d.number) {
    if (raw === "off" || raw === undefined) return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`${d.label} must be a number above 0, or off.`);
    return n;
  }
  if (d.list) {
    const items = (Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(",")).map((x) => x.trim()).filter(Boolean);
    return items.length === 1 && items[0] === "none" ? [] : items;
  }
  const v = String(raw ?? "").trim();
  if (!v) throw new Error(`${d.label} needs a value.`);
  const choices = d.choices?.() ?? [];
  if (!d.free && choices.length && !choices.includes(v)) throw new Error(`${d.label} must be one of: ${choices.join(", ")}.`);
  return v;
}

function writeSetting(path: string, name: string, value: unknown): void {
  const data = readJson(path);
  if (name === "permissionMode" && typeof data.permissions === "string") delete data.permissions;
  if (value === undefined) delete data[name];
  else data[name] = value;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function recordSetting(session: SettingSession | undefined, d: SettingDef, old: unknown, value: unknown, scope: Scope): void {
  session?.record.append("setting", d.secret ? { name: d.name, scope, change: "changed" } : { name: d.name, old: old ?? null, new: value ?? null, scope });
}

export async function changeSetting(ctx: SettingCtx, name: string, raw: unknown, scope: Scope): Promise<{ old: unknown; value: unknown; note?: string }> {
  const d = find(name);
  if (!d) throw new Error(`No setting named ${name}. Type ga config to see the names.`);
  if (d.secret || !d.scopes.length) throw new Error(`${d.label} cannot change here. ${d.help}`);
  if (!d.scopes.includes(scope)) throw new Error(`${d.label} can be saved only in: ${d.scopes.map(scopeLabel).join(", ")}.`);
  if (d.lockedInTurn && ctx.session?.busy) throw new Error(`${d.label} is locked until the turn ends.`);
  if (name === "output_folder" && (typeof raw !== "string" || !raw.trim())) throw new Error(`${d.label} must be a folder: a name in the project folder, such as cuvette, or an absolute path.`);
  const value = parseValue(d, raw);
  const old = name === "details" ? d.read!(ctx).value : d.read ? fileValue(d, ctx.cwd).value : resolve(d, ctx).value;
  const s = ctx.session;
  if (name === "details" && value !== old) ctx.ui?.toggleDetails();
  if (s && !d.read) {
    if (name === "mode") s.setMode(value as never);
    else if (name === "permissionMode" && s.setPermissionMode) s.setPermissionMode(value as never);
    else if (s.applySetting) await s.applySetting(name, value);
    else if (s.settings) s.settings[name] = value;
  }
  if (scope !== "session") writeSetting(settingsPath(scope, ctx.cwd), name, value);
  recordSetting(s, d, old, value, scope);
  const after = d.read ? undefined : fileValue(d, ctx.cwd);
  const env = name === "budgetUsd" && Number((ctx.env ?? process.env).GA_BUDGET_USD) > 0;
  const note = env
    ? "GA_BUDGET_USD in this shell still wins."
    : scope !== "session" && after && !same(after.value, value)
      ? `The ${after.source} setting (${show(after.value)}) still wins in new sessions in this folder.`
      : undefined;
  return { old, value, note };
}

export function scopeLabel(scope: Scope | Source): string {
  return scope === "session" ? "this session only" : scope === "user" ? "user settings" : scope === "project" ? "project settings" : scope === "env" ? "environment" : scope;
}
