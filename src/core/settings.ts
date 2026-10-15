import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { ensureHome, writeFileAtomic } from "./atomic.ts";
import { harnessWrite } from "./harness-writes.ts";
import { dirname, join } from "node:path";
import { accessAll } from "../adapters/access.ts";
import { CATALOG_DIR, cuvetteHome } from "../adapters/manifest.ts";
import { DEFAULT_REGISTRY } from "../adapters/registry.ts";
import { CLAUDE_MODELS, modelSpecProblem } from "../providers/index.ts";
import { DEFAULTS, settingFits, wellTyped } from "./config.ts";
import { antLogin, claudeKey, elabftwConfig } from "./credentials.ts";
import { budgetUsd, monthStart, totalSpend } from "./spend.ts";
import { afterProjectWrite, endTrustOnce, folderLines, folderTrusted, oneLine, projectAdapterDirs, projectSettingFiles, safeOnly, SAFE_KEYS, stateLabel, trustFolder, trustOnce, trustStatus, untrustFolder, type TrustChoice } from "./trust.ts";
import { folderHasNoPatientData, setFolderNoPatientData } from "./phi.ts";

export type Scope = "session" | "user" | "project";
export type Source = "default" | "user" | "project" | "session" | "env" | "ant" | "";

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
  setTrust?(choice: TrustChoice): Promise<string>;
}

export interface SettingCtx {
  cwd: string;
  env?: Record<string, string | undefined>;
  session?: SettingSession;
  ui?: { details(): boolean; toggleDetails(): void };
}

export interface SettingDef {
  name: string;
  unit?: string;
  min?: number;
  path?: boolean;
  group: string;
  label: string;
  help: string;
  brief?: string;
  scopes: Scope[];
  choices?: () => string[];
  free?: boolean;
  number?: boolean;
  list?: boolean;
  def?: unknown;
  lockedInTurn?: boolean;
  secret?: boolean;
  edit?: "key" | "eln" | "programs";
  shown?: (ctx: SettingCtx) => boolean;
  read?: (ctx: SettingCtx) => { value: string; source: Source; file?: string };
  details?: (ctx: SettingCtx) => string[];
  confirm?: (value: string) => string | undefined;
  write?: (ctx: SettingCtx, value: unknown) => void;
}

export interface SettingRow {
  def: SettingDef;
  value: string;
  source: Source;
  file?: string;
  locked: boolean;
}

