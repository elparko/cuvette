import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { allowAdapter, BLIND_REASON, blindCheck, blindPolicy, pathsIn, setBlindPolicy } from "../adapters/blind.ts";
import { adapterIndex, alternatives, fileTypeHint, filesFor, formatIndex, installHint, programFound, type AdapterSummary, type FoundCache } from "../adapters/catalog.ts";
import { findAdapter, gaHome, type LoadedAdapter } from "../adapters/manifest.ts";
import type { AdapterRuntime } from "../adapters/runtime.ts";
import { makeProvider } from "../providers/index.ts";
import { coreTools, searchTools } from "../tools/core.ts";
import { broadSearch } from "../tools/broad-search.ts";
import { taskTool } from "../tools/task.ts";
import { findPlace, inProject, placeAt, legacyPlace, local, newPlace, outputRoot, outside, provisional, saveIndexRow, titlePlace, type Place } from "./places.ts";
import { changedAnalysis, describeSession, lastTitle } from "./titles.ts";
import { Bus } from "./bus.ts";
import { annotate, checkAnswer, extractNumbers } from "./claims.ts";
import { compact, estimateTokens, needsCompaction, summaryMessage } from "./compaction.ts";
import { folderHasNoPatientData, groupHits, isCloud, isLocal, Masker, phiOn, scanMessages, withheld, type PhiAction, type PhiShown } from "./phi.ts";
import { contextWarning, promptTokens, usageSummary, type UsageSummary } from "./spend.ts";
import { loadSettings, xlsxOn, type Settings } from "./config.ts";
import { outputDir, savedLine, writeResults, type Saved } from "./results.ts";
import { outputFile, type Dirs } from "../adapters/kinds/common.ts";
import { ADAPTER_DECISION, decisionHook, DecisionRecord } from "./decisions.ts";
import { HookRunner } from "./hooks.ts";
import { applyOverlay, labText, propose } from "./labmemory.ts";
import { accessOf, blocksCode, isCodeTool, usable } from "../adapters/access.ts";
import { compareNote, instruction, teachReview, type TeachSummary } from "./modes.ts";
import { batchReason, pilotState, pilotText, type PilotRun } from "./pilot.ts";
import { agreement, agreementText, blandAltmanPng, compareLine, describeCandidate, findReferences, norm, referenceValues, type Candidate, type Pair, type Reference } from "./reference.ts";
import { definitionsOf } from "./plan.ts";
import { goalOnly, matchSettings, settingsOf, type KnownDecision } from "./plan.ts";
import { find as findSetting, resolve as resolveSetting } from "./settings.ts";
import { citationStyle, type CitationStyle } from "./citations.ts";
import { absentStains, groundQuestions, inspectData, type Inspection } from "./inspect.ts";
import { addedSteps, approvedPlan, currentPlan, matchStep, mergePlan, openDecisions, planText, plannedAdapters, readPlan, type AnalysisPlan, type PlanDecision } from "./plan.ts";
import { modeHook, Permissions } from "./permissions.ts";
import { systemPrompt } from "./prompt.ts";
import { activity, makesNode as makesNodeFor, PURPOSE, stepNumbers } from "./housekeeping.ts";
import { QuestionQueue } from "./questions.ts";
import { checkFiles, checkTable, dataCheckText, existsTable, fileInfos, listDataFiles, readCsvTable, type CheckItem, type DataCheck } from "./datacheck.ts";
import { applyEdit, designChecks, groupSummary, readSheet, SAMPLE_COLUMNS, sheetFromFiles, sheetFromTable, sheetTable, writeSheet, type DesignIssue, type SampleRow, type SampleSheet } from "./samples.ts";
import { endTrustOnce, projectSettings, TRUST_OPTIONS, TRUST_TITLE, trustEvidence, trustFolder, trustOnce, trustStatus, trustText, untrustedNotice, untrustFolder, type TrustChoice, type TrustStatus } from "./trust.ts";
import { AnalysisRecord } from "./record.ts";
import { rewindPoints, type RewindResult } from "./rewind.ts";
import { fillFromMethod, loadMethod, methodFrom, methodNote, saveMethod, type Method } from "./methods.ts";
import { branchesOf, branchSession, compareRows, findBranch, openRecord, type BranchInfo } from "./branch.ts";
import { Findings, referee, runChecks } from "./review.ts";
import { runSensitivity } from "./sensitivity.ts";
import { captureEnv, envTarget, type EnvLock, type EnvTarget } from "./envlock.ts";
import { changeRows, fileSha, liveReasons, recordReasons, replacedNode, stepStatus, type Current, type Reason, type RerunData, type StepState } from "./status.ts";
import { scriptPython } from "../tools/run_script.ts";
import {
  ProviderError,
  type Args,
  type Entry,
  type Finding,
  type BusEvent,
  type FindingIn,
  type Message,
  type Mode,
  type ModelInfo,
  type Owner,
  type Part,
  type PlanResponse,
  type ReferenceChoice,
  type Provider,
  type Question,
  type Tool,
  type ToolOutput,
} from "./types.ts";

export type ExportFormat = "html" | "md" | "jsonl" | "pdf" | "protocol" | "script" | "notebook" | "flow" | "eln" | "xlsx";

export interface SessionOptions {
  adapters: string[];
  model?: string;
  referee?: string;
  mode?: Mode;
  cwd?: string;
  id?: string;
  settings?: Partial<Settings>;
  provider?: Provider;
  refereeProvider?: Provider;
  generic?: boolean;
  pick?: boolean;
  interactive?: boolean;
  home?: boolean;
  place?: Place;
  defaults?: boolean;
  trustFolder?: boolean;
  method?: string;
}

interface Pending<T> {
  resolve: (v: T) => void;
}

const ownPurpose = (t: Tool) => Boolean((t.inputSchema.properties as Record<string, unknown> | undefined)?.purpose);

function withPurpose(t: Tool): Record<string, unknown> {
  if (t.source === "adapter" || ownPurpose(t)) return t.inputSchema;
  return { ...t.inputSchema, properties: { ...((t.inputSchema.properties as object) ?? {}), purpose: PURPOSE } };
}

const MODE_NOTE: Record<Mode, string> = {
  watch: "Mode is now watch: you run the steps.",
  follow: "Mode is now follow: the scientist does each program step by hand; the harness shows the manual route, waits, and checks the result. Call one program step at a time.",
  teach: "Mode is now teach: the scientist works in the program. Run only read-only tools. When the scientist says a step is finished, call review_my_steps. It reads the steps that the scientist did and compares them with the decision record. Then explain each difference and why it matters.",
  plan: "Mode is now plan: write a plan with the plan tool. Run only read-only tools.",
};

const PLAN_NOTE = "Plan first, in two phases. Phase 1, clarifying questions: first call inspect_data on the data that the request names (a folder or a file; . for the project folder). The harness refuses clarify before it. Use at most three read-only calls. Then call clarify once. In found, say plainly what the inspection shows, with counts and the real channel names (for example: Each field has 3 images: CH1 is brightfield, CH3 is red fluorescence, and Overlay combines them. There is no nuclear stain.). Ground every question in the inspection: options come from the real channel names, groups, folders and columns. Never ask about a stain, a channel, a group or a column that the inspection did not find. If something is unclear, say what you saw (for example: CH1 looks like brightfield. Is that right?). In questions, ask at most 5 questions about meaning only: what to measure and what counts as one (for example a red-positive cell or a red spot), which groups to compare, what one replicate is, whether earlier results or hand counts exist, and what the output is for. Give options from the data. Leave out a question that the request already answers, and say in answered_by_request what the request says. Never ask about technical settings such as thresholds, segmentation models, size filters, error bars, test families or alpha: you choose those in phase 2. Phase 2, proposed metrics: after the answers, call plan. In definitions, turn the answers into concrete metrics and how each is measured, with the setting values, one short line each (what counts as one n, what counts as one object, what counts as positive, the metric). restatement: only the scientific goal, starting with 'You want:'. Answer setup questions (is the program ready, where the results go) briefly in your message, not in the plan. steps: one line each in plain words, the actions you will run, with every setting filled in: its value and who set it (default, from your answer, or agent). Leave no setting open: if you are not sure, choose a sensible value (agent); the demonstration checks it and the scientist can change it. Also give exclusions with their effects, pilot (the sample for the demonstration, if the method runs on more than one sample), outputs, programs, data, checks and out_of_scope. Write for a scientist: short sentences, plain words. No analysis step runs before the scientist confirms the proposed analysis.";
const DATA_CHECK_NOTE = "When you first read a table or list a data folder, the harness checks the data (missing values, copies, mixed columns, group sizes, extreme values, channels, names, bit depths) and makes a sample sheet. The harness asks the scientist about these problems and the sample sheet in the Questions stage. Do not ask about them in clarify.";
const PLAN_UPDATE_NOTE = "This is a new request in a session with an approved plan. If the request needs analysis steps that are not in the plan, call plan with only what changes: the new steps and the changed sections. The scientist approves the update before a new step runs. If the request needs no new step, answer directly.";
const PILOT_NOTE = "Pilot: before the first step that changes or counts things, say in one sentence how you will check the method on one sample first. A step that processes many files does not run until the scientist approves a pilot: run the method on one sample, save QC images with outlines of what was counted and what was left out, and call pilot_result.";
const TECHNICAL = /\b(threshold|otsu|triangle|segmentation model|cellpose model|stardist|cyto\d|diameter|size (filter|limit|cut-?off)|(minimum|maximum|min|max)\.? (cell |object |particle )?size|pixels? (size|area)|sigma|blur|error bars?|standard error|sem|sd bars|test family|t-?test|wilcoxon|mann-?whitney|anova|alpha|significance level|p-?value cut|one-?sided|two-?sided|sidedness|fdr|bonferroni|correction method|random seed|iterations|normali[sz]ation method)\b/i;
const CHECK_TITLE: Record<string, string> = { missing: "missing values", mixed_type: "text in a number column", decimal_comma: "decimal comma", duplicate_rows: "copied rows", duplicate_ids: "repeated IDs", group_labels: "group names", mixed_units: "units", missing_channel: "missing images", bit_depth: "bit depth", pseudoreplication: "what is n", confounding: "group and batch", too_few: "too few n" };
const CLARIFY_SKIP = "No answer. Use your judgment and say what you chose.";
const SHEET_TITLE = "Sample sheet";
const PROGRAM_REASON = "chosen by the scientist with /program";
const CONTINUE = /^(continue|go on|go ahead|proceed|yes|ok|okay|next|carry on)\b[\s\S]{0,40}$/i;

function shortTitle(text: string): string {
  const first = text.split(/(?<=[?.!])\s/)[0]!.trim();
  return first.length > 60 ? `${first.slice(0, 57).replace(/\s+\S*$/, "")}...` : first;
}

function lastSentence(text: string): string {
  const s = text.trim().split(/(?<=[.!?])\s+/).filter(Boolean).at(-1) ?? "";
  return s.length > 200 ? s.slice(0, 197) + "..." : s;
}

function newId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${randomBytes(2).toString("hex")}`;
}

function extOf(p: string): string {
  const m = /\.[A-Za-z0-9]{1,6}$/.exec(p);
  return m ? m[0].toLowerCase() : "";
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function withoutShown(o: ToolOutput): { value?: unknown; fullTable: boolean } {
  if (o.data === undefined) return { fullTable: false };
  if (!o.data || typeof o.data !== "object" || Array.isArray(o.data)) return { value: o.data, fullTable: false };
  const rest: Record<string, unknown> = { ...(o.data as Record<string, unknown>) };
  const shown: Record<string, unknown> = { ok: o.ok, summary: o.summary, error: o.error, metrics: o.metrics, table: o.table };
  let fullTable = false;
  for (const [k, v] of Object.entries(rest)) {
    const t = v as { columns?: unknown; rows?: unknown } | null;
    if (k === "table" && o.table && t && same(t.columns, o.table.columns) && same(t.rows, o.table.rows)) {
      fullTable = true;
      delete rest[k];
    }
    if ((k in shown && same(v, shown[k])) || (typeof v === "number" && o.metrics?.[k] === v)) delete rest[k];
  }
  return { value: Object.keys(rest).length ? rest : undefined, fullTable };
}

function stringsIn(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}

function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("interrupted"));
    const onAbort = () => reject(new Error("interrupted"));
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(
      (v) => (signal.removeEventListener("abort", onAbort), resolve(v)),
      (e) => (signal.removeEventListener("abort", onAbort), reject(e)),
    );
  });
}

const ACTION = "use|call|run|compute|count|measure|perform|fit|check|merge|filter|align|infer|analy[sz]e|calculate|load|inspect|compare|plot|apply|test|examine|determine|fetch|read";

export function endsWithPromise(text: string): boolean {
  const last = text.trim().slice(-400).split(/(?<=[.!?:])\s+/).at(-1) ?? "";
  const intent = /\b(I will|I'll|we will|we'll|Let me(?! know)|Let's|(?:Next|Now),? (?:I|we)|I am going to|I'm going to|we are going to|we're going to)\b/i;
  const need = new RegExp(`\\b(?:I|we) (?:need|have|must) to (?:${ACTION})\\b|\\bthe next step is to\\b`, "i");
  const later = /\bwill be (?:determined|calculated|computed|measured|counted|reported|obtained|done)\b[^.]*\b(?:after|in|by) (?:the|a) (?:next|later|following|\w+ statistics|\w+ing) step\b/i;
  return intent.test(last) || need.test(last) || later.test(last);
}

export function announcesStep(text: string): boolean {
  const tail = text.trim().slice(-400);
  return new RegExp(`\\b(?:I will|I'll|we will|we'll) (?:now )?(?:${ACTION})\\b|\\b(?:I|we) (?:need|have|must) to (?:${ACTION})\\b|\\bthe next step is to\\b`, "i").test(tail);
}

export class Session {
  id: string;
  dir: string;
  workDir: string;
  cwd: string;
  place: Place;
  mode: Mode;
  permissionMode: Settings["permissionMode"];
  busy = false;
  settings: Settings;
  bus = new Bus();
  record: AnalysisRecord;
  decisions!: DecisionRecord;
  questions!: QuestionQueue;
  findings!: Findings;
  provider!: Provider;
  refereeProvider?: Provider;
  adapters: LoadedAdapter[] = [];
  runtimes: AdapterRuntime[] = [];
  adapterInfo: { name: string; title: string; version: string; programVersion: string }[] = [];
  pick = false;
  setupPreset: Record<string, unknown> = {};
  history: Message[] = [];
  private runtimeInfo: { adapter: LoadedAdapter; programVersion: string; instructions: string }[] = [];
  private envTargets = new Map<string, EnvTarget>();
  private envNow = new Map<string, EnvLock>();
  private found: FoundCache = new Map();
  private index?: AdapterSummary[];
  private overrides: Partial<Settings> = {};
  private onceTrusted = false;
  untrusted?: TrustStatus;
  trustQid?: string;
  private tools = new Map<string, Tool>();
  private active = new Set<string>();
  private hooks!: HookRunner;
  private permissions!: Permissions;
  private sessionAllow = new Set<string>();
  private system = "";
  private notes: string[] = [];
  private abort?: AbortController;
  private permissionWaits = new Map<string, Pending<{ ok: boolean; note: string; always: boolean }>>();
  private followWaits = new Map<number, Pending<{ note: string; agentDoes: boolean }>>();
  private followCount = 0;
  private permCount = 0;
  private callCount = 0;
  private lastAnswer = "";
  private waitedQids = new Set<string>();
  private timer?: ReturnType<typeof setInterval>;
  planFirst = false;
  interactive = false;
  planning = false;
  plan?: AnalysisPlan;
  private planUpdate = false;
  private planVersion = 0;
  private approvedEntry = 0;
  private planWait?: Pending<PlanResponse>;
  private planQids = new Map<string, PlanDecision>();
  private modeBefore: Mode = "watch";
  private planLooks = 0;
  private planWarned = new Set<string>();
  private stopTurn = false;
  pilotStage = false;
  private clarified = false;
  private checked = new Set<string>();
  private sheet?: SampleSheet;
  private toolsHinted = false;
  private scientistAsked?: string;
  inspection?: Inspection;
  reference?: Reference;
  private hidden: string[] = [];
  private refCandidates: Candidate[] = [];
  private pilotPlan?: { plan: AnalysisPlan; version: number; target: Mode; answers: string[] };
  private lastSaid = "";
  private waiting = new Map<string, BusEvent>();
  private phiFrom = 0;
  private phiChoice?: PhiAction;
  private masker = new Masker();
  private phiWaits = new Map<string, Pending<PhiAction>>();
  private phiCount = 0;
  private phiOffNoted = false;
  private refereeOffNoted = false;
  private contextWarned = false;
  lastStatus: Extract<BusEvent, { type: "status" }> = { type: "status", state: "idle" };
  method?: Method;

  private constructor(id: string, cwd: string, settings: Settings, place: Place) {
    this.id = id;
    this.cwd = cwd;
    this.settings = settings;
    this.mode = settings.mode;
    this.permissionMode = settings.permissionMode;
    this.place = place;
    this.dir = place.recordDir;
    mkdirSync(this.dir, { recursive: true });
    this.record = new AnalysisRecord(this.dir, id, place.legacy ? {} : { workDir: place.outDir, exportDir: place.outDir, project: inProject(place) ? place.project : undefined });
    this.workDir = this.record.workDir;
    this.record.onAppend = (entry: Entry) => this.bus.emit({ type: "entry", entry });
    this.bus.on((e) => {
      if (e.type === "status") this.lastStatus = e;
    });
  }

  openEvents(): BusEvent[] {
    return [...this.waiting.values()];
  }

  private emitWaiting(key: string, e: BusEvent) {
    this.waiting.set(key, e);
    this.bus.emit(e);
  }

  get outputDir(): string {
    return outputDir(this);
  }

  dirs(): Dirs {
    this.sharedDirs ??= { workDir: this.workDir, sessionDir: this.dir, projectDir: this.cwd } as Dirs;
    return Object.assign(this.sharedDirs, { outputDir: this.outputDir, figureFormats: this.settings.figure_formats, xlsx: xlsxOn(this.settings) });
  }

  private sharedDirs?: Dirs;

  get folderLine(): string {
    if (this.place.legacy) return `Results: ${this.workDir}`;
    return provisional(this.place) ? `Results go to ${dirname(this.place.outDir)}/<date>-<title>/` : `Results: ${this.place.outDir}`;
  }

  get model(): ModelInfo {
    return this.provider.info;
  }

  static async create(opts: SessionOptions): Promise<Session> {
    const cwd = opts.cwd ?? process.cwd();
    if (opts.trustFolder) trustOnce(cwd);
    const overrides = { ...(opts.settings ?? {}), mode: opts.mode, model: opts.model, referee: opts.referee };
    const settings = loadSettings(cwd, overrides);
    const id = opts.place?.id ?? opts.id ?? newId();
    const place = opts.place ?? (opts.home ? legacyPlace(id, cwd) : newPlace(cwd, settings.output_folder, id));
    if (opts.method) Object.assign(settings, { planFirst: "on", pilot: "on" });
    const s = new Session(id, cwd, settings, place);
    s.overrides = overrides;
    s.onceTrusted = !!opts.trustFolder;
    await s.init(opts);
    if (opts.method) s.startMethod(opts.method);
    if (place.fallback && !opts.place) s.record.append("notice", { text: `The folder ${outputRoot(cwd, settings.output_folder)} is read-only. The session files are in ${dirname(place.outDir)}.` });
    return s;
  }

  static async resume(ref: string, opts: Partial<SessionOptions> = {}): Promise<Session> {
    const place = findPlace(ref, { cwd: opts.cwd, outputFolder: loadSettings(opts.cwd ?? process.cwd(), opts.settings ?? {}).output_folder });
    if (!place) throw new Error(`no session ${ref}`);
    const log = join(place.recordDir, "log.jsonl");
    if (!existsSync(log)) throw new Error(`no session ${ref}`);
    const id = place.id;
    const entries = readFileSync(log, "utf8").split("\n").map((l) => (l ? local(JSON.parse(l), inProject(place) ? place.project : undefined) : null)) as any[];
    const first = entries.find((e) => e?.kind === "session");
    const loaded = entries.filter((e) => e?.kind === "adapter").map((e) => e.data);
    const adapters = opts.adapters ?? [...((first?.data.adapters ?? []) as { name: string; path?: string }[]), ...loaded].map((a) => (a.path && existsSync(a.path) ? a.path : a.name));
    const cwd = !place.legacy ? place.project : opts.cwd ?? (typeof first?.data.cwd === "string" && existsSync(first.data.cwd) ? first.data.cwd : undefined);
    return Session.create({ ...opts, cwd, place, adapters, id, model: opts.model ?? first?.data.modelSpec, mode: opts.mode ?? first?.data.mode, pick: opts.pick ?? !!first?.data.pick });
  }

  private async init(opts: SessionOptions) {
    const resumed = this.record.entries(["session"]).length > 0;
    const off = (a: LoadedAdapter) => resumed && !!accessOf(a.name, this.cwd).off && !!this.notes.push(`The adapter ${a.name} is turned off in Programs, so this resumed session does not load it.`);
    this.adapters = opts.adapters.map((a) => applyOverlay(findAdapter(a, this.cwd))).filter((a) => !off(a)).map((a) => usable(a, this.cwd));
    this.provider = opts.provider ?? (await makeProvider(this.settings.model, { effort: this.settings.effort, numCtx: this.settings.numCtx, think: this.settings.think }));
    if (opts.refereeProvider) this.refereeProvider = opts.refereeProvider;
    else if (this.settings.referee === "same") this.refereeProvider = this.provider;
    else if (this.settings.referee && this.settings.referee !== "none") this.refereeProvider = await makeProvider(this.settings.referee, { effort: this.settings.effort });

    this.pick = opts.pick ?? opts.adapters.length === 0;
    const defaults = opts.defaults ? this.defaultAdapters() : [];
    for (const a of this.adapters) await this.startOne(a);
    for (const a of [...defaults])
      try {
        await this.startOne(a);
      } catch (e) {
        this.adapters = this.adapters.filter((x) => x !== a);
        defaults.splice(defaults.indexOf(a), 1);
        this.notes.push(`The default adapter ${a.name} did not start: ${(e as Error).message}`);
      }

    this.decisions = new DecisionRecord(this.adapters, this.record, this.pick ? [ADAPTER_DECISION] : []);
    this.interactive = !!opts.interactive;
    const pf = this.settings.planFirst;
    this.planFirst = pf === undefined ? !!opts.interactive : pf === true || pf === "on";
    const approved = approvedPlan(this.record);
    if (approved) {
      this.approvedEntry = approved.entry;
      this.plan = structuredClone(currentPlan(this.record));
    }
    this.planVersion = Math.max(0, ...this.record.entries(["plan", "plan_approved"]).map((e) => Number(e.data.version) || 0));
    let notify: ((q: Question) => Promise<void>) | undefined;
    if (this.settings.notify.ntfy) {
      try {
        const { ntfyNotifier } = await import("../server/notify.ts");
        notify = ntfyNotifier(this.settings.notify.ntfy);
      } catch {}
    }
    this.questions = new QuestionQueue(this.record, { notify });
    this.findings = new Findings(this.record);
    this.permissions = new Permissions(this.settings.permissions);

    const extra: Tool[] = [];
    const always = new Set(["read_file", "list_dir"]);
    extra.push(...(await this.fileTools()).filter((t) => t.name === "run_script" || opts.generic || this.pick || this.adapters.length === 0 || always.has(t.name)));
    extra.push((await import("../tools/calculate.ts")).calculateTool());
    extra.push(
      ...coreTools({
        adapters: this.adapters,
        allTools: () => [...this.tools.values()],
        activate: (names) => names.forEach((n) => this.active.add(n)),
        ask: (spec) => this.askTool(spec),
        proposeChange: (spec) => this.proposeChange(spec),
        compare: (spec) => this.compareOptions(spec),
        proposeLab: (adapter, kind, payload, reason) => {
          const c = propose(adapter, kind as "default", payload, reason, this.record);
          return { ok: true, summary: `Proposed lab rule ${c.pid}. The scientist approves it with /lab.` };
        },
        log: (kind, data) => this.record.append(kind, data),
        plan: (a) => this.planTool(a),
        fullPlan: () => this.planFirst || this.planning || this.approvedEntry > 0,
      }),
    );
    if (this.adapters.some((a) => a.manifest.connection.history_tool)) extra.push(this.reviewTool());
    if (this.pick) extra.push(...this.adapterTools());
    if (!this.provider.info.small) extra.push(taskTool({ provider: () => this.provider, tools: () => [...this.tools.values()], run: (t, a, id, sig) => this.pipeline(t, a, id, sig) }));
    if (this.pilotOn()) extra.push(...this.pilotTools());
    if (this.planFirst || this.interactive) extra.push(this.clarifyTool());
    extra.push(this.inspectTool());
    for (const t of extra) if (!this.tools.has(t.name)) this.tools.set(t.name, t);
    this.chooseActiveTools();

    const moduleHooks = (await Promise.all(this.adapters.map(async (a) => (await a.module()).hooks ?? []))).flat();
    this.hooks = new HookRunner(
      [...(this.settings.guidance ? [decisionHook(this.decisions)] : []), modeHook(() => this.mode, (n) => this.findTool(n)?.readOnly ?? false), ...moduleHooks],
      this.settings.hooks,
      this.cwd,
    );

    this.system = this.buildSystem();
    if (resumed) {
      const used = this.record.live(["method"]).filter((e) => e.data.action === "started").at(-1);
      if (used)
        try {
          this.method = loadMethod(String(used.data.path));
        } catch {}
      this.history = this.record.messages();
      const choice = this.record.entries(["phi"]).filter((e) => e.data.by === "scientist" && e.data.action !== "stop").at(-1)?.data.action;
      if (choice) this.phiChoice = choice as PhiAction;
      this.notes.push("The session was resumed after a restart. Program state may have reset; outputs from earlier steps are still on disk.");
    } else {
      this.record.append("session", {
        adapters: this.adapterInfo.map((a) => ({ name: a.name, version: a.version, programVersion: a.programVersion, path: this.adapters.find((x) => x.name === a.name)?.root })),
        model: this.provider.info.model,
        modelSpec: this.settings.model,
        provider: this.provider.info.provider,
        referee: this.settings.referee,
        mode: this.mode,
        cwd: this.cwd,
        guidance: this.settings.guidance,
        ...(this.pick ? { pick: true } : {}),
        ...(defaults.length ? { defaults: defaults.map((a) => a.name) } : {}),
      });
    }
    for (const a of this.adapterInfo) await this.envHashFor(a.name);
    if (resumed) await this.checkStatus();
    if (this.permissionMode === "bypass") this.record.append("permission_mode", { old: "ask", new: "bypass", how: opts.settings?.permissionMode === "bypass" ? "the --bypass-permissions flag" : "a settings file" });
    await this.checkTrust(!!opts.interactive);
    await this.hooks.event("SessionStart", { session: this.id });
    this.markOpen({ app: undefined });
    this.timer = setInterval(() => this.expireQuestions(), 30_000);
    this.timer.unref?.();
  }

  expireQuestions(now = Date.now()) {
    for (const q of this.questions.expire(now)) {
      if (q.status === "defaulted" && q.decisionKey) this.decisions.change(q.decisionKey, q.answer, { by: "human", reason: `default after the time limit of ${q.qid}` });
      this.notes.push(q.status === "defaulted" ? `Question ${q.qid} reached its time limit. The default ${String(q.answer)} applies.` : `Question ${q.qid} reached its time limit with no answer. That branch stays stopped.`);
    }
  }

  private async fileTools(): Promise<Tool[]> {
    const out: Tool[] = [];
    try {
      const { genericTools } = await import("../tools/generic.ts");
      out.push(...genericTools(this.dirs()));
    } catch {}
    try {
      const { runScriptTool } = await import("../tools/run_script.ts");
      out.push(runScriptTool(this.dirs(), { network: this.settings.networkForScripts }));
    } catch {}
    return out;
  }

  private async nameFolder(request: string) {
    if (!provisional(this.place)) return;
    const next = titlePlace(this.place, request, this.runtimes.length > 0);
    this.place = next;
    this.dir = next.recordDir;
    this.workDir = next.outDir;
    this.record.moveTo(next.recordDir, { workDir: next.outDir, exportDir: next.outDir });
    Object.assign(this.dirs(), { workDir: next.outDir, sessionDir: next.recordDir });
    for (const t of await this.fileTools()) if (this.tools.has(t.name) && this.tools.get(t.name)!.source === t.source) this.tools.set(t.name, t);
    this.system = this.buildSystem();
    this.record.append("notice", { text: `This session saves its results in ${next.outDir}.` });
  }

  private async writeReport() {
    if (this.place.legacy || provisional(this.place)) return;
    try {
      const trail = await import("./trail.ts");
      trail.exportHtml(this.record, this.adapters, join(this.place.outDir, "index.html"), this.citationStyle());
    } catch {}
  }

  private buildSystem(): string {
    return systemPrompt({ adapters: this.runtimeInfo, model: this.provider.info, mode: this.mode, lab: labText(this.cwd), guidance: this.settings.guidance, pick: this.pick, folders: { project: this.cwd, work: this.workDir, output: this.outputDir, figureFormats: this.settings.figure_formats, xlsx: xlsxOn(this.settings) }, textStyle: this.settings.text_style });
  }

  private defaultAdapters(): LoadedAdapter[] {
    const out: LoadedAdapter[] = [];
    for (const name of this.settings.defaultAdapters ?? []) {
      if (this.adapters.some((a) => a.name === name)) continue;
      try {
        const a = usable(applyOverlay(findAdapter(name, this.cwd)), this.cwd);
        const l = a.manifest.locate;
        if (!(l.env || l.paths.length || l.which.length) || programFound(a.manifest, this.found).path) out.push(a);
        else this.notes.push(`The default adapter ${name} is not loaded: its program is not found. ${installHint(a.manifest)}`);
      } catch (e) {
        this.notes.push(`The default adapter ${name} is not loaded: ${(e as Error).message}.`);
      }
    }
    this.adapters.push(...out);
    return out;
  }

  private async startOne(a: LoadedAdapter): Promise<string[]> {
    const { startAdapter } = await import("../adapters/runtime.ts");
    const rt = await startAdapter(a, this.dirs());
    this.runtimes.push(rt);
    this.envTargets.set(a.name, envTarget({ kind: a.manifest.connection.kind, interpreter: rt.interpreter ?? [], programPath: rt.programPath, program: a.manifest.program.name, programVersion: rt.programVersion }));
    this.runtimeInfo.push({ adapter: a, programVersion: rt.programVersion, instructions: rt.instructions });
    this.adapterInfo.push({ name: a.name, title: a.manifest.adapter.title || a.manifest.program.name, version: a.manifest.adapter.version, programVersion: rt.programVersion });
    const mod = await a.module();
    const names: string[] = [];
    const noCode = blocksCode(a.name, this.cwd);
    for (const t of [...(await rt.tools()), ...(mod.tools ?? []).map((t) => ({ ...t, adapter: t.adapter ?? a.name, source: "adapter" as const }))]) {
      if (noCode && isCodeTool(t.remoteName ?? t.name, (t.inputSchema as { properties?: object }).properties)) continue;
      const name = this.tools.has(t.name) ? `${a.name.replace(/-/g, "_")}_${t.name}` : t.name;
      this.tools.set(name, { ...t, name, remoteName: t.remoteName ?? t.name });
      names.push(name);
    }
    return names;
  }

  adapterList(): AdapterSummary[] {
    this.index ??= adapterIndex(this.cwd, this.found);
    return this.index;
  }

  async useAdapter(name: string, reason: string): Promise<ToolOutput> {
    const have = (n: string) => this.adapters.some((a) => a.name === n);
    const already = (n: string) => ({ ok: true, summary: `The adapter ${n} is already loaded. Nothing changed.` });
    if (have(name)) return already(name);
    if (this.planning) return { ok: false, error: "Plan first: name the adapter in the programs section of the plan. When the scientist approves the plan, call use_adapter. The approval covers the adapters that the plan names." };
    let a: LoadedAdapter;
    try {
      a = usable(applyOverlay(findAdapter(name, this.cwd)), this.cwd);
    } catch (e) {
      return { ok: false, error: `${(e as Error).message}. Call list_adapters to see the names.` };
    }
    if (have(a.name)) return already(a.name);
    if (this.activePlan() && !this.planApproves(a)) {
      this.record.append("notice", { text: `Not in the approved plan: the adapter ${a.name}. Reason: ${reason.trim() || "the agent gave none."}`, plan: "deviation", tool: "use_adapter", adapter: a.name });
      this.notes.push(`The approved plan does not name the adapter ${a.name}. It loads as your choice, and the scientist can change it with /program. Call plan to add it to programs, with the reason.`);
    }
    const gate = await this.chooseProgram(a, reason);
    if (gate.blocked) return { ok: false, error: gate.blocked };
    const texts = gate.text ? [gate.text] : [];
    let ok = true;
    for (const n of gate.load) {
      let b: LoadedAdapter;
      try {
        b = n === a.name ? a : usable(applyOverlay(findAdapter(n, this.cwd)), this.cwd);
      } catch (e) {
        ok = false;
        texts.push((e as Error).message);
        continue;
      }
      const why = n === a.name ? reason : `chosen by the scientist instead of ${a.name} (the agent's reason: ${reason})`;
      const r = await this.loadOne(b, why, gate.by);
      ok &&= r.ok;
      texts.push(r.ok ? r.text! : r.error!);
    }
    if (!gate.load.length) texts.push("No adapter was loaded.");
    const text = texts.join("\n\n");
    return ok && gate.load.length ? { ok: true, summary: `Loaded ${gate.load.join(", ")}.`, text } : { ok: false, error: text };
  }

  private async chooseProgram(a: LoadedAdapter, reason: string): Promise<{ load: string[]; by: string; text?: string; blocked?: string }> {
    const key = ADAPTER_DECISION.key;
    if (!this.decisions.has(key)) return { load: [a.name], by: "agent" };
    const split = (v: unknown) => String(v ?? "").split(/[,\s]+/).filter(Boolean);
    const loaded = this.adapters.map((x) => x.name);
    const chosen = this.decisions.isSet(key) ? split(this.decisions.value(key)) : [];
    if (chosen.includes(a.name)) return { load: [a.name], by: "human" };
    const owner = this.decisions.owner(key);
    if (owner === "fixed") return { load: [], by: "fixed", blocked: `The lab fixed the program: ${chosen.join(", ") || "none"}. Load one of these adapters, or ask the scientist.` };
    const value = (n: string) => [...new Set([...loaded, n])].join(", ");
    if (this.planApproves(a)) {
      this.decisions.change(key, value(a.name), { by: "human", reason: `the scientist approved plan version ${this.pilotPlan?.version ?? this.planVersion}, which names ${a.name}` });
      return { load: [a.name], by: "human", text: `The approved plan names ${a.name}, so the plan approval covers this load.` };
    }
    const preset = this.setupPreset?.[key];
    if (preset && !this.programByScientist().length) this.decisions.change(key, String(preset), { by: "human", reason: "from the answers file" });
    const picked = this.programByScientist();
    if (picked.includes(a.name)) return { load: [a.name], by: "human" };
    if (picked.length) {
      const load = picked.filter((n) => !loaded.includes(n));
      if (!load.length) return { load: [], by: "human", blocked: `The scientist chose the program ${picked.join(", ")}. Use that adapter, or ask the scientist in your message.` };
      return { load, by: "human", text: `The scientist chose ${load.join(", ")} instead of ${a.name}.` };
    }
    if (owner === "agent") {
      this.decisions.change(key, value(a.name), { by: "agent", reason });
      return { load: [a.name], by: "agent" };
    }
    const list = this.adapterList();
    const request = String(this.lastRequest()?.data.text ?? "");
    const me = list.find((x) => x.name === a.name);
    const files = me ? filesFor(request, me, this.cwd) : [];
    const why = [reason.trim().replace(/([^.])$/, "$1."), files.length ? `The request names ${files.join(", ")}, and ${a.name} reads that file type.` : ""].filter(Boolean).join(" ");
    const others = [...new Set([...chosen.filter((n) => !loaded.includes(n) && n !== a.name), ...alternatives(list, a.name, [...loaded, ...chosen])])].slice(0, 4);
    const options = [a.name, ...others].map((n) => ({ value: value(n), label: n }));
    const q = await this.questions.ask({
      decisionKey: key,
      title: ADAPTER_DECISION.label,
      text: `The agent wants to use ${a.manifest.program.name} through the ${a.name} adapter: ${why}`,
      options,
      recommendation: { value: options[0].value, reason: why },
      evidence: others.length ? `Other adapters that read the same file types: ${others.join(", ")}.` : "",
    });
    this.bus.emit({ type: "question", question: q });
    this.record.append("blocked", { tool: "use_adapter", reason: `waiting for the scientist: ${key}`, qid: q.qid });
    if (!this.settings.askWaits) return { load: [], by: "human", blocked: `BLOCKED: the choice of program belongs to the scientist. Question ${q.qid} waits for the answer. Call use_adapter again after the answer.` };
    this.waitedQids.add(q.qid);
    this.bus.emit({ type: "status", state: "waiting", tool: "use_adapter" });
    try {
      await abortable(this.questions.wait(q.qid), this.abort?.signal);
    } catch {
      return { load: [], by: "human", blocked: `The question ${q.qid} about the program is still open.` };
    }
    const now = split(this.decisions.value(key)).filter((n) => !loaded.includes(n));
    return { load: now, by: "human", text: now.includes(a.name) ? undefined : `The scientist chose ${now.join(", ") || "no new adapter"} instead of ${a.name}.` };
  }

  private programByScientist(): string[] {
    const key = ADAPTER_DECISION.key;
    const last = this.record.entries(["setup", "decision"]).filter((e) => (e.kind === "decision" ? e.data.key === key : key in ((e.data.values as object) ?? {}))).at(-1);
    if (!last) return [];
    const human = last.kind === "setup" || (last.data.by === "human" && !String(last.data.reason ?? "").startsWith("the scientist approved plan"));
    return human ? String(this.decisions.value(key) ?? "").split(/[,\s]+/).filter(Boolean) : [];
  }

  async changeProgram(name: string): Promise<{ ok: boolean; text: string }> {
    let a: LoadedAdapter;
    try {
      a = usable(applyOverlay(findAdapter(name, this.cwd)), this.cwd);
    } catch (e) {
      return { ok: false, text: `${(e as Error).message}. /adapters lists the loaded programs.` };
    }
    if (this.decisions.has(ADAPTER_DECISION.key)) this.decisions.change(ADAPTER_DECISION.key, a.name, { by: "human", reason: PROGRAM_REASON });
    const before = this.adapters.map((x) => x.name).filter((n) => n !== a.name);
    if (!this.adapters.some((x) => x.name === a.name)) {
      const r = await this.loadOne(a, PROGRAM_REASON, "human");
      if (!r.ok) return { ok: false, text: r.error ?? `The adapter ${a.name} did not load.` };
    }
    this.notes.push(`The scientist changed the program to ${a.manifest.program.name} (adapter ${a.name}) with /program. Use its tools from now on${before.length ? `, not the tools of ${before.join(", ")}` : ""}.`);
    return { ok: true, text: `The program is now ${a.manifest.program.name} through ${a.name}. The agent uses it from the next step.` };
  }

  private async loadOne(a: LoadedAdapter, reason: string, by: string): Promise<ToolOutput> {
    const m = a.manifest;
    const where = programFound(m, this.found);
    const checked = Boolean(m.locate.env || m.locate.paths.length || m.locate.which.length);
    const missing = checked && !where.path;
    const notices: string[] = [];
    if (m.adapter.status === "draft") notices.push(`The adapter ${a.name} is a draft. No one approved it yet. Check its results with care.`);
    if (missing) notices.push(`The program ${m.program.name} was not found on this computer. Its tools can fail. ${installHint(m)}`);
    allowAdapter(a.root, where.path);
    let names: string[];
    try {
      names = await this.startOne(a);
    } catch (e) {
      const msg = `The adapter ${a.name} did not start: ${(e as Error).message}${missing ? ` ${installHint(m)}` : ""}`;
      this.record.append("notice", { text: msg });
      return { ok: false, error: msg };
    }
    this.adapters.push(a);
    const added = this.decisions.addAdapter(a, this.setupPreset);
    const planned = this.activePlan();
    if (planned && added.length) this.commitSettings(planned);
    this.hooks.add((await a.module()).hooks ?? []);
    if (m.connection.history_tool && !this.tools.has("review_my_steps")) {
      this.tools.set("review_my_steps", this.reviewTool());
      this.active.add("review_my_steps");
    }
    if (this.deferred()) {
      this.active.add("find_tools");
      this.chooseActiveTools(String(this.lastRequest()?.data.text ?? ""));
    } else names.forEach((n) => this.active.add(n));
    this.system = this.buildSystem();
    const info = this.adapterInfo.at(-1)!;
    const envHash = await this.envHashFor(a.name);
    this.record.append("adapter", { name: a.name, program: m.program.name, version: info.version, programVersion: info.programVersion, envHash, reason, by, status: m.adapter.status, path: a.root, programFound: checked ? !!where.path : null, how: where.how, tools: names, notices });
    const shown = names.filter((n) => this.active.has(n));
    const skills = a.skills();
    const brief = added.length ? this.decisions.brief(added) : "";
    const text = [
      `Loaded the adapter ${a.name} ${info.version} (${info.title} ${info.programVersion}).`,
      ...notices,
      `Tools now in your list: ${shown.join(", ") || "none"}.${shown.length < names.length ? ` Find the other ${names.length - shown.length} with find_tools.` : ""}`,
      skills.length ? `Skills (read one with load_skill): ${skills.map((x) => x.name).join(", ")}.` : "",
      brief ? `Decisions of this adapter:\n${brief}` : "",
      "The standards of this program are now in your instructions. Follow them.",
    ].filter(Boolean).join("\n");
    return { ok: true, summary: `Loaded ${a.name} ${info.version}: ${names.length} tools.`, text };
  }

  private adapterTools(): Tool[] {
    const base = { source: "harness" as const, readOnly: true, permission: "allow" as const };
    return [
      {
        ...base,
        name: "list_adapters",
        description: "List the program adapters on this computer: name, program, field, what it does, the input file types, the status, and whether the program is found. Give a filter, such as a file type or a method, to list fewer.",
        inputSchema: { type: "object", properties: { filter: { type: "string", description: "Optional words, such as .bam or mixed model." } }, required: [] },
        execute: async (a) => ({ ok: true, summary: "Listed the adapters.", text: formatIndex(this.adapterList(), typeof a.filter === "string" ? a.filter : "") }),
      },
      {
        ...base,
        name: "use_adapter",
        description: "Load one program adapter into this session: its tools, standards, skills and decisions. Give the adapter name from list_adapters and, in one sentence, the reason that it fits the request.",
        inputSchema: { type: "object", properties: { name: { type: "string" }, reason: { type: "string" } }, required: ["name", "reason"] },
        execute: async (a) => this.useAdapter(String(a.name), String(a.reason ?? "")),
      },
    ];
  }

  private deferred(): boolean {
    const n = [...this.tools.values()].filter((t) => t.source === "adapter").length;
    return this.settings.toolExposure === "search" || (this.settings.toolExposure === "auto" && this.provider.info.small && n > 24);
  }

  private chooseActiveTools(request = "") {
    const all = [...this.tools.values()];
    const adapterTools = all.filter((t) => t.source === "adapter");
    const deferred = this.deferred();
    if (!this.active.size) this.active = new Set(all.filter((t) => t.source !== "adapter" || !deferred).map((t) => t.name));
    if (!deferred) {
      this.active.delete("find_tools");
      return;
    }
    const states = new Set(this.adapters.map((a) => a.manifest.connection.state_tool).filter(Boolean));
    const keep = [
      ...adapterTools.filter((t) => states.has(t.remoteName ?? t.name)),
      ...(request ? searchTools(adapterTools, request, 10) : []),
      ...adapterTools.filter((t) => !t.deferred),
    ];
    for (const t of keep) {
      if ([...this.active].filter((n) => this.tools.get(n)?.source === "adapter").length >= 16) break;
      this.active.add(t.name);
    }
  }

  findTool(name: string): Tool | undefined {
    return this.tools.get(name) ?? [...this.tools.values()].find((t) => t.remoteName === name);
  }

  private adapterOf(t: Tool): LoadedAdapter | undefined {
    return this.adapters.find((a) => a.name === t.adapter);
  }

  allTools(): Tool[] {
    return [...this.tools.values()];
  }

  setupNeeded(): boolean {
    return this.settings.guidance && this.record.entries(["setup"]).length === 0;
  }

  // ------------------------------------------------------------- turn

  async send(text: string, opts: { internal?: boolean; plan?: boolean } = {}): Promise<string> {
    if (this.busy) throw new Error("the agent is busy; wait or press Esc to stop it");
    this.busy = true;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    let revised = false;
    let nudges = 0;
    let lastSig = "";
    let repeats = 0;
    let forceAnswer = false;
    const turnStart = this.record.entries().length;
    try {
      await this.nameFolder(text);
      await this.hooks.event("UserPromptSubmit", { session: this.id, text });
      if (this.setupNeeded()) this.decisions.applySetup({}, { how: "defaults accepted without review (the setup card was skipped)" });
      if (this.history.length === 0 && this.settings.guidance) this.notes.unshift(this.decisions.brief(), MODE_NOTE[this.mode], ...(this.pilotOn() ? [PILOT_NOTE] : []));
      if (this.settings.guidance && !opts.internal && (opts.plan || (this.planFirst && !CONTINUE.test(text.trim())))) this.startPlanning(text);
      this.chooseActiveTools(text);
      if (this.pick) {
        const hint = fileTypeHint(text, this.adapterList(), this.cwd, this.adapters.map((a) => a.name));
        if (hint) this.notes.push(hint);
      }
      this.record.append("user", { text, ...(opts.internal ? { internal: true } : {}) });
      const notes = this.drainNotes();
      this.push({ role: "user", parts: [{ type: "text", text: notes ? `${notes}\n\n${text}` : text }] });
      for (let step = 0; step < this.settings.maxSteps; step++) {
        if (!(await this.phiGate(signal))) {
          this.record.append("notice", { text: "Stopped before the content went to the model. Nothing was sent." });
          return "";
        }
        await this.maybeCompact(signal);
        this.bus.emit({ type: "status", state: "thinking" });
        const res = await this.provider.step({
          system: this.system,
          messages: this.history,
          tools: forceAnswer ? [] : this.activeSchemas(),
          signal,
          onDelta: (d) => this.bus.emit({ type: "delta", kind: d.type, text: d.text }),
        });
        this.push(res.message);
        this.record.append("usage", { ...res.usage, model: this.provider.info.model, provider: this.provider.info.provider, local: isLocal(this.provider.info) });
        this.checkContext();
        if (res.note) this.record.append("notice", { text: res.note });
        const thinking = res.message.parts.flatMap((p) => (p.type === "thinking" && p.text ? [p.text] : [])).join("\n");
        if (thinking) this.record.append("thinking", { text: thinking });
        const said = res.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n").trim();
        const calls = res.message.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
        this.lastSaid = said;
        if (!calls.length && this.steered.length) {
          if (said) this.record.append("assistant", { text: said, final: false });
          this.push({ role: "user", parts: [{ type: "text", text: this.takeSteer() }] });
          continue;
        }
        if (!calls.length && nudges < 2 && !forceAnswer && (this.pilotStage || this.needsValidation())) {
          nudges++;
          if (said) this.record.append("assistant", { text: said, final: false });
          const why = this.pilotStage ? "The pilot is not finished. Run the method on the pilot sample, then call pilot_result. The scientist confirms the pilot before the other samples run." : "Call batch_results with the value of each sample, so that the harness can compare your results with the reference.";
          this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
          continue;
        }
        if (!calls.length && this.planning && !this.planUpdate && nudges < 2 && !forceAnswer) {
          nudges++;
          if (said) this.record.append("assistant", { text: said, final: false });
          this.push({ role: "user", parts: [{ type: "text", text: "[Notes from the harness]\n- Write the analysis plan with the plan tool now. No step runs before the scientist approves it." }] });
          continue;
        }
        if (!calls.length && !said && nudges < 2) {
          nudges++;
          const names = this.activeSchemas().map((t) => t.name).join(", ");
          const why = res.usage.outputTokens > 20
            ? `Your last reply was lost. It was probably a call to a tool that does not exist, so nothing ran. Use only these tools: ${names}. Skills are procedures, not tools: read one with load_skill.${this.active.has("find_tools") ? " To find more tools, call find_tools." : ""}`
            : "Your last reply was empty. Do the next step with a tool, or give your answer to the scientist.";
          this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
          continue;
        }
        if (!calls.length && nudges < 3 && !forceAnswer) {
          const tail = said.slice(-400);
          const promise = endsWithPromise(said) || announcesStep(said);
          const asksLeave = this.settings.headless && /\b(would you like me to|shall I|should I|do you want me to)\b[^?]*\?\s*$/i.test(tail);
          const turnStart = this.lastRequest()?.id ?? 0;
          const ranStep = this.record.nodes().some((n) => n.entry > turnStart && !n.sensitivityOf && n.tool !== "calculate");
          const noWork = this.settings.headless && this.adapters.length > 0 && !ranStep;
          const plan = (this.record.entries(["note"]).filter((e) => e.id > turnStart && Array.isArray(e.data.plan)).at(-1)?.data.plan as { step: string; status: string }[] | undefined) ??
            (this.plan && this.approvedEntry > turnStart && !this.planning ? this.plan.steps.filter((p) => p.tool) : undefined);
          const open = (plan ?? []).filter((p) => p.status === "todo" || p.status === "doing");
          if (promise || asksLeave || noWork || open.length) {
            nudges++;
            this.record.append("assistant", { text: said, final: false });
            const why = asksLeave
              ? "The scientist is not here to answer. Go on with your recommendation."
              : promise
                ? "You said what you will do next, but you did not call a tool. Do it now with a tool call, or give your final answer."
                : noWork
                  ? "No program step has run in this turn, so the request is not answered yet. Run the next step now with a tool. If a tool failed, fix the input and try again."
                  : `Your plan still has steps that are not done: ${open.map((p) => p.step).join("; ")}. Do the next one now with a tool. If a step cannot be done, call plan and mark it skipped with the reason. Then give the answer, with every number the request asks for.`;
            this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
            continue;
          }
        }
        if (!calls.length) {
          const out = await this.finishAnswer(said, revised, signal);
          if (out.revise) {
            revised = true;
            this.push({ role: "user", parts: [{ type: "text", text: out.revise }] });
            continue;
          }
          return out.text;
        }
        if (said) this.record.append("assistant", { text: said, final: false });
        nudges = 0;
        const results: Part[] = [];
        for (const call of calls) {
          if (signal.aborted) {
            results.push({ type: "tool_result", callId: call.id, name: call.name, text: "ERROR: not run. The scientist stopped the turn.", isError: true });
            continue;
          }
          if (this.steered.some((m) => m.now)) {
            results.push({ type: "tool_result", callId: call.id, name: call.name, text: "ERROR: not run. The scientist sent a message. Read it first.", isError: true });
            continue;
          }
          const sig = `${call.name}:${JSON.stringify(call.args)}`;
          repeats = sig === lastSig ? repeats + 1 : 0;
          lastSig = sig;
          if (repeats >= 2) {
            forceAnswer = true;
            this.record.append("notice", { text: `The agent called ${call.name} with the same input three times. The harness asks for the final answer.` });
            results.push({ type: "tool_result", callId: call.id, name: call.name, text: `ERROR: you called ${call.name} with the same input three times in a row. Stop. Give your final answer now, from the results you have.`, isError: true });
            continue;
          }
          results.push(await this.runCall(call, signal));
        }
        const pending = this.drainNotes();
        if (pending) results.push({ type: "text", text: pending } as Part);
        if (this.steered.length) results.push({ type: "text", text: this.takeSteer() } as Part);
        this.push({ role: "user", parts: results });
        if (this.stopTurn) {
          this.stopTurn = false;
          this.record.append("notice", { text: "You cancelled the plan. No analysis step ran." });
          return "";
        }
        if (signal.aborted) {
          this.record.append("notice", { text: "Stopped. The results so far are kept." });
          return "";
        }
      }
      this.record.append("notice", { text: `Paused after ${this.settings.maxSteps} steps. Type "continue" to go on.` });
      return "";
    } catch (e) {
      const msg = e instanceof ProviderError ? e.message : signal.aborted ? "Stopped." : `${(e as Error).name}: ${(e as Error).message}`;
      this.record.append(signal.aborted ? "notice" : "error", signal.aborted ? { text: msg } : { message: msg });
      this.closeOpenCalls();
      if (this.draft) {
        const { answer } = this.draft;
        this.draft = undefined;
        this.record.append("notice", { text: "The turn stopped during the revision. The first answer is kept, with the problems that the review found." });
        this.record.append("assistant", { text: answer, final: true });
        this.lastAnswer = answer;
        return answer;
      }
      return "";
    } finally {
      if (this.planning) this.endPlanning();
      this.stopTurn = false;
      this.saveResults(turnStart);
      this.busy = false;
      await this.writeReport();
      this.bus.emit({ type: "status", state: "idle" });
      await this.hooks.event("Stop", { session: this.id }).catch(() => {});
      this.titling = this.retitle(turnStart);
    }
  }

  titling?: Promise<void>;

  private async retitle(turnStart: number): Promise<void> {
    if (!this.interactive || this.settings.headless || this.provider.info.provider === "fake" || this.phiChoice === "mask") return;
    const all = this.record.entries();
    const had = lastTitle(all);
    if (!changedAnalysis(all.slice(turnStart)) && (had || !all.some((e) => e.kind === "assistant" && e.data.final))) return;
    try {
      const p = this.provider.info.provider === "claude" ? await makeProvider("claude:claude-haiku-5-5", { effort: "low" }) : this.provider;
      const t = await describeSession(p, this.record, AbortSignal.timeout(60_000));
      if (!t || (had && had.title === t.title && had.description === t.description)) return;
      this.record.append("title", { ...t });
      if (!this.place.legacy) saveIndexRow(this.place, t);
    } catch {}
  }

  private lockPath(): string {
    return join(this.dir, "open.json");
  }

  markOpen(extra: Record<string, unknown> = {}): void {
    try {
      let old: Record<string, unknown> = {};
      try {
        old = JSON.parse(readFileSync(this.lockPath(), "utf8"));
      } catch {}
      writeFileSync(this.lockPath(), JSON.stringify({ ...(old.pid === process.pid ? old : {}), pid: process.pid, started: old.started ?? new Date().toISOString(), ...extra }), { mode: 0o600 });
    } catch {}
  }

  saveResults(since = 0, force = false): Saved | undefined {
    if (!force && !this.record.nodes().some((n) => n.entry > since && !n.sensitivityOf)) return undefined;
    try {
      const saved = writeResults({
        record: this.record,
        adapters: this.adapters,
        fields: this.decisions?.fields() ?? [],
        programs: this.adapterInfo.map((a) => ({ name: a.title || a.name, version: a.version, programVersion: a.programVersion })),
        dir: this.outputDir,
        xlsx: force || xlsxOn(this.settings),
        citationStyle: this.citationStyle(),
        toolText: Object.fromEntries([...this.tools.values()].map((t) => [t.remoteName ?? t.name, t.description.split(/(?<=\.)\s/)[0]!.trim()])),
      });
      if (saved.xlsx || saved.figures || saved.decks?.length) this.record.append("notice", { text: savedLine(saved), saved: { ...saved } });
      return saved;
    } catch (e) {
      this.record.append("notice", { text: `The harness could not save results.xlsx and the figures: ${(e as Error).message}` });
      return undefined;
    }
  }

  private closeOpenCalls() {
    const last = this.history[this.history.length - 1];
    if (last?.role !== "assistant") return;
    const calls = last.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
    if (calls.length)
      this.push({ role: "user", parts: calls.map((c) => ({ type: "tool_result", callId: c.id, name: c.name, text: "ERROR: not run. The turn stopped.", isError: true })) });
  }

  private push(m: Message) {
    this.history.push(m);
    this.record.append("message", { message: m as unknown as Record<string, unknown> });
  }

  private drainNotes(): string {
    if (!this.notes.length) return "";
    const text = "[Notes from the harness]\n" + this.notes.map((n) => `- ${n}`).join("\n");
    this.notes = [];
    return text;
  }

  private activeSchemas() {
    return [...this.tools.values()].filter((t) => this.active.has(t.name)).map((t) => ({ name: t.name, description: t.description, inputSchema: withPurpose(t) }));
  }

  private async maybeCompact(signal: AbortSignal, force = false) {
    if (!force && !needsCompaction(this.history, this.system, this.provider.info.contextWindow)) return;
    const res = await compact(this.history, this.provider, signal);
    if (!res) return;
    const upTo = this.record.entries(["message"]).at(-1)?.id ?? 0;
    this.record.append("compaction", { summary: res.summary, upTo });
    this.history = [summaryMessage(res.summary), ...res.kept];
    for (const m of res.kept) this.record.append("message", { message: m as unknown as Record<string, unknown> });
    this.phiFrom = this.history.length;
    this.contextWarned = false;
  }

  // ------------------------------------------------------------- patient identifiers

  private phiOff(): string | undefined {
    if (!phiOn(this.settings.phi_check)) return "The patient identifier check is off (the phi_check setting).";
    if (folderHasNoPatientData(this.cwd)) return "The patient identifier check is off for this folder: you said that it has no patient data.";
    return undefined;
  }

  private maskFrom(from: number) {
    if (!this.masker.map.size) return;
    for (let i = from; i < this.history.length; i++) this.history[i] = this.masker.message(this.history[i]!);
  }

  private localSpec(): string | undefined {
    const spec = this.settings.local_model?.trim();
    return spec && /^(ollama|openai):/.test(spec) ? spec : undefined;
  }

  private async phiGate(signal: AbortSignal): Promise<boolean> {
    const from = Math.min(this.phiFrom, this.history.length);
    this.phiFrom = this.history.length;
    if (from >= this.history.length) return true;
    const off = this.phiOff();
    if (off) {
      if (!this.phiOffNoted) this.record.append("notice", { text: off });
      this.phiOffNoted = true;
      return true;
    }
    const hits = scanMessages(this.history.slice(from), this.history);
    if (!hits.length) {
      this.maskFrom(from);
      return true;
    }
    const shown = groupHits(hits);
    const entry = (action: PhiAction | "local model", by: string, rid?: string) =>
      this.record.append("phi", { rid, action, by, model: this.provider.info.model, count: hits.length, hits: shown.slice(0, 20) as unknown as Record<string, unknown>[] });
    if (!isCloud(this.provider.info)) {
      entry("local model", "harness");
      this.record.append("notice", { text: `Possible patient identifiers (${hits.length}) go to the local model ${this.provider.info.model}. They stay on this computer.` });
      return true;
    }
    let action: PhiAction;
    let by = "scientist";
    let rid: string | undefined;
    if (this.phiChoice) {
      action = this.phiChoice;
      by = "your earlier choice in this session";
    } else if (this.settings.headless) {
      action = "mask";
      by = "harness: no one can answer the card in a headless run";
    } else ({ rid, action } = await this.askPhi(shown, signal, this.localSpec()));
    if (action === "local") {
      const problem = await this.useLocalModel();
      if (problem) {
        this.record.append("notice", { text: `The local model did not start: ${problem}` });
        if (by !== "scientist") return false;
        ({ rid, action } = await this.askPhi(shown, signal, undefined));
      }
    }
    entry(action, by, rid);
    if (action === "stop") {
      for (let i = from; i < this.history.length; i++) this.history[i] = withheld(this.history[i]!);
      return false;
    }
    this.phiChoice = action;
    if (action === "mask") {
      this.masker.add(hits);
      this.maskFrom(from);
    }
    return true;
  }

  private async askPhi(hits: PhiShown[], signal: AbortSignal, local: string | undefined): Promise<{ rid: string; action: PhiAction }> {
    const rid = `phi${++this.phiCount}`;
    const p = new Promise<PhiAction>((resolve) => this.phiWaits.set(rid, { resolve }));
    this.emitWaiting(rid, { type: "phi", rid, model: this.provider.info.model, hits: hits.slice(0, 8), more: Math.max(0, hits.length - 8), local });
    this.bus.emit({ type: "status", state: "waiting", tool: "patient data check" });
    let action: PhiAction;
    try {
      action = await abortable(p, signal);
    } catch {
      action = "stop";
    }
    if (action === "local" && !local) action = "stop";
    this.phiWaits.delete(rid);
    this.waiting.delete(rid);
    this.bus.emit({ type: "status", state: "thinking" });
    return { rid, action };
  }

  respondPhi(rid: string, action: PhiAction): void {
    this.phiWaits.get(rid)?.resolve(action);
  }

  private async useLocalModel(): Promise<string | undefined> {
    const spec = this.localSpec();
    if (!spec) return "no local model is set (the local_model setting).";
    const old = this.settings.model;
    try {
      await this.applySetting("model", spec);
    } catch (e) {
      return (e as Error).message;
    }
    this.record.append("setting", { name: "model", old, new: spec, scope: "session", reason: "patient data card" });
    if (this.refereeProvider && isCloud(this.refereeProvider.info)) {
      this.refereeProvider = undefined;
      this.record.append("notice", { text: "The referee is off for this session: its model is a cloud model." });
    }
    return undefined;
  }

  // ------------------------------------------------------------- usage

  contextTokens(): number {
    const last = this.record.entries(["usage", "compaction"]).at(-1);
    return !last || last.kind === "compaction" ? estimateTokens(this.history, this.system) : promptTokens(last.data);
  }

  usage(): UsageSummary {
    return usageSummary(this.record.entries(["user", "usage"]), this.provider.info, this.contextTokens());
  }

  private checkContext() {
    const used = this.contextTokens();
    const win = this.provider.info.contextWindow;
    if (this.contextWarned || used < win * 0.8) return;
    this.contextWarned = true;
    this.record.append("notice", { text: contextWarning(used, win), warn: true });
  }

  private draft?: { answer: string; claims: ReturnType<typeof checkAnswer>; found: { f: FindingIn; source: Finding["source"] }[]; errors: number; measured: number };

  private async finishAnswer(text: string, revised: boolean, signal: AbortSignal): Promise<{ text: string; revise?: string }> {
    if (!this.settings.guidance) {
      this.record.append("assistant", { text, final: true });
      this.lastAnswer = text;
      return { text };
    }
    const pre = await this.hooks.preAnswer({ event: "PreAnswer", session: this.id, answer: text });
    const answer = pre.answer ?? text;
    this.noteSkippedSteps();
    const claims = checkAnswer(answer, this.record.liveView());
    let kept: string | undefined;
    let keptClaims: typeof claims | undefined;
    let keptFound: { f: FindingIn; source: Finding["source"] }[] | undefined;
    const ctx = { record: this.record.liveView(), decisions: this.decisions, adapters: this.adapters, answer, claims, textStyle: this.settings.text_style ?? "ste" };
    const found: { f: FindingIn; source: Finding["source"] }[] = [...(pre.findings ?? []).map((f) => ({ f, source: "hook" as const }))];
    for (const f of await runChecks(ctx)) found.push({ f, source: "rule" });
    if (this.refereeProvider && this.phiChoice === "mask" && isCloud(this.refereeProvider.info) && !this.refereeOffNoted) {
      this.refereeOffNoted = true;
      this.record.append("notice", { text: "The referee did not run: it reads the record, and the record holds the values that the patient data card masked." });
    }
    if (this.refereeProvider && !signal.aborted && !(this.phiChoice === "mask" && isCloud(this.refereeProvider.info))) {
      try {
        for (const f of await referee(this.refereeProvider, ctx)) found.push({ f, source: "referee" });
      } catch (e) {
        this.record.append("notice", { text: `The referee did not run: ${(e as Error).message}` });
      }
    }
    let errors = found.filter((x) => x.f.severity === "error");
    const measured = (cs: typeof claims) => cs.filter((c) => c.label === "measured").length;
    if (revised && this.draft && errors.length >= this.draft.errors && measured(claims) < this.draft.measured) {
      this.record.append("notice", { text: "The revision lost results and fixed no problem, so the harness kept the first answer." });
      ({ answer: kept, found: keptFound } = this.draft);
      keptClaims = checkAnswer(kept, this.record.liveView());
      errors = keptFound.filter((x) => x.f.severity === "error");
    }
    this.draft = undefined;
    if (errors.length && !revised && this.settings.reviseOnFindings) {
      this.draft = { answer, claims, found, errors: errors.length, measured: measured(claims) };
      this.record.append("notice", { text: `Review found ${errors.length} problem(s). The agent revises the answer before you see it.` });
      return {
        text: "",
        revise: "[Review before the answer reaches the scientist]\n" + errors.map((x) => `- ${x.f.message}`).join("\n") + "\nFix these problems. Then give the answer again.",
      };
    }
    const finalAnswer = kept ?? answer;
    const finalClaims = keptClaims ?? claims;
    const finalFound = keptFound ?? found;
    if (endsWithPromise(finalAnswer)) finalFound.push({ f: { check: "answer_unfinished", severity: "warning", message: "The answer ends with a plan for more steps, not with a result. The agent stopped before it finished." }, source: "rule" });
    const fids = finalFound.map(({ f, source }) => this.findings.add(f, source).fid);
    const missing = this.resultsNotIn(finalAnswer);
    const settings = this.settingsUsed();
    const defs = this.approvedEntry ? definitionsOf(this.record) : [];
    const definitions = defs.length ? `Definitions, from the confirmed analysis:\n${defs.map((d) => `- ${d.measure}: ${d.definition}`).join("\n")}` : "";
    const tail = [missing, settings, definitions].filter(Boolean).join("\n\n");
    const shown = tail ? `${finalAnswer}\n\n${tail}` : finalAnswer;
    const annotated = annotate(finalAnswer, finalClaims) + (tail ? `\n\n${tail}` : "");
    this.record.append("assistant", { text: shown, annotated, final: true, findings: fids, settings, results: missing || undefined });
    this.lastAnswer = finalAnswer;
    return { text: annotated };
  }

  private resultsNotIn(answer: string): string {
    const turnStart = this.lastRequest()?.id ?? 0;
    const stale = this.record.stale();
    const said = extractNumbers(answer).map((f) => f.value);
    const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 0.005);
    const lines: string[] = [];
    for (const n of this.record.nodes()) {
      if (n.entry <= turnStart || n.sensitivityOf || stale.has(n.id) || n.tool === "calculate") continue;
      const nums = extractNumbers(n.summary ?? "").map((f) => f.value);
      if (!nums.length || nums.some((v) => said.some((x) => close(x, v)))) continue;
      lines.push(`- ${n.id} ${n.tool}: ${n.summary}`);
    }
    if (!lines.length) return "";
    return `Step results that the answer does not mention, from the record:\n${lines.slice(-12).join("\n")}`;
  }

  private settingsUsed(): string {
    const stale = this.record.stale();
    const keys = new Set<string>();
    for (const n of this.record.nodes()) if (!n.sensitivityOf && !stale.has(n.id)) for (const k of Object.keys(n.decisions ?? {})) keys.add(k);
    const fields = this.decisions.fields().filter((f) => keys.has(f.key) && f.set);
    if (!fields.length) return "";
    const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
    const items = fields.map((f) => `${f.label}: ${show(f.value)}${f.owner === "agent" ? " (agent's choice)" : ""}`);
    return `Settings used, from the decision record: ${items.join(" · ")}.`;
  }

  // ------------------------------------------------------------- tool calls

  private fail(callId: string, name: string, message: string, adapter?: string): Part {
    this.record.append("tool_result", { callId, tool: name, adapter, ok: false, error: message, text: message });
    return { type: "tool_result", callId, name, text: `ERROR: ${message}`, isError: true };
  }

  private steered: { text: string; typedAt: string; afterStep: number; afterTool: string; now: boolean }[] = [];
  private callAbort?: AbortController;

  steer(text: string, now = false): void {
    const last = this.record.entries(["tool_result"]).at(-1);
    this.steered.push({ text, typedAt: new Date().toISOString(), afterStep: stepNumbers(this.record.nodes()).size, afterTool: String(last?.data.tool ?? ""), now });
    if (now) this.callAbort?.abort();
  }

  takeSteered(): string[] {
    const list = this.steered.map((m) => m.text);
    this.steered = [];
    return list;
  }

  private takeSteer(): string {
    const list = this.steered;
    this.steered = [];
    for (const m of list) this.record.append("user", { text: m.text, during: true, typedAt: m.typedAt, afterStep: m.afterStep, afterTool: m.afterTool, ...(m.now ? { now: true } : {}) });
    return `[The scientist wrote this while you worked. Read it before your next step.]\n${list.map((m) => m.text).join("\n\n")}`;
  }

  private lastRequest(): Entry | undefined {
    return this.record.entries(["user"]).filter((e) => !e.data.during).at(-1);
  }

  private async runCall(call: Extract<Part, { type: "tool_call" }>, outer: AbortSignal): Promise<Part> {
    const ctl = new AbortController();
    const stop = () => ctl.abort();
    outer.addEventListener("abort", stop, { once: true });
    this.callAbort = ctl;
    try {
      return await this.runOne(call, ctl.signal);
    } finally {
      outer.removeEventListener("abort", stop);
      this.callAbort = undefined;
    }
  }

  private async runOne(call: Extract<Part, { type: "tool_call" }>, signal: AbortSignal): Promise<Part> {
    const tool = this.findTool(call.name);
    this.record.append("tool_call", { callId: call.id, tool: call.name, adapter: tool?.adapter, args: call.args as Record<string, unknown> });
    this.bus.emit({ type: "status", state: "running", tool: call.name, purpose: activity(call.name, (call.args ?? {}) as Args, tool?.source === "adapter" ? tool.title : undefined), since: Date.now() });
    if (call.parseError) return this.fail(call.id, call.name, `the arguments are not valid JSON: ${call.parseError}`);
    if (!tool) return this.fail(call.id, call.name, `no tool named ${call.name}. Use find_tools to search.`);
    if (!this.active.has(tool.name)) this.active.add(tool.name);
    const args = dropNulls((call.args && typeof call.args === "object" ? call.args : {}) as Args, tool.inputSchema);
    if (!ownPurpose(tool)) delete args.purpose;
    const r = await this.pipeline(tool, absolutePaths(args, this.cwd) as Args, call.id, signal);
    return { type: "tool_result", callId: call.id, name: call.name, text: r.text, images: r.images, isError: r.isError };
  }

  async pipeline(tool: Tool, args: Args, callId: string, signal: AbortSignal, depth = 0): Promise<{ text: string; images?: string[]; isError: boolean; output?: ToolOutput }> {
    const error = (message: string) => {
      this.record.append("tool_result", { callId, tool: tool.name, adapter: tool.adapter, ok: false, error: message, text: message });
      return { text: `ERROR: ${message}`, isError: true };
    };
    const blind = blindCheck(tool, args);
    if (blind) {
      this.record.append("blocked", { callId, tool: tool.name, path: blind.path, reason: BLIND_REASON });
      return error(blind.message);
    }
    const held = this.heldBack(args);
    if (held) {
      this.record.append("blocked", { callId, tool: tool.name, path: held, reason: "reference held back for the blind test" });
      return error(`${basename(held)} is held back for the blind test. The harness compares it with your results after the batch. Do not read it.`);
    }
    if (tool.source === "generic" && !this.pathAllowed(args)) return error("This path is outside the folders of this analysis. Ask the scientist where the data is, or use a path from the request.");
    const gate = this.pilotGate(tool, args);
    if (gate) {
      this.record.append("blocked", { callId, tool: tool.name, reason: gate, pilot: true });
      return error(gate);
    }
    if (this.planning && depth === 0 && tool.readOnly && tool.name !== "plan" && tool.name !== "clarify" && ++this.planLooks === 4) this.notes.push(this.clarified ? "You have looked at the data enough. Call plan now." : "You have looked at the data enough. Call clarify now.");
    if ((this.mode === "plan" || this.mode === "teach") && !tool.readOnly)
      return error(this.planning ? "Plan first: no analysis step runs before the scientist approves the plan. Call plan now." : this.mode === "plan" ? "Plan mode: the agent plans and runs only read-only tools. Switch to watch mode to run steps." : "Teach mode: the scientist runs the steps and the agent runs only read-only tools.");
    const pre = await this.hooks.pre({ event: "PreToolUse", session: this.id, mode: this.mode, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args, readOnly: tool.readOnly } as never);
    let eff = (pre.updatedArgs ?? args) as Args;
    if (pre.deviations?.length) this.record.append("deviation", { callId, tool: tool.name, deviations: pre.deviations });
    if (pre.decision === "deny") return error(pre.reason ?? "a hook denied this call");
    const missing = ((tool.inputSchema.required as string[]) ?? []).filter((k) => eff[k] === undefined && !(pre.waitingOn ?? []).some((w) => this.adapterOf(tool)?.linksFor(tool.remoteName ?? tool.name)[k] === w));
    if (missing.length) return error(`missing required arguments: ${missing.join(", ")}`);
    if (pre.decision === "block") {
      const answered = await this.blockOn(pre.waitingOn ?? [], tool, eff, callId, signal);
      if (!answered) {
        return {
          text: `BLOCKED: ${pre.reason ?? "a decision belongs to the scientist"} A question is waiting for the scientist. Do not guess the value. Continue with steps that do not need it, or end your turn with a short summary of what waits.`,
          isError: true,
        };
      }
      if (depth > 3) return error("the decision is still open after the answer");
      const adapter = this.adapterOf(tool);
      const links = adapter?.linksFor(tool.remoteName ?? tool.name) ?? {};
      const next = structuredClone(args);
      for (const [arg, key] of Object.entries(links)) if ((pre.waitingOn ?? []).includes(key) && this.decisions.hasValue(key)) setArg(next, arg, this.decisions.value(key));
      return this.pipeline(tool, next, callId, signal, depth + 1);
    }
    let perm = this.sessionAllow.has(tool.name) ? "allow" : this.permissions.check(tool, eff);
    if (pre.decision === "ask" && perm === "allow") perm = "ask";
    if (perm === "deny") return error("the permission rules deny this tool");
    const searchRoot = tool.source !== "adapter" ? broadSearch(tool.name, eff, this.cwd) : undefined;
    if (searchRoot) {
      const res = await this.requestPermission(tool, eff, signal, undefined, { root: searchRoot, purpose: typeof eff.purpose === "string" ? eff.purpose : "" });
      if (!res.ok) return error(`the scientist did not allow a search of ${searchRoot}${res.note ? `: ${res.note}` : ""}. Do not search large folders. Use the absolute paths from earlier tool results, or ask the scientist where the files are.`);
    } else if (perm === "ask") {
      const res = await this.requestPermission(tool, eff, signal);
      if (!res.ok) return error(`the scientist did not allow this${res.note ? `: ${res.note}` : ""}. Ask what they want instead.`);
    }
    if (pre.decision === "instruct") return this.followStep(tool, eff, callId, signal, pre.applied ?? {});
    const kept = (pre.deviations ?? []).filter((d) => d.overwritten);
    const many = kept.length > 1;
    const keptNote = kept.length
      ? `The harness used the recorded decision${many ? "s" : ""}: ${kept.map((d) => `${d.arg} = ${JSON.stringify(d.setup)} (you gave ${JSON.stringify(d.requested)})`).join("; ")}. This result is for the recorded ${many ? "values" : "value"}, not for the ${many ? "values" : "value"} you gave. Do not report it as the result for ${many ? "those values" : "that value"}. To see the result for ${many ? "other values" : "another value"}, call compare_options. To change the record, call propose_change. The scientist owns ${many ? "these values" : "this value"}.`
      : "";
    const out = await this.execute(tool, eff, callId, signal, { applied: pre.applied ?? {} });
    if (out.node) this.checkPlanned(tool);
    const post = await this.hooks.post({ event: "PostToolUse", session: this.id, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args: eff, output: out.output, node: out.node });
    for (const f of post.findings ?? []) this.findings.add(f, "hook");
    const r = this.render(tool, out.output);
    const inspected = tool.name === "inspect_data" ? { path: resolve(this.cwd, String(eff.path ?? ".")) } : undefined;
    const checked = depth === 0 && tool.readOnly && (tool.source !== "harness" || inspected) && out.output.ok ? this.checkData(tool.remoteName ?? tool.name, inspected ?? eff, out.output) : "";
    const extra = [keptNote, post.additionalContext, checked].filter(Boolean).join("\n");
    return { text: extra ? `${r.text}\n\nNote: ${extra}` : r.text, images: r.images, isError: !out.output.ok, output: out.output };
  }

  async execute(tool: Tool, args: Args, callId: string, signal: AbortSignal, meta: { applied?: Record<string, unknown>; sensitivityOf?: string }): Promise<{ output: ToolOutput; node?: string }> {
    const t0 = performance.now();
    let output: ToolOutput;
    try {
      output = await tool.execute(args, {
        session: this.id,
        callId,
        workDir: this.workDir,
        sessionDir: this.dir,
        signal,
        log: (kind, data) => this.record.append(kind, data),
        callTool: async (name, a) => {
          const t = this.findTool(name);
          if (!t) return { ok: false, error: `no tool named ${name}` };
          const id = `${callId}.${++this.callCount}`;
          this.record.append("tool_call", { callId: id, tool: name, adapter: t.adapter, args: a, from: tool.name });
          const r = await this.pipeline(t, a, id, signal);
          return r.output ?? { ok: false, error: r.text };
        },
      });
    } catch (e) {
      output = { ok: false, error: signal.aborted ? "interrupted: the scientist stopped this tool" : `${(e as Error).name}: ${(e as Error).message}` };
    }
    const durationS = (performance.now() - t0) / 1000;
    const adapter = this.adapterOf(tool);
    const remote = tool.remoteName ?? tool.name;
    const entry = adapter?.mapEntry(remote, args);
    const mod = adapter ? await adapter.module() : {};
    const manualRoute = output.manualRoute ?? mod.manualRoute?.(remote, args) ?? entry?.route ?? "";
    const fidelity = output.fidelity ?? entry?.fidelity ?? (tool.source === "adapter" ? (manualRoute ? "close" : "none") : "none");
    const fileList = [...(output.outputs ?? [])];
    for (const img of output.images ?? []) if (!fileList.some((o) => o.path === img)) fileList.push({ path: img, kind: "image" });
    const outputs = fileList
      .filter((o) => existsSync(o.path) && statSync(o.path).isFile())
      .map((o) => ({ ...o, sha: this.record.putBlob(o.path, extOf(o.path)), ...(!this.place.legacy && outside(o.path, this.cwd) ? { outside: true } : {}) }));
    const images = outputs.filter((o) => o.kind === "image" && /\.(png|jpe?g)$/i.test(o.path));
    const summary = output.summary ?? (output.ok ? `Ran ${remote}.` : `Failed: ${output.error ?? "unknown error"}`);
    let node: string | undefined;
    const argStrings = stringsIn(args);
    const sensitivityOf = meta.sensitivityOf || this.record.nodes().find((n) => n.sensitivityOf && n.outputs.some((o) => argStrings.includes(o.path)))?.sensitivityOf || undefined;
    const makesNode = makesNodeFor(tool, args, output);
    const nodeId = makesNode ? `n${this.record.nodes().length + 1}` : undefined;
    this.record.append(
      "tool_result",
      {
        callId,
        tool: tool.name,
        adapter: tool.adapter,
        ok: output.ok,
        error: output.error,
        summary,
        text: (output.text ?? "").slice(0, 4000),
        metrics: output.metrics,
        table: output.table,
        images: images.map((o) => o.sha),
        files: outputs.filter((o) => !images.includes(o)).map((o) => o.sha),
        durationS,
        effectiveArgs: args,
        manualRoute,
        fidelity,
        sensitivityOf,
      },
      { node: nodeId },
    );
    if (makesNode) {
      const strings = stringsIn(args);
      const inputs = strings.filter((s) => s.length < 1024 && (s.startsWith("/") || /^[A-Za-z]:\\/.test(s)) && existsSync(s) && statSync(s).isFile());
      const parents = this.record.nodes().filter((n) => n.outputs.some((o) => strings.includes(o.path) || (o.sha && strings.some((s) => s.includes(o.sha!))))).map((n) => n.id);
      const inputFiles = await Promise.all(
        inputs
          .filter((p) => !this.record.nodes().some((x) => x.outputs.some((o) => o.path === p)))
          .map(async (p) => {
            const st = statSync(p);
            return { path: p, size: st.size, mtime: st.mtime.toISOString(), sha256: await fileSha(p), ...(!this.place.legacy && outside(p, this.cwd) ? { outside: true } : {}) };
          }),
      );
      const envHash = tool.adapter || tool.name === "run_script" ? await this.envHashFor(tool.adapter || "run_script") : undefined;
      const before = await this.checkStatus();
      const n = this.record.addNode({
        entry: this.record.entries(["tool_result"]).at(-1)!.id,
        adapter: tool.adapter ?? "",
        adapterVersion: adapter?.manifest.adapter.version ?? "",
        programVersion: this.adapterInfo.find((a) => a.name === tool.adapter)?.programVersion ?? "",
        tool: remote,
        args,
        decisions: meta.applied ?? {},
        codeHash: createHash("sha256").update(`${adapter?.name}@${adapter?.manifest.adapter.version}:${remote}:${JSON.stringify(entry ?? {})}`).digest("hex"),
        inputHashes: inputFiles.map((f) => f.sha256),
        inputFiles,
        ...(envHash ? { envHash } : {}),
        outputs,
        result: { ok: output.ok, summary, metrics: output.metrics ?? {}, table: output.table, data: output.data },
        parents,
        summary,
        model: this.provider.info.model,
        manualRoute,
        fidelity,
        sensitivityOf: sensitivityOf ?? "",
      });
      node = n.id;
      if (!n.sensitivityOf) this.noteRerun(n, before);
    }
    return { output: { ...output, summary, manualRoute, fidelity, outputs }, node };
  }

  private noteRerun(n: import("./types.ts").Node, before: StepState[]) {
    const out = before.filter((x) => !x.current);
    const old = replacedNode(this.record, n, new Set(out.map((x) => x.node)));
    if (!old) return;
    const steps = stepNumbers(this.record.nodes());
    const diff = changeRows(old.result, n.result);
    const data: RerunData = { old: old.id, node: n.id, oldStep: steps.get(old.id) ?? 0, step: steps.get(n.id) ?? 0, tool: n.tool, reasons: out.find((x) => x.node === old.id)!.reasons.map((r) => r.text), rows: diff.rows, changed: diff.changed, unchanged: diff.unchanged };
    this.record.append("rerun", data as unknown as Record<string, unknown>, { node: n.id });
  }

  private async envHashFor(key: string): Promise<string | undefined> {
    const target = key === "run_script" ? envTarget({ kind: "python", interpreter: [scriptPython()], program: "", programVersion: "" }) : this.envTargets.get(key);
    if (!target) return undefined;
    const lock = await captureEnv(target).catch(() => undefined);
    if (!lock) return undefined;
    this.envNow.set(key, lock);
    return this.record.addEnvironment(lock, key);
  }

  labels(): Record<string, string> {
    return Object.fromEntries((this.decisions?.fields() ?? []).map((f) => [f.key, f.label || f.key]));
  }

  private currentInfo(): Current {
    const cur: Current = new Map();
    for (const a of this.adapters) {
      const info = this.adapterInfo.find((x) => x.name === a.name);
      cur.set(a.name, { version: a.manifest.adapter.version, programVersion: info?.programVersion, program: a.manifest.program.name, env: this.envNow.get(a.name) });
    }
    if (this.envNow.has("run_script")) cur.set("run_script", { env: this.envNow.get("run_script") });
    return cur;
  }

  async checkStatus(): Promise<StepState[]> {
    const live = await liveReasons(this.record, this.currentInfo());
    const known = recordReasons(this.record, this.labels());
    const fresh = new Map<string, { kind: Reason["kind"]; ids: string[] }>();
    for (const [id, list] of live)
      for (const r of list) {
        if ((known.get(id) ?? []).some((x) => x.text === r.text)) continue;
        const g = fresh.get(r.text) ?? { kind: r.kind, ids: [] };
        g.ids.push(id);
        fresh.set(r.text, g);
      }
    for (const [text, g] of fresh) {
      const nodes = [...new Set([...g.ids, ...g.ids.flatMap((id) => this.record.descendants(id))])];
      this.record.append("stale", { kind: g.kind, reason: text, nodes, direct: g.ids });
    }
    return stepStatus(this.record, { labels: this.labels() });
  }

  private render(tool: Tool, o: ToolOutput): { text: string; images?: string[] } {
    const adapter = this.adapterOf(tool);
    const cloud = this.provider.info.provider === "claude";
    const vis = cloud ? (adapter?.manifest.data_rules.cloud_visibility ?? "all") : "all";
    const small = this.provider.info.small;
    const limit = small ? Math.min(this.settings.maxResultChars, 6000) : this.settings.maxResultChars;
    if (o.text && !o.metrics && !o.table && !o.outputs?.length && vis === "all") return { text: o.text.slice(0, limit) };
    const obj: Record<string, unknown> = { ok: o.ok };
    if (o.error) obj.error = o.error;
    if (o.summary) obj.summary = o.summary;
    if (vis !== "none") {
      if (o.metrics && Object.keys(o.metrics).length) obj.metrics = o.metrics;
      const data = vis === "all" ? withoutShown(o) : undefined;
      if (vis === "all" && o.text && o.text !== JSON.stringify(o.data)) obj.text = o.text;
      if (data?.value !== undefined) obj.data = data.value;
      if (o.outputs?.length) {
        const cap = small ? 12 : 30;
        const files = [...o.outputs.filter((f) => f.kind !== "image"), ...o.outputs.filter((f) => f.kind === "image")];
        obj.outputs = files.slice(0, cap).map((f) => ({ name: f.name, kind: f.kind, path: f.path }));
        if (files.length > cap) obj.outputs_omitted = files.length - cap;
      }
      if (o.table)
        obj.table =
          vis === "summaries"
            ? { columns: o.table.columns, n_rows: o.table.n_rows, path: o.table.path }
            : { path: o.table.path, ...o.table, rows: data?.fullTable ? o.table.rows : o.table.rows.slice(0, small ? 5 : 12) };
    }
    if (o.manualRoute && !small) obj.manual_route = o.manualRoute;
    let text = JSON.stringify(obj, null, small ? 0 : 1);
    if (text.length > limit) text = text.slice(0, limit) + `\n[cut ${text.length - limit} characters; read the files for the rest]`;
    const images = vis === "all" && this.provider.info.vision ? (o.outputs ?? []).filter((f) => f.kind === "image" && /\.(png|jpe?g)$/i.test(f.path)).map((f) => f.path).slice(0, 4) : [];
    return { text, images };
  }

  // ------------------------------------------------------------- decisions owned by the scientist

  private pathAllowed(args: Args): boolean {
    const paths = ["path", "folder", "cwd"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && v.length > 0).map((v) => resolve(this.cwd, v));
    if (!paths.length) return true;
    const named = this.record.entries(["user", "setup"]).flatMap((e) => stringsIn(e.data)).flatMap((t) => t.match(/(?:~|\/|[A-Za-z]:\\)[^\s"'`,;]+/g) ?? []).map((t) => resolve(this.cwd, t.replace(/^~(?=\/)/, process.env.HOME ?? "~").replace(/[.)\]]+$/, "")));
    const roots = [this.cwd, this.dir, gaHome(), ...this.adapters.map((a) => a.root), ...named, ...named.map((n) => join(n, ".."))];
    const nodeFiles = this.record.nodes().flatMap((n) => n.outputs.map((o) => join(o.path, "..")));
    roots.push(...nodeFiles);
    return paths.every((p) => roots.some((r) => {
      const rel = relative(r, p);
      return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
    }));
  }

  private decisionOf(key: string) {
    for (const a of this.adapters) {
      const d = a.manifest.decisions.find((x) => x.key === key);
      if (d) return { adapter: a, decision: d };
    }
    return undefined;
  }

  private async blockOn(keys: string[], tool: Tool, args: Args, callId: string, signal: AbortSignal): Promise<boolean> {
    const qids: string[] = [];
    const compared = (k: string) => Boolean(this.decisionOf(k)?.decision.sensitivity);
    for (const key of [...keys.filter((k) => !compared(k)), ...keys.filter(compared)]) {
      const open = this.questions.open().find((q) => q.decisionKey === key);
      if (open) {
        qids.push(open.qid);
        continue;
      }
      const found = this.decisionOf(key);
      let evidence = "";
      if (found?.decision.sensitivity) {
        const d = found.decision;
        const sensTool = d.sensitivity!.tool || (tool.remoteName ?? tool.name);
        const link = d.links.find((l) => l.tool === sensTool);
        const target = this.findTool(sensTool);
        const canCompare = sensTool === (tool.remoteName ?? tool.name) || this.record.nodes().some((n) => n.tool === sensTool && !n.sensitivityOf);
        if (link && target && !canCompare) evidence = `No comparison yet: ${sensTool} has not run in this session, so the options cannot be compared before you choose.`;
        if (link && target && canCompare) {
          const same = sensTool === (tool.remoteName ?? tool.name);
          const lastRun = same ? undefined : this.record.nodes().filter((n) => n.tool === sensTool && !n.sensitivityOf).at(-1);
          const base: Args = same ? structuredClone(args) : lastRun ? structuredClone(lastRun.args) : {};
          const proposedArgs = structuredClone(base);
          const links = this.adapterOf(target)?.linksFor(sensTool) ?? {};
          const unknown: { arg: string; key: string }[] = [];
          for (const [arg, k] of Object.entries(links)) {
            if (k === key || !keys.includes(k)) continue;
            const other = this.decisionOf(k)?.decision;
            if (this.decisions.isSet(k)) {
              if (this.decisions.hasValue(k)) setArg(base, arg, this.decisions.value(k));
            }
            else if (other?.default !== undefined) setArg(base, arg, other.default);
            else {
              deleteArg(base, arg);
              unknown.push({ arg, key: k });
            }
          }
          for (const u of unknown) {
            const q = this.questions.open().find((x) => x.decisionKey === u.key);
            if (!q || !this.settings.askWaits) continue;
            this.bus.emit({ type: "status", state: "waiting", tool: tool.name });
            this.waitedQids.add(q.qid);
            try {
              await abortable(this.questions.wait(q.qid), signal);
            } catch {}
            if (this.decisions.hasValue(u.key)) setArg(base, u.arg, this.decisions.value(u.key));
            else if (this.decisions.isSet(u.key) && getArg(proposedArgs, u.arg) !== undefined) setArg(base, u.arg, getArg(proposedArgs, u.arg));
          }
          const required = (target.inputSchema.required as string[] | undefined) ?? [];
          const missing = [
            ...unknown.filter((u) => [undefined, null, ""].includes(getArg(base, u.arg) as never)).map((u) => `${u.arg} (${this.decisionOf(u.key)?.decision.label ?? u.key})`),
            ...required.filter((a) => [undefined, null, ""].includes(getArg(base, a) as never) && !unknown.some((u) => u.arg === a)),
          ];
          if (missing.length) {
            evidence = `No comparison yet: the comparison runs of ${sensTool} need a value for ${missing.join(", ")}, and it has none until the scientist answers. The options were not compared.`;
          } else {
            this.record.append("notice", { text: `Comparing the options for "${d.label}" before asking you.` });
            try {
              const res = await runSensitivity(d, sensTool, base, link.arg, async (_t, a, meta) => this.execute(target, a, `${callId}.s${++this.callCount}`, signal, { sensitivityOf: meta.sensitivityOf }), this.record);
              evidence = [res.table, ...res.holds, ...res.depends].join("\n");
            } catch (e) {
              evidence = `The comparison did not run: ${(e as Error).message}`;
            }
          }
        }
      }
      const d = found?.decision;
      const proposed = d?.links.map((l) => getArg(args, l.arg)).find((v) => v !== undefined && v !== null && v !== "");
      const hint = found ? await (await found.adapter.module()).suggest?.(key, args) : undefined;
      if (hint) evidence = [evidence, `Detected from the files: ${String(hint.value)}. ${hint.reason}`].filter(Boolean).join("\n");
      const q = await this.questions.ask({
        decisionKey: key,
        title: d?.label ?? key,
        text: `${d?.help || `The agent needs a value for "${d?.label ?? key}".`} The agent wants to run ${tool.remoteName ?? tool.name}.`,
        options: d?.kind === "bool" && !d.choices.length ? [{ value: true, label: "yes" }, { value: false, label: "no" }] : (d?.choices ?? []).map((c) => ({ value: c, label: String(c) })),
        recommendation: hint ? { value: hint.value, reason: `The harness detected it from the files. ${hint.reason}` } : proposed !== undefined ? { value: proposed, reason: "The agent proposed this value in its tool call." } : d?.default !== undefined ? { value: d.default, reason: "This is the adapter default." } : undefined,
        evidence,
        default: d?.default,
      });
      this.bus.emit({ type: "question", question: q });
      qids.push(q.qid);
    }
    this.record.append("blocked", { callId, tool: tool.name, reason: `waiting for the scientist: ${keys.join(", ")}`, qid: qids.join(",") });
    if (!this.settings.askWaits) return false;
    this.bus.emit({ type: "status", state: "waiting", tool: tool.name });
    try {
      qids.forEach((q) => this.waitedQids.add(q));
      for (const qid of qids) await abortable(this.questions.wait(qid), signal);
      return keys.every((k) => this.decisions.isSet(k));
    } catch {
      return false;
    }
  }

  private async askTool(spec: { question: string; options: string[]; recommendation?: string; reason?: string; wait: boolean }): Promise<ToolOutput> {
    const q = await this.questions.ask({
      decisionKey: "",
      title: spec.question.length > 80 ? spec.question.slice(0, 77) + "..." : spec.question,
      text: spec.question,
      options: spec.options.map((o) => ({ value: o, label: o })),
      recommendation: spec.recommendation ? { value: spec.recommendation, reason: spec.reason ?? "" } : undefined,
      evidence: "",
    });
    this.bus.emit({ type: "question", question: q });
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. Continue with other work.` };
    this.bus.emit({ type: "status", state: "waiting" });
    this.waitedQids.add(q.qid);
    try {
      const done = await abortable(this.questions.wait(q.qid), this.abort?.signal);
      const note = this.record.entries(["answer"]).filter((e) => e.data.qid === q.qid).at(-1)?.data.note;
      return { ok: true, summary: `The scientist answered: ${String(done.answer)}${note ? ` (${note})` : ""}`, data: { answer: done.answer, note } };
    } catch {
      return { ok: false, error: "the question is still open" };
    }
  }

  private async proposeChange(spec: { key: string; value: unknown; reason: string; wait: boolean }): Promise<ToolOutput> {
    const fields = this.decisions.fields();
    const f = fields.find((x) => x.key === spec.key);
    if (!f) return { ok: false, error: `No decision ${spec.key}. Decisions: ${fields.map((x) => x.key).join(", ")}.` };
    if (f.owner === "fixed") return { ok: false, error: `${f.label} is fixed for this analysis. Nobody can change it in this session.` };
    const value = (f.kind === "int" || f.kind === "float") && typeof spec.value === "string" && spec.value.trim() !== "" && Number.isFinite(Number(spec.value)) ? Number(spec.value) : spec.value;
    if (f.choices.length && !f.choices.some((c) => String(c) === String(value))) return { ok: false, error: `${f.label} must be one of: ${f.choices.map(String).join(", ")}.` };
    if (f.owner === "agent") {
      this.decisions.change(f.key, value, { by: "agent", reason: spec.reason });
      return { ok: true, summary: `You own ${f.label}. The record now says ${JSON.stringify(this.decisions.value(f.key))}.` };
    }
    const current = f.set ? f.value : f.default;
    if (current !== undefined && String(current) === String(value)) return { ok: true, summary: `The record already says ${JSON.stringify(current)} for ${f.label}.` };
    if (this.scientistAsked !== undefined || (this.pilotStage && this.pilotPlan)) {
      const asked = this.scientistAsked;
      this.decisions.change(f.key, value, { by: asked !== undefined ? "human" : "agent", reason: asked !== undefined ? `the scientist asked: "${asked}"` : `changed during the demonstration: ${spec.reason}` });
      const t = this.pilotPlan ? settingsOf(this.pilotPlan.plan).find((x) => x.setting.key === f.key)?.setting : undefined;
      if (t) Object.assign(t, { value: this.decisions.value(f.key), by: asked !== undefined ? "you" : "agent" });
      return { ok: true, summary: `${f.label} is now ${JSON.stringify(this.decisions.value(f.key))}. ${asked !== undefined ? "The scientist asked for this change, so no card asks again." : "The scientist sees it on the demonstration card and confirms it there."}` };
    }
    const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
    let q = this.questions.open().find((x) => x.decisionKey === f.key);
    if (!q) {
      q = await this.questions.ask({
        decisionKey: f.key,
        title: `Change ${f.label}?`,
        text: `The agent asks to change "${f.label}" from ${current === undefined ? "not set" : show(current)} to ${show(value)}. Reason: ${spec.reason}`,
        options: [{ value, label: `Change to ${show(value)}` }, ...(current === undefined ? [] : [{ value: current, label: `Keep ${show(current)}` }])],
        recommendation: { value, reason: spec.reason },
        evidence: "",
      });
      this.bus.emit({ type: "question", question: q });
    }
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. The record changes only if the scientist agrees.` };
    this.bus.emit({ type: "status", state: "waiting" });
    this.waitedQids.add(q.qid);
    try {
      await abortable(this.questions.wait(q.qid), this.abort?.signal);
      const now = this.decisions.value(f.key);
      return { ok: true, summary: `The scientist answered. The record now says ${JSON.stringify(now)} for ${f.label}.`, data: { key: f.key, value: now } };
    } catch {
      return { ok: false, error: "the question is still open" };
    }
  }

  private async compareOptions(spec: { key: string; values: unknown[] }): Promise<ToolOutput> {
    const found = this.decisionOf(spec.key);
    if (!found) return { ok: false, error: `No decision ${spec.key}.` };
    const d = found.decision;
    const tools = new Set(d.links.map((l) => l.tool));
    const last = this.record.nodes().filter((n) => tools.has(n.tool) && !n.sensitivityOf).at(-1);
    if (!last) return { ok: false, error: `No step that uses ${d.label} has run yet. Run one first, then compare.` };
    const link = d.links.find((l) => l.tool === last.tool)!;
    const target = this.findTool(last.tool);
    if (!target) return { ok: false, error: `The tool ${last.tool} is not available.` };
    const values = (spec.values.length ? spec.values : d.sensitivity?.options.length ? d.sensitivity.options : d.choices).slice(0, 5);
    if (!values.length) return { ok: false, error: `Give the values to compare for ${d.label}.` };
    const signal = this.abort?.signal ?? new AbortController().signal;
    const perm = this.sessionAllow.has(target.name) ? "allow" : this.permissions.check(target, last.args);
    if (perm === "deny") return { ok: false, error: "the permission rules deny this tool" };
    if (perm === "ask") {
      const res = await this.requestPermission(target, { ...last.args, [link.arg]: values }, signal);
      if (!res.ok) return { ok: false, error: `the scientist did not allow the comparison runs${res.note ? `: ${res.note}` : ""}` };
    }
    const plan = { ...d, sensitivity: { options: values, tool: last.tool, args: {}, compare: d.sensitivity?.compare ?? [], max_runs: values.length } };
    const res = await runSensitivity(plan, last.tool, structuredClone(last.args), link.arg, async (_t, a, meta) => this.execute(target, a, `cmp${++this.callCount}`, signal, { sensitivityOf: meta.sensitivityOf }), this.record);
    const ran = Object.entries(last.args).filter(([k, v]) => k !== link.arg && (typeof v === "number" || typeof v === "boolean" || (typeof v === "string" && v.length <= 60))).map(([k, v]) => `${k}=${v}`);
    const summary = `Compared ${values.length} values of ${d.label} as comparison runs of the last step, ${last.tool}${ran.length ? ` (${ran.join(", ")})` : ""}. Only that step was repeated. To compare another step, run it again first. The record still says ${JSON.stringify(this.decisions.value(d.key))}.`;
    return {
      ok: true,
      summary,
      text: [summary, res.table, ...res.holds, ...res.depends].join("\n"),
      data: { table: res.table, holds: res.holds, depends: res.depends },
    };
  }

  // ------------------------------------------------------------- permissions and follow mode

  private async requestPermission(tool: Tool, args: Args, signal: AbortSignal, outward?: string, search?: { root: string; purpose: string }): Promise<{ ok: boolean; note: string; always: boolean }> {
    const rid = `r${++this.permCount}`;
    const code = typeof args.code === "string" ? args.code : undefined;
    if (this.permissionMode === "bypass" && !outward) {
      this.record.append("permission", { rid, tool: tool.name, decision: "allowed", by: "harness", reason: "bypass permissions", always: false, sha256: code ? createHash("sha256").update(code).digest("hex") : undefined, ...(search ? { search: search.root } : {}) });
      return { ok: true, note: "bypass permissions", always: false };
    }
    let touches = outward ?? ( tool.adapter ? `Runs ${tool.remoteName ?? tool.name} in ${this.adapterInfo.find((a) => a.name === tool.adapter)?.title}. It writes only to the session folder.` : "Runs on this computer with your user permissions.");
    if (!outward && tool.name === "run_script") {
      try {
        const { describeLimits } = await import("../tools/run_script.ts");
        touches = describeLimits(this.settings.networkForScripts);
      } catch {}
    }
    const sha256 = code ? createHash("sha256").update(code).digest("hex") : undefined;
    const p = new Promise<{ ok: boolean; note: string; always: boolean }>((resolve) => this.permissionWaits.set(rid, { resolve }));
    if (search) touches = `The agent wants to search ${search.root}${search.purpose ? ` for this purpose: ${search.purpose.replace(/\.$/, "")}` : ""}. This can take minutes and reads folders outside your project.`;
    this.emitWaiting(rid, { type: "permission", rid, tool: tool.name, args, code, touches, search });
    this.bus.emit({ type: "status", state: "waiting", tool: tool.name });
    let res: { ok: boolean; note: string; always: boolean };
    try {
      res = await abortable(p, signal);
    } catch {
      res = { ok: false, note: "the turn stopped", always: false };
    }
    this.permissionWaits.delete(rid);
    this.waiting.delete(rid);
    if (res.ok && res.always && !search) this.sessionAllow.add(tool.name);
    this.record.append("permission", { rid, tool: tool.name, decision: res.ok ? "allowed" : "denied", by: "scientist", note: res.note, always: res.always && !search, sha256, ...(search ? { search: search.root } : {}) });
    if (res.ok) this.bus.emit({ type: "status", state: "running", tool: tool.name, purpose: activity(tool.name, args, tool.source === "adapter" ? tool.title : undefined), since: Date.now() });
    return res;
  }

  respondPermission(rid: string, ok: boolean, note = "", always = false): void {
    this.permissionWaits.get(rid)?.resolve({ ok, note, always });
  }

  pendingPermissions(): string[] {
    return [...this.permissionWaits.keys()];
  }

  private async followStep(tool: Tool, args: Args, callId: string, signal: AbortSignal, applied: Record<string, unknown>) {
    const step = ++this.followCount;
    const adapter = this.adapterOf(tool);
    const remote = tool.remoteName ?? tool.name;
    const mod = adapter ? await adapter.module() : {};
    const text = instruction(adapter, remote, args, mod.manualRoute?.(remote, args));
    this.record.append("follow_step", { step, tool: remote, instruction: text, status: "waiting" });
    const p = new Promise<{ note: string; agentDoes: boolean }>((resolve) => this.followWaits.set(step, { resolve }));
    this.emitWaiting(`f${step}`, { type: "instruction", step, tool: remote, text });
    this.bus.emit({ type: "status", state: "waiting", tool: remote });
    let done: { note: string; agentDoes: boolean };
    try {
      done = await abortable(p, signal);
    } catch {
      return { text: "ERROR: the scientist stopped before doing this step.", isError: true };
    } finally {
      this.followWaits.delete(step);
      this.waiting.delete(`f${step}`);
    }
    const out = await this.execute(tool, args, callId, signal, { applied });
    const r = this.render(tool, out.output);
    if (done.agentDoes) {
      this.record.append("follow_step", { step, tool: remote, instruction: text, status: "agent did it" });
      return { text: r.text, images: r.images, isError: !out.output.ok, output: out.output };
    }
    let state: unknown;
    const stateTool = adapter?.manifest.connection.state_tool ? this.findTool(adapter.manifest.connection.state_tool) : undefined;
    if (stateTool && stateTool.name !== tool.name) {
      try {
        state = (await stateTool.execute({}, { session: this.id, callId: `${callId}.state`, workDir: this.workDir, sessionDir: this.dir, signal, log: (k, d) => this.record.append(k, d), callTool: async () => ({ ok: false }) })).data;
      } catch {}
    }
    const cmp = compareNote(done.note, out.output.metrics ?? {});
    this.record.append("follow_step", { step, tool: remote, instruction: text, expected: out.output.metrics ?? {}, observed: { note: done.note, state }, match: cmp.match, checked: cmp.checked, differences: cmp.differences, status: "done" });
    const verdict = cmp.checked === 0 ? "The scientist gave no numbers to compare." : cmp.match ? "The scientist's numbers match the reference run." : `The numbers differ: ${cmp.differences.join("; ")}.`;
    return { text: `The scientist did step ${step} by hand. Their note: "${done.note}". ${verdict}\nReference run:\n${r.text}`, images: r.images, isError: !out.output.ok, output: out.output };
  }

  async followDone(step: number, note = "", agentDoes = false): Promise<void> {
    this.followWaits.get(step)?.resolve({ note, agentDoes });
  }

  pendingFollowSteps(): number[] {
    return [...this.followWaits.keys()];
  }

  private reviewTool(): Tool {
    return {
      name: "review_my_steps",
      description: "Teach mode. Read the steps that the scientist did in the program, and compare each step with the decision record. Gives the differences, the decisions that the record does not cover yet, and the steps that the adapter map does not know. Call it when the scientist says that a step is finished. Give args only if the history tool needs them, such as the path of a saved recording.",
      inputSchema: {
        type: "object",
        properties: { adapter: { type: "string", description: "Adapter name. Optional if one adapter has a history tool." }, args: { type: "object", description: "Arguments for the history tool of the adapter, such as {\"path\": \"/data/recording.ijm\"}." } },
        required: [],
      },
      source: "harness",
      readOnly: true,
      permission: "allow",
      execute: async (a) => {
        const r = await this.teachReview(typeof a.adapter === "string" ? a.adapter : undefined, (a.args && typeof a.args === "object" ? a.args : {}) as Args);
        return { ok: r.ok, error: r.error, text: r.text, summary: r.ok ? `${r.n_match} of ${r.n_steps} steps match the record.` : r.error, data: r };
      },
    };
  }

  async teachReview(adapterName?: string, args: Args = {}): Promise<TeachSummary> {
    return teachReview(
      {
        adapters: this.adapters,
        decisions: this.decisions,
        record: this.record,
        runHistory: async (adapter, name, a) => {
          const tool = [...this.tools.values()].find((t) => t.adapter === adapter.name && (t.remoteName ?? t.name) === name);
          if (!tool) return { ok: false, error: `${adapter.name} has no tool named ${name}.` };
          if (!tool.readOnly) return { ok: false, error: `${name} is not read-only, so teach mode does not run it.` };
          const callId = `teach${++this.callCount}`;
          this.record.append("tool_call", { callId, tool: tool.name, adapter: tool.adapter, args: a });
          const r = await this.pipeline(tool, absolutePaths(a, this.cwd) as Args, callId, this.abort?.signal ?? new AbortController().signal);
          return r.output ?? { ok: false, error: r.text };
        },
      },
      adapterName,
      args,
    );
  }

  // ------------------------------------------------------------- scientist actions

  interrupt(): void {
    this.abort?.abort();
    for (const rt of this.runtimes) rt.cancel().catch(() => {});
  }

  private async checkTrust(interactive: boolean): Promise<void> {
    const t = trustStatus(this.cwd);
    for (const q of this.questions.open()) if (q.title === TRUST_TITLE) this.questions.answer(q.qid, "no", "the session started again", "system");
    if (t.state !== "new" && t.state !== "changed") return;
    this.untrusted = t;
    if (interactive) await this.askTrust();
    else this.record.append("notice", { text: untrustedNotice(t) });
  }

  get trustNotice(): string | undefined {
    return this.untrusted ? untrustedNotice(this.untrusted) : undefined;
  }

  async askTrust(): Promise<Question | undefined> {
    const open = this.trustQid ? this.questions.get(this.trustQid) : undefined;
    if (open?.status === "open") return open;
    const t = trustStatus(this.cwd);
    if (t.state === "none") return undefined;
    const q = await this.questions.ask({ decisionKey: "", title: TRUST_TITLE, text: trustText(t), options: TRUST_OPTIONS, evidence: trustEvidence(t) });
    this.trustQid = q.qid;
    this.bus.emit({ type: "question", question: q });
    return q;
  }

  async setTrust(choice: TrustChoice): Promise<string> {
    const t = trustStatus(this.cwd);
    const open = this.trustQid ? this.questions.get(this.trustQid) : undefined;
    if (open?.status === "open") this.questions.answer(open.qid, choice);
    this.record.append("trust", { folder: t.scan.folder, choice, hash: t.scan.hash });
    if (choice === "no") {
      const removed = untrustFolder(this.cwd);
      this.onceTrusted = false;
      if (!this.untrusted && t.state !== "none" && (removed || t.state === "once")) return "The folder is not trusted now. This session keeps the folder settings that it already uses. New sessions ignore them.";
      return "The session runs with user settings only. Cuvette ignores the settings, hooks and adapters of this folder.";
    }
    if (choice === "trust") trustFolder(this.cwd);
    else if (!this.onceTrusted) {
      trustOnce(this.cwd);
      this.onceTrusted = true;
    }
    if (!this.untrusted) return choice === "trust" ? "This folder is trusted." : "This folder is trusted for this session.";
    return this.applyProjectFiles(choice);
  }

  private async applyProjectFiles(choice: TrustChoice): Promise<string> {
    this.untrusted = undefined;
    const before = { ...this.settings };
    const fresh = loadSettings(this.cwd, this.overrides);
    Object.assign(this.settings, fresh);
    this.permissions = new Permissions(this.settings.permissions);
    this.hooks.setCommands(this.settings.hooks);
    if (fresh.permissionMode === "bypass" && this.permissionMode !== "bypass") {
      this.record.append("permission_mode", { old: this.permissionMode, new: "bypass", how: "a settings file of the trusted folder" });
      this.permissionMode = "bypass";
    }
    this.index = undefined;
    const project = projectSettings(this.cwd).reduce<Record<string, unknown>>((a, l) => Object.assign(a, l), {});
    const start = (project.hooks as Settings["hooks"] | undefined)?.SessionStart;
    if (start?.length) await new HookRunner([], { SessionStart: start }, this.cwd).event("SessionStart", { session: this.id });
    const later = ["model", "referee", "mode", "effort", "numCtx", "think", "defaultAdapters", "output_folder"].filter((k) => k in project && JSON.stringify(project[k]) !== JSON.stringify((before as Record<string, unknown>)[k]));
    const shadowed = this.adapters.filter((a) => { try { return findAdapter(a.name, this.cwd).root !== a.root; } catch { return false; } }).map((a) => a.name);
    const parts = [choice === "trust" ? "This folder is trusted. Its settings, hooks and adapters apply now." : "This folder is trusted for this session. Its settings, hooks and adapters apply now."];
    if (later.length) parts.push(`These folder settings apply in the next session: ${later.join(", ")}.`);
    if (shadowed.length) parts.push(`The session already uses the catalog version of ${shadowed.join(", ")}. Start a new session to use the folder version.`);
    const text = parts.join(" ");
    this.record.append("notice", { text });
    return text;
  }

  async answer(qid: string, value: unknown, note = ""): Promise<void> {
    if (qid === this.trustQid || this.questions.get(qid)?.title === TRUST_TITLE) {
      const q = this.questions.get(qid);
      if (q?.status === "open") {
        const v = String(this.questions.match(q, value ?? "no"));
        await this.setTrust(v === "trust" || v === "once" ? v : "no");
      }
      return;
    }
    const waited = this.waitedQids.has(qid);
    const open = this.questions.get(qid);
    if (open && (value === undefined || value === null)) {
      if (open.recommendation) value = open.recommendation.value;
      else if (open.default !== undefined) value = open.default;
      else throw new Error(`${open.title}: choose an option or type a value.`);
    }
    if (open?.decisionKey && open.status === "open") this.decisions.validate(open.decisionKey, this.questions.match(open, value));
    const q = this.questions.answer(qid, value, note);
    if (q.decisionKey) this.decisions.change(q.decisionKey, q.answer, { by: "human", reason: `answer to ${qid}` });
    if (waited) return;
    this.notes.push(`The scientist answered ${qid} (${q.title}): ${String(q.answer)}${note ? ` - ${note}` : ""}.`);
    if (!this.busy && this.settings.autoResume && this.history.length) void this.send("Continue the analysis with this answer.", { internal: true }).catch(() => {});
  }

  async changeAnswer(qid: string, value: unknown, note = ""): Promise<string[]> {
    const q = this.questions.get(qid);
    if (!q) throw new Error(`No question ${qid}.`);
    if (q.status === "open") return (await this.answer(qid, value, note), []);
    const chosen = this.questions.match(q, value);
    if (q.decisionKey) this.decisions.validate(q.decisionKey, chosen);
    const old = q.answer;
    if (JSON.stringify(old) === JSON.stringify(chosen)) return [];
    this.questions.change(qid, chosen, note);
    const stale = q.decisionKey ? this.decisions.change(q.decisionKey, chosen, { by: "human", reason: `changed answer to ${qid}` }) : [];
    this.notes.push(`The scientist changed the answer to ${qid} (${q.title}): ${JSON.stringify(old)} -> ${JSON.stringify(chosen)}.${stale.length ? ` Results that used the old value are out of date: ${stale.join(", ")}.` : ""} Use the new answer from now on.`);
    return stale;
  }

  setDecision(key: string, value: unknown, reason = ""): string[] {
    const stale = this.decisions.change(key, value, { by: "human", reason });
    this.notes.push(`The scientist changed "${key}" to ${JSON.stringify(value)}.${stale.length ? ` Results that used the old value are out of date: ${stale.join(", ")}. Run those steps again if they matter.` : ""}`);
    return stale;
  }

  setOwner(key: string, owner: Owner): void {
    this.decisions.setOwner(key, owner, "human");
    this.notes.push(`The scientist set the owner of "${key}" to ${owner}.`);
  }

  setPermissionMode(m: Settings["permissionMode"]): void {
    if (m === this.permissionMode) return;
    this.record.append("permission_mode", { old: this.permissionMode, new: m, how: `/permissions ${m}` });
    this.permissionMode = m;
  }

  async applySetting(name: string, value: unknown): Promise<void> {
    if (name === "mode") return this.setMode(value as Mode);
    if (name === "planFirst") this.planFirst = value === true || value === "on";
    if (name === "pilot" && (value === true || value === "on")) this.addPilotTools();
    const next = { ...this.settings, [name]: value } as Settings;
    const provider = name === "model" || name === "effort" ? await makeProvider(next.model, { effort: next.effort, numCtx: next.numCtx, think: next.think }) : this.provider;
    const referee = ["model", "referee", "effort"].includes(name)
      ? next.referee === "same"
        ? provider
        : next.referee && next.referee !== "none"
          ? await makeProvider(next.referee, { effort: next.effort })
          : undefined
      : this.refereeProvider;
    this.settings = next;
    this.provider = provider;
    this.refereeProvider = referee;
    if (name === "export_xlsx" || name === "figure_formats") this.dirs();
    if (["model", "export_xlsx", "figure_formats", "text_style"].includes(name)) this.system = this.buildSystem();
  }

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.record.append("mode", { old: this.mode, new: mode });
    this.mode = mode;
    this.notes.push(MODE_NOTE[mode]);
  }

  // ------------------------------------------------------------- analysis plan

  private startPlanning(request: string) {
    this.planning = true;
    this.planUpdate = this.approvedEntry > 0 && !!this.plan;
    this.planLooks = 0;
    this.inspection = undefined;
    this.toolsHinted = false;
    this.clarified = !this.tools.has("clarify");
    this.modeBefore = this.mode === "plan" ? "watch" : this.mode;
    this.refCandidates = this.findReferenceFiles(request);
    if (this.mode !== "plan") {
      this.record.append("mode", { old: this.mode, new: "plan", reason: "plan first" });
      this.mode = "plan";
    }
    this.notes.push(this.planUpdate ? PLAN_UPDATE_NOTE : `${PLAN_NOTE} ${DATA_CHECK_NOTE}`);
    if (!this.planUpdate && this.method) this.notes.push(methodNote(this.method));
    if (!this.planUpdate && this.pick && !this.adapters.length) this.notes.push("No adapter is loaded yet. Call list_adapters, then name the adapter for each part in programs, with its exact name. When the scientist confirms the plan, call use_adapter for it. The confirmation covers that load, so no second card shows.");
    if (!this.planUpdate && this.refCandidates.length)
      this.notes.push(`Files in the project folder that may be earlier results on the same data: ${this.refCandidates.map(describeCandidate).join("; ")}. If one fits, name it in the reference section, state each measure in the reference's own terms, and ask in reference.question whether your measure is the same as the reference's measure.`);
  }

  private findReferenceFiles(text: string): Candidate[] {
    const relative = (text.match(/[\w][\w./ -]*[\w/]/g) ?? []).flatMap((w) => w.split(/\s+/)).map((w) => resolve(this.cwd, w.replace(/[.,;:]+$/, ""))).filter((p) => p !== this.cwd && existsSync(p));
    const paths = [...new Set([...pathsIn(text).filter((p) => existsSync(p)), ...relative])];
    const names: string[] = [];
    const skip: string[] = [];
    for (const p of paths) {
      names.push(basename(p, extname(p)), basename(dirname(p)));
      skip.push(p);
      try {
        if (statSync(p).isDirectory())
          for (const n of readdirSync(p).slice(0, 60)) {
            names.push(basename(n, extname(n)));
            const sub = join(p, n);
            if (statSync(sub).isDirectory()) names.push(...readdirSync(sub).slice(0, 30).map((m) => basename(m, extname(m))));
          }
      } catch {}
    }
    names.push(basename(this.cwd));
    return findReferences([this.cwd, dirname(this.cwd)], names, skip);
  }

  pilotOn(): boolean {
    const p = this.settings.pilot;
    return this.settings.guidance && (p === undefined ? this.interactive || this.planFirst : p === true || p === "on");
  }

  private pilotTools(): Tool[] {
    const base = { source: "harness" as const, readOnly: true, permission: "allow" as const };
    return [
      {
        ...base,
        name: "pilot_result",
        description: "Show the scientist the pilot: the method run on one sample. Give the sample, the numbers (one for each measure), the paths of the QC images (outlines of what was counted and what was left out, with a legend) and your own plain check of what looks wrong or uncertain. The scientist confirms the pilot, asks for a change, or asks for another sample.",
        inputSchema: {
          type: "object",
          properties: {
            sample: { type: "string", description: "The pilot sample, for example the file name." },
            values: { type: "object", description: "One number for each measure, named as in the plan, for example {\"positive cells\": 296, \"all cells\": 530}." },
            images: { type: "array", items: { type: "string" }, description: "Paths of the QC images." },
            legend: { type: "string", description: "The legend of the QC images in plain words, for example: yellow outline = counted as positive; cyan outline = counted as negative; magenta = red that is not in a cell; orange = left out (too small or at the edge)." },
            check: { type: "string", description: "Your own plain check: what looks wrong or uncertain." },
          },
          required: ["sample", "values", "check"],
        },
        execute: async (a) => this.pilotResult(a),
      },
      {
        ...base,
        name: "batch_results",
        description: "After all samples ran, give the value of each sample for one measure. The harness compares the values with the reference that the scientist named, writes the validation table and plot, and shows you the result.",
        inputSchema: {
          type: "object",
          properties: {
            measure: { type: "string", description: "The measure, named as in the plan." },
            values: { type: "array", items: { type: "object", properties: { sample: { type: "string" }, value: { type: "number" } }, required: ["sample", "value"] } },
          },
          required: ["measure", "values"],
        },
        execute: async (a) => this.batchResults(a),
      },
    ];
  }

  private addPilotTools() {
    for (const t of this.pilotTools()) if (!this.tools.has(t.name)) (this.tools.set(t.name, t), this.active.add(t.name));
  }

  setPilot(on: boolean): void {
    if (on) this.addPilotTools();
    this.settings = { ...this.settings, pilot: on ? "on" : "off" };
    this.record.append("notice", { text: on ? "Pilot is on. A batch step waits until you approve a pilot on one sample." : "Pilot is off. Batch steps run without a pilot." });
  }

  private pilotGate(tool: Tool, args: Args): string | undefined {
    if (!this.pilotOn() || tool.readOnly) return undefined;
    const remote = tool.remoteName ?? tool.name;
    const m = this.adapterOf(tool)?.manifest;
    const declared = !!m?.tools.find((t) => t.name === remote)?.batch || !!m?.batch_tools.includes(remote);
    const why = batchReason(remote, args, declared);
    if (!why) return undefined;
    const st = pilotState(this.record);
    if (st.approved && !st.stale) return undefined;
    if (st.stale) return `Pilot first: ${why} The pilot is out of date: ${st.stale}. Run the method again on one sample, save the QC images, and call pilot_result. The scientist confirms it before the batch runs.`;
    return `Pilot first: ${why} This step processes many files, so it waits for a pilot. Run the method on one sample only, save QC images with outlines of what was counted and what was left out, and call pilot_result. The scientist approves the pilot before the batch runs.`;
  }

  private heldBack(args: Args): string | undefined {
    if (!this.hidden.length) return undefined;
    const paths = pathsIn(args);
    const strings = JSON.stringify(args);
    return this.hidden.find((h) => paths.some((p) => p === h || p.startsWith(`${h}/`)) || strings.includes(basename(h)));
  }

  private setReference(choice: ReferenceChoice | undefined) {
    if (!choice || choice.mode === "none" || !choice.path) {
      if (choice) this.record.append("reference", { mode: "none" });
      return;
    }
    const path = resolve(this.cwd, choice.path);
    this.reference = { path, sheet: choice.sheet, sample_column: choice.sample_column, columns: choice.columns, mode: choice.mode };
    this.record.append("reference", { ...this.reference });
    if (choice.mode !== "blind") return;
    this.hidden.push(path);
    const bp = blindPolicy();
    if (bp) setBlindPolicy({ allow: bp.allow, deny: [...bp.deny, path], hide: bp.hide });
  }

  private needsValidation(): boolean {
    return !!this.reference && !!this.record.entries(["pilot_approved"]).length && !this.record.entries(["validation"]).length && this.record.nodes().some((n) => n.entry > (this.record.entries(["pilot_approved"]).at(-1)?.id ?? 0));
  }

  private figuresDir(): string {
    const d = join(this.outputDir, "figures");
    mkdirSync(d, { recursive: true });
    return d;
  }

  private showImages(paths: string[]) {
    if (this.settings.headless || !this.interactive || process.platform !== "darwin" || process.env.VITEST || process.env.GA_NO_OPEN === "1" || this.settings.openImages === "off") return;
    for (const p of paths) {
      const child = spawn("open", [p], { stdio: "ignore", detached: true });
      child.on("error", () => {});
      child.unref();
    }
  }

  private async askPlanCard(event: Omit<import("./types.ts").PlanEvent, "type">): Promise<PlanResponse | undefined> {
    const wait = new Promise<PlanResponse>((resolve) => (this.planWait = { resolve }));
    this.emitWaiting("plan", { type: "plan", ...event });
    this.bus.emit({ type: "status", state: "waiting", tool: event.stage === "pilot" ? "pilot_result" : "plan" });
    try {
      return await abortable(wait, this.abort?.signal);
    } catch {
      return undefined;
    } finally {
      this.planWait = undefined;
      this.waiting.delete("plan");
    }
  }

  private changeDefinition(d: { measure: string; old: string; new: string }) {
    this.record.append("decision", { key: `definition:${d.measure}`, old: d.old, new: d.new, by: "human", reason: "the scientist changed the definition" });
  }

  private referenceQuestion(): { question: string; candidates: { path: string; sheet?: string; columns: string[]; label: string }[] } {
    const c = this.refCandidates;
    return {
      question: c.length ? `I found ${describeCandidate(c[0]!)}. Is this an earlier analysis of these images? Should the demonstration compare with it?` : "Do you have hand counts or an earlier analysis to check against?",
      candidates: c.map((x) => ({ path: x.path, sheet: x.sheet, columns: x.columns, label: describeCandidate(x) })),
    };
  }

  private approvePlan(plan: AnalysisPlan, version: number, target: Mode, answers: string[], pilot?: PilotRun): number {
    const text = planText(plan);
    this.plan = structuredClone(plan);
    this.approvedEntry = this.record.append("plan_approved", { phase: "Confirmed", version, text, plan: structuredClone(plan), mode: target, update: this.planUpdate, answers, ...(pilot ? { pilot } : {}) }).id;
    this.planWarned.clear();
    return this.approvedEntry;
  }

  private async pilotResult(a: Args): Promise<ToolOutput> {
    this.scientistAsked = undefined;
    const sample = String(a.sample ?? "").trim();
    if (!sample) return { ok: false, error: "Give the pilot sample." };
    const values: Record<string, number> = {};
    for (const [k, v] of Object.entries((a.values ?? {}) as Record<string, unknown>)) if (Number.isFinite(Number(v))) values[k] = Number(v);
    if (!Object.keys(values).length) return { ok: false, error: "Give the numbers for the pilot sample in values, one for each measure, for example {\"positive cells\": 296}." };
    const plan = this.pilotPlan?.plan ?? this.plan;
    const definitions = plan?.definitions ?? [];
    const figs = this.figuresDir();
    const images = (Array.isArray(a.images) ? a.images.map(String) : []).filter((p) => existsSync(p)).map((p) => {
      const to = join(figs, `pilot-${norm(sample) || "sample"}-${basename(p)}`);
      if (resolve(p) !== to) copyFileSync(p, to);
      return to;
    });
    const comparison: string[] = [];
    let refValues: Record<string, number> | undefined;
    if (this.reference?.mode === "compare") {
      try {
        refValues = referenceValues(this.reference, sample);
      } catch (e) {
        comparison.push(`The reference could not be read: ${(e as Error).message}`);
      }
      if (refValues) {
        const cols = Object.keys(refValues);
        Object.entries(values).forEach(([k, v], i) => {
          const col = cols.find((c) => norm(c).includes(norm(k)) || norm(k).includes(norm(c))) ?? cols[i];
          if (col !== undefined) comparison.push(compareLine(k, v, refValues![col]!, col));
        });
      } else if (!comparison.length) comparison.push(`The reference has no row for ${sample}.`);
    }
    const run = { sample, values, images, legend: String(a.legend ?? "").trim() || undefined, check: String(a.check ?? ""), comparison, reference: this.reference ? { path: this.reference.path, mode: this.reference.mode, values: refValues } : undefined, definitions };
    const entry = this.record.append("pilot_run", { phase: "Demonstration on a sample", ...run } as unknown as Record<string, unknown>).id;
    this.showImages(images);
    const pending = this.pilotPlan;
    const shownPlan = pending?.plan ?? this.plan;
    const r = await this.askPlanCard({
      stage: "pilot",
      version: pending?.version ?? this.planVersion,
      text: pilotText(run),
      details: shownPlan ? planText(shownPlan, { view: "compact" }) : undefined,
      settings: shownPlan ? settingsOf(shownPlan).map((x, i) => ({ index: i, step: x.step, label: x.setting.label, key: x.setting.key, value: x.setting.value, by: x.setting.by, options: x.setting.options })) : [],
      update: false,
      qids: [],
      programs: [],
      mode: pending?.target ?? this.mode,
      definitions,
      images,
    });
    if (!r) return { ok: false, error: "the scientist stopped the turn before answering the pilot" };
    if (r.action === "confirm") {
      const pilot = { entry, ...run } as PilotRun;
      this.record.append("pilot_approved", { run: entry, sample });
      this.pilotStage = false;
      if (pending) {
        this.approvePlan(pending.plan, pending.version, pending.target, pending.answers, pilot);
        this.pilotPlan = undefined;
      }
      const next = this.reference ? " After all samples ran, call batch_results with the value of each sample, so that the harness compares them with the reference." : "";
      return { ok: true, summary: `The scientist confirmed the ${pending ? "plan and the " : ""}pilot on ${sample}. Run all samples now with the same method and settings.${next}` };
    }
    if (r.action === "cancel") {
      this.record.append("pilot_rejected", { run: entry, sample, reason: "cancelled" });
      if (pending) this.record.append("plan", { action: "cancelled", version: pending.version });
      this.pilotStage = false;
      this.pilotPlan = undefined;
      this.stopTurn = true;
      return { ok: true, summary: "The scientist cancelled. Stop now." };
    }
    if (r.action === "another") {
      this.record.append("pilot_rejected", { run: entry, sample, reason: "try another sample", another: true });
      return { ok: true, summary: `The scientist wants the pilot on another sample${r.text ? `: ${r.text}` : ""}. Run the same method on one other sample, then call pilot_result.` };
    }
    if (r.action === "set" && shownPlan) {
      const t = settingsOf(shownPlan)[r.index]?.setting;
      if (!t) return { ok: false, error: "no such setting" };
      const old = t.value;
      t.value = typeof old === "number" && typeof r.value === "string" && Number.isFinite(Number(r.value)) ? Number(r.value) : r.value;
      t.by = "you";
      this.planVersion++;
      if (pending) pending.version = this.planVersion;
      this.record.append("plan", { action: "setting_changed", phase: "Demonstration on a sample", version: this.planVersion, label: t.label, key: t.key, old: old ?? null, new: t.value, text: planText(shownPlan), plan: structuredClone(shownPlan) });
      this.commitSettings(shownPlan);
      this.record.append("pilot_rejected", { run: entry, sample, reason: `${t.label} changed to ${String(t.value)}` });
      return { ok: true, summary: `The scientist changed ${t.label} from ${String(old)} to ${String(t.value)}. Run the demonstration again on ${sample} with this value, then call pilot_result.` };
    }
    if (r.action === "change") {
      if (r.definition) this.changeDefinition(r.definition);
      this.record.append("pilot_rejected", { run: entry, sample, reason: r.text });
      this.scientistAsked = r.text;
      return { ok: true, summary: `The scientist asks for a change: "${r.text}". Change the metrics or the method, run the demonstration on ${sample} again, then call pilot_result. If the change is a setting with a key, call propose_change: the harness applies it at once, with no second card, because the scientist asked for it. If a definition changes, call plan with the new definition and the reason.` };
    }
    return { ok: false, error: "unknown answer" };
  }

  private async batchResults(a: Args): Promise<ToolOutput> {
    const ref = this.reference;
    const measure = String(a.measure ?? "").trim();
    const raw = a.values;
    const rows: { sample: string; value: number }[] = Array.isArray(raw)
      ? raw.map((x: any) => ({ sample: String(x?.sample ?? ""), value: Number(x?.value) }))
      : Object.entries((raw ?? {}) as Record<string, unknown>).map(([sample, value]) => ({ sample, value: Number(value) }));
    const good = rows.filter((r) => r.sample && Number.isFinite(r.value));
    if (!good.length) return { ok: false, error: "Give values as a list of {sample, value}." };
    if (!ref) return { ok: true, summary: `Saved ${good.length} values. No reference was set, so there is nothing to compare.` };
    const pilots = new Set(this.record.entries(["pilot_approved"]).map((e) => norm(e.data.sample)));
    const pairs: Pair[] = [];
    const missing: string[] = [];
    let refColumn = "";
    for (const r of good) {
      let vals: Record<string, number> | undefined;
      try {
        vals = referenceValues(ref, r.sample);
      } catch (e) {
        return { ok: false, error: `The reference could not be read: ${(e as Error).message}` };
      }
      const cols = Object.keys(vals ?? {});
      const col = cols.find((c) => norm(c).includes(norm(measure)) || norm(measure).includes(norm(c))) ?? cols[0];
      if (!vals || col === undefined) {
        missing.push(r.sample);
        continue;
      }
      refColumn ||= col;
      pairs.push({ sample: r.sample, ours: r.value, ref: vals[col]!, pilot: pilots.has(norm(r.sample)) });
    }
    if (!pairs.length) return { ok: false, error: `The reference has no rows for these samples: ${missing.join(", ")}.` };
    const all = agreement(pairs);
    const rest = pairs.filter((p) => !p.pilot);
    const summary = [
      `Measure: ${measure || "value"}; reference column "${refColumn}" in ${basename(ref.path)} (${ref.mode === "blind" ? "held back from the agent until now" : "seen in the pilot"}).`,
      agreementText("All samples", all),
      ...(rest.length && rest.length < pairs.length ? [agreementText("Without the pilot sample", agreement(rest))] : []),
      ...(missing.length ? [`No reference row for: ${missing.join(", ")}.`] : []),
    ];
    const plot = pairs.length >= 2 ? blandAltmanPng(pairs, join(this.figuresDir(), `bland-altman-${norm(measure) || "value"}.png`)) : undefined;
    this.record.append("validation", { measure, refColumn, reference: ref.path, mode: ref.mode, pairs, summary, plot });
    if (ref.mode === "blind") {
      this.hidden = this.hidden.filter((h) => h !== ref.path);
      this.record.append("reference", { ...ref, revealed: true });
    }
    const table = pairs.map((p) => `${p.sample}: agent ${p.ours}, reference ${p.ref}${p.pilot ? " (pilot)" : ""}`).join("\n");
    return { ok: true, summary: summary.join(" "), text: `${summary.join("\n")}\n${table}\nNow you can read the reference. Explain the gaps between your values and the reference in the answer.` };
  }

  private endPlanning(target?: Mode) {
    this.planning = false;
    const to = target ?? this.modeBefore;
    if (this.mode === to) return;
    this.record.append("mode", { old: this.mode, new: to, reason: target ? "plan approved" : "plan ended" });
    this.mode = to;
  }

  private whoSet(key: string): string {
    const last = this.record.entries(["setup", "decision"]).filter((e) => (e.kind === "decision" ? e.data.key === key : key in ((e.data.values as object) ?? {}))).at(-1);
    if (!last) return "default";
    const how = String(last.kind === "decision" ? last.data.reason ?? "" : last.data.how ?? "");
    if (how.startsWith("from the method ") && !((last.data.defaultsAccepted as string[] | undefined) ?? []).includes(key)) return how.slice(9);
    if (last.kind === "decision") return last.data.by === "agent" ? "agent" : String(last.data.reason ?? "").startsWith("set in the confirmed analysis") ? String(last.data.reason).replace(/^.*\((.*)\)$/, "$1") : "you";
    return ((last.data.defaultsAccepted as string[] | undefined) ?? []).includes(key) || String(last.data.how ?? "").startsWith("defaults") ? "default" : "you";
  }

  private fillDecisions(plan: AnalysisPlan) {
    const fields = this.decisions.fields();
    for (const step of plan.steps)
      for (const d of step.decisions ?? []) {
        const byLabel = fields.find((x) => [x.label, x.key].some((n) => norm(n) === norm(d.label)));
        if (!d.key && byLabel) d.key = byLabel.key;
        const f = d.key ? fields.find((x) => x.key === d.key) : undefined;
        const qid = [...this.planQids].find(([, x]) => x === d)?.[0];
        const answered = qid ? this.record.entries(["answer"]).filter((e) => e.data.qid === qid).at(-1) : undefined;
        if (answered) {
          d.value = f && this.decisions.hasValue(f.key) ? this.decisions.value(f.key) : answered.data.value;
          d.by = "you";
        } else if (d.by === "you") continue;
        else if (f && f.set && this.decisions.hasValue(f.key) && (d.value === undefined || this.whoSet(f.key) !== "default" || f.owner === "fixed")) {
          d.value = this.decisions.value(f.key);
          d.by = f.owner === "fixed" ? "fixed" : this.whoSet(f.key);
        } else if (d.value !== undefined) d.by ??= "agent";
        else if (d.recommendation) {
          d.value = (d.options ?? f?.choices.map(String) ?? []).find((o) => o.toLowerCase() === d.recommendation!.toLowerCase()) ?? d.recommendation;
          d.by = "agent";
        } else if (f && f.default !== undefined && f.default !== null && f.default !== "") {
          d.value = f.default;
          d.by = "default";
        }
      }
  }

  private knownDecisions(plan: AnalysisPlan): KnownDecision[] {
    const out: KnownDecision[] = [];
    for (const name of new Set([...this.adapters.map((a) => a.name), ...plannedAdapters(plan)])) {
      let a: LoadedAdapter | undefined = this.adapters.find((x) => x.name === name);
      try {
        a ??= applyOverlay(findAdapter(name, this.cwd));
      } catch {
        continue;
      }
      for (const d of a.manifest.decisions) {
        const owner = this.decisions.has(d.key) ? this.decisions.owner(d.key) : d.owner;
        if (owner !== "human" || !d.links.length || out.some((x) => x.key === d.key)) continue;
        out.push({ key: d.key, label: d.label, kind: d.kind, choices: d.choices, default: d.default, tools: d.links.map((l) => l.tool.toLowerCase()), asks: d.stage === "when_needed" && !(this.decisions.has(d.key) && this.decisions.isSet(d.key)) });
      }
    }
    return out;
  }

  private commitSettings(plan: AnalysisPlan) {
    const fields = this.decisions.fields();
    const done = new Set<string>();
    for (const { setting: d } of settingsOf(plan)) {
      const f = d.key ? fields.find((x) => x.key === d.key) : undefined;
      if (!f || f.owner === "fixed" || d.value === undefined || done.has(f.key)) continue;
      done.add(f.key);
      if (f.set && JSON.stringify(this.decisions.value(f.key)) === JSON.stringify(d.value)) continue;
      try {
        this.decisions.change(f.key, d.value, { by: f.owner === "agent" ? "agent" : "human", reason: `set in the confirmed analysis (${d.by ?? "agent"})` });
      } catch (e) {
        this.notes.push(`The setting ${d.label} = ${JSON.stringify(d.value)} does not fit the decision ${f.key}: ${(e as Error).message}`);
      }
    }
  }

  private async askPlanDecisions(plan: AnalysisPlan): Promise<string[]> {
    const fields = this.decisions.fields();
    const qids: string[] = [];
    this.planQids.clear();
    for (const { step, decision: d } of openDecisions(plan)) {
      const f = d.key ? fields.find((x) => x.key === d.key) : undefined;
      if (f && f.owner !== "human") continue;
      let q = this.questions.open().find((x) => (f ? x.decisionKey === f.key : !x.decisionKey && x.title === d.label));
      if (!q) {
        const options = (f?.choices.length ? f.choices : (d.options ?? [])).map((v) => ({ value: v, label: String(v) }));
        const rec = d.recommendation ? (options.find((o) => String(o.value).toLowerCase() === d.recommendation!.toLowerCase())?.value ?? d.recommendation) : f?.default;
        q = await this.questions.ask({
          decisionKey: f?.key ?? "",
          title: f?.label ?? d.label,
          text: `${f?.help || d.label} Step ${step} of the plan needs this decision.`,
          options,
          recommendation: rec !== undefined ? { value: rec, reason: d.recommendation ? "The agent recommends it in the plan." : "This is the adapter default." } : undefined,
          evidence: "",
          default: f?.default,
        });
        this.bus.emit({ type: "question", question: q });
      }
      qids.push(q.qid);
      this.planQids.set(q.qid, d);
    }
    return qids;
  }

  private async planTool(a: Args): Promise<ToolOutput> {
    const given = readPlan(a, false);
    const reason = typeof a.reason === "string" ? a.reason.trim() : "";
    if (!this.planning) {
      if (!this.plan || !this.approvedEntry) {
        const draft = { steps: [], ...readPlan(a) } as AnalysisPlan;
        this.record.append("note", { text: `Plan:\n${planText(draft)}`, plan: draft.steps.map((x) => ({ step: x.step, status: x.status })), by: "agent" });
        return { ok: true, summary: `Plan with ${draft.steps.length} steps.` };
      }
      const prev = this.plan;
      const next = mergePlan(prev, given);
      const added = addedSteps(prev, next);
      const skipped = next.steps.filter((x) => x.status === "skipped" && prev.steps.find((p) => p.step.toLowerCase() === x.step.toLowerCase())?.status !== "skipped");
      const sections = (["restatement", "question", "definitions", "exclusions", "pilot", "reference", "data", "programs", "outputs", "checks", "out_of_scope"] as const).some((k) => given[k] !== undefined);
      const changed = added.length > 0 || skipped.length > 0 || sections;
      if (changed && !reason && ![...added, ...skipped].every((x) => x.reason)) return { ok: false, error: "Give the reason for this change of the approved plan in reason. The scientist sees it." };
      const ran = this.record.nodes().filter((n) => n.entry > this.approvedEntry && !n.sensitivityOf).map((n) => n.tool);
      for (const x of added) if (x.status === "todo" && ran.some((t) => matchStep({ steps: [x] }, t, this.findTool(t)?.adapter) === 0)) x.status = "done";
      for (const d of given.definitions ?? []) {
        const old = prev.definitions?.find((x) => x.measure.toLowerCase() === d.measure.toLowerCase());
        if (old?.definition !== d.definition) this.record.append("decision", { key: `definition:${d.measure}`, old: old?.definition ?? null, new: d.definition, by: "agent", reason: reason || "the agent changed the definition" });
      }
      this.plan = next;
      if (changed) this.planVersion++;
      this.record.append("plan", { action: changed ? "updated" : "status", version: this.planVersion, reason: reason || [...added, ...skipped].map((x) => x.reason).join(" "), text: planText(next), plan: structuredClone(next) });
      for (const x of skipped) this.record.append("notice", { text: `Skipped from the approved plan: ${x.step}. Reason: ${x.reason || reason}`, plan: "skipped" });
      for (const x of added) this.record.append("notice", { text: `Added to the approved plan: ${x.step}. Reason: ${x.reason || reason}`, plan: "added" });
      return { ok: true, summary: changed ? `The plan is now version ${this.planVersion}. The scientist sees the change and the reason.` : "Plan status saved." };
    }
    if (!this.planUpdate && !this.clarified) return { ok: false, error: "Phase 1 first: call clarify with what you found in the data and your clarifying questions about meaning (or none). Then call plan with the proposed analysis." };
    const plan = this.planUpdate && this.plan ? mergePlan(this.plan, given) : ({ steps: [], ...readPlan(a) } as AnalysisPlan);
    if (this.method && !this.planUpdate) fillFromMethod(plan, this.method);
    if (plan.restatement) {
      const g = goalOnly(plan.restatement);
      plan.restatement = g.text;
      if (g.dropped.length) this.notes.push(`The restatement holds only the scientific goal. The harness took out: ${g.dropped.join(" ")} Answer such setup points briefly in your message.`);
    }
    const known = this.knownDecisions(plan);
    const m = matchSettings(plan, known);
    const stepTools = new Set(plan.steps.flatMap((x) => (x.tool ?? "").toLowerCase().split(/[\s,;/()]+/)).filter(Boolean));
    const keyed = new Set(settingsOf(plan).map((x) => x.setting.key).filter(Boolean));
    const loose = known.filter((k) => k.asks && !keyed.has(k.key) && !k.tools.some((t) => stepTools.has(t)));
    if (!this.planUpdate && !this.toolsHinted && loose.length && plannedAdapters(plan).length) {
      this.toolsHinted = true;
      const byTool = new Map<string, string[]>();
      for (const k of loose) for (const t of k.tools) byTool.set(t, [...(byTool.get(t) ?? []), `${k.key} (${k.label}${k.choices?.length ? `: ${k.choices.map(String).join(", ")}` : ""}${k.default !== undefined ? `; default ${JSON.stringify(k.default)}` : ""})`]);
      return { ok: false, error: `Name the tool of each step (the tool field) and give the settings of that tool with their keys, so that the run asks nothing again. The harness fills the ones you leave out with their defaults. Tools of the planned programs and their settings: ${[...byTool].map(([t, ks]) => `${t}: ${ks.join("; ")}`).join(". ")}. Then call plan again.` };
    }
    if (m.added.length) this.notes.push(`The harness added the settings ${m.added.join(", ")} of the planned programs with their default values. The scientist sees them in the card.`);
    this.fillDecisions(plan);
    if (this.sheet && !this.planUpdate) this.planFromSheet(plan);
    for (const g of plan.programs ?? []) g.program ??= this.adapterList().find((x) => x.name === g.adapter)?.program;
    const open = openDecisions(plan);
    if (open.length) return { ok: false, error: `Open settings: ${open.map((x) => x.decision.label).join("; ")}. Fill in every setting with a value and say who set it: default, from your answer (a setting about meaning, such as what one n is or what counts as positive, comes from the answers in Questions), or agent (your choice; the demonstration checks it). The scientist can change each one in the card.` };
    let version = ++this.planVersion;
    const part = this.planUpdate ? { ...given, steps: addedSteps(this.plan!, plan) } : plan;
    this.record.append("plan", { action: this.planUpdate ? "update_proposed" : "proposed", phase: "Proposed metrics", version, text: planText(part), full: planText(plan), plan: structuredClone(plan) });
    const qids = await this.askPlanDecisions(plan);
    const programs = (plan.programs ?? []).map((g) => ({ part: g.part, adapter: g.adapter, alternatives: g.alternatives ?? [], program: g.program, why: g.why }));
    let r: PlanResponse | undefined;
    for (;;) {
      const shownPart = this.planUpdate ? { ...given, steps: addedSteps(this.plan!, plan) } : plan;
      r = await this.askPlanCard({
        stage: "plan",
        version,
        text: planText(shownPart, { view: "compact", numbered: true }),
        details: planText(shownPart, { view: "details", numbered: true }),
        settings: settingsOf(plan).map((x, i) => ({ index: i, step: x.step, label: x.setting.label, key: x.setting.key, value: x.setting.value, by: x.setting.by, options: x.setting.options })),
        update: this.planUpdate,
        qids,
        programs,
        mode: this.modeBefore,
        restatement: plan.restatement,
        definitions: plan.definitions,
        pilot: plan.pilot?.sample,
      });
      if (!r || r.action !== "set") break;
      const target = settingsOf(plan)[r.index]?.setting;
      if (!target) continue;
      const old = target.value;
      const raw = r.value;
      target.value = typeof old === "number" && typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw;
      target.by = "you";
      version = ++this.planVersion;
      this.record.append("plan", { action: "setting_changed", phase: "Proposed metrics", version, label: target.label, key: target.key, old: old ?? null, new: target.value, text: planText(plan), plan: structuredClone(plan) });
    }
    if (!r) return { ok: false, error: "the scientist stopped the turn before answering the proposed analysis" };
    if (r.action === "change") {
      if (r.definition) this.changeDefinition(r.definition);
      this.record.append("plan", { action: "change_requested", version, text: r.text });
      return { ok: true, summary: `The scientist asks for a change: "${r.text}". Revise the proposed analysis and call plan again${this.planUpdate ? " with only what changes" : " with the full plan"}. Keep the settings that the scientist set. Do not run steps yet.` };
    }
    if (r.action === "cancel") {
      this.record.append("plan", { action: "cancelled", version });
      this.endPlanning();
      this.stopTurn = true;
      return { ok: true, summary: "The scientist cancelled the proposed analysis. No step runs. Stop now." };
    }
    if (r.action !== "approve" && r.action !== "pilot") return { ok: false, error: "unknown answer" };
    this.fillDecisions(plan);
    this.commitSettings(plan);
    const target: Mode = r.mode && r.mode !== "plan" ? r.mode : this.modeBefore;
    const answers = [...this.planQids.values(), ...settingsOf(plan).map((x) => x.setting)].filter((d, i, all) => d.by === "you" && all.indexOf(d) === i).map((d) => `${d.label} = ${String(d.value)}`);
    this.setReference(r.reference);
    const refNote = this.reference ? (this.reference.mode === "blind" ? ` The reference ${basename(this.reference.path)} is held back for a blind test. Do not try to read it.` : ` The pilot compares with the reference ${basename(this.reference.path)}.`) : "";
    const methodPilot = !!this.method && !this.planUpdate && r.action === "approve" && !!plan.pilot;
    if (methodPilot) this.record.append("notice", { text: `The method ${this.method!.name} requires the demonstration on a sample before the batch. Demonstration sample: ${plan.pilot!.sample.replace(/[.\s]+$/, "")}.` });
    if ((r.action === "pilot" || methodPilot) && plan.pilot) {
      this.pilotPlan = { plan: structuredClone(plan), version, target, answers };
      this.pilotStage = true;
      this.record.append("plan", { action: "pilot_requested", phase: "Demonstration on a sample", version, sample: plan.pilot.sample });
      this.endPlanning(target);
      return {
        ok: true,
        summary: [
          `The scientist wants the pilot first. Mode is now ${target}.`,
          answers.length ? `The scientist set: ${answers.join("; ")}.` : "",
          `Run the method on ${plan.pilot.sample} only, with the settings of the proposed analysis. Save QC images: outlines of what was counted and what was left out. Give the legend in plain words in legend (for example yellow = counted as positive, cyan = counted as negative, magenta = red that is not counted, orange = left out).`,
          "Then call pilot_result with the sample, the numbers (one for each measure in What I will count), the QC image paths and your own plain check: what looks wrong or uncertain. Do not run the other samples yet.",
          refNote,
        ].filter(Boolean).join(" "),
      };
    }
    this.approvePlan(plan, version, target, answers);
    this.endPlanning(target);
    const first = plan.steps.findIndex((x) => x.status !== "done" && x.status !== "skipped") + 1;
    const stillOpen = openDecisions(plan).map((x) => x.decision.label);
    return {
      ok: true,
      summary: [
        `The scientist confirmed the analysis, version ${version}. Mode is now ${target}.`,
        answers.length ? `The scientist set: ${answers.join("; ")}.` : "",
        stillOpen.length ? `Still open: ${stillOpen.join("; ")}. The harness asks the scientist when a step needs one.` : "",
        `Start with step ${first || 1} now, with the settings of the confirmed analysis. If you run a step that is not in it, or skip one, call plan with the reason.${refNote}`,
      ].filter(Boolean).join(" "),
    };
  }

  private inspectTool(): Tool {
    return {
      name: "inspect_data",
      title: "Look at the data",
      description:
        "Look at a data file or folder before you ask the scientist anything. A relative path starts in the project folder. For images: the channels and what each one is (brightfield, or fluorescence and its color), the names from the files (CH1, CH3, Overlay), the size, the bit depth, intensity statistics and a small preview. For tables: the rows, the columns and the values of group columns. For folders: the groups, the file counts and a few sample names. Read-only.",
      inputSchema: { type: "object", properties: { path: { type: "string", description: "The file or folder, for example images/ or counts.csv." } }, required: ["path"] },
      source: "harness",
      readOnly: true,
      permission: "allow",
      execute: async (a, ctx) => {
        const path = resolve(this.cwd, String(a.path ?? ".").replace(/^~(?=[\\/]|$)/, homedir()));
        const insp = await inspectData(path, join(this.workDir, "inspect"), ctx.signal);
        if (!insp.ok) return { ok: false, error: insp.error ?? "The inspection failed." };
        this.inspection = insp;
        this.record.append("inspection", { path, kind: insp.kind, summary: insp.summary, colors: insp.colors, kinds: insp.kinds, groups: (insp.groups ?? []).map((g) => g.name), columns: (insp.columns ?? []).map((c) => c.name) });
        const { previews, ...rest } = insp;
        return { ok: true, summary: insp.summary, text: JSON.stringify(rest).slice(0, 8000), outputs: previews.map((p) => outputFile(p)) };
      },
    };
  }

  private clarifyTool(): Tool {
    return {
      name: "clarify",
      description: "Phase 1 of a new request: tell the scientist what you found in the data, and ask at most 5 questions about meaning (what counts as one n, what counts as a positive or as one object, what is measured, which groups, any earlier result or hand count, what the output is for). No technical settings. The harness shows one card at a time and returns the answers.",
      inputSchema: {
        type: "object",
        properties: {
          found: { type: "string", description: "One to three plain sentences on what inspect_data found, with counts and the real channel names, for example: Each field has 3 images: CH1 is brightfield, CH3 is red fluorescence, and Overlay combines them. There is no nuclear stain." },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" }, description: "Options from the data: the real channel names, groups, folders or columns that inspect_data found." },
                label: { type: "string", description: "A short name of 1 to 4 words for the answer line, for example One n or Positive cell." },
                recommendation: { type: "string", description: "One of the options, word for word." },
                key: { type: "string", description: "The decision key, if the decision record has one for this meaning, for example replicate." },
                answered_by_request: { type: "string", description: "If the request already answers this question, quote it here. The harness then skips the question." },
              },
              required: ["question"],
            },
          },
        },
        required: ["found"],
      },
      source: "harness",
      readOnly: true,
      permission: "allow",
      execute: async (a) => this.clarify(a),
    };
  }

  private async clarify(a: Args): Promise<ToolOutput> {
    if (!this.planning || this.planUpdate) return { ok: false, error: "clarify is for the start of a new request, before the proposed metrics." };
    if (!this.inspection) return { ok: false, error: "Look at the data first: call inspect_data on the data folder or file of the request (or . for the project folder). Then call clarify, with questions that fit what you found." };
    let found = String(a.found ?? "").trim();
    const wrong = absentStains(found, this.inspection);
    if (!found || wrong.length) {
      if (found) this.record.append("clarify", { action: "found_replaced", phase: "Questions", found, reason: `The data has no ${wrong.join(" or ")} channel or stain.` });
      found = this.inspection.summary;
    }
    const raw = (Array.isArray(a.questions) ? a.questions : []).filter((q: any) => q && typeof q.question === "string" && q.question.trim());
    const skipped: string[] = [];
    const technical: string[] = [];
    const kept: { question: string; label?: string; options: string[]; recommendation?: string; key?: string }[] = [];
    for (const q of raw as any[]) {
      const text = String(q.question).trim();
      if (typeof q.answered_by_request === "string" && q.answered_by_request.trim()) skipped.push(`${text} The request says: ${q.answered_by_request.trim()}`);
      else if (TECHNICAL.test(text)) technical.push(text);
      else kept.push({ question: text, label: q.label ? String(q.label).trim() : undefined, options: Array.isArray(q.options) ? q.options.map(String) : [], recommendation: q.recommendation ? String(q.recommendation) : undefined, key: q.key ? String(q.key) : undefined });
    }
    const fromMethod = new Set<string>();
    if (this.method?.questions.length) {
      const saved = this.method.questions.map((q) => {
        const same = kept.find((k) => norm(k.question) === norm(q.question));
        fromMethod.add(q.question);
        return { question: q.question, options: [q.answer, ...(same?.options ?? []).filter((o) => o !== q.answer)], recommendation: q.answer, key: same?.key };
      });
      kept.splice(0, kept.length, ...saved);
    }
    const grounded = groundQuestions(kept, this.inspection);
    if (grounded.dropped.length) this.record.append("clarify", { action: "dropped", phase: "Questions", dropped: grounded.dropped });
    const asked = grounded.kept.slice(0, 5 + fromMethod.size);
    const c = this.refCandidates[0];
    const refAsked = c && !asked.some((q) => /hand count|earlier (analysis|result)|reference|previous (analysis|result)/i.test(q.question));
    this.record.append("clarify", { action: "asked", phase: "Questions", found, questions: asked.map((q) => q.question), skipped, technical, reference: refAsked ? c.path : undefined, ...(fromMethod.size ? { method: this.method!.name, fromMethod: [...fromMethod] } : {}) });
    const fields = this.decisions.fields();
    type Asked = { qid: string; question: string; ref?: boolean; key?: string; item?: CheckItem | DesignIssue; design?: boolean };
    const qs: Asked[] = [];
    const notes: string[] = [];
    const check = this.record.entries(["data_check"]).map((e) => String(e.data.text ?? "")).join("\n\n") || undefined;
    const emit = () => this.bus.emit({ type: "clarify", found, qids: qs.map((q) => q.qid), skipped, check, notes: [...notes] });
    const askItem = async (item: CheckItem | DesignIssue, design: boolean) => {
      const q = await this.questions.ask({ decisionKey: "", title: `${design ? "Design check" : "Data check"}: ${CHECK_TITLE[item.check] ?? item.check.replace(/_/g, " ")}`, text: item.question ?? item.text, options: item.options ?? [], recommendation: item.recommendation ? { value: item.recommendation, reason: "" } : undefined, evidence: "" });
      qs.push({ qid: q.qid, question: item.question ?? item.text, item, design });
    };
    for (const item of this.openChecks()) await askItem(item, false);
    for (const q of asked) {
      const f = q.key ? fields.find((x) => x.key === q.key && x.owner === "human") : undefined;
      const options = (q.options.length ? q.options : (f?.choices ?? []).map(String)).map((o) => ({ value: o, label: o }));
      const text = fromMethod.has(q.question) ? `${q.question} The method ${this.method!.name} answers: ${String(q.recommendation).replace(/[.\s]+$/, "")}. Confirm it, or choose another answer for the new data.` : q.question;
      const rec = q.recommendation ? (options.find((o) => o.label.toLowerCase() === q.recommendation!.toLowerCase())?.value ?? (options.length ? undefined : q.recommendation)) : undefined;
      const asked1 = await this.questions.ask({ decisionKey: f?.key ?? "", title: shortTitle(q.label || q.question), text, options, recommendation: rec !== undefined ? { value: rec, reason: "" } : undefined, evidence: "" });
      qs.push({ qid: asked1.qid, question: q.question, key: q.key });
    }
    if (refAsked) {
      const rq = this.referenceQuestion();
      const asked1 = await this.questions.ask({ decisionKey: "", title: "Earlier results", text: rq.question, options: [{ value: "compare", label: "Yes. Compare in the demonstration" }, { value: "blind", label: "Yes. Hold it back (blind test)" }, { value: "none", label: "No, it is not a reference" }], recommendation: { value: this.settings.referenceMode ?? "compare", reason: "" }, evidence: "" });
      qs.push({ qid: asked1.qid, question: rq.question, ref: true });
    }
    const show = (list: Asked[]) => {
      emit();
      for (const q of list) this.bus.emit({ type: "question", question: this.questions.open().find((x) => x.qid === q.qid)! });
    };
    show(qs);
    const answers: string[] = [];
    const checkAnswers: string[] = [];
    const stops: string[] = [];
    let n: string | undefined;
    const take = async (q: Asked): Promise<boolean> => {
      const ans = await this.waitAnswer(q.qid);
      if (!ans) return false;
      const value = String(ans.value ?? "");
      if (q.item) {
        this.record.append("decision", { key: `${q.design ? "design" : "data_check"}:${q.item.id}`, old: null, new: value, by: ans.by, reason: q.item.text });
        const label = (q.item.options ?? []).find((o) => o.value === value)?.label ?? value;
        if (value === "stop") stops.push(q.item.text);
        else checkAnswers.push(`${q.item.text} Answer: ${label}.`);
      } else answers.push(`${q.question} -> ${value}${ans.note ? ` (${ans.note})` : ""}`);
      if (q.key === "replicate" || (!q.item && !q.ref && /\b(one n|unit of replication|replicate|what is n|as n)\b/i.test(q.question))) n = value;
      if (q.ref && c && (value === "compare" || value === "blind")) this.setReference({ mode: value, path: c.path, sheet: c.sheet });
      return true;
    };
    const stopped = { ok: false, error: "the scientist stopped the turn before answering the questions" };
    for (const q of [...qs]) if (!(await take(q))) return stopped;
    const last = (qid: string) => this.record.entries(["answer"]).filter((e) => e.data.qid === qid).at(-1);
    answers.splice(0, answers.length, ...qs.filter((q) => !q.item).map((q) => `${q.question} -> ${String(last(q.qid)?.data.value ?? "")}${last(q.qid)?.data.note ? ` (${String(last(q.qid)!.data.note)})` : ""}`));
    if (!stops.length && this.sheet) {
      if (!(await this.askSheet(qs, emit))) return stopped;
      n ??= this.decisions.isSet("replicate") ? String(this.decisions.value("replicate")) : undefined;
      const issues = designChecks(this.sheet.rows, { n });
      this.record.append("samples", { action: "design_checks", n: n ?? null, issues });
      notes.push(...issues.filter((x) => x.level === "warn").map((x) => x.text));
      const before = qs.length;
      for (const i of issues.filter((x) => x.level === "ask")) await askItem(i, true);
      const more = qs.slice(before);
      if (more.length || notes.length) show(more);
      for (const q of more) if (!(await take(q))) return stopped;
    }
    this.clarified = true;
    this.record.append("clarify", { action: "answered", phase: "Questions", found, answers: [...checkAnswers, ...answers], skipped, notes });
    if (stops.length) {
      this.record.append("notice", { text: `You stopped the analysis to correct the data: ${stops.join(" ")}` });
      this.endPlanning();
      this.stopTurn = true;
      return { ok: true, summary: `The scientist stops to correct the data: ${stops.join(" ")} No step runs. Stop now. Say in one or two sentences what the scientist must correct.` };
    }
    return {
      ok: true,
      summary: [
        answers.length ? `The scientist answered: ${answers.join("; ")}.` : "No question was needed.",
        fromMethod.size ? `These are the questions of the saved method ${this.method!.name}, with the scientist's answers for the new data. Your own questions were not asked. If the new data needs one, ask it with ask_scientist.` : "",
        checkAnswers.length ? `Data check answers: ${checkAnswers.join(" ")} Put each row or file that is left out in exclusions of the plan, with its effect.` : "",
        this.sheet ? `The scientist checked the sample sheet ${join(this.outputDir, "samples.csv")}: ${groupSummary(this.sheet.rows)}. The steps must use it for the groups and for n: match files on the path column, and use the unit column as n.` : "",
        notes.length ? `Design notes from the sample sheet: ${notes.join(" ")}` : "",
        skipped.length ? `Skipped because the request answers them: ${skipped.join("; ")}.` : "",
        technical.length ? `These are technical settings, not questions for the scientist: ${technical.join("; ")}. Choose a sensible value for each and show it as a setting in the proposed metrics.` : "",
        grounded.dropped.length ? `The harness did not ask these, because the data does not have what they assume: ${grounded.dropped.map((d) => `${d.question} (${d.reason.split(". ")[0]}.)`).join("; ")}` : "",
        this.reference ? (this.reference.mode === "blind" ? `The reference ${basename(this.reference.path)} is held back for a blind test. Do not read it.` : `The demonstration compares with the reference ${basename(this.reference.path)}.`) : "",
        "Now call plan with the proposed metrics: each measure defined in plain words with its setting values, and the actions.",
      ].filter(Boolean).join(" "),
    };
  }

  private planFromSheet(plan: AnalysisPlan): void {
    const rows = this.sheet!.rows;
    const path = join(this.outputDir, "samples.csv");
    plan.data = { ...(plan.data ?? {}), files: plan.data?.files?.length ? plan.data.files : [path], n: plan.data?.n || `From the sample sheet: ${groupSummary(rows)}` };
    const test = plan.steps.map((x) => [x.step, x.method, x.tool].filter(Boolean).join(" ")).join(" ");
    const n = this.record.entries(["samples"]).filter((e) => e.data.action === "design_checks").at(-1)?.data.n;
    const said = new Set(this.record.entries(["samples"]).flatMap((e) => ((e.data.issues as DesignIssue[]) ?? []).map((i) => i.text)));
    const fresh = designChecks(rows, { n: typeof n === "string" ? n : undefined, test }).filter((i) => !said.has(i.text));
    if (!fresh.length) return;
    this.record.append("samples", { action: "design_checks", n: n ?? null, issues: fresh, test });
    this.notes.push(`Design check of the proposed test with the sample sheet ${path}: ${fresh.map((i) => i.text).join(" ")}`);
  }

  private async waitAnswer(qid: string): Promise<{ value: unknown; note: string; by: string } | undefined> {
    this.waitedQids.add(qid);
    try {
      await abortable(this.questions.wait(qid), this.abort?.signal);
    } catch {
      return undefined;
    }
    const ans = this.record.entries(["answer"]).filter((e) => e.data.qid === qid).at(-1);
    return { value: ans?.data.value, note: String(ans?.data.note ?? ""), by: String(ans?.data.by ?? "human") };
  }

  private openChecks(): CheckItem[] {
    const done = new Set(this.record.entries(["decision"]).map((e) => String(e.data.key)));
    const items = this.record.entries(["data_check"]).flatMap((e) => (e.data.items as CheckItem[]) ?? []);
    return items.filter((i, k) => i.level === "ask" && !done.has(`data_check:${i.id}`) && items.findIndex((x) => x.id === i.id) === k).slice(0, 8);
  }

  private checkData(name: string, args: Args, output: ToolOutput): string {
    const given = ["path", "folder", "input", "dir", "directory", "input_dir", "data_dir"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && isAbsolute(v));
    const own = (p: string) => [this.dir, this.outputDir, gaHome()].some((d) => p === d || p.startsWith(`${d}/`));
    const found: { path: string; label: string; kind: "table" | "files" }[] = [];
    const saved = /^(read|load|import|open|inspect)/.test(name) ? (output.table?.path ?? output.outputs?.find((o) => o.kind === "table")?.path) : undefined;
    if (saved && existsTable(saved)) found.push({ path: saved, label: given[0] ?? saved, kind: "table" });
    for (const g of given) {
      if (own(g) || !existsSync(g)) continue;
      if (statSync(g).isDirectory()) found.push({ path: g, label: g, kind: "files" });
      else if (!found.length && existsTable(g)) found.push({ path: g, label: g, kind: "table" });
    }
    const out: string[] = [];
    for (const f of found) {
      if (this.checked.has(f.label)) continue;
      this.checked.add(f.label);
      let check: DataCheck;
      let sheet: SampleSheet | undefined;
      try {
        if (f.kind === "files") {
          const rels = listDataFiles(f.path);
          if (rels.length < 2) continue;
          check = checkFiles(fileInfos(f.path, rels), f.path);
          const inside = (p: string) => (p.startsWith(`${this.cwd}/`) ? relative(this.cwd, p) : p);
          if (!this.sheet) sheet = sheetFromFiles(rels.map((r) => inside(join(f.path, r))), f.path);
        } else {
          const t = readCsvTable(f.path);
          if (!t.rows.length) continue;
          check = checkTable(t, f.label);
          if (!this.sheet) sheet = sheetFromTable(t, f.label);
        }
      } catch {
        continue;
      }
      const text = dataCheckText(check);
      this.record.append("data_check", { source: f.label, kind: check.kind, size: check.size, items: check.items, groups: check.groups ?? null, units: check.units ?? [], text });
      out.push(`Data check by the harness (code, not a model):\n${text}`);
      if (check.items.some((i) => i.level === "ask")) out.push(this.planning ? "The harness asks the scientist about each problem under Questions for you in the Questions stage. Do not ask about them again." : "Ask the scientist about each problem under Questions for you before a step uses the data.");
      if (sheet?.rows.length) {
        this.sheet = sheet;
        this.saveSheet(sheet.rows, "drafted");
        out.push(`Sample sheet: the harness made ${join(this.outputDir, "samples.csv")} (${sheet.rows.length} rows) from ${sheet.from}. ${groupSummary(sheet.rows)}. The scientist checks it in the Questions stage. Use it for the groups and for n.`);
      }
    }
    return out.join("\n");
  }

  private saveSheet(rows: SampleRow[], action: string, said = ""): void {
    if (!this.sheet) return;
    this.sheet = { ...this.sheet, rows };
    const path = join(this.outputDir, "samples.csv");
    try {
      writeSheet(path, rows);
    } catch (e) {
      this.record.append("notice", { text: `The harness could not save ${path}: ${(e as Error).message}` });
    }
    this.record.append("samples", { action, source: this.sheet.source, from: this.sheet.from, path, rows, said });
  }

  private sheetQuestion(msg = ""): Omit<Question, "qid" | "session" | "status" | "created"> {
    const s = this.sheet!;
    return {
      decisionKey: "",
      title: SHEET_TITLE,
      text: `${msg ? `${msg} ` : ""}The agent made this sample sheet from ${s.from}. One row is one sample. unit is the unit of replication (one n). batch is the slide, plate, day or run. Is it correct?`,
      evidence: `${sheetTable(s.rows)}\n${groupSummary(s.rows)}.\nTo change a cell, type: row column value (for example: 3 group Ceramide), or: column old = new (for example: batch Day1 = 2024-03-01). You can also edit ${join(this.outputDir, "samples.csv")} and choose Read samples.csv again.`,
      options: [{ value: "accept", label: "The sheet is correct" }, { value: "reload", label: "Read samples.csv again (I edited it)" }],
      recommendation: { value: "accept", reason: "" },
      table: { columns: [...SAMPLE_COLUMNS], rows: s.rows.map((r) => SAMPLE_COLUMNS.map((c) => r[c])) },
    };
  }

  private async askSheet(qs: { qid: string; question: string }[], emit: () => void): Promise<boolean> {
    let msg = "";
    for (;;) {
      const q = await this.questions.ask(this.sheetQuestion(msg));
      qs.push({ qid: q.qid, question: SHEET_TITLE });
      emit();
      this.bus.emit({ type: "question", question: q });
      const ans = await this.waitAnswer(q.qid);
      if (!ans) return false;
      const r = this.sheetAnswer(ans.value);
      if (r.done) return true;
      msg = r.said;
    }
  }

  private sheetAnswer(value: unknown): { done: boolean; said: string } {
    const v = value as { rows?: unknown };
    if (v && typeof v === "object" && Array.isArray(v.rows)) {
      const rows = (v.rows as unknown[]).filter(Array.isArray).map((r) => Object.fromEntries(SAMPLE_COLUMNS.map((c, i) => [c, String((r as unknown[])[i] ?? "").trim()])) as SampleRow);
      if (JSON.stringify(rows) !== JSON.stringify(this.sheet!.rows)) this.saveSheet(rows, "edited", "edited in the table");
      this.record.append("samples", { action: "accepted", rows: rows.length });
      return { done: true, said: "" };
    }
    const text = String(value ?? "").trim();
    if (text === "accept" || text === CLARIFY_SKIP || !text) {
      this.record.append("samples", { action: "accepted", rows: this.sheet!.rows.length });
      return { done: true, said: "" };
    }
    if (text === "reload") {
      try {
        const rows = readSheet(join(this.outputDir, "samples.csv"));
        this.saveSheet(rows, "reloaded", "read samples.csv again");
        return { done: false, said: `Read samples.csv again: ${rows.length} rows.` };
      } catch (e) {
        return { done: false, said: `Could not read samples.csv: ${(e as Error).message}` };
      }
    }
    const r = applyEdit(this.sheet!.rows, text);
    if ("error" in r) return { done: false, said: r.error };
    this.saveSheet(r.rows, "edited", r.said);
    return { done: false, said: r.said };
  }

  sampleSheet(): { rows: SampleRow[]; path: string; from: string } | undefined {
    return this.sheet ? { rows: this.sheet.rows, path: join(this.outputDir, "samples.csv"), from: this.sheet.from } : undefined;
  }

  async editSamples(text: string): Promise<string> {
    if (!this.sheet) return "There is no sample sheet yet. The agent makes one when it reads the data.";
    const open = this.questions.open().find((q) => q.title === SHEET_TITLE);
    if (open) {
      await this.answer(open.qid, text);
      return "Sent to the open sample sheet.";
    }
    const r = this.sheetAnswer(text);
    if (r.said) this.notes.push(`The scientist changed the sample sheet ${join(this.outputDir, "samples.csv")}: ${r.said}`);
    return r.said || "The sample sheet is unchanged.";
  }

  private checkPlanned(tool: Tool) {
    if (!this.plan || this.planning || !this.approvedEntry) return;
    const name = tool.remoteName ?? tool.name;
    if (name === "calculate") return;
    if (tool.readOnly) return;
    const i = matchStep(this.plan, name, tool.adapter);
    if (i >= 0) {
      if (this.plan.steps[i]!.status !== "skipped") this.plan.steps[i]!.status = "done";
      return;
    }
    if (this.planWarned.has(name)) return;
    this.planWarned.add(name);
    this.record.append("notice", { text: `Not in the approved plan: ${name}. Reason: ${lastSentence(this.lastSaid) || "the agent gave none yet."}`, plan: "deviation", tool: name });
    this.notes.push(`${name} is not in the approved plan. Call plan now to add it as a step, with the reason.`);
  }

  private noteSkippedSteps() {
    if (!this.plan || this.planning || !this.approvedEntry) return;
    const turnStart = this.lastRequest()?.id ?? 0;
    if (this.approvedEntry < turnStart) return;
    for (const x of this.plan.steps) {
      if (!x.tool || x.status === "done" || x.status === "skipped" || this.planWarned.has(`skip:${x.step}`)) continue;
      this.planWarned.add(`skip:${x.step}`);
      this.record.append("notice", { text: `Not done from the approved plan: ${x.step}. Reason: none given.`, plan: "skipped" });
    }
  }

  startMethod(ref: string): Method {
    if (this.record.live(["user"]).some((e) => !e.data.internal)) throw new Error(`This session has a request already. Start a new session with the method: cuvette --method ${ref} <folder>`);
    const m = loadMethod(ref, this.cwd);
    this.method = m;
    this.record.append("method", { action: "started", name: m.name, path: m.path, hash: m.hash, saved: m.saved, from: m.from ?? null, questions: m.questions.length });
    this.setupPreset = { ...this.setupPreset, ...m.decisions };
    const known = Object.fromEntries(Object.entries(m.decisions).filter(([k]) => this.decisions.has(k)));
    if (this.setupNeeded()) this.decisions.applySetup(known, { how: `from the method ${m.name}` });
    else for (const [k, v] of Object.entries(known)) this.decisions.change(k, v, { by: "human", reason: `from the method ${m.name}` });
    this.planFirst = true;
    this.settings = { ...this.settings, pilot: "on" };
    this.addPilotTools();
    if (!this.tools.has("clarify")) this.tools.set("clarify", this.clarifyTool());
    this.active.add("clarify");
    return m;
  }

  saveMethod(name: string, where: "home" | "project" = "home"): { method: Method; path: string } {
    const method = methodFrom(this.record, name, this.decisions.values(), { session: this.id, folder: this.place.outDir, title: this.place.title });
    const path = saveMethod(method, where === "project" ? this.cwd : undefined);
    this.record.append("method", { action: "saved", name: method.name, path });
    return { method, path };
  }

  branch(name: string, point?: number): { id: string; folder: string; upTo: number } {
    if (this.busy) throw new Error("The agent is busy. Press Esc to stop it, then make the branch.");
    if (!this.record.live(["user"]).length) throw new Error("Nothing to copy yet. Send a request first.");
    const upTo = point === undefined ? undefined : rewindPoints(this.record).find((p) => p.n === point)?.upTo;
    if (point !== undefined && upTo === undefined) throw new Error(`No point ${point}. Type /rewind to see the points.`);
    const r = branchSession({ id: this.id, place: this.place, record: this.record }, name, upTo);
    return { id: r.place.id, folder: r.place.outDir, upTo: r.upTo };
  }

  branches(): BranchInfo[] {
    return branchesOf({ id: this.id, place: this.place, record: this.record });
  }

  compareBranches(a: string, b: string): { a: BranchInfo; b: BranchInfo; rows: string[][]; differ: number } {
    const src = { id: this.id, place: this.place, record: this.record };
    const [x, y] = [findBranch(src, a), findBranch(src, b)];
    if (!x || !y) throw new Error(`No branch named ${!x ? a : b}. Type /branches to see the list.`);
    const rec = (i: BranchInfo) => {
      if (i.role === "this") return this.record;
      const p = placeAt(join(i.folder, ".record"));
      if (!p) throw new Error(`The folder of ${i.name} is missing: ${i.folder}`);
      return openRecord(p);
    };
    return { a: x, b: y, ...compareRows(rec(x), rec(y)) };
  }

  rewind(n: number): RewindResult {
    if (this.busy) throw new Error("The agent is busy. Press Esc to stop it, then rewind.");
    const point = rewindPoints(this.record).find((p) => p.n === n);
    if (!point) throw new Error(`No point ${n}. Type /rewind to see the list.`);
    const nodes = this.record.entries(["node"]).filter((e) => e.id > point.upTo && !this.record.setAside(e.id)).map((e) => String(e.node ?? e.data.id));
    this.record.append("rewind", { upTo: point.upTo, entry: point.entry, kind: point.kind, point: point.label, nodes });
    const decisions = this.decisions.restoreTo(point.upTo, `rewind to ${point.label}`);
    const modeThen = this.record.entries(["mode"]).filter((e) => e.id <= point.upTo).at(-1)?.data.new ?? this.record.entries(["session"])[0]?.data.mode ?? this.mode;
    if (modeThen !== this.mode && modeThen !== "plan") {
      this.record.append("mode", { old: this.mode, new: modeThen, reason: "rewind" });
      this.mode = modeThen as Mode;
    }
    this.history = this.record.messages();
    this.closeOpenCalls();
    const a = approvedPlan(this.record);
    this.approvedEntry = a?.entry ?? 0;
    this.plan = a ? structuredClone(currentPlan(this.record)) : undefined;
    this.planning = false;
    this.pilotStage = false;
    this.pilotPlan = undefined;
    this.planWarned.clear();
    this.waiting.delete("plan");
    const ref = this.record.live(["reference"]).at(-1)?.data;
    this.reference = ref && ref.mode !== "none" && ref.path ? ({ ...ref } as unknown as Reference) : undefined;
    this.notes.push(`The scientist rewound the conversation to ${point.kind === "message" ? `the point before the message "${point.text}"` : `this point: ${point.label}`}.${nodes.length ? ` These results are set aside and must not be used: ${nodes.join(", ")}.` : ""}${decisions.length ? ` Decisions returned to earlier values: ${decisions.map((d) => `${d.key} = ${JSON.stringify(d.to)}`).join("; ")}.` : ""}`);
    return { point, nodes, decisions, text: point.kind === "message" ? point.text : undefined };
  }

  respondPlan(r: PlanResponse): void {
    this.planWait?.resolve(r);
  }

  pendingPlan(): boolean {
    return !!this.planWait;
  }

  setPlanFirst(on: boolean): void {
    this.planFirst = on;
    this.record.append("notice", { text: on ? "Plan first is on. The agent writes a plan before any step runs." : "Plan first is off. Type /plan <request> to get a plan first." });
  }

  private activePlan(): AnalysisPlan | undefined {
    if (this.planning) return undefined;
    if (this.pilotStage && this.pilotPlan) return this.pilotPlan.plan;
    return this.approvedEntry > 0 ? this.plan : undefined;
  }

  planApproves(adapter: string | LoadedAdapter): boolean {
    const names = typeof adapter === "string" ? [adapter] : [adapter.name, adapter.manifest.adapter.title, adapter.manifest.adapter.title.replace(/\s*\(.*\)\s*$/, ""), adapter.manifest.program.name];
    const want = names.map((n) => n.toLowerCase().trim()).filter((n) => n.length >= 3).map((n) => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`));
    return plannedAdapters(this.activePlan()).some((p) => want.some((w) => w.test(p.toLowerCase())));
  }

  async review(): Promise<Finding[]> {
    const answer = this.lastAnswer || (this.record.entries(["assistant"]).filter((e) => e.data.final).at(-1)?.data.text as string) || "";
    const claims = checkAnswer(answer, this.record.liveView());
    const ctx = { record: this.record.liveView(), decisions: this.decisions, adapters: this.adapters, answer, claims, textStyle: this.settings.text_style ?? "ste" };
    const out: Finding[] = [];
    for (const f of await runChecks(ctx)) out.push(this.findings.add(f, "rule"));
    if (this.refereeProvider) for (const f of await referee(this.refereeProvider, ctx)) out.push(this.findings.add(f, "referee"));
    return out;
  }

  async compact(): Promise<void> {
    await this.maybeCompact(new AbortController().signal, true);
  }

  citationStyle(): CitationStyle {
    return citationStyle(resolveSetting(findSetting("citation_style")!, { cwd: this.cwd, session: this as never }).value);
  }

  async exportAs(fmt: ExportFormat): Promise<string> {
    const out = this.record.exportDir;
    mkdirSync(out, { recursive: true });
    const trail = await import("./trail.ts");
    const ex = await import("./exports.ts");
    const a = this.adapters;
    switch (fmt) {
      case "html": return trail.exportHtml(this.record, a, join(out, "trail.html"), this.citationStyle());
      case "md": return trail.exportMarkdown(this.record, a, join(out, "trail.md"), this.citationStyle());
      case "jsonl": return trail.exportJsonl(this.record, join(out, "log.jsonl"));
      case "pdf": return trail.exportPdf(this.record, a, join(out, "trail.pdf"), this.citationStyle());
      case "protocol": return ex.exportProtocol(this.record, a, join(out, "protocol.md"), this.citationStyle());
      case "script": return ex.exportScript(this.record, a, join(out, "replay.ts"));
      case "notebook": return ex.exportNotebook(this.record, a, join(out, "analysis.ipynb"));
      case "flow": return ex.exportFlow(this.record, a, join(out, "flow.json"));
      case "xlsx": {
        const saved = this.saveResults(0, true);
        if (!saved?.xlsx) throw new Error("the harness could not write results.xlsx");
        return saved.xlsx;
      }
      case "eln": {
        const eln = await import("../eln/export.ts");
        return eln.exportEln(this, join(out, `${this.id}.eln`));
      }
    }
  }

  async exportImages(options: import("./imagedeck.ts").DeckOptions): Promise<import("./imagedeck.ts").DeckWritten> {
    const deck = await import("./imagedeck.ts");
    const { bookSettings } = await import("./databook.ts");
    const w = await deck.writeImageDeck({ record: this.record, adapters: this.adapters, dir: this.outputDir, options, paper: bookSettings(this.cwd).paper });
    this.saveResults(0);
    return w;
  }

  async elnPush(): Promise<{ experiment: number; url: string; version: number; hash: string; created: boolean }> {
    const { elabftwConfig } = await import("./credentials.ts");
    const cfg = elabftwConfig();
    if (!cfg) throw new Error("eLabFTW is not set up. Run `ga eln setup` or /eln setup.");
    const { elabftw } = await import("../eln/elabftw.ts");
    const sync = await import("../eln/sync.ts");
    const plan = sync.planPush(this, cfg.url);
    const tool: Tool = { name: "eln_push", title: "Send to eLabFTW", description: "Send this session to the eLabFTW notebook.", inputSchema: {}, source: "harness", execute: async () => ({ ok: true }) };
    const res = await this.requestPermission(tool, plan.display, new AbortController().signal, `Sends the listed data to ${plan.server}. It leaves this computer.`);
    if (!res.ok) throw new Error(`The scientist did not approve the push${res.note ? `: ${res.note}` : "."}`);
    const client = elabftw(cfg);
    const done = await sync.runPush(plan, client);
    const url = client.experimentUrl(done.experiment);
    this.record.append("eln_push", { experiment: done.experiment, url, server: plan.server, hash: plan.hash, version: plan.version, created: done.created, attachments: { ...this.lastSent(plan.server), ...done.attachments } });
    return { experiment: done.experiment, url, version: plan.version, hash: plan.hash, created: done.created };
  }

  private lastSent(server: string): Record<string, string> {
    const last = this.record.entries(["eln_push"]).filter((e) => e.data.server === server).at(-1);
    return (last?.data.attachments as Record<string, string> | undefined) ?? {};
  }

  async elnLink(id: number): Promise<{ text: string; proposals: { key: string; label: string; value: unknown }[] }> {
    const { elabftwConfig } = await import("./credentials.ts");
    const cfg = elabftwConfig();
    if (!cfg) throw new Error("eLabFTW is not set up. Run `ga eln setup` or /eln setup.");
    const { elabftw, baseUrl } = await import("../eln/elabftw.ts");
    const sync = await import("../eln/sync.ts");
    const client = elabftw(cfg);
    const { experiment, items } = await sync.readLink(client, id);
    const proposals = sync.proposeSetup(this.decisions.fields(), [{ entity: experiment, label: `experiment ${experiment.id}` }, ...items.map((i) => ({ entity: i, label: `item ${i.id}` }))]);
    this.record.append("eln_link", {
      experiment: id,
      server: baseUrl(cfg.url),
      url: client.experimentUrl(id),
      title: experiment.title,
      items: items.map((i) => ({ id: i.id, title: i.title })),
      proposed: Object.fromEntries(proposals.map((p) => [p.key, p.value])),
    });
    return { text: sync.describeLink(experiment, items, proposals), proposals };
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.onceTrusted) {
      endTrustOnce(this.cwd);
      this.onceTrusted = false;
    }
    this.interrupt();
    await this.titling?.catch(() => {});
    try {
      if (JSON.parse(readFileSync(this.lockPath(), "utf8")).pid === process.pid) rmSync(this.lockPath());
    } catch {}
    await Promise.all(this.runtimes.map((r) => r.close().catch(() => {})));
  }
}

function dropNulls(args: Args, schema: Record<string, unknown>): Args {
  const props = (schema.properties ?? {}) as Record<string, { type?: unknown }>;
  const out: Args = {};
  for (const [k, v] of Object.entries(args)) {
    const t = props[k]?.type;
    const nullable = t === "null" || (Array.isArray(t) && t.includes("null"));
    if ((v === null || v === "") && !nullable && !((schema.required as string[] | undefined) ?? []).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

function absolutePaths(v: unknown, cwd: string): unknown {
  if (typeof v === "string") {
    if (!v || v.length > 1024 || isAbsolute(v) || /^[a-z]+:\/\//i.test(v) || !/[\\/.]/.test(v)) return v;
    const p = resolve(cwd, v.replace(/^~(?=\/)/, process.env.HOME ?? "~"));
    return existsSync(p) ? p : v;
  }
  if (Array.isArray(v)) return v.map((x) => absolutePaths(x, cwd));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, absolutePaths(x, cwd)]));
  return v;
}

function deleteArg(args: Args, path: string) {
  const keys = path.split(".");
  let cur: unknown = args;
  for (const k of keys.slice(0, -1)) {
    if (!cur || typeof cur !== "object") return;
    cur = (cur as Record<string, unknown>)[k];
  }
  if (cur && typeof cur === "object") delete (cur as Record<string, unknown>)[keys.at(-1)!];
}

function setArg(args: Args, path: string, value: unknown) {
  const keys = path.split(".");
  let cur: Record<string, unknown> = args;
  for (const k of keys.slice(0, -1)) cur = (cur[k] && typeof cur[k] === "object" ? cur[k] : (cur[k] = {})) as Record<string, unknown>;
  cur[keys.at(-1)!] = value;
}

function getArg(args: Args, path: string): unknown {
  let cur: unknown = args;
  for (const k of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}