const ALL: Scope[] = ["session", "user", "project"];
const MODELS = () => CLAUDE_MODELS.map((m) => m.spec);
export const EFFORTS = ["auto", "low", "medium", "high", "xhigh", "max"];

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
    help: "How much the Claude model thinks before it acts. More effort costs more. auto: medium for Haiku, high for the other Claude models.",
    scopes: ALL,
    choices: () => EFFORTS,
    lockedInTurn: true,
    shown: (ctx) => String(resolve(find("model")!, ctx).value).startsWith("claude"),
  },
  {
    name: "promptCache",
    group: "Model",
    label: "Prompt cache",
    help: "5m: Claude keeps the history for 5 minutes, and each step in a turn reads it at a low price. 1h: the cache stays for 1 hour, so a pause between your messages costs less; each write costs more. off: each step pays the full price for the whole history.",
    scopes: ALL,
    choices: () => ["5m", "1h", "off"],
    lockedInTurn: true,
    shown: (ctx) => String(resolve(find("model")!, ctx).value).startsWith("claude"),
  },
  {
    name: "show_thinking",
    group: "Model",
    label: "Show thinking",
    help: "on: the Claude model sends a summary of its thinking at each step. The app shows it, and the record keeps it. off: the model sends no summary, so the text of each step comes sooner. The bill is the same.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
    lockedInTurn: true,
    shown: (ctx) => String(resolve(find("model")!, ctx).value).startsWith("claude"),
  },
  {
    name: "mode",
    group: "Session",
    label: "Mode",
    help: "watch: the agent runs the steps. follow: you run each step. teach: you run the steps and the agent explains. plan: the agent plans only.",
    brief: "Who runs the steps: the agent, you, or you with the agent as a teacher.",
    scopes: ALL,
    choices: () => ["watch", "follow", "teach", "plan"],
  },
  {
    name: "planFirst",
    group: "Session",
    label: "Plan first",
    help: "on: in an interactive session the agent writes a proposed analysis, and you confirm it before any step runs. off: the agent starts at once; /plan <request> still plans one request.",
    brief: "The agent proposes the analysis, and you confirm it before a step runs.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "pilot",
    group: "Session",
    label: "Pilot",
    help: "on: a step that processes many files waits until you approve the method on one sample. Bypass permissions does not skip it. off: batch steps run at once.",
    brief: "A step for many files waits until you approve the method on one sample.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "openImages",
    group: "Session",
    label: "Open QC images",
    help: "on: the demonstration on a sample opens its QC images on screen. off: it only saves them in figures/. CUVETTE_NO_OPEN=1 also turns it off.",
    brief: "The demonstration on a sample opens its QC images on screen.",
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
    brief: "The transcript shows each housekeeping step, such as a file read.",
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
    brief: "When a message that you type during a turn goes to the agent.",
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
    name: "text_style",
    group: "Session",
    label: "Text style",
    help: "ste: the agent writes in Simplified Technical English (ASD-STE100): short sentences, active voice, simple words. The review marks long or passive sentences in the answer. plain: no text rules in the prompt and no text review.",
    scopes: ALL,
    choices: () => ["ste", "plain"],
  },
  {
    name: "output_folder",
    group: "Outputs",
    label: "Save results in",
    help: "Where each session saves its results, report and record. A name, such as cuvette, is a folder in the project folder. An absolute path, such as a lab share, is used as given. A project setting wins over a user setting. The change applies to the next session.",
    scopes: ["user", "project"],
    free: true,
    path: true,
    def: "cuvette",
  },
  {
    name: "export_xlsx",
    group: "Outputs",
    label: "Save results.xlsx",
    help: "on: at the end of each turn with results, the harness writes results.xlsx in the output folder, with a summary, one sheet for each table, the steps and the files.",
    brief: "Each turn with results writes results.xlsx in the output folder.",
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
    name: "databook_author",
    group: "Outputs",
    label: "Data book author",
    help: "The name on the title page of each data book. If it is not set, the data book uses the name in git config user.name.",
    scopes: ["user", "project"],
    free: true,
  },
  {
    name: "citation_style",
    group: "Outputs",
    label: "Citation style",
    help: "apa or vancouver. The style of the references in /cite, the data book, the report, the protocol and results.xlsx. Many medical journals use vancouver.",
    brief: "The style of the references in each output.",
    scopes: ["session", "user", "project"],
    choices: () => ["apa", "vancouver"],
    def: "apa",
  },
  {
    name: "databook_paper",
    group: "Outputs",
    label: "Data book paper size",
    help: "a4 or letter. The default follows the system locale.",
    brief: "The paper size of each data book.",
    scopes: ["user", "project"],
    choices: () => ["a4", "letter"],
    def: localePaper(),
  },
  {
    name: "permissionMode",
    group: "Permissions",
    label: "Permission mode",
    help: "ask: a card asks before each tool call that needs permission. bypass: the harness allows these calls without a card. Deny rules still deny.",
    brief: "Ask before each tool call that needs permission, or allow it without a card.",
    scopes: ALL,
    choices: () => ["ask", "bypass"],
  },
  {
    name: "folder_trust",
    group: "Permissions",
    label: "Folder trust",
    help: "Whether Cuvette uses the settings, hooks and adapters in the .ga or .cuvette folder of this project folder. trusted: always, until a file changes. trust once: this session only. not trusted: Cuvette ignores them. /trust shows what the folder contains.",
    scopes: ["user"],
    choices: () => [...TRUST_CHOICES],
    read: (ctx) => {
      const t = trustStatus(ctx.cwd);
      return { value: stateLabel(t), source: t.state === "trusted" ? "user" : t.state === "once" ? "session" : "" };
    },
    details: (ctx) => {
      const t = trustStatus(ctx.cwd);
      return [`Folder: ${oneLine(t.scan.folder)}`, ...(t.state === "none" ? ["This folder has no settings, hooks or adapters that need trust."] : folderLines(t.scan))];
    },
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
    name: "adapter_registry",
    group: "Adapters",
    label: "Adapter registry",
    help: "The address of the index.json that cuvette adapter add reads to find an adapter by name. A web address, a file:// address or a file path. Only the user settings file sets it.",
    scopes: ["user"],
    free: true,
    def: DEFAULT_REGISTRY,
  },
  {
    name: "programs",
    group: "Adapters",
    label: "Programs",
    help: "Install, update, remove, turn on or off each adapter and its program, and set a custom program path. Enter opens the Programs panel. On the command line: cuvette programs.",
    scopes: [],
    edit: "programs",
    read: (ctx) => {
      const all = Object.entries(accessAll(ctx.cwd));
      const off = all.filter(([, a]) => a.off).length;
      const paths = all.filter(([, a]) => a.path).length;
      return { value: `${off} off, ${paths} custom ${paths === 1 ? "path" : "paths"}`, source: all.length ? "user" : "default" };
    },
    details: (ctx) => Object.entries(accessAll(ctx.cwd)).map(([n, a]) => `${n}: ${[a.off ? "off" : "", a.path ? `path ${a.path}` : "", a.network === undefined ? "" : a.network ? "network allowed" : "network blocked", a.code === false ? "own code blocked" : ""].filter(Boolean).join(", ")}`),
  },
  {
    name: "adapter_folders",
    group: "Adapters",
    label: "Adapter folders",
    help: "The folders where the harness looks for adapters, in this order.",
    scopes: [],
    read: (ctx) => ({ value: `${adapterFolders(ctx.cwd).filter((f) => existsSync(f)).length} of ${adapterFolders(ctx.cwd).length} folders exist`, source: "default" }),
    details: (ctx) => {
      const ignored = new Set(folderTrusted(ctx.cwd) ? [] : projectAdapterDirs(ctx.cwd));
      return adapterFolders(ctx.cwd).map((f) => `${f}${!existsSync(f) ? "  (missing)" : ignored.has(f) ? "  (ignored: the folder is not trusted)" : ""}`);
    },
  },
  {
    name: "animations",
    group: "Display",
    label: "Animations",
    help: "on: the status line shows a spinner while the agent thinks or runs a step. off: the status line does not move. A terminal that is not interactive never shows the spinner.",
    brief: "The status line shows a spinner while the agent works.",
    scopes: ALL,
    choices: () => ["on", "off"],
    def: "on",
  },
  {
    name: "footer_hints",
    group: "Display",
    label: "Footer hints",
    help: "full: the mode with its explanation, the model and the key hints. short: only the mode name and the model. off: no footer, except Esc stops this step while a step runs. The bypass permissions marker and Waiting for your answer show in each value. Ctrl+T changes the value for this session. The change applies at once.",
    brief: "How much the footer under the input box shows. Ctrl+T changes it.",
    scopes: ALL,
    choices: () => ["full", "short", "off"],
    def: "full",
  },
  {
    name: "phi_check",
    group: "Patient data",
    label: "Patient data check",
    brief: "Look for patient identifiers before content goes to a cloud model.",
    help: "on: before content goes to a cloud model, the harness looks for patient identifiers, such as names, dates of birth and record numbers. If it finds one, a card asks what to do. The check is a help, not a guarantee. off: no check.",
    scopes: ["session", "user"],
    choices: () => ["on", "off"],
    confirm: (v) => (v === "off" ? "With the check off, patient identifiers can go to a cloud model with no card. Choose off again to confirm." : undefined),
  },
  {
    name: "no_patient_data",
    group: "Patient data",
    label: "No patient data here",
    brief: "Skip the patient identifier check in this folder.",
    help: "yes: the harness does not check the content of this project folder for patient identifiers. Cuvette keeps this answer in your user settings, with the folder trust.",
    scopes: ["user"],
    choices: () => ["no", "yes"],
    read: (ctx) => (folderHasNoPatientData(ctx.cwd) ? { value: "yes", source: "user" } : { value: "no", source: "default" }),
    write: (ctx, v) => setFolderNoPatientData(ctx.cwd, v === "yes"),
    confirm: (v) => (v === "yes" ? "With yes, the harness does not check this folder for patient identifiers. Choose yes again to confirm." : undefined),
  },
  {
    name: "local_model",
    group: "Patient data",
    label: "Local model",
    brief: "The local model that the patient data card offers.",
    help: "The local model that the patient data card offers, for example ollama:qwen3:8b. The data stays on this computer.",
    scopes: ALL,
    free: true,
  },
  {
    name: "claude_key",
    group: "Account and spend",
    label: "Claude API key",
    help: "The key for the Claude API. The screen never shows it. ANTHROPIC_API_KEY in the shell wins over the saved key. Enter opens the key card. On the command line: cuvette key.",
    brief: "The key for the Claude API. The screen never shows it.",
    scopes: [],
    secret: true,
    edit: "key",
    read: (ctx) => {
      const k = claudeKey(ctx.env ?? process.env);
      if (k.from === "env") return { value: "set by environment", source: "env" };
      if (k.from === "file") return { value: "saved", source: "user" };
      return antLogin(ctx.env ?? process.env) ? { value: "signed in with ant auth login", source: "ant" } : { value: "not set", source: "" };
    },
  },
  {
    name: "budgetUsd",
    group: "Account and spend",
    label: "Budget per month",
    help: "The harness stops Claude requests when the spend this month reaches this limit, in US dollars. At 80% of the limit, the agent asks if you want to continue, switch to a cheaper model or stop. CUVETTE_BUDGET_USD wins over the setting. Type off to remove it.",
    brief: "Claude requests stop when the spend this month reaches this limit.",
    scopes: ["user"],
    number: true,
    unit: "US dollars",
    min: 0.01,
    read: (ctx) => {
      const env = ctx.env ?? process.env;
      const b = budgetUsd(env);
      if (b === undefined) return { value: "no limit", source: "" };
      return { value: `$${b.toFixed(2)}`, source: Number(env.CUVETTE_BUDGET_USD) > 0 ? "env" : "user" };
    },
  },
  {
    name: "spend_month",
    group: "Account and spend",
    label: "Spent this month",
    help: "Claude spend since the first day of this month, at list prices. cuvette spend shows each day.",
    scopes: [],
    read: () => ({ value: `$${totalSpend(monthStart()).toFixed(2)}`, source: "" }),
  },
  {
    name: "elabftw_url",
    group: "Lab notebook",
    label: "eLabFTW address",
    help: "The address of your eLabFTW server. Enter opens the eLabFTW card. On the command line: cuvette eln setup.",
    brief: "The address of your eLabFTW server.",
    scopes: [],
    edit: "eln",
    read: () => ({ value: elabftwConfig()?.url ?? "not set", source: elabftwConfig() ? "user" : "" }),
  },
  {
    name: "elabftw_key",
    group: "Lab notebook",
    label: "eLabFTW API key",
    help: "The key for eLabFTW. The screen never shows it. Enter opens the eLabFTW card.",
    brief: "The key for eLabFTW. The screen never shows it.",
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
  return scope === "user" ? join(cuvetteHome(), "settings.json") : join(cwd, ".cuvette", "settings.json");
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8");
  if (!text.trim()) return {};
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch (e) {
    throw new Error(`settings file ${path} is not valid JSON: ${(e as Error).message}`);
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`settings file ${path} must hold one JSON object, in braces { }`);
  return v as Record<string, unknown>;
}

function layers(cwd: string): [Source, Record<string, unknown>, string][] {
  const user = settingsPath("user", cwd);
  const { permissions, ...rest } = readJson(user);
  const layer = typeof permissions === "string" ? { ...rest, permissionMode: permissions } : permissions === undefined ? rest : { ...rest, permissions };
  const trusted = folderTrusted(cwd);
  return [["user", layer, user], ...projectSettingFiles(cwd).map((f): [Source, Record<string, unknown>, string] => ["project", trusted ? f.layer : safeOnly(f.layer), f.path])];
}

export function adapterFolders(cwd: string): string[] {
  return [...projectAdapterDirs(cwd), join(cuvetteHome(), "adapters"), CATALOG_DIR];
}

const TRUST_CHOICES = ["trusted", "trust once", "not trusted"] as const;

async function changeTrust(ctx: SettingCtx, raw: unknown): Promise<{ old: unknown; value: unknown; note?: string }> {
  const value = String(raw ?? "").trim();
  if (!TRUST_CHOICES.includes(value as never)) throw new Error(`Folder trust must be one of: ${TRUST_CHOICES.join(", ")}.`);
  const old = stateLabel(trustStatus(ctx.cwd));
  const choice: TrustChoice = value === "trusted" ? "trust" : value === "trust once" ? "once" : "no";
  if (ctx.session?.setTrust) return { old, value, note: await ctx.session.setTrust(choice) };
  if (choice === "trust") trustFolder(ctx.cwd);
  else if (choice === "no") untrustFolder(ctx.cwd);
  else {
    trustOnce(ctx.cwd);
    endTrustOnce(ctx.cwd);
    return { old, value: old, note: "Trust once applies only to an open session. Use it in a session, or use --trust-folder." };
  }
  return { old, value };
}

export function permissionRules(cwd: string): { pattern: string; rule: string; source: Source }[] {
  const out = new Map<string, { pattern: string; rule: string; source: Source }>();
  for (const [source, layer] of layers(cwd))
    for (const [pattern, rule] of Object.entries(wellTyped({ permissions: layer.permissions } as never).permissions ?? {})) out.set(pattern, { pattern, rule, source });
  return [...out.values()];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "not set";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "none";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function fileValue(d: SettingDef, cwd: string): { value: unknown; source: Source; file?: string } {
  let value = d.def ?? (DEFAULTS as unknown as Record<string, unknown>)[d.name];
  let source: Source = "default";
  let file: string | undefined;
  for (const [s, layer, p] of layers(cwd))
    if (d.name in layer && settingFits(d.name, layer[d.name]) && (s === "user" || d.name !== "phi_check")) {
      value = layer[d.name];
      source = s;
      file = p;
    }
  return { value, source, file };
}

export function resolve(d: SettingDef, ctx: SettingCtx): { value: unknown; source: Source; file?: string } {
  if (d.read) {
    const r = d.read(ctx);
    if (r.file || (r.source !== "user" && r.source !== "project")) return r;
    const f = fileValue(d, ctx.cwd);
    return f.source === r.source ? { ...r, file: f.file } : r;
  }
  const f = fileValue(d, ctx.cwd);
  const s = ctx.session;
  const live = !s ? undefined : d.name === "mode" || d.name === "permissionMode" ? s[d.name] : s.settings && d.name in s.settings ? s.settings[d.name] : undefined;
  if (live !== undefined && !same(live, f.value)) return { value: live, source: "session" };
  return f;
}

export function describe(ctx: SettingCtx): SettingRow[] {
  return SETTINGS.filter((d) => !d.shown || d.shown(ctx)).map((d) => {
    const r = resolve(d, ctx);
    return { def: d, value: show(r.value), source: r.source, file: r.file, locked: !!(d.lockedInTurn && ctx.session?.busy) };
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
  if (d.name === "model" || (d.name === "referee" && v !== "same" && v !== "none")) {
    const problem = modelSpecProblem(v);
    if (problem) throw new Error(`${d.label} cannot be "${v}". ${problem}`);
  }
  return v;
}

function writeSetting(path: string, name: string, value: unknown): void {
  const data = readJson(path);
  if (name === "permissionMode" && typeof data.permissions === "string") delete data.permissions;
  if (value === undefined) delete data[name];
  else data[name] = value;
  if (dirname(path) === cuvetteHome()) ensureHome();
  mkdirSync(dirname(path), { recursive: true });
  harnessWrite(path, () => writeFileAtomic(path, JSON.stringify(data, null, 2) + "\n"));
}

export function recordSetting(session: SettingSession | undefined, d: SettingDef, old: unknown, value: unknown, scope: Scope): void {
  session?.record.append("setting", d.secret ? { name: d.name, scope, change: "changed" } : { name: d.name, old: old ?? null, new: value ?? null, scope });
}

export async function changeSetting(ctx: SettingCtx, name: string, raw: unknown, scope: Scope): Promise<{ old: unknown; value: unknown; note?: string }> {
  const d = find(name);
  if (!d) throw new Error(`No setting named ${name}. Type cuvette config to see the names.`);
  if (name === "folder_trust") return changeTrust(ctx, raw);
  if (d.secret || !d.scopes.length) throw new Error(`${d.label} cannot change here. ${d.help}`);
  if (!d.scopes.includes(scope)) throw new Error(`${d.label} can be saved only in: ${d.scopes.map(scopeLabel).join(", ")}.`);
  if (d.lockedInTurn && ctx.session?.busy) throw new Error(`${d.label} cannot change until the turn ends.`);
  if (name === "output_folder" && (typeof raw !== "string" || !raw.trim())) throw new Error(`${d.label} must be a folder: a name in the project folder, such as cuvette, or an absolute path.`);
  const value = parseValue(d, raw);
  const old = name === "details" || d.write ? d.read!(ctx).value : d.read ? fileValue(d, ctx.cwd).value : resolve(d, ctx).value;
  const s = ctx.session;
  if (name === "details" && value !== old) ctx.ui?.toggleDetails();
  if (!d.read) await applyLive(ctx, name, value);
  if (d.write) d.write(ctx, value);
  else if (scope === "project") {
    const before = trustStatus(ctx.cwd).state;
    writeSetting(settingsPath(scope, ctx.cwd), name, value);
    afterProjectWrite(ctx.cwd, before);
  } else if (scope !== "session") writeSetting(settingsPath(scope, ctx.cwd), name, value);
  recordSetting(s, d, old, value, scope);
  const after = d.read ? undefined : fileValue(d, ctx.cwd);
  const env = name === "budgetUsd" && Number((ctx.env ?? process.env).CUVETTE_BUDGET_USD) > 0;
  const note = env
    ? "CUVETTE_BUDGET_USD in this shell still wins."
    : scope === "project" && !folderTrusted(ctx.cwd) && !SAFE_KEYS.has(name)
      ? "This folder is not trusted, so Cuvette ignores its project settings. /trust shows the folder."
      : scope !== "session" && after && !same(after.value, value)
      ? `The ${after.source} setting (${show(after.value)}) still wins in new sessions in this folder.`
      : undefined;
  return { old, value, note };
}

async function applyLive(ctx: SettingCtx, name: string, value: unknown): Promise<void> {
  const s = ctx.session;
  if (!s) return;
  if (name === "mode") s.setMode(value as never);
  else if (name === "permissionMode" && s.setPermissionMode) s.setPermissionMode(value as never);
  else if (s.applySetting) await s.applySetting(name, value);
  else if (s.settings) s.settings[name] = value;
}

export function canReset(r: { def: SettingDef; source: Source; locked?: boolean }): boolean {
  if (r.def.secret || !r.def.scopes.length || r.locked) return false;
  return r.source === "session" || ((r.source === "user" || r.source === "project") && (!r.def.read || r.def.name === "budgetUsd"));
}

export async function resetSetting(ctx: SettingCtx, name: string): Promise<{ old: unknown; value: unknown; from: Scope }> {
  const d = find(name);
  if (!d) throw new Error(`No setting named ${name}.`);
  if (d.lockedInTurn && ctx.session?.busy) throw new Error(`${d.label} cannot change until the turn ends.`);
  const now = resolve(d, ctx);
  if (!canReset({ def: d, source: now.source })) throw new Error(`${d.label} has no saved value to reset.`);
  if (d.name === "details") {
    await changeSetting(ctx, "details", "off", "session");
    return { old: "on", value: "off", from: "session" };
  }
  const old = d.read ? fileValue(d, ctx.cwd).value : now.value;
  if (now.source !== "session") writeSetting(now.file ?? settingsPath(now.source as "user" | "project", ctx.cwd), name, undefined);
  const after = fileValue(d, ctx.cwd);
  if (!d.read) await applyLive(ctx, name, after.value);
  const from = now.source as Scope;
  recordSetting(ctx.session, d, old, after.value, from);
  return { old, value: after.value, from };
}

export function scopeLabel(scope: Scope | Source): string {
  return scope === "session" ? "this session only" : scope === "user" ? "user settings" : scope === "project" ? "project settings" : scope === "env" ? "environment" : scope;
}
