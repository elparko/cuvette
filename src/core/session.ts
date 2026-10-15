import { createHash, randomBytes } from "node:crypto";
import { resultKey } from "./loopkey.ts";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { opendir, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { namesValue } from "./asked.ts";
import { refangDeep } from "../providers/text.ts";
import { hideKeys, isCredentialsFile, isSecretFile } from "./credentials.ts";
import { claimLock, lockAlive, ownStart, type OpenLock } from "./sessions.ts";
import { allowAdapter, BLIND_REASON, blindCheck, blindPolicy, pathsIn, setBlindPolicy } from "../adapters/blind.ts";
import { adapterIndex, alternatives, fileTypeHint, filesFor, formatIndex, installHint, programFound, type AdapterSummary, type FoundCache } from "../adapters/catalog.ts";
import { adapterDirs, findAdapter, cuvetteHome, type LoadedAdapter } from "../adapters/manifest.ts";
import type { AdapterRuntime } from "../adapters/runtime.ts";
import { START_VERSION_TIMEOUT_MS } from "../adapters/locate.ts";
import { makeProvider } from "../providers/index.ts";
import { coreTools, searchTools } from "../tools/core.ts";
import { broadSearch } from "../tools/broad-search.ts";
import { taskTool } from "../tools/task.ts";
import { pathRefusalReason } from "./refusals.ts";
import { COPY_LIMIT_BYTES, cutText, findPlace, inProject, isRecordName, placeAt, legacyPlace, newPlace, outputRoot, outside, provisional, readIndex, saveIndexRow, titlePlace, type Place } from "./places.ts";
import { changedAnalysis, describeSession, lastTitle, titleInput } from "./titles.ts";
import { Bus } from "./bus.ts";
import { annotate, checkAnswer, extractNumbers, logClaimCheck } from "./claims.ts";
import { ELIDE_AT, ELIDE_BATCH, SUMMARIZE_AT, elideOld, estimateTokens, headText, pointerText, summarizeOld, summaryMessage } from "./compaction.ts";
import { folderHasNoPatientData, groupHits, isCloud, isLocal, localUrl, Masker, phiOn, scanContent, scanMessages, withheld, type PhiAction, type PhiShown } from "./phi.ts";
import { BUDGET_WARN, budgetState, cheaperModel, contextWarning, dollars, promptTokens, usageSummary, type UsageSummary } from "./spend.ts";
import { estimateText, modelName } from "./estimate.ts";
import { loadSettings, thinkingShown, xlsxOn, type Settings } from "./config.ts";
import { outputDir, savedLine, writeResults, type Saved } from "./results.ts";
import { outputFile, type Dirs } from "../adapters/kinds/common.ts";
import { ADAPTER_DECISION, decisionHook, DecisionRecord, REPORTING_DECISION, TEST_DECISIONS } from "./decisions.ts";
import { buildChecklist, checklistText, GUIDELINE_IDS, GUIDELINE_QUESTION_TITLE, guessGuideline, guidelineId, isChecklistQuestion, itemTitle, loadGuideline, offerText, REPORTING_KEY, setGuideline } from "./checklist.ts";
import { HookRunner } from "./hooks.ts";
import { applyOverlay, labText, propose } from "./labmemory.ts";
import { accessOf, blocksCode, isCodeTool, usable } from "../adapters/access.ts";
import { adapterTrust, confirmCode } from "../adapters/source.ts";
import { compareNote, instruction, teachReview, type TeachSummary } from "./modes.ts";
import { batchReason, pilotState, pilotText, type PilotRun } from "./pilot.ts";
import { agreement, agreementText, blandAltmanPng, compareLine, describeCandidate, findReferences, norm, referenceValues, type Candidate, type Pair, type Reference } from "./reference.ts";
import { definitionsOf } from "./plan.ts";
import { abs, metricsOf, planBatch, swapArgs, writeTable, type BatchPlan, type BatchRow } from "./batch.ts";
import { NO_REASON, freezePlan, frozenPlan, planChanges, recordDeviation, setDeviationReason, type PlanChange } from "./freeze.ts";
import { assumptionBlock, withoutWaits } from "./answers.ts";
import { goalOnly, matchSettings, settingsOf, type KnownDecision } from "./plan.ts";
import { find as findSetting, resolve as resolveSetting } from "./settings.ts";
import { citationStyle, type CitationStyle } from "./citations.ts";
import { absentStains, groundQuestions, inspectData, type Inspection } from "./inspect.ts";
import { addedSteps, approvedPlan, currentPlan, matchStep, toolWords, mergePlan, openDecisions, planText, plannedAdapters, readPlan, type AnalysisPlan, type PlanDecision, type PlanStep } from "./plan.ts";
import { modeHook, Permissions } from "./permissions.ts";
import { FOLDER_LIST_MAX, FOLDER_LIST_READ_MAX, folderListNote, foldersNote, systemPrompt } from "./prompt.ts";
import { scaleImages } from "../providers/images.ts";
import { RETRY_BUDGET_MS, realSleep, type Sleep } from "../providers/retry.ts";
import { activity, makesNode as makesNodeFor, PURPOSE, stepNumbers } from "./housekeeping.ts";
import { QuestionQueue } from "./questions.ts";
import { compareChecks, matchSummary, summarizeTable, METHOD_DATA_CHECK, METHOD_DATA_TITLE, type DataSummary } from "./datacompare.ts";
import { checkFiles, checkTable, dataCheckText, existsTable, fileInfos, listDataFiles, readCsvTable, type CheckItem, type DataCheck } from "./datacheck.ts";
import { applyChanges, applyEdit, designChecks, groupSummary, readSheet, replaySheet, SAMPLE_COLUMNS, sampleFiles, sheetChanges, sheetFromFiles, sheetFromTable, sheetTable, writeSheet, type DesignIssue, type SampleRow, type SampleSheet, type SheetChange } from "./samples.ts";
import { cannotTrust, endTrustOnce, longLabRefusal, folderTrusted, labLong, oneLine, projectAdapterDirs, projectSettings, TRUST_OPTIONS, TRUST_TITLE, trustEvidence, trustFolder, trustOnce, trustStatus, trustText, untrustable, untrustedNotice, untrustFolder, type TrustChoice, type TrustStatus } from "./trust.ts";
import { AnalysisRecord } from "./record.ts";
import { rewindPoints, type RewindResult } from "./rewind.ts";
import { fillFromMethod, loadMethod, methodFrom, methodNote, resumeMethodAllowed, saveMethod, type Method } from "./methods.ts";
import { branchesOf, branchSession, compareRows, findBranch, openRecord, type BranchInfo } from "./branch.ts";
import { Findings, logText, referee, runChecks } from "./review.ts";
import { runSensitivity } from "./sensitivity.ts";
import { captureEnv, envTarget, type EnvLock, type EnvTarget } from "./envlock.ts";
import { selfTestEnabled, selfTestFor, warningCard } from "./selftest.ts";
import { changeRows, fileSha, liveReasons, recordReasons, replacedNode, REVIEW_PURPOSE, stepStatus, type Current, type Reason, type RerunData, type StepState } from "./status.ts";
import { scriptPython } from "../tools/run_script.ts";
import {
  ProviderError,
  type Args,
  type StepResult,
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
  addAdapters?: string[];
  interactive?: boolean;
  home?: boolean;
  place?: Place;
  defaults?: boolean;
  trustFolder?: boolean;
  method?: string;
}

const sheetGrid = (rows: SampleRow[]) => ({ columns: [...SAMPLE_COLUMNS] as string[], rows: rows.map((r) => SAMPLE_COLUMNS.map((c) => r[c])) });
const gridRows = (grid: unknown[]) => grid.filter(Array.isArray).map((r) => Object.fromEntries(SAMPLE_COLUMNS.map((c, i) => [c, String((r as unknown[])[i] ?? "").trim()])) as SampleRow);

const recordPlaces = (place: Place) => (place.legacy ? {} : { workDir: place.outDir, exportDir: place.outDir, project: inProject(place) ? place.project : undefined });

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

const PLAN_NOTE = "Plan first, in two phases. Phase 1, clarifying questions: first call inspect_data on the data that the request names (a folder or a file; . for the project folder). The harness refuses clarify before it. Use at most three read-only calls on the data. Then call search_literature once for background on the scientific question: the usual methods, measures and controls for this kind of experiment. If the search fails or the scientist refuses it, continue without it. Then call clarify once. In found, list the studies that you used in one short line each, and say that they are background only. Use them to choose better questions and options. In found, also say plainly what the inspection shows, with counts and the real channel names (for example: Each field has 3 images: CH1 is brightfield, CH3 is red fluorescence, and Overlay combines them. There is no nuclear stain.). Ground every question in the inspection: options come from the real channel names, groups, folders and columns. Never ask about a stain, a channel, a group or a column that the inspection did not find. If something is unclear, say what you saw (for example: CH1 looks like brightfield. Is that right?). In questions, ask at most 5 questions about meaning only: what to measure and what counts as one (for example a red-positive cell or a red spot), which groups to compare, what one replicate is, whether earlier results or hand counts exist, and what the output is for. Give options from the data. Leave out a question that the request already answers, and say in answered_by_request what the request says. Never ask about technical settings such as thresholds, segmentation models, size filters, error bars, test families or alpha: you choose those in phase 2. Phase 2, proposed metrics: after the answers, call plan. In definitions, turn the answers into concrete metrics and how each is measured, with the setting values, one short line each (what counts as one n, what counts as one object, what counts as positive, the metric). restatement: only the scientific goal, starting with 'You want:'. Answer setup questions (is the program ready, where the results go) briefly in your message, not in the plan. steps: one line each in plain words, the actions you will run, with every setting filled in: its value and who set it (default, from your answer, or agent). Leave no setting open: if you are not sure, choose a sensible value (agent); the demonstration checks it and the scientist can change it. Also give exclusions with their effects, pilot (the sample for the demonstration, if the method runs on more than one sample), outputs, programs, data, checks and out_of_scope. Write for a scientist: short sentences, plain words. No analysis step runs before the scientist confirms the proposed analysis.";
const DATA_CHECK_NOTE = "When you first read a table or list a data folder, the harness checks the data (missing values, copies, mixed columns, group sizes, extreme values, channels, names, bit depths) and makes a sample sheet. The harness asks the scientist about these problems and the sample sheet in the Questions stage. Do not ask about them in clarify.";
const PLAN_UPDATE_NOTE = "This is a new request in a session with an approved plan. If the request needs analysis steps that are not in the plan, call plan with only what changes: the new steps and the changed sections. The scientist approves the update before a new step runs. If the request needs no new step, answer directly.";
const PILOT_NOTE = "Pilot: before the first step that changes or counts things, say in one sentence how you will check the method on one sample first. A step that processes many files does not run until the scientist approves a pilot: run the method on one sample, save QC images with outlines of what was counted and what was left out, and call pilot_result.";
const TECHNICAL = /\b(threshold|otsu|triangle|segmentation model|cellpose model|stardist|cyto\d|diameter|size (filter|limit|cut-?off)|(minimum|maximum|min|max)\.? (cell |object |particle )?size|pixels? (size|area)|sigma|blur|error bars?|standard error|sem|sd bars|test family|t-?test|wilcoxon|mann-?whitney|anova|alpha|significance level|p-?value cut|one-?sided|two-?sided|sidedness|fdr|bonferroni|correction method|random seed|iterations|normali[sz]ation method)\b/i;
const CHECK_TITLE: Record<string, string> = { missing: "missing values", mixed_type: "text in a number column", decimal_comma: "decimal comma", duplicate_rows: "copied rows", duplicate_ids: "repeated IDs", group_labels: "group names", mixed_units: "units", missing_channel: "missing images", bit_depth: "bit depth", pseudoreplication: "what is n", confounding: "group and batch", too_few: "too few n", [METHOD_DATA_CHECK]: METHOD_DATA_TITLE };
const TOOL_IDLE_TURNS = 2;
const MAX_ADAPTER_TOOLS = 16;
const MAX_EXTRA_TOOLS = 10;
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
  private defaultNames = new Set<string>();
  private warmed = false;
  adapterInfo: { name: string; title: string; version: string; programVersion: string; trust?: string }[] = [];
  private codeAsks = new Map<string, string>();
  private selfTestAsks = new Map<string, string>();
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
  private replanReason = "";
  private planVersion = 0;
  private approvedEntry = 0;
  private planWait?: Pending<PlanResponse>;
  private planQids = new Map<string, PlanDecision>();
  private modeBefore: Mode = "watch";
  private planLooks = 0;
  private planWarned = new Set<string>();
  private budgetAsked = false;
  private stopTurn = false;
  private endTurn?: string;
  private batchAllow = new Set<string>();
  pilotStage = false;
  private clarified = false;
  private clarifyLeft = new Set<string>();
  private checked = new Set<string>();
  private noCompareNoted = false;
  private sheet?: SampleSheet;
  private toolsHinted = false;
  private planStart = 0;
  private scientistAsked?: string;
  private askedUsed = new Set<string>();
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

  private constructor(id: string, cwd: string, settings: Settings, place: Place, record?: AnalysisRecord) {
    this.id = id;
    this.cwd = cwd;
    this.settings = settings;
    this.mode = settings.mode;
    this.permissionMode = settings.permissionMode;
    this.place = place;
    this.dir = place.recordDir;
    mkdirSync(this.dir, { recursive: true });
    this.record = record ?? new AnalysisRecord(this.dir, id, recordPlaces(place));
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
    this.sharedDirs ??= { workDir: this.workDir, sessionDir: this.dir, projectDir: this.cwd, heldBack: () => this.hidden } as Dirs;
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

  static async create(opts: SessionOptions, record?: AnalysisRecord): Promise<Session> {
    const cwd = opts.cwd ?? process.cwd();
    if (opts.trustFolder) trustOnce(cwd);
    try {
      return await Session.build(opts, cwd, record);
    } catch (e) {
      if (opts.trustFolder) endTrustOnce(cwd);
      throw e;
    }
  }

  private static async build(opts: SessionOptions, cwd: string, record?: AnalysisRecord): Promise<Session> {
    const overrides = { ...(opts.settings ?? {}), mode: opts.mode, model: opts.model, referee: opts.referee };
    const notes: string[] = [];
    const settings = loadSettings(cwd, overrides, notes);
    const id = opts.place?.id ?? opts.id ?? newId();
    const place = opts.place ?? (opts.home ? legacyPlace(id, cwd) : newPlace(cwd, settings.output_folder, id));
    if (opts.method) Object.assign(settings, { planFirst: "on", pilot: "on" });
    const s = new Session(id, cwd, settings, place, record);
    const held = claimLock(s.dir);
    if (held) throw new Error(held.app ? `This session is open in the app: ${held.app}. Use it there, or close it there first` : `This session is open in another window (process ${held.pid}). Close it there first`);
    s.overrides = overrides;
    s.onceTrusted = !!opts.trustFolder;
    try {
      await s.init(opts);
    } catch (e) {
      s.releaseLock();
      throw e;
    }
    if (opts.method) s.startMethod(opts.method);
    for (const text of notes) s.record.append("notice", { text, warn: true });
    if (place.fallback && !opts.place) s.record.append("notice", { text: `The folder ${outputRoot(cwd, settings.output_folder)} is read-only. The session files are in ${dirname(place.outDir)}.` });
    return s;
  }

  static async resume(ref: string, opts: Partial<SessionOptions> = {}): Promise<Session> {
    const place = findPlace(ref, { cwd: opts.cwd, outputFolder: loadSettings(opts.cwd ?? process.cwd(), opts.settings ?? {}).output_folder });
    if (!place) {
      const row = readIndex().find((r) => r.id === ref);
      throw new Error(row ? `The folder of session ${ref} is gone: ${row.folder}. Someone moved or deleted it` : `No session ${ref}`);
    }
    const log = join(place.recordDir, "log.jsonl");
    if (!existsSync(log)) throw new Error(`No session ${ref}`);
    const id = place.id;
    const record = new AnalysisRecord(place.recordDir, id, recordPlaces(place));
    const first = record.entries(["session"])[0] as any;
    const loaded = record.entries(["adapter"]).map((e) => e.data as { name: string; path?: string });
    const cwd = !place.legacy ? place.project : opts.cwd ?? (typeof first?.data.cwd === "string" && existsSync(first.data.cwd) ? first.data.cwd : undefined);
    const gone = new Map<string, boolean>();
    const recorded = new Map<string, string | undefined>();
    for (const a of [...((first?.data.adapters ?? []) as { name: string; path?: string }[]), ...loaded]) recorded.set(a.name, a.path);
    if (opts.trustFolder && cwd) trustOnce(cwd);
    let adapters: string[];
    const replaced: string[] = [];
    try {
      const dirs = adapterDirs(cwd);
      const known = new Set(Object.values(dirs).map((d) => realpathSync(d)));
      const guarded = [cwd, place.recordDir, place.outDir].filter((d): d is string => !!d && existsSync(d)).map((d) => realpathSync(d));
      const inGuarded = (path: string) => guarded.some((d) => realpathSync(path) === d || realpathSync(path).startsWith(d + sep));
      const refOf = (name: string, path?: string) => (path && existsSync(path) && (known.has(realpathSync(path)) || !inGuarded(path)) ? path : dirs[name] ?? name);
      for (const a of opts.addAdapters ?? []) {
        try {
          const found = findAdapter(a, cwd);
          const before = [recorded.get(found.name), dirs[found.name]].filter((d): d is string => !!d && existsSync(d)).map((d) => realpathSync(d));
          if (recorded.has(found.name) && !before.includes(realpathSync(found.root))) replaced.push(found.name);
        } catch {}
      }
      adapters =
        opts.adapters ??
        [...recorded].filter(([name]) => !replaced.includes(name)).map(([name, path]) => [name, path, refOf(name, path)] as const).filter(([name, path, ref]) => {
          try {
            findAdapter(ref, cwd, { byName: ref === name && !dirs[name] });
            return true;
          } catch (e) {
            if (!(e as Error).message.startsWith("no adapter named")) throw e;
            gone.set(name, !!path && existsSync(path) && !!cwd && projectAdapterDirs(cwd).some((d) => resolve(path).startsWith(d + sep)));
            return false;
          }
        }).map(([, , ref]) => ref);
    } finally {
      if (opts.trustFolder && cwd) endTrustOnce(cwd);
    }
    const lastMode = record.entries(["mode"]).at(-1)?.data;
    const mode = lastMode ? (lastMode.reason === "plan first" ? lastMode.old : lastMode.new) : first?.data.mode;
    const switched = record.live(["setting"]).filter((e) => e.data.name === "model" && typeof e.data.new === "string" && e.data.new).at(-1)?.data.new as string | undefined;
    const kept: Record<string, unknown> = {};
    for (const name of ["effort", "promptCache", "show_thinking", "numCtx", "think"]) {
      const last = record.live(["setting"]).filter((e) => e.data.name === name).at(-1)?.data;
      if (last?.scope === "session" && last.new !== null && last.new !== undefined) kept[name] = last.new;
    }
    const s = await Session.create({ ...opts, settings: { ...kept, ...opts.settings }, cwd, place, adapters: [...adapters, ...(opts.addAdapters ?? [])], id, model: opts.model ?? switched ?? first?.data.modelSpec, mode: opts.mode ?? (mode as Mode | undefined), pick: opts.pick ?? !!first?.data.pick }, record);
    for (const name of replaced) s.record.append("notice", { text: `The adapter ${name} comes from the folder that you gave for this run. This session used another folder before.`, warn: true });
    for (const [name, untrusted] of gone) {
      const text = untrusted
        ? `The adapter ${name} is in the project folder, and this folder is not trusted. This resumed session does not load it. Check the folder with /trust, then trust it with /trust on.`
        : `The adapter ${name} is not installed here, or its folder moved. This resumed session does not load it. The record and the exports of its steps stay available.`;
      if (!s.record.entries(["notice"]).some((n) => n.data.text === text)) s.record.append("notice", { text, warn: true });
    }
    return s;
  }

  private async init(opts: SessionOptions) {
    const resumed = this.record.entries(["session"]).length > 0;
    const cutLine = resumed && this.record.repairTail();
    const off = (a: LoadedAdapter) => resumed && !!accessOf(a.name, this.cwd).off && !!this.notes.push(`The adapter ${a.name} is turned off in Programs, so this resumed session does not load it.`);
    this.adapters = opts.adapters.map((a) => applyOverlay(findAdapter(a, this.cwd))).filter((a, i, all) => all.findIndex((x) => x.name === a.name) === i).filter((a) => !off(a)).map((a) => usable(a, this.cwd));
    this.provider = opts.provider ?? (await makeProvider(this.settings.model, { effort: this.settings.effort, numCtx: this.settings.numCtx, think: this.settings.think, cache: this.settings.promptCache, showThinking: thinkingShown(this.settings) }));
    if (opts.refereeProvider) this.refereeProvider = opts.refereeProvider;
    else if (this.settings.referee === "same") this.refereeProvider = this.provider;
    else if (this.settings.referee && this.settings.referee !== "none") this.refereeProvider = await makeProvider(this.settings.referee, { effort: this.settings.effort });

    this.pick = opts.pick ?? opts.adapters.length === 0;
    const named = [...this.adapters];
    const defaults = opts.defaults ? this.defaultAdapters() : [];
    const launched = await Promise.allSettled([...named, ...defaults].map((a) => this.launch(a, true)));
    const failed = launched.flatMap((r, i) => (r.status === "rejected" && i < named.length ? [r.reason] : []));
    if (failed.length) {
      await Promise.all(launched.map((r) => (r.status === "fulfilled" ? r.value.rt.close().catch(() => {}) : undefined)));
      throw failed[0];
    }
    for (const r of launched) if (r.status === "fulfilled") this.register(r.value);
    launched.slice(named.length).forEach((r, i) => {
      if (r.status === "fulfilled") return;
      const a = defaults[i]!;
      this.adapters = this.adapters.filter((x) => x !== a);
      this.notes.push(`The default adapter ${a.name} did not start: ${(r.reason as Error).message}`);
    });
    defaults.splice(0, defaults.length, ...defaults.filter((_, i) => launched[named.length + i]!.status === "fulfilled"));
    this.defaultNames = new Set(defaults.map((a) => a.name));

    this.decisions = new DecisionRecord(this.adapters, this.record, [...(this.pick ? [ADAPTER_DECISION] : []), ...TEST_DECISIONS, REPORTING_DECISION]);
    this.interactive = !!opts.interactive;
    this.decisions.onDeviation = (e) => this.askMissingReason(e);
    const pf = this.settings.planFirst;
    this.planFirst = pf === undefined ? !!opts.interactive : pf === true || pf === "on";
    const approved = approvedPlan(this.record);
    if (approved) {
      this.approvedEntry = approved.entry;
      this.plan = structuredClone(currentPlan(this.record));
    }
    const ref = this.record.live(["reference"]).at(-1)?.data;
    if (ref && ref.mode !== "none" && ref.path) {
      this.reference = { ...ref } as unknown as Reference;
      if (ref.mode === "blind" && !ref.revealed) {
        this.hidden.push(String(ref.path));
        const bp = blindPolicy();
        if (bp) setBlindPolicy({ allow: bp.allow, deny: [...bp.deny, String(ref.path)], hide: bp.hide });
      }
    }
    this.planVersion = Math.max(0, ...this.record.entries(["plan", "plan_approved"]).map((e) => Number(e.data.version) || 0));
    let notify: ((q: Question) => Promise<void>) | undefined;
    if (this.settings.notify.ntfy) {
      try {
        const { ntfyNotifier } = await import("../server/notify.ts");
        const send = ntfyNotifier(this.settings.notify.ntfy);
        const outside = !localUrl(this.settings.notify.ntfy);
        notify = (q) => send(outside && !this.phiOff() && scanContent(`${q.title}\n${q.text}`, "question").length ? { ...q, title: "A question waits for you", text: "The question can contain patient identifiers, so the notice does not show it. Open Cuvette to read it." } : q);
      } catch {}
    }
    this.questions = new QuestionQueue(this.record, { notify });
    const sheetQs = this.questions.open().filter((q) => q.tableFrom === "samples");
    const sheetNow = sheetQs.length ? replaySheet(this.record.live(["samples"])) : undefined;
    for (const q of sheetQs) if (sheetNow) q.table = sheetGrid(sheetNow);
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
        activate: (names) => this.useTools(names),
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
    if (!this.provider.info.small) extra.push(taskTool({ provider: () => this.provider, tools: () => [...this.tools.values()], run: (t, a, id, sig) => this.runTool(t, a, id, sig), guard: (m, all) => this.phiForHelper(m, all), folders: () => this.foldersText() }));
    if (this.pilotOn()) extra.push(...this.pilotTools());
    if (this.planFirst || this.interactive) extra.push(this.clarifyTool());
    extra.push(this.inspectTool());
    extra.push((await import("../tools/literature.ts")).literatureTool());
    for (const t of extra) if (!this.tools.has(t.name)) this.tools.set(t.name, t);
    this.chooseActiveTools();

    const moduleHooks = (await Promise.all(this.adapters.map(async (a) => (await a.module()).hooks ?? []))).flat();
    this.hooks = new HookRunner(
      [...(this.settings.guidance ? [decisionHook(this.decisions)] : []), modeHook(() => this.mode, (n) => this.findTool(n)?.readOnly ?? false), ...moduleHooks],
      this.settings.hooks,
      this.cwd,
    );
    this.hooks.onError = (message) => this.record.append("notice", { text: message, warn: true });

    this.system = this.buildSystem();
    if (resumed) {
      const used = this.record.live(["method"]).filter((e) => e.data.action === "started").at(-1);
      if (used) {
        const file = String(used.data.path);
        if (resumeMethodAllowed(file, this.cwd))
          try {
            this.method = loadMethod(file);
          } catch {}
        else {
          const text = `Cuvette did not load the saved method ${String(used.data.name)}. Its file is not in your methods folder or in the methods folder of a trusted project: ${file}. To use it, type /method ${file}.`;
          const first = `Cuvette did not load the saved method ${String(used.data.name)}`;
          if (!this.record.entries(["notice"]).some((n) => String(n.data.text).startsWith(first) && String(n.data.text).includes(file))) this.record.append("notice", { text, warn: true });
        }
      }
      this.history = this.record.messages();
      const unknown = this.record.unknownKinds();
      const said = (first: string) => this.record.entries(["notice"]).some((n) => String(n.data.text).startsWith(first));
      const kindsFirst = `A newer version of Cuvette wrote entries of these kinds: ${unknown.join(", ")}.`;
      if (unknown.length && !said(kindsFirst)) this.record.append("notice", { text: `${kindsFirst} This version does not know them. Cuvette keeps them in the file as they are. Update Cuvette to see them.`, warn: true });
      const cutFirst = "The last line of the record was cut when the app stopped.";
      const cutNotice = `${cutFirst} Cuvette keeps the line in the file as it is. Cuvette does not read it, so the last action can be missing. Check the last step.`;
      const earlierCuts = this.record.entries(["notice"]).filter((n) => String(n.data.text).startsWith(cutFirst)).length;
      if (cutLine) this.record.append("notice", { text: cutNotice, warn: true });
      const linesFirst = "Some lines of the record are in a form that this version of Cuvette cannot read.";
      const linesText = `${linesFirst} Cuvette keeps them in the file as they are. If a result is missing, update Cuvette and open the session again.`;
      if (this.record.skipped > earlierCuts && !said(linesFirst)) this.record.append("notice", { text: linesText, warn: true });
      this.closeOpenCalls(this.recordedResults());
      const choice = this.record.entries(["phi"]).filter((e) => e.data.by === "scientist" && e.data.action !== "stop").at(-1)?.data.action;
      if (choice) this.phiChoice = choice as PhiAction;
      // A summary or a kept message can hold placeholders from before the restart. The masker gives each value its old placeholder again.
      if (this.phiChoice !== "send" && this.record.entries(["phi"]).some((e) => e.data.action === "mask")) {
        const all = this.record.entries(["message"]).map((e) => e.data.message as unknown as Message);
        this.masker.add(scanMessages(all, all));
      }
      this.restorePilot();
      this.closeUnfinishedClarify();
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
    const started = [...this.runtimes];
    this.starting = (async () => {
      for (const rt of started) await this.afterStart(rt);
    })();
    if (resumed) {
      await this.starting;
      await this.checkStatus();
    }
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
    let next: Place;
    try {
      next = titlePlace(this.place, request, this.runtimes.length > 0);
    } catch (e) {
      if (!(e as { renameFailed?: boolean }).renameFailed) throw e;
      this.record.append("notice", { text: `The results folder keeps its temporary name. The rename failed: ${(e as Error).message}` });
      return;
    }
    this.place = next;
    this.dir = next.recordDir;
    this.workDir = next.outDir;
    this.record.moveTo(next.recordDir, { workDir: next.outDir, exportDir: next.outDir });
    Object.assign(this.dirs(), { workDir: next.outDir, sessionDir: next.recordDir });
    for (const t of await this.fileTools()) if (this.tools.has(t.name) && this.tools.get(t.name)!.source === t.source) this.tools.set(t.name, t);
    this.system = this.buildSystem();
    this.record.append("notice", { text: `This session saves its results in ${next.outDir}.` });
  }

  private reporting = Promise.resolve();
  private reportHtml = "";

  private writeReport(): Promise<void> {
    if (this.place.legacy || provisional(this.place)) return this.reporting;
    const path = join(this.place.outDir, "index.html");
    this.reporting = this.reporting.then(async () => {
      try {
        await new Promise((r) => setTimeout(r, 0));
        const html = (await import("./trail.ts")).trailHtml(this.record, this.adapters, this.citationStyle(), { linkFrom: this.place.outDir });
        if (html === this.reportHtml && existsSync(path)) return;
        this.reportHtml = html;
        await writeFile(`${path}.tmp`, html);
        await rename(`${path}.tmp`, path);
      } catch {}
    });
    return this.reporting;
  }

  private foldersSent = false;

  private foldersText(): string {
    return foldersNote({ project: this.cwd, work: this.workDir, output: this.outputDir });
  }

  // The first message gives the list of the project folder, so the model does not need a list_dir call before its first real step.
  private async folderList(): Promise<string | undefined> {
    const read = async () => {
      const dir = await opendir(this.cwd);
      const names: { name: string; folder: boolean }[] = [];
      try {
        for await (const e of dir) {
          names.push({ name: e.name, folder: e.isDirectory() });
          if (names.length === FOLDER_LIST_READ_MAX) break;
        }
      } finally {
        await dir.close().catch(() => {});
      }
      names.sort((x, y) => x.name.localeCompare(y.name));
      const shown = await Promise.all(
        names.slice(0, FOLDER_LIST_MAX).map(async (e) => {
          const st = await stat(join(this.cwd, e.name)).catch(() => undefined);
          return { name: e.name, folder: st ? st.isDirectory() : e.folder, size: st?.isFile() ? st.size : undefined };
        }),
      );
      const hidden = isCloud(this.provider.info) && this.runtimes.some((rt) => rt.adapter.manifest.data_rules.cloud_visibility === "summaries");
      const inspect = this.runtimes.some((rt) => rt.adapter.manifest.tools.some((t) => t.name === "inspect_table"));
      return folderListNote(shown, names.length > FOLDER_LIST_MAX) + (hidden ? "\nAdapter tools do not send table rows to a cloud model." + (inspect ? " To see the column names of a small CSV file, call read_file on it in the same reply as inspect_table." : "") : "");
    };
    const limit = new Promise<undefined>((done) => AbortSignal.timeout(this.folderListMs).addEventListener("abort", () => done(undefined)));
    try {
      return await Promise.race([read(), limit]);
    } catch {
      return undefined;
    }
  }

  folderListMs = 2000;

  private buildSystem(): string {
    return systemPrompt({ adapters: this.runtimeInfo, model: this.provider.info, mode: this.mode, lab: labText(this.cwd), guidance: this.settings.guidance, pick: this.pick, folders: { figureFormats: this.settings.figure_formats, xlsx: xlsxOn(this.settings) }, textStyle: this.settings.text_style });
  }

  private defaultAdapters(): LoadedAdapter[] {
    const out: LoadedAdapter[] = [];
    for (const name of this.settings.defaultAdapters ?? []) {
      if (this.adapters.some((a) => a.name === name)) continue;
      try {
        const a = usable(applyOverlay(findAdapter(name, this.cwd, { byName: true })), this.cwd);
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

  // A named adapter gets a worker with its modules imported. A default adapter gets one only if the request names a file that it reads.
  private warmAdapters(text: string) {
    if (this.warmed) return;
    this.warmed = true;
    for (const rt of this.runtimes) {
      if (!rt.warm) continue;
      if (!this.defaultNames.has(rt.adapter.name) || filesFor(text, { fileTypes: rt.adapter.manifest.adapter.file_types }, this.cwd).length) rt.warm(true);
    }
  }

  private starting: Promise<void> = Promise.resolve();
  private systemSent = false;

  // The version command and the package list of an adapter run after the first request goes out.
  private async afterStart(rt: AdapterRuntime) {
    const name = rt.adapter.name;
    const had = rt.startPath;
    const f = await rt.checked?.catch(() => undefined);
    if (f && had && !f.path) this.record.append("notice", { text: `The version check of the adapter ${name} did not find ${rt.adapter.manifest.program.name} at ${had}: ${f.how}. The tools of ${name} can fail. To look for the program again, run "cuvette programs check ${name}".`, warn: true });
    if (f) {
      const info = this.adapterInfo.find((x) => x.name === name);
      const before = info?.programVersion;
      if (info) info.programVersion = f.version;
      const shown = this.runtimeInfo.find((x) => x.adapter.name === name);
      if (shown && shown.programVersion !== f.version) {
        shown.programVersion = f.version;
        // After the first model request, a new system prompt makes the API write the prompt cache again.
        if (!this.systemSent) this.system = this.buildSystem();
      }
      if (before && before !== f.version && before !== rt.adapter.manifest.program.version && !f.timedOut) this.record.append("notice", { text: `The version command of the adapter ${name} gives the program version ${f.version}. The start of this session used the saved version ${before}. The steps record ${f.version}.` });
      this.envTargets.set(name, envTarget({ kind: rt.adapter.manifest.connection.kind, interpreter: rt.interpreter ?? [], programPath: f.path, program: rt.adapter.manifest.program.name, programVersion: f.version }));
      if (f.timedOut) this.record.append("notice", { text: `The version command of the adapter ${name} ran longer than ${START_VERSION_TIMEOUT_MS / 1000} s. Cuvette did not check the program at ${f.path ?? "the found path"}. The record shows the version from the adapter manifest: ${f.version}.` });
    }
    await this.envHashFor(name).catch(() => undefined);
  }

  private async startOne(a: LoadedAdapter): Promise<string[]> {
    return this.register(await this.launch(a));
  }

  // The programs start at the same time. The tools register in a fixed order after that.
  private async launch(a: LoadedAdapter, quick = false) {
    const trust = adapterTrust(a.root);
    if (!trust.codeConfirmed) throw new Error(`The adapter ${a.name} is Unlisted and ships code (${trust.codeFiles.join(", ")}). Confirm that it can run: cuvette adapter allow-code ${a.name}`);
    const { startAdapter } = await import("../adapters/runtime.ts");
    const rt = await startAdapter(a, this.dirs(), { quick });
    try {
      const [mod, tools] = await Promise.all([a.module(), rt.tools()]);
      return { a, trust, rt, mod, tools };
    } catch (e) {
      await rt.close().catch(() => {});
      throw e;
    }
  }

  private register({ a, trust, rt, mod, tools }: Awaited<ReturnType<Session["launch"]>>): string[] {
    this.runtimes.push(rt);
    this.envTargets.set(a.name, envTarget({ kind: a.manifest.connection.kind, interpreter: rt.interpreter ?? [], programPath: rt.programPath, program: a.manifest.program.name, programVersion: rt.programVersion }));
    this.runtimeInfo.push({ adapter: a, programVersion: rt.programVersion, instructions: rt.instructions });
    this.adapterInfo.push({ name: a.name, title: a.manifest.adapter.title || a.manifest.program.name, version: a.manifest.adapter.version, programVersion: rt.programVersion, trust: trust.label });
    const names: string[] = [];
    const noCode = blocksCode(a.name, this.cwd);
    for (const t of [...tools, ...(mod.tools ?? []).map((t) => ({ ...t, adapter: t.adapter ?? a.name, source: "adapter" as const }))]) {
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
      a = usable(applyOverlay(findAdapter(name, this.cwd, { byName: true })), this.cwd);
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
        b = n === a.name ? a : usable(applyOverlay(findAdapter(n, this.cwd, { byName: true })), this.cwd);
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
      text: `The agent wants to use ${a.manifest.program.name} through the ${a.name} adapter (trust: ${adapterTrust(a.root).label}): ${why}`,
      options,
      recommendation: { value: options[0].value, reason: why },
      evidence: others.length ? `Other adapters that read the same file types: ${others.join(", ")}.` : "",
    });
    this.bus.emit({ type: "question", question: q });
    this.record.append("blocked", { tool: "use_adapter", reason: `waiting for the scientist: ${key}`, qid: q.qid });
    if (!this.settings.askWaits) return { load: [], by: "human", blocked: `BLOCKED: the choice of program belongs to the scientist. Question ${q.qid} waits for the answer. Call use_adapter again after the answer.` };
    this.bus.emit({ type: "status", state: "waiting", tool: "use_adapter" });
    try {
      await this.waitFor(q.qid);
    } catch {
      return { load: [], by: "human", blocked: `The question ${q.qid} about the program is still open.${this.steerText(q.qid)}` };
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
      const shown = name.length > 40 ? `${name.slice(0, 39)}…` : name;
      if (/^no adapter named/.test((e as Error).message)) return { ok: false, text: `No adapter named ${shown}. Type /programs to see the adapters.` };
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

  private async selfTestGate(a: LoadedAdapter, names: string[]): Promise<string | undefined> {
    if (!selfTestEnabled()) return undefined;
    const done = await selfTestFor(a, this.runtimes.at(-1)!).catch(() => undefined);
    if (!done) return undefined;
    const { result, cached } = done;
    this.record.append("self_test", { adapter: a.name, cached, ...result });
    if (result.status === "error") this.record.append("notice", { text: `The self-test of the adapter ${a.name} did not run. ${result.message}.` });
    if (result.status !== "fail") return undefined;
    let q = this.selfTestAsks.has(a.name) ? this.questions.get(this.selfTestAsks.get(a.name)!) : undefined;
    if (!q) {
      q = await this.questions.ask(warningCard(a.name, result));
      this.selfTestAsks.set(a.name, q.qid);
      this.bus.emit({ type: "question", question: q });
      this.record.append("blocked", { tool: "use_adapter", reason: `waiting for the scientist: self-test of ${a.name}`, qid: q.qid });
    }
    if (q.status === "open" && this.settings.askWaits) {
      this.bus.emit({ type: "status", state: "waiting", tool: "use_adapter" });
      try {
        await this.waitFor(q.qid);
      } catch {}
      q = this.questions.get(q.qid) ?? q;
    }
    if (q.answer === "continue") {
      this.record.append("notice", { text: `The scientist continued with the adapter ${a.name} after the self-test failed: ${result.message}.` });
      return undefined;
    }
    const rt = this.runtimes.pop();
    await rt?.close().catch(() => {});
    this.runtimeInfo.pop();
    this.adapterInfo.pop();
    this.envTargets.delete(a.name);
    for (const n of names) this.tools.delete(n);
    return q.status === "open" ? `BLOCKED: the self-test of ${a.name} failed (${result.message}). Question ${q.qid} waits for the scientist: continue or stop.` : `The adapter ${a.name} is not loaded. Its self-test failed (${result.message}) and the scientist stopped it.`;
  }

  private async confirmUnlistedCode(a: LoadedAdapter): Promise<string | undefined> {
    const t = adapterTrust(a.root);
    if (t.codeConfirmed) return undefined;
    let q = this.codeAsks.has(a.name) ? this.questions.get(this.codeAsks.get(a.name)!) : undefined;
    if (!q) {
      q = await this.questions.ask({
        decisionKey: "",
        title: `Run the code of ${a.name}?`,
        text: `The adapter ${a.name} is Unlisted: nobody reviewed or checked it. It ships code that runs on this computer with your user permissions: ${t.codeFiles.join(", ")}. Run it only if you read these files.`,
        options: [{ value: "run", label: `Run the code of ${a.name}` }, { value: "no", label: "Do not run it" }],
        evidence: `Source: ${t.entry?.source ?? "unknown"}. SHA-256 ${t.entry?.sha256.slice(0, 16) ?? ""}.`,
      });
      this.codeAsks.set(a.name, q.qid);
      this.bus.emit({ type: "question", question: q });
      this.record.append("blocked", { tool: "use_adapter", reason: `waiting for the scientist: run the code of ${a.name}`, qid: q.qid });
    }
    if (q.status === "open") {
      if (!this.settings.askWaits) return `BLOCKED: ${a.name} is Unlisted and ships code. Question ${q.qid} waits for the scientist. Or run: cuvette adapter allow-code ${a.name}`;
      this.bus.emit({ type: "status", state: "waiting", tool: "use_adapter" });
      try {
        await this.waitFor(q.qid);
      } catch {
        return `The question ${q.qid} about the code of ${a.name} is still open.${this.steerText(q.qid)}`;
      }
      q = this.questions.get(q.qid) ?? q;
    }
    if (q.answer === "run") {
      confirmCode(a.root);
      this.record.append("notice", { text: `The scientist allowed the code of the Unlisted adapter ${a.name} to run.` });
      return undefined;
    }
    return `The scientist did not allow the code of ${a.name} to run.`;
  }

  private async loadOne(a: LoadedAdapter, reason: string, by: string): Promise<ToolOutput> {
    const denied = await this.confirmUnlistedCode(a);
    if (denied) return { ok: false, error: denied };
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
    const stopped = await this.selfTestGate(a, names);
    if (stopped) return { ok: false, error: stopped };
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
    this.record.append("adapter", { name: a.name, program: m.program.name, version: info.version, programVersion: info.programVersion, envHash, reason, by, status: m.adapter.status, trust: info.trust, path: a.root, programFound: checked ? !!where.path : null, how: where.how, tools: names, notices });
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

  private turnNo = 0;
  private toolTurn = new Map<string, number>();

  private useTools(names: string[]) {
    for (const n of names) {
      this.active.add(n);
      this.toolTurn.set(n, this.turnNo);
    }
  }

  // With deferred tools, a fixed base of adapter tools stays in the list. A tool that find_tools, a call or the request brings in
  // is an extra: it leaves after TOOL_IDLE_TURNS turns with no call, and at most MAX_EXTRA_TOOLS extras stay.
  // The list changes only at the start of a turn or after find_tools, so the prompt cache stays valid between the other steps.
  private baseTools = new Set<string>();

  private chooseActiveTools(request = "", turnStart = false) {
    const all = [...this.tools.values()];
    const adapterTools = all.filter((t) => t.source === "adapter");
    const deferred = this.deferred();
    if (!this.active.size) this.active = new Set(all.filter((t) => t.source !== "adapter" || !deferred).map((t) => t.name));
    if (!deferred) {
      this.active.delete("find_tools");
      return;
    }
    const states = new Set(this.adapters.map((a) => a.manifest.connection.state_tool).filter(Boolean));
    for (const t of [...adapterTools.filter((t) => states.has(t.remoteName ?? t.name)), ...adapterTools.filter((t) => !t.deferred)]) {
      if (this.baseTools.size >= MAX_ADAPTER_TOOLS) break;
      this.baseTools.add(t.name);
    }
    for (const n of this.baseTools) this.active.add(n);
    if (!turnStart) return;
    const hits = request ? searchTools(adapterTools.filter((t) => !this.baseTools.has(t.name)), request, 4) : [];
    this.useTools(hits.map((t) => t.name));
    const planned = new Set((this.plan?.steps ?? []).filter((s) => s.status === "todo" || s.status === "doing").flatMap((s) => toolWords(s.tool ?? "")));
    this.useTools(adapterTools.filter((t) => !this.baseTools.has(t.name) && planned.has((t.remoteName ?? t.name).toLowerCase())).map((t) => t.name));
    const extras = [...this.active].filter((n) => this.tools.get(n)?.source === "adapter" && !this.baseTools.has(n));
    for (const n of extras) if (this.turnNo - (this.toolTurn.get(n) ?? 0) > TOOL_IDLE_TURNS) this.active.delete(n);
    const kept = extras.filter((n) => this.active.has(n)).sort((x, y) => (this.toolTurn.get(y) ?? 0) - (this.toolTurn.get(x) ?? 0));
    for (const n of kept.slice(MAX_EXTRA_TOOLS)) this.active.delete(n);
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

  private withoutKeys(text: string): string {
    const h = hideKeys(text);
    if (h.found) this.record.append("notice", { text: `Cuvette removed ${h.found === 1 ? "an API key" : `${h.found} API keys`} from your text. The key did not go to the model or into the record. To save a Claude key, use /key.` });
    return h.text;
  }

  private valueWithoutKeys(v: unknown): unknown {
    if (typeof v === "string") return this.withoutKeys(v);
    if (Array.isArray(v)) return v.map((x) => this.valueWithoutKeys(x));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, this.valueWithoutKeys(x)]));
    return v;
  }

  async send(text: string, opts: { internal?: boolean; plan?: boolean } = {}): Promise<string> {
    if (this.busy) throw new Error("the agent is busy; wait or press Esc to stop it");
    const gone = [this.cwd, this.record.dir].find((d) => !existsSync(d));
    if (gone) throw new Error(`the folder ${gone} is gone. Someone moved or deleted it. Nothing was sent. Open a folder again, or start a new session`);
    text = this.withoutKeys(text);
    this.busy = true;
    this.endedBy = "stopped";
    this.turnStartedAt = performance.now();
    this.answerReadyMs = undefined;
    this.reviewState = "none";
    this.reviewFindings = 0;
    this.turnMs = undefined;
    this.abort = new AbortController();
    const signal = this.abort.signal;
    let revised = false;
    let nudges = 0;
    let lastSig = "";
    let streak: CallOutcome[] = [];
    let stuckSig = "";
    let forceAnswer = false;
    let stopBlocks = 0;
    let held: { said: string; tools: number; open: string[] } | undefined;
    let stopHooked = false;
    const turnStart = this.record.entries().length;
    let results: Part[] = [];
    this.summaryFailed = false;
    this.assumptions = "";
    try {
      await this.nameFolder(text);
      await this.hooks.event("UserPromptSubmit", { session: this.id, text });
      if (this.setupNeeded()) this.decisions.applySetup({}, { how: "defaults accepted without review (the setup card was skipped)" });
      if (this.history.length === 0 && this.settings.guidance) this.notes.unshift(this.decisions.brief(), MODE_NOTE[this.mode], ...(this.pilotOn() ? [PILOT_NOTE] : []));
      if (this.history.length === 0 || !this.foldersSent) {
        const list = this.history.length === 0 ? await this.folderList() : undefined;
        this.notes.unshift(...[this.foldersText(), list].filter((n): n is string => !!n));
        this.foldersSent = true;
      }
      if (this.settings.guidance && !opts.internal && (opts.plan || (this.planFirst && !CONTINUE.test(text.trim())))) this.startPlanning(text);
      else if (this.settings.guidance && this.planFirst && !this.planning && !this.approvedEntry && !this.pilotPlan) this.startPlanning(String(this.realRequest()?.data.text ?? text), true);
      if (!opts.internal) {
        this.scientistAsked = text;
        this.askedUsed.clear();
      }
      this.turnNo++;
      this.chooseActiveTools(text, true);
      this.warmAdapters(text);
      if (this.pick) {
        const hint = fileTypeHint(text, () => this.adapterList(), this.cwd, this.adapters.map((a) => a.name));
        if (hint) this.notes.push(hint);
      }
      this.record.append("user", { text, ...(opts.internal ? { internal: true } : {}) });
      const notes = this.drainNotes();
      this.request = { role: "user", parts: [{ type: "text", text: notes ? `${notes}\n\n${text}` : text }] };
      this.push(this.request);
      for (let step = 0; step < this.settings.maxSteps; step++) {
        if (!(await this.phiGate(signal))) {
          this.record.append("notice", { text: "Stopped before the content went to the model. Nothing was sent." });
          return this.stoppedText();
        }
        if (!(await this.budgetGate(signal))) return this.stoppedText();
        await this.maybeCompact(signal);
        this.bus.emit({ type: "status", state: "thinking" });
        const res = await this.stepWithRecovery(forceAnswer, signal);
        this.uniqueCallIds(res.message);
        this.push(res.message);
        this.record.append("usage", { ...res.usage, model: this.provider.info.model, provider: this.provider.info.provider, local: isLocal(this.provider.info) });
        this.checkContext();
        const note = res.note ?? (res.stopReason === "max_tokens" ? "The reply hit the output limit and was cut short." : undefined);
        if (note) this.record.append("notice", { text: note });
        const thinking = res.message.parts.flatMap((p) => (p.type === "thinking" && p.text ? [p.text] : [])).join("\n");
        if (thinking) this.record.append("thinking", { text: thinking });
        let said = res.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n").trim();
        const calls = res.message.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
        this.lastSaid = said;
        if (!calls.length && this.steered.length) {
          if (said) this.record.append("assistant", { text: said, final: false });
          this.push({ role: "user", parts: [{ type: "text", text: this.takeSteer() }] });
          continue;
        }
        if (!calls.length && res.stopReason === "max_tokens" && nudges < 2 && !forceAnswer) {
          nudges++;
          if (said) this.record.append("assistant", { text: said, final: false });
          this.push({ role: "user", parts: [{ type: "text", text: "[Notes from the harness]\n- The output limit stopped your last reply before its end. If it had a tool call, that call did not run. Do the step again, shorter: one tool call with short inputs, or the complete answer in fewer words." }] });
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
        let keptFirst = false;
        if (!calls.length && held && !this.draft && said && !held.tools) {
          keptFirst = true;
          this.record.append("assistant", { text: said, final: false });
          this.record.append("notice", { text: `Not done from the plan: ${held.open.join("; ")}. The agent gave no result for ${held.open.length > 1 ? "these steps" : "this step"}. The first answer stays.`, plan: "skipped" });
          said = held.said;
          held = undefined;
        }
        if (!calls.length && nudges < 3 && !forceAnswer && !keptFirst) {
          const tail = said.slice(-400);
          const promise = endsWithPromise(said) || announcesStep(said);
          const asksLeave = this.settings.headless && /\b(would you like me to|shall I|should I|do you want me to)\b[^?]*\?\s*$/i.test(tail);
          const turnStart = this.realRequest()?.id ?? 0;
          const ranStep = this.record.nodes().some((n) => n.entry > turnStart && !n.sensitivityOf && n.tool !== "calculate");
          const noWork = this.settings.headless && this.adapters.length > 0 && !ranStep;
          const planNote = this.record.entries(["note"]).filter((e) => e.id > turnStart && Array.isArray(e.data.plan)).at(-1);
          const approvedSteps = !planNote && this.plan && this.approvedEntry > turnStart && !this.planning ? this.plan.steps.filter((p) => p.tool) : undefined;
          const ran = planNote ? this.record.entries(["tool_result"]).filter((e) => e.id > planNote.id && e.data.ok === true && e.data.tool !== "plan" && e.data.tool !== "calculate") : [];
          const covered = (p: PlanStep) => (p.tool ? ran.some((e) => matchStep({ steps: [p] }, String(e.data.tool), e.data.adapter ? String(e.data.adapter) : undefined) === 0) : ran.some((e) => { const t = this.findTool(String(e.data.tool)); return !!t && (!t.readOnly || t.source === "adapter"); }));
          const open = (approvedSteps ?? (planNote?.data.plan as PlanStep[] | undefined) ?? []).filter((p) => (p.status === "todo" || p.status === "doing") && (approvedSteps || !covered(p)));
          if (promise || asksLeave || noWork || open.length) {
            nudges++;
            this.record.append("assistant", { text: said, final: false });
            const why = asksLeave
              ? "The scientist is not here to answer. Go on with your recommendation."
              : promise
                ? "You said what you will do next, but you did not call a tool. Do it now with a tool call, or give your final answer."
                : noWork
                  ? "No program step has run in this turn, so the request is not answered yet. Run the next step now with a tool. If a tool failed, fix the input and try again."
                  : approvedSteps
                    ? `Your plan still has steps that are not done: ${open.map((p) => p.step).join("; ")}. Do the next one now with a tool. If a step cannot be done, call plan and mark it skipped with the reason. Then give the answer, with every number the request asks for.`
                    : `Your plan still has steps that are not done: ${open.map((p) => p.step).join("; ")}. Do the next one now with a tool. If a step cannot be done, the harness records it as not done. Then give the answer, with every number the request asks for.`;
            if (open.length && !approvedSteps && !promise && !asksLeave && !noWork && !held && !this.draft && said) held = { said, tools: 0, open: open.map((p) => p.step) };
            this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- ${why}` }] });
            continue;
          }
        }
        if (!calls.length && !said && this.draft) {
          const kept = this.keepDraft("The correction was empty. The first answer stays, with the problems that the review found.");
          this.endedBy = "answer";
          return kept;
        }
        if (!calls.length && !said) {
          const cut = res.stopReason === "max_tokens";
          this.record.append("notice", { text: cut ? 'The output limit of the model cut its reply before any text or tool call. Type "continue" to ask again with a smaller step, or raise the output limit of the model.' : 'The model gave no answer. Its last replies had no text and no tool call. Type "continue" to ask again, or choose another model.', warn: true });
          this.endedBy = "error";
          return "";
        }
        if (!calls.length) {
          const block = stopBlocks < MAX_STOP_BLOCKS ? await this.hooks.stop({ session: this.id, answer: said, stop_hook_active: stopBlocks > 0 }, signal).catch(() => undefined) : undefined;
          if (block && !signal.aborted) {
            stopBlocks++;
            if (said) this.record.append("assistant", { text: said, final: false });
            this.record.append("notice", { text: `A Stop hook asks the agent to continue: ${block}` });
            this.push({ role: "user", parts: [{ type: "text", text: `[Notes from the harness]\n- A Stop hook asks you to continue: ${block}` }] });
            continue;
          }
          stopHooked = true;
          const out = await this.finishAnswer(said, revised, signal);
          if (out.revise) {
            revised = true;
            this.push({ role: "user", parts: [{ type: "text", text: out.revise }] });
            continue;
          }
          this.endedBy = "answer";
          return out.text;
        }
        if (said) this.record.append("assistant", { text: said, final: false });
        if (held) held.tools += calls.length;
        nudges = 0;
        results = [];
        this.callOrder.clear();
        let together: number[] = [];
        const sigs: string[] = [];
        const record = (i: number) => {
          const part = results[i] as Extract<Part, { type: "tool_result" }>;
          const seen = this.outcomes.get(calls[i]!.id);
          this.outcomes.delete(calls[i]!.id);
          if (sigs[i] === lastSig) streak.push(seen ?? { ok: !part.isError, key: createHash("sha1").update(part.text).digest("hex") });
        };
        const stopLoop = (i: number) => {
          const call = calls[i]!;
          forceAnswer = true;
          stuckSig = sigs[i]!;
          this.record.append("notice", { text: `The agent called ${call.name} with the same input three times. The harness asks for the final answer.` });
          results[i] = { type: "tool_result", callId: call.id, name: call.name, text: `ERROR: you called ${call.name} with the same input three times in a row. Stop. Give your final answer now, from the results you have.`, isError: true };
        };
        const runTogether = async () => {
          const list = together;
          together = [];
          const parts = await Promise.all(list.map((i) => this.runCall(calls[i]!, signal)));
          list.forEach((i, k) => (results[i] = parts[k]!));
          list.forEach(record);
        };
        for (const [i, call] of calls.entries()) {
          const sig = `${call.name}:${JSON.stringify(call.args)}`;
          sigs[i] = sig;
          const parallel = this.parallelSafe(call) && sig !== lastSig;
          if (!parallel && together.length) await runTogether();
          if (signal.aborted || this.stopTurn || this.endTurn) {
            results[i] = { type: "tool_result", callId: call.id, name: call.name, text: `ERROR: not run. ${this.endTurn && !signal.aborted && !this.stopTurn ? this.endTurn : "The scientist stopped the turn."}`, isError: true };
            continue;
          }
          if (this.steered.some((m) => m.now)) {
            results[i] = { type: "tool_result", callId: call.id, name: call.name, text: "ERROR: not run. The scientist sent a message. Read it first.", isError: true };
            continue;
          }
          if (sig !== lastSig) {
            streak = [];
            stuckSig = "";
          }
          lastSig = sig;
          if (sig === stuckSig || (streak.length >= 2 && streak.slice(-2).every((o) => !o.ok))) {
            streak.push({ ok: false, key: "" });
            stopLoop(i);
            continue;
          }
          if (parallel) together.push(i);
          else {
            results[i] = await this.runCall(call, signal);
            record(i);
            const last = streak.slice(-3);
            if (last.length === 3 && last.every((o) => o.ok && o.key === last[0]!.key)) stopLoop(i);
          }
        }
        if (together.length) await runTogether();
        const pending = this.drainNotes();
        if (pending) results.push({ type: "text", text: pending } as Part);
        if (this.steered.length) results.push({ type: "text", text: this.takeSteer() } as Part);
        this.push({ role: "user", parts: results });
        results = [];
        if (this.stopTurn) {
          this.stopTurn = false;
          this.record.append("notice", { text: "You cancelled the plan. No analysis step ran." });
          return this.stoppedText();
        }
        if (this.endTurn) {
          this.record.append("notice", { text: this.endTurn });
          this.endTurn = undefined;
          return this.stoppedText();
        }
        if (signal.aborted) {
          this.record.append("notice", { text: "Stopped. The results so far are kept.", warn: true });
          return this.stoppedText();
        }
      }
      this.record.append("notice", { text: `Paused after ${this.settings.maxSteps} steps. Type "continue" to go on.`, warn: true });
      this.endedBy = "max_steps";
      return this.stoppedText();
    } catch (e) {
      const msg = signal.aborted && this.cutReply ? "Stopped. The reply above is not complete." : signal.aborted ? "Stopped." : e instanceof ProviderError ? e.message : `${(e as Error).name}: ${(e as Error).message}`;
      this.record.append(signal.aborted ? "notice" : "error", signal.aborted ? { text: msg, warn: true } : { message: msg });
      if (!signal.aborted) this.endedBy = "error";
      this.closeOpenCalls(results);
      if (this.draft) return this.keepDraft("The turn stopped during the correction. The first answer stays, with the problems that the review found.");
      return "";
    } finally {
      this.turnMs = Math.round(performance.now() - this.turnStartedAt);
      if (this.planning) this.endPlanning();
      this.waitedQids.clear();
      this.laterQids.clear();
      this.draft = undefined;
      this.stopTurn = false;
      this.endTurn = undefined;
      this.cutReply = false;
      this.saveResults(turnStart);
      this.busy = false;
      this.bus.emit({ type: "status", state: "idle" });
      await this.writeReport();
      if (!stopHooked) await this.hooks.event("Stop", { session: this.id }).catch(() => {});
      this.titling = this.retitle(turnStart);
    }
  }

  // How the last turn ended: "answer", "max_steps" (the step limit), "error" or "stopped" (Esc, a card or a cancel).
  endedBy: "answer" | "max_steps" | "error" | "stopped" = "stopped";

  // Milliseconds from the start of the last turn to the first shown answer, and to the end of the turn with the review.
  answerReadyMs?: number;
  turnMs?: number;
  private turnStartedAt = 0;
  reviewState: "done" | "stopped" | "failed" | "none" = "none";
  reviewFindings = 0;

  private appendReview(answer: number, state: "done" | "stopped" | "failed" | "off", findings: string[], extra: Record<string, unknown> = {}): void {
    this.record.append("review", { answer, state, findings, ...extra });
    this.reviewState = state === "off" ? "none" : state;
    this.reviewFindings = findings.length;
  }

  private markAnswerReady(): void {
    if (this.answerReadyMs !== undefined) return;
    this.answerReadyMs = Math.round(performance.now() - this.turnStartedAt);
    this.record.append("answer_ready", { at: new Date().toISOString(), elapsedMs: this.answerReadyMs });
  }

  private cutReply = false;
  retryBudgetMs = RETRY_BUDGET_MS;
  recoveryWaitMs = 20_000;
  recoveryRounds = 1;
  recoverySleep: Sleep = realSleep;

  private async stepWithRecovery(noTools: boolean, signal: AbortSignal): Promise<StepResult> {
    let rounds = 0;
    let compacted = false;
    let budget = { leftMs: this.retryBudgetMs };
    let started = Date.now();
    let allTries = 0;
    for (;;) {
      let retried = false;
      let tries = 1;
      let streamed = false;
      let partial = "";
      const dropStreamed = () => {
        if (streamed) this.bus.emit({ type: "delta_reset" });
        streamed = false;
        partial = "";
      };
      try {
        this.systemSent = true;
        const res = await this.provider.step({
          system: this.system,
          messages: this.history,
          tools: this.activeSchemas(),
          knownTools: [...this.tools.keys()],
          noToolCalls: noTools,
          signal,
          retryBudget: budget,
          onDelta: (d) => {
            streamed = true;
            if (d.type === "text") partial += d.text;
            this.bus.emit({ type: "delta", kind: d.type, text: d.text });
          },
          onRetry: (r) => {
            retried = true;
            tries = r.attempt + 1;
            dropStreamed();
            const text = `Waiting to retry (${r.attempt} of ${r.of})`;
            const wait = Math.round(r.waitMs / 1000);
            this.bus.emit({ type: "status", state: "thinking", purpose: `${text}: ${r.reason}. The next try is in ${wait} s.` });
            this.record.append("notice", { text: `${text}: ${r.reason}. The next try is in ${wait} s.` });
          },
        });
        if (retried) this.bus.emit({ type: "status", state: "thinking" });
        return res;
      } catch (e) {
        if (e instanceof ProviderError && e.overflow && !signal.aborted) {
          if (!compacted) {
            compacted = true;
            if (await this.maybeCompact(signal, true, true)) {
              dropStreamed();
              allTries += tries;
              this.record.append("notice", { text: "The context was too long for the model. The harness made the context shorter and tries again." });
              continue;
            }
          }
          if (e.result) {
            if (retried) this.bus.emit({ type: "status", state: "thinking" });
            this.record.append("notice", { text: `${e.message} The summary could not make the context shorter, so the harness keeps this reply.` });
            return e.result;
          }
        }
        if (signal.aborted && partial.trim()) {
          this.record.append("assistant", { text: partial.trim(), final: false, stopped: true });
          this.cutReply = true;
          streamed = false;
        }
        dropStreamed();
        if (!(e instanceof ProviderError) || !e.transient || signal.aborted) throw e;
        allTries += tries;
        const seconds = Math.round(Math.max(Date.now() - started, this.retryBudgetMs - budget.leftMs) / 1000);
        const after = `after ${countWord(allTries)} ${allTries === 1 ? "try" : "tries"} in ${seconds} s`;
        this.record.append("notice", { text: `The model did not answer ${after}. The conversation is saved up to the last finished step.` });
        if (this.settings.headless) {
          if (++rounds > this.recoveryRounds || this.recoveryWaitMs > budget.leftMs)
            throw new ProviderError(`The model did not answer ${after}. ${e.message} The run stopped. Wait a few minutes, then start the run again.`);
          budget.leftMs -= this.recoveryWaitMs;
          this.record.append("notice", { text: `No one can answer the card in a headless run. Waiting ${Math.round(this.recoveryWaitMs / 1000)} s to try again (round ${rounds} of ${this.recoveryRounds}).` });
          await this.recoverySleep(this.recoveryWaitMs, signal);
          continue;
        }
        const choice = await this.askRecovery(e.message, after, signal);
        if (choice !== "stop") this.bus.emit({ type: "status", state: "thinking" });
        budget = { leftMs: this.retryBudgetMs };
        started = Date.now();
        allTries = 0;
        if (choice === "stop") throw e;
        this.bus.emit({ type: "status", state: "thinking" });
        if (choice === "local") {
          compacted = false;
          const problem = await this.useLocalModel("the Claude API could not be reached");
          if (problem) this.record.append("notice", { text: `The local model did not start: ${problem}` });
        }
      }
    }
  }

  private async askRecovery(problem: string, after: string, signal: AbortSignal): Promise<"resume" | "local" | "stop"> {
    const local = this.localSpec();
    const options = [
      { value: "resume", label: "Resume" },
      ...(local ? [{ value: "local", label: "Switch to the local model" }] : []),
      { value: "stop", label: "Stop" },
    ];
    const q = await this.questions.ask({
      decisionKey: "",
      title: "The model did not answer",
      text: `${problem} The model gave no answer ${after}. The finished steps are saved. Resume goes on from the last finished step. No finished step runs again.`,
      options,
      recommendation: { value: "resume", reason: /rate limit/i.test(problem) ? (/wait of \d/i.test(problem) ? "Wait for the time that the text gives, then press Resume." : "Wait one minute, then press Resume.") : "The server is busy or the network failed. Press Resume to try again." },
      evidence: "",
    });
    this.bus.emit({ type: "question", question: q });
    this.bus.emit({ type: "status", state: "waiting" });
    try {
      const done = await this.waitFor(q.qid, signal);
      const answer = String(done.answer);
      return answer === "resume" || answer === "local" ? answer : "stop";
    } catch {
      this.questions.withdraw(q.qid, "The turn stopped before an answer.");
      return "stop";
    }
  }

  titling?: Promise<void>;

  private async retitle(turnStart: number): Promise<void> {
    if (!this.interactive || this.settings.headless || this.provider.info.provider === "fake" || this.phiChoice === "mask") return;
    if (isCloud(this.provider.info) && (this.phiHeld() || (!this.phiOff() && this.phiChoice !== "send" && scanContent(titleInput(this.record), "title").length))) return;
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
        old = JSON.parse(readFileSync(this.lockPath(), "utf8")) ?? {};
      } catch {}
      if (typeof old !== "object") old = {};
      if (old.pid !== process.pid && lockAlive(old as unknown as OpenLock)) return;
      const mine = old.pid === process.pid;
      const tmp = `${this.lockPath()}.${process.pid}.tmp`;
      writeFileSync(tmp, JSON.stringify({ ...(mine ? old : {}), pid: process.pid, procStart: ownStart(), started: (mine && old.started) || new Date().toISOString(), ...extra }), { mode: 0o600 });
      renameSync(tmp, this.lockPath());
    } catch {}
  }

  private releaseLock(): void {
    try {
      if (JSON.parse(readFileSync(this.lockPath(), "utf8")).pid === process.pid) rmSync(this.lockPath());
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

  // After a crash, the last reply can have tool calls with no results in the history. The record still has the results of the calls that ended.
  private recordedResults(): Part[] {
    const last = this.history.at(-1);
    if (last?.role !== "assistant") return [];
    const ids = new Set(last.parts.flatMap((p) => (p.type === "tool_call" ? [p.id] : [])));
    const since = this.record.entries(["message", "compaction"]).at(-1)?.id ?? 0;
    return this.record.entries(["tool_result"]).filter((e) => e.id > since && ids.has(String(e.data.callId))).map((e) => {
      const d = e.data;
      const text = d.ok === false ? `ERROR: ${String(d.error ?? "the step failed")}` : [d.summary, d.text].filter(Boolean).map(String).join("\n");
      return { type: "tool_result", callId: String(d.callId), name: String(d.tool), text: `${text}\n[From the record after a restart.]`, isError: d.ok === false };
    });
  }

  private closeOpenCalls(done: Part[] = []) {
    const last = this.history[this.history.length - 1];
    if (last?.role !== "assistant") return;
    const calls = last.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
    const ran = (id: string) => done.find((p) => p?.type === "tool_result" && p.callId === id);
    if (calls.length)
      this.push({ role: "user", parts: calls.map((c) => ran(c.id) ?? { type: "tool_result", callId: c.id, name: c.name, text: "ERROR: not run. The turn stopped.", isError: true }) });
  }

  // A local model server gives no call ids, so its provider counts the calls that it sees in the context.
  // After a summary or a rewind the count can start again and reuse an id from the record.
  private callIds?: Set<string>;

  private uniqueCallIds(m: Message) {
    if (Array.isArray(m.raw)) return;
    const used = (this.callIds ??= new Set(this.record.entries(["message"]).flatMap((e) => (e.data.message as unknown as Message).parts.flatMap((p) => (p.type === "tool_call" ? [p.id] : [])))));
    for (const p of m.parts) {
      if (p.type !== "tool_call") continue;
      const base = p.id;
      for (let k = 2; used.has(p.id); k++) p.id = `${base}-${k}`;
      used.add(p.id);
    }
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

  // Two stages, before each step. Above ELIDE_AT of the window, old bulky tool output
  // is shortened in the live history only. Above SUMMARIZE_AT, the older messages are summarized.
  // The latest request and the recent messages stay as they are, also inside one long turn.
  private request?: Message;
  private summaryFailed = false;

  // After a context error, the real window of the model is smaller than the window that the provider reports, so the summary also shortens the recent messages.
  private async maybeCompact(signal: AbortSignal, force = false, tooLong = false): Promise<boolean> {
    const size = () => estimateTokens(this.history, this.system, this.activeSchemas());
    const win = tooLong ? Math.min(this.provider.info.contextWindow, Math.floor(size() * 0.8)) : this.provider.info.contextWindow;
    let shortened = false;
    if (!force && size() <= win * ELIDE_AT) return false;
    if (!force || tooLong) {
      const { messages, elided } = elideOld(this.history, win, force || tooLong || size() > win * SUMMARIZE_AT ? 1 : ELIDE_BATCH);
      if (elided) {
        shortened = tooLong;
        this.history = messages;
        this.record.append("notice", { text: `The harness shortened ${elided} older tool output(s) in the context. The record keeps the full output.`, elided });
      }
      if (!force && (this.summaryFailed || size() <= win * SUMMARIZE_AT)) return false;
    }
    let res: Awaited<ReturnType<typeof summarizeOld>>;
    try {
      res = await summarizeOld(this.history, this.provider, win, signal, this.request);
    } catch (e) {
      if (signal.aborted) throw e;
      this.summaryFailed = true;
      this.record.append("notice", { text: `The harness could not summarize the older messages: ${(e as Error).message} The turn continues with the full context.` });
      return shortened;
    }
    if (!res) return shortened;
    if (!res.summary.trim()) {
      this.summaryFailed = true;
      this.record.append("notice", { text: "The summary of the older messages was empty. The turn continues with the full context." });
      return shortened;
    }
    const facts = this.summaryFacts(res.request);
    const summary = summaryMessage(facts ? `${res.summary}\n${facts}` : res.summary);
    const upTo = this.record.entries(["message"]).at(-1)?.id ?? 0;
    const rest = [...(res.request ? [res.request] : []), ...res.kept];
    this.record.append("compaction", { summary: (summary.parts[0] as { text: string }).text, upTo, kept: rest as unknown as Record<string, unknown>[] });
    this.history = [summary, ...rest];
    this.phiFrom = this.history.length;
    this.contextWarned = false;
    return true;
  }

  // The summary gets the facts that the harness knows from the session, as the model wrote them or as they stand now.
  // A block that the kept request of the turn already holds is not written again.
  private summaryFacts(request?: Message): string {
    const sent = (request?.parts ?? []).flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");
    const plan = this.plan?.steps.length ? [planText(this.plan, { view: "compact" }), ...(this.plan.exclusions?.length ? [planText({ exclusions: this.plan.exclusions }, { view: "details" })] : [])].join("\n\n") : "";
    const blocks: [string, string][] = [
      ["Current plan", plan],
      ...(this.settings.guidance ? ([["Decisions", this.decisions.brief()], ...(this.mode === "watch" ? [] : [["Mode", MODE_NOTE[this.mode]]]), ...(this.pilotOn() ? [["Pilot", PILOT_NOTE]] : [])] as [string, string][]) : []),
      ["Folders", this.foldersText()],
    ];
    return blocks.filter(([head, body]) => body && (head === "Current plan" || !sent.includes(body))).map(([head, body]) => `## ${head}\n${body}`).join("\n");
  }

  // ------------------------------------------------------------- patient identifiers

  private phiOff(): string | undefined {
    if (!phiOn(this.settings.phi_check)) return "The patient identifier check is off (the phi_check setting).";
    if (folderHasNoPatientData(this.cwd)) return "The patient identifier check is off for this folder: you said that it has no patient data.";
    return undefined;
  }

  private maskFrom(from: number) {
    if (!this.masker.map.size) return;
    for (let i = from; i < this.history.length; i++) {
      const was = this.history[i]!;
      this.history[i] = this.masker.message(was);
      if (was === this.request) this.request = this.history[i];
    }
  }

  private localSpec(): string | undefined {
    const spec = this.settings.local_model?.trim();
    return spec && /^(ollama|openai):/.test(spec) ? spec : undefined;
  }

  private async budgetGate(signal: AbortSignal): Promise<boolean> {
    const b = isLocal(this.provider.info) ? undefined : budgetState();
    if (!b || b.ratio < BUDGET_WARN) {
      this.budgetAsked = false;
      return true;
    }
    if (this.budgetAsked || b.ratio >= 1) return true;
    this.budgetAsked = true;
    const used = `${dollars(b.spent)} of your ${dollars(b.budget)} limit is used this month.`;
    if (this.settings.headless || !this.interactive) {
      this.record.append("notice", { text: `${used} Claude requests stop at the limit.` });
      return true;
    }
    const cheaper = cheaperModel(this.provider.info.model);
    const options = [
      { value: "continue", label: "Continue with this model" },
      ...(cheaper ? [{ value: "cheaper", label: `Switch to ${modelName(cheaper)}, which costs less` }] : []),
      { value: "stop", label: "Stop now" },
    ];
    const q = await this.questions.ask({ decisionKey: "", title: "Spend limit nearly reached", text: `${used} Claude requests stop at the limit. What do you want to do?`, options, evidence: "" });
    this.bus.emit({ type: "question", question: q });
    this.waitedQids.add(q.qid);
    this.bus.emit({ type: "status", state: "waiting", tool: "spend limit" });
    let answer: unknown;
    try {
      answer = (await abortable(this.questions.wait(q.qid), signal)).answer;
    } catch {
      return false;
    }
    this.bus.emit({ type: "status", state: "thinking" });
    if (answer === "stop") {
      this.record.append("notice", { text: "Stopped at your choice, near the spend limit. Nothing more was sent." });
      return false;
    }
    if (answer === "cheaper" && cheaper) {
      const old = this.settings.model;
      await this.applySetting("model", `claude:${cheaper}`);
      this.record.append("setting", { name: "model", old, new: `claude:${cheaper}`, scope: "session", reason: "spend limit card" });
      this.record.append("notice", { text: `The model is now ${modelName(cheaper)}.` });
    }
    return true;
  }

  private planEstimate(plan: AnalysisPlan): string {
    const steps = plan.steps.filter((x) => x.status !== "skipped").length;
    const b = budgetState();
    return estimateText(this.provider.info.model, steps, isLocal(this.provider.info), b ? Math.max(0, b.budget - b.spent) : undefined);
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
      this.foldersSent = false;
      return false;
    }
    this.phiChoice = action;
    if (action === "mask") {
      this.masker.add(hits);
      this.maskFrom(from);
    }
    return true;
  }

  // The record keeps each possible patient identifier that the check found. Only the "send" choice lets a cloud model read the record.
  private phiHeld(): boolean {
    return !this.phiOff() && this.phiChoice !== "send" && this.record.entries(["phi"]).length > 0;
  }

  // The record also keeps results that never went to the model, for example the tool calls inside a script, so a cloud referee also needs a scan of the log.
  private refereeBlocked(): boolean {
    if (!this.refereeProvider || !isCloud(this.refereeProvider.info)) return false;
    return this.phiHeld() || (!this.phiOff() && this.phiChoice !== "send" && scanContent(logText(this.record.liveView()), "log").length > 0);
  }

  // The MCP client cannot show the patient data card, so the harness masks possible patient identifiers, as in a headless run.
  phiForClient(text: string, where: string): string {
    if (this.phiOff() || this.phiChoice === "send") return text;
    const hits = scanContent(text, where);
    if (!hits.length) return this.masker.text(text);
    this.masker.add(hits);
    this.record.append("phi", { action: "mask", by: "harness: the MCP client cannot show the card", model: "MCP client", count: hits.length, hits: groupHits(hits).slice(0, 20) as unknown as Record<string, unknown>[] });
    return `${this.masker.text(text)}\n\n[Cuvette masked ${hits.length === 1 ? "a possible patient identifier" : `${hits.length} possible patient identifiers`} in this result before it went to the MCP client. To send the values, the scientist sets phi_check to off or marks the folder as a folder with no patient data.]`;
  }

  // The helper agent of the task tool sends tool results to the same model, so they go through the same check.
  private phiForHelper(m: Message, all: Message[]): Message | string {
    if (this.phiOff() || !isCloud(this.provider.info)) return m;
    const hits = scanMessages([m], [...all, m]);
    if (hits.length && this.phiChoice !== "send" && this.phiChoice !== "mask") {
      this.record.append("phi", { action: "stop", by: "harness: the helper agent cannot show the card", model: this.provider.info.model, count: hits.length, hits: groupHits(hits).slice(0, 20) as unknown as Record<string, unknown>[] });
      return "The helper agent stopped: a tool result has possible patient identifiers. Nothing went to the model. Do this job yourself, so that the scientist sees the patient data card.";
    }
    if (hits.length && this.phiChoice === "mask") this.masker.add(hits);
    return this.masker.map.size ? this.masker.message(m) : m;
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

  private async useLocalModel(reason = "patient data card"): Promise<string | undefined> {
    const spec = this.localSpec();
    if (!spec) return "no local model is set (the local_model setting).";
    const old = this.settings.model;
    const before = { settings: this.settings, provider: this.provider, referee: this.refereeProvider, system: this.system, active: new Set(this.active), phiFrom: this.phiFrom };
    const restore = () => {
      Object.assign(this, { settings: before.settings, provider: before.provider, refereeProvider: before.referee, system: before.system, active: before.active, phiFrom: before.phiFrom });
    };
    try {
      await this.applySetting("model", spec);
    } catch (e) {
      restore();
      return (e as Error).message;
    }
    if (isCloud(this.provider.info)) {
      restore();
      return `${spec} does not run on this computer. Set OLLAMA_HOST or the server address to a local address.`;
    }
    this.record.append("setting", { name: "model", old, new: spec, scope: "session", reason });
    if (this.refereeProvider && isCloud(this.refereeProvider.info)) {
      this.refereeProvider = undefined;
      this.record.append("notice", { text: "The referee is off for this session: its model is a cloud model." });
    }
    return undefined;
  }

  // ------------------------------------------------------------- usage

  // The last token count holds only if it came from the current model and the history did not change since.
  contextTokens(): number {
    const last = this.record.entries(["usage", "compaction", "rewind"]).at(-1);
    if (last?.kind === "usage" && last.data.model === this.provider.info.model) return promptTokens(last.data);
    return estimateTokens(this.history, this.system, this.activeSchemas());
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

  private draft?: { answer: string; assumed: string; annotated: string; claims: ReturnType<typeof checkAnswer>; found: { f: FindingIn; source: Finding["source"] }[]; errors: number; measured: number; entry: number };

  private stoppedText(): string {
    return this.draft ? this.keepDraft("The turn stopped during the correction. The first answer stays, with the problems that the review found.") : "";
  }

  private keepDraft(note: string): string {
    const d = this.draft!;
    this.draft = undefined;
    this.record.append("notice", { text: note });
    this.lastAnswer = d.answer;
    this.assumptions = d.assumed;
    return d.annotated;
  }

  private presentation(answer: string, claims: ReturnType<typeof checkAnswer>) {
    const missing = this.resultsNotIn(answer);
    const settings = this.settingsUsed();
    const defs = this.approvedEntry ? definitionsOf(this.record) : [];
    const definitions = defs.length ? `Definitions, from the confirmed analysis:\n${defs.map((d) => `- ${d.measure}: ${d.definition}`).join("\n")}` : "";
    const tail = [missing, settings, definitions].filter(Boolean).join("\n\n");
    return { shown: tail ? `${answer}\n\n${tail}` : answer, annotated: annotate(answer, claims) + (tail ? `\n\n${tail}` : ""), settings, results: missing || undefined };
  }

  assumptions = "";

  private headlessSplit(text: string): { answer: string; block: string } {
    if (!this.settings.headless) return { answer: text, block: "" };
    const turnStart = this.lastRequest()?.id ?? 0;
    const assumed = this.record.entries(["answer"]).filter((e) => e.id > turnStart && e.data.by === "default" && !e.data.withdrawn).map((e) => `${this.questions.get(String(e.data.qid))?.title ?? String(e.data.qid)}: used ${typeof e.data.value === "string" ? e.data.value : JSON.stringify(e.data.value)}.`);
    const split = withoutWaits(text);
    return { answer: split.answer, block: assumptionBlock(assumed, split.open) };
  }

  private async finishAnswer(text: string, revised: boolean, signal: AbortSignal): Promise<{ text: string; revise?: string }> {
    if (!this.settings.guidance) {
      const split = this.headlessSplit(text);
      this.assumptions = split.block;
      this.record.append("assistant", { text: split.answer, final: true, ...(split.block ? { assumed: split.block } : {}) });
      this.markAnswerReady();
      this.lastAnswer = split.answer;
      return { text: split.answer };
    }
    const pre = await this.hooks.preAnswer({ event: "PreAnswer", session: this.id, answer: text });
    const { answer, block } = this.headlessSplit(pre.answer ?? text);
    this.noteSkippedSteps();
    const claims = checkAnswer(answer, this.record.liveView(), { log: false });
    const ctx = { record: this.record.liveView(), decisions: this.decisions, adapters: this.adapters, answer, claims, textStyle: this.settings.text_style ?? "ste" };
    const refereeCtx = block ? { ...ctx, answer: `${answer}\n\n[Text of the harness, not of the model. The harness wrote it from the answers that it chose.]\n${block}` } : ctx;
    const found: { f: FindingIn; source: Finding["source"] }[] = [...(pre.findings ?? []).map((f) => ({ f, source: "hook" as const }))];
    for (const f of await runChecks(ctx)) found.push({ f, source: "rule" });
    if (endsWithPromise(answer)) found.push({ f: { check: "answer_unfinished", severity: "warning", message: "The answer ends with a plan for more steps, not with a result. The agent stopped before it finished." }, source: "rule" });
    const correcting = this.draft;
    let first: { id: number; annotated: string } | undefined;
    if (!correcting) {
      const p = this.presentation(answer, claims);
      const entry = this.record.append("assistant", { text: p.shown, annotated: p.annotated, final: true, settings: p.settings, results: p.results, ...(block ? { assumed: block } : {}) });
      this.assumptions = block;
      this.lastAnswer = answer;
      this.markAnswerReady();
      logClaimCheck(this.record, claims, entry.id);
      first = { id: entry.id, annotated: p.annotated };
    }
    if (this.refereeBlocked() && !this.refereeOffNoted) {
      this.refereeOffNoted = true;
      this.record.append("notice", { text: "The referee did not run: it reads the record, and the record holds possible patient identifiers that did not go to a cloud model." });
    }
    const turnStart = this.realRequest()?.id ?? 0;
    const nothingToCheck = !claims.length && !this.record.nodes().some((n) => n.entry > turnStart && !n.sensitivityOf);
    let state: "done" | "stopped" | "failed" | "off" = "off";
    if (this.refereeProvider && !signal.aborted && !nothingToCheck && !this.refereeBlocked()) {
      this.bus.emit({ type: "status", state: "thinking", purpose: REVIEW_PURPOSE });
      try {
        for (const f of await referee(this.refereeProvider, refereeCtx, signal)) found.push({ f, source: "referee" });
        state = "done";
      } catch (e) {
        state = signal.aborted ? "stopped" : "failed";
        this.record.append("notice", { text: `The referee did not run: ${signal.aborted ? "the scientist stopped the turn." : (e as Error).message}` });
      }
      this.bus.emit({ type: "status", state: "thinking" });
    } else if (this.refereeProvider && signal.aborted) state = "stopped";
    const errors = found.filter((x) => x.f.severity === "error");
    const measured = (cs: typeof claims) => cs.filter((c) => c.label === "measured").length;
    if (correcting && errors.length >= correcting.errors && measured(claims) < correcting.measured) {
      return { text: this.keepDraft("The revision lost results and fixed no problem, so the harness kept the first answer.") };
    }
    this.draft = undefined;
    if (first && errors.length && !revised && this.settings.reviseOnFindings && !signal.aborted) {
      const firstFindings = found.map(({ f, source }) => this.findings.add(f, source).fid);
      this.appendReview(first.id, state, firstFindings, { corrected: true });
      this.draft = { answer, assumed: block, annotated: first.annotated, claims, found, errors: errors.length, measured: measured(claims), entry: first.id };
      this.record.append("notice", { text: `Review found ${errors.length} problem(s) in the answer above:\n${errors.map((x) => `- ${x.f.message}`).join("\n")}\nThe first answer stays. The agent revises the answer and marks the new one as the correction.` });
      return {
        text: "",
        revise: "[Review of your answer. The scientist has already read it.]\n" + errors.map((x) => `- ${x.f.message}`).join("\n") + "\nFix these problems. Then give the answer again. The scientist sees it as the correction.",
      };
    }
    const findings = found.map(({ f, source }) => this.findings.add(f, source).fid);
    let shown = first;
    if (!shown) {
      const p = this.presentation(answer, claims);
      const entry = this.record.append("assistant", { text: p.shown, annotated: p.annotated, final: true, corrects: correcting!.entry, settings: p.settings, results: p.results, ...(block ? { assumed: block } : {}) });
      this.assumptions = block;
      this.lastAnswer = answer;
      logClaimCheck(this.record, claims, entry.id);
      shown = { id: entry.id, annotated: p.annotated };
    }
    this.appendReview(shown.id, state, findings);
    this.offerChecklist();
    return { text: shown.annotated };
  }

  private offerChecklist(): void {
    const id = setGuideline(this.record);
    if (!id || this.record.entries(["notice"]).some((e) => e.data.checklist === "offer")) return;
    const turnStart = this.realRequest()?.id ?? 0;
    if (!this.record.nodes().some((n) => n.entry > turnStart && !n.sensitivityOf)) return;
    if (this.plan?.steps.some((s) => s.tool && s.status !== "done" && s.status !== "skipped")) return;
    this.record.append("notice", { text: offerText(buildChecklist(this.record, id)), checklist: "offer" });
  }

  async checklist(arg = ""): Promise<{ text: string; asked: number }> {
    const want = arg.trim().toLowerCase();
    if (want && !guidelineId(want)) throw new Error("Use: /checklist or /checklist arrive, consort, strobe or miqe.");
    if (want) this.decisions.change(REPORTING_KEY, want, { by: "human", reason: "set with /checklist" });
    const id = setGuideline(this.record);
    if (!id) {
      if (!this.questions.open().some((q) => q.title === GUIDELINE_QUESTION_TITLE)) {
        const guess = guessGuideline(this.record, this.adapters.map((a) => a.name));
        const q = await this.questions.ask({
          decisionKey: REPORTING_KEY,
          title: GUIDELINE_QUESTION_TITLE,
          text: guess ? `Which reporting guideline does the journal ask for? ${loadGuideline(guess.id).name} fits, because ${guess.why}.` : "Which reporting guideline does the journal ask for?",
          options: GUIDELINE_IDS.map((g) => ({ value: g, label: loadGuideline(g).name })),
          recommendation: guess ? { value: guess.id, reason: guess.why } : undefined,
          evidence: "",
        });
        this.bus.emit({ type: "question", question: q });
      }
      return { text: "Choose the reporting guideline in the question card. Then type /checklist again.", asked: 1 };
    }
    const list = buildChecklist(this.record, id);
    const open = new Set(this.questions.open().map((q) => q.title));
    let asked = 0;
    for (const item of list.items) {
      const title = itemTitle(list.guideline, item);
      if (item.status !== "missing" || !item.ask || open.has(title)) continue;
      const q = await this.questions.ask({ decisionKey: "", title, text: item.ask, options: [{ value: "not applicable", label: "Not applicable" }], evidence: "" });
      this.bus.emit({ type: "question", question: q });
      asked++;
    }
    const tail = asked ? `\n\n${asked} question ${asked === 1 ? "card asks" : "cards ask"} for items that are not in the record. Each answer goes into the record. Type /checklist again to see the result.` : "";
    return { text: checklistText(list) + tail, asked };
  }

  private resultsNotIn(answer: string): string {
    const turnStart = this.realRequest()?.id ?? 0;
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
  private callAborts = new Set<AbortController>();

  steer(text: string, now = false): void {
    text = this.withoutKeys(text);
    const last = this.record.entries(["tool_result"]).at(-1);
    this.steered.push({ text, typedAt: new Date().toISOString(), afterStep: stepNumbers(this.record.nodes()).size, afterTool: String(last?.data.tool ?? ""), now });
    if (now) for (const c of this.callAborts) c.abort();
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

  // A wait for an answer stops when the turn stops or when the scientist sends a message with "now". The card stays open, and a later answer comes to the agent as a note.
  // "Answer later" on a card also stops the wait. The card stays in /questions.
  private async waitFor(qid: string, signal?: AbortSignal): Promise<Question> {
    const calls = [...this.callAborts].map((c) => c.signal);
    const base = signal ?? (calls.length ? AbortSignal.any(calls) : this.abort?.signal);
    const later = new AbortController();
    if (this.laterQids.has(qid)) later.abort();
    const waits = this.laterWaits.get(qid) ?? new Set<AbortController>();
    waits.add(later);
    this.laterWaits.set(qid, waits);
    this.waitedQids.add(qid);
    try {
      return await abortable(this.questions.wait(qid), base ? AbortSignal.any([base, later.signal]) : later.signal);
    } catch (e) {
      if (waits.size === 1) this.waitedQids.delete(qid);
      throw e;
    } finally {
      waits.delete(later);
      if (!waits.size && this.laterWaits.get(qid) === waits) this.laterWaits.delete(qid);
    }
  }

  private laterQids = new Set<string>();
  private laterWaits = new Map<string, Set<AbortController>>();

  answerLater(qids: string[]): void {
    if (!this.busy) return;
    for (const qid of qids) {
      if (this.questions.get(qid)?.status !== "open") continue;
      this.laterQids.add(qid);
      for (const w of this.laterWaits.get(qid) ?? []) w.abort();
    }
  }

  private steerText(qid?: string): string {
    if (qid && this.laterQids.has(qid)) return " The scientist chose to answer it later. Continue with work that does not need the answer. The answer comes to you as a note.";
    return this.steered.some((m) => m.now) ? " The scientist sent a message instead. Read it first. The card stays open, and the answer comes to you as a note." : "";
  }

  // A card wait ends for one of three causes: the turn stopped, the scientist sent a message now, or the scientist chose "Answer later".
  private waitEnd(qid?: string): "stopped" | "later" | "now" {
    if (this.abort?.signal.aborted) return "stopped";
    if (qid && this.laterQids.has(qid)) return "later";
    return "now";
  }

  private cardSignal(): AbortSignal | undefined {
    const calls = [...this.callAborts].map((c) => c.signal);
    return calls.length ? AbortSignal.any(calls) : this.abort?.signal;
  }

  private lastRequest(): Entry | undefined {
    return this.record.entries(["user"]).filter((e) => !e.data.during).at(-1);
  }

  private async runCall(call: Extract<Part, { type: "tool_call" }>, outer: AbortSignal): Promise<Part> {
    const ctl = new AbortController();
    const stop = () => ctl.abort();
    outer.addEventListener("abort", stop, { once: true });
    this.callAborts.add(ctl);
    try {
      return await this.runOne(call, ctl.signal);
    } finally {
      outer.removeEventListener("abort", stop);
      this.callAborts.delete(ctl);
    }
  }

  private parallelSafe(call: Extract<Part, { type: "tool_call" }>): boolean {
    if (call.parseError || !PARALLEL_TOOLS.has(call.name)) return false;
    const tool = this.findTool(call.name);
    if (!tool?.readOnly || tool.source === "adapter") return false;
    const args = absolutePaths(dropNulls((call.args && typeof call.args === "object" ? call.args : {}) as Args, tool.inputSchema), this.cwd) as Args;
    return this.permitted(tool, args) === "allow";
  }

  // A deny rule or an ask rule wins over an earlier "always allow" and over the batch approval.
  private permitted(tool: Tool, args: Args): "allow" | "ask" | "deny" {
    const rule = this.permissions.check(tool, args);
    return rule !== "deny" && !(rule === "ask" && this.permissions.asks(tool, args)) && (this.sessionAllow.has(tool.name) || this.batchAllow.has(tool.name)) ? "allow" : rule;
  }

  private outcomes = new Map<string, CallOutcome>();
  private callSeq = 0;
  private callOrder = new Map<string, number>();
  private inspectionOrder = 0;

  private async runOne(call: Extract<Part, { type: "tool_call" }>, signal: AbortSignal): Promise<Part> {
    this.callOrder.set(call.id, ++this.callSeq);
    const tool = this.findTool(call.name);
    this.record.append("tool_call", { callId: call.id, tool: call.name, adapter: tool?.adapter, args: call.args as Record<string, unknown> });
    this.bus.emit({ type: "status", state: "running", tool: call.name, purpose: activity(call.name, (call.args ?? {}) as Args, tool?.source === "adapter" ? tool.title : undefined), since: Date.now() });
    if (call.parseError) return this.fail(call.id, call.name, `the arguments are not valid JSON: ${call.parseError}`);
    if (!tool) return this.fail(call.id, call.name, `no tool named ${call.name}. Use only these tools: ${this.activeSchemas().map((t) => t.name).join(", ")}.${this.active.has("find_tools") ? " To find more tools, call find_tools." : ""}`);
    this.useTools([tool.name]);
    const r = await this.pipeline(tool, this.callArgs(tool, call.args), call.id, signal);
    this.outcomes.set(call.id, { ok: !r.isError, key: r.output ? resultKey(r.output, this.workDir) : createHash("sha1").update(r.text).digest("hex") });
    if (r.images?.length && this.provider.info.vision) await scaleImages(r.images, signal);
    const earlier = tool.readOnly && !r.isError && !r.images?.length && r.text.length > 400 ? this.sameEarlierResult(call, r.text) : undefined;
    if (earlier) return { type: "tool_result", callId: call.id, name: call.name, text: pointerText(earlier) };
    return { type: "tool_result", callId: call.id, name: call.name, text: r.text, images: r.images, isError: r.isError };
  }

  private callArgs(tool: Tool, raw: unknown): Args {
    raw = refangDeep(raw);
    const args = coerceArgs(dropNulls((raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Args, tool.inputSchema), tool.inputSchema);
    if (!ownPurpose(tool)) delete args.purpose;
    return absolutePaths(args, this.cwd) as Args;
  }

  // A call from the MCP server or the helper agent gets the same argument checks as a call from the model: relative paths become absolute before the blind check.
  runTool(tool: Tool, raw: unknown, callId: string, signal: AbortSignal) {
    return this.pipeline(tool, this.callArgs(tool, raw), callId, signal);
  }

  // A read-only call that repeats an earlier call with the same output does not put the output in the context a second time.
  private sameEarlierResult(call: Extract<Part, { type: "tool_call" }>, text: string): string | undefined {
    const args = JSON.stringify(call.args ?? {});
    const ids = new Set(this.history.flatMap((m) => m.parts.flatMap((p) => (p.type === "tool_call" && p.id !== call.id && p.name === call.name && JSON.stringify(p.args ?? {}) === args ? [p.id] : []))));
    if (!ids.size) return undefined;
    for (const m of this.history) for (const p of m.parts) if (p.type === "tool_result" && ids.has(p.callId) && (p.text === text || p.text.startsWith(`${text}\n\nNote: `))) return p.callId;
    return undefined;
  }

  async pipeline(tool: Tool, args: Args, callId: string, signal: AbortSignal, depth = 0): Promise<{ text: string; images?: string[]; isError: boolean; output?: ToolOutput }> {
    const r = await this.runPipeline(tool, args, callId, signal, depth);
    const h = hideKeys(r.text);
    if (!h.found) return r;
    this.record.append("notice", { text: `Cuvette removed ${h.found === 1 ? "an API key" : `${h.found} API keys`} from the result of ${tool.name}. The key did not go to the model.` });
    return { ...r, text: h.text };
  }

  private async runPipeline(tool: Tool, args: Args, callId: string, signal: AbortSignal, depth: number): Promise<{ text: string; images?: string[]; isError: boolean; output?: ToolOutput }> {
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
    if (tool.source === "generic" || tool.name === "inspect_data") {
      const { place, path: refused } = this.pathPlace(args, tool.source !== "generic");
      if (place === "outside") return error("This path is outside the folders of this analysis. Ask the scientist where the data is, or use a path from the request.");
      if (place === "private" || place === "link") {
        this.record.append("blocked", { callId, tool: tool.name, path: refused, reason: pathRefusalReason(place, refused), by: "path rule" });
      }
      if (place === "private") return error("This path is in the Cuvette home folder or in the record of another session. The agent cannot read it. Ask the scientist to name the folder in the request.");
      if (place === "link") return error("This path is a link that leads outside the folders of this analysis. Ask the scientist to name the real folder in the request. A folder that the request names is allowed.");
    }
    const gate = this.pilotGate(tool, args);
    if (gate) {
      this.record.append("blocked", { callId, tool: tool.name, reason: gate, pilot: true, ...(pilotState(this.record).stale ? { stale: String(pilotState(this.record).stale) } : {}) });
      return error(gate);
    }
    if (this.planning && depth === 0 && tool.readOnly && tool.name !== "plan" && tool.name !== "clarify" && ++this.planLooks === 4) this.notes.push(this.clarified ? "You have looked at the data enough. Call plan now." : "You have looked at the data enough. Call clarify now.");
    if (this.planning && this.planUpdate && this.mode === "plan" && !tool.readOnly && depth === 0 && this.plan && this.plan.steps.some((x) => x.status !== "skipped" && !!x.tool && toolWords(x.tool).includes((tool.remoteName ?? tool.name).toLowerCase()))) {
      this.endPlanning();
      this.record.append("notice", { text: `${tool.remoteName ?? tool.name} is a step of the confirmed plan, so it runs with no plan update.` });
    }
    if ((this.mode === "plan" || this.mode === "teach") && !tool.readOnly)
      return error(this.planning ? "Plan first: no analysis step runs before the scientist approves the plan. Call plan now." : this.mode === "plan" ? "Plan mode: the agent plans and runs only read-only tools. Switch to watch mode to run steps." : "Teach mode: the scientist runs the steps and the agent runs only read-only tools.");
    const pre = await this.hooks.pre({ event: "PreToolUse", session: this.id, mode: this.mode, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args, readOnly: tool.readOnly } as never, signal);
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
    let perm = this.permitted(tool, eff);
    if (pre.decision === "ask" && perm === "allow") perm = "ask";
    if (perm === "deny") return error("the permission rules deny this tool");
    const searchRoot = tool.source !== "adapter" ? broadSearch(tool.name, eff, this.cwd) : undefined;
    if (searchRoot) {
      const res = await this.requestPermission(tool, eff, signal, undefined, { root: searchRoot, purpose: typeof eff.purpose === "string" ? eff.purpose : "" });
      if (res.cancelled) return error("not run. The turn stopped before the scientist answered the card.");
      if (!res.ok) return error(`the scientist did not allow a search of ${searchRoot}${res.note ? `: ${res.note}` : ""}. Do not search large folders. Use the absolute paths from earlier tool results, or ask the scientist where the files are.`);
    } else if (perm === "ask") {
      const outward = tool.name === "search_literature" ? `Sends this query to api.sciencemadereadable.com, an outside literature search: "${String(eff.query ?? "")}". It sends no data files.` : undefined;
      const res = await this.requestPermission(tool, eff, signal, outward);
      if (res.cancelled) return error("not run. The turn stopped before the scientist answered the card.");
      if (!res.ok) return error(`the scientist did not allow this${res.note ? `: ${res.note}` : ""}. Ask what they want instead.`);
    }
    pre.commit?.();
    if (pre.decision === "instruct") return this.followStep(tool, eff, callId, signal, pre.applied ?? {});
    const kept = (pre.deviations ?? []).filter((d) => d.overwritten);
    const many = kept.length > 1;
    const keptNote = kept.length
      ? `The harness used the recorded decision${many ? "s" : ""}: ${kept.map((d) => `${d.arg} = ${JSON.stringify(d.setup)} (you gave ${JSON.stringify(d.requested)})`).join("; ")}. This result is for the recorded ${many ? "values" : "value"}, not for the ${many ? "values" : "value"} you gave. Do not report it as the result for ${many ? "those values" : "that value"}. To see the result for ${many ? "other values" : "another value"}, call compare_options. To change the record, call propose_change. The scientist owns ${many ? "these values" : "this value"}.`
      : "";
    const out = await this.execute(tool, eff, callId, signal, { applied: pre.applied ?? {} });
    if (this.parentAbandoned(callId)) return error("the call was stopped");
    if (out.node) this.checkPlanned(tool);
    const post = await this.hooks.post({ event: "PostToolUse", session: this.id, tool: tool.remoteName ?? tool.name, adapter: tool.adapter, args: eff, output: out.output, node: out.node });
    for (const f of post.findings ?? []) this.findings.add(f, "hook");
    const r = this.render(tool, out.output);
    const inspected = tool.name === "inspect_data" ? { path: resolve(this.cwd, String(eff.path ?? ".")) } : undefined;
    const checked = depth === 0 && tool.readOnly && (tool.source !== "harness" || inspected) && out.output.ok ? await this.checkData(tool.remoteName ?? tool.name, inspected ?? eff, out.output) : "";
    const extra = [keptNote, post.additionalContext, checked].filter(Boolean).join("\n");
    return { text: extra ? `${r.text}\n\nNote: ${extra}` : r.text, images: r.images, isError: !out.output.ok, output: out.output };
  }

  abandonMs = 5000;
  private abandonedIds = new Set<string>();

  private parentAbandoned(callId: string): boolean {
    return [...this.abandonedIds].some((a) => callId.startsWith(`${a}.`));
  }

  private untilStopped<T>(run: Promise<T>, signal: AbortSignal, abandon: () => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let timer: NodeJS.Timeout | undefined;
      const onAbort = () => {
        timer = setTimeout(() => (abandon(), reject(new Error("the tool did not stop"))), this.abandonMs);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
      const done = () => (clearTimeout(timer), signal.removeEventListener("abort", onAbort));
      run.then((v) => (done(), resolve(v)), (e) => (done(), reject(e)));
    });
  }

  async execute(tool: Tool, args: Args, callId: string, signal: AbortSignal, meta: { applied?: Record<string, unknown>; sensitivityOf?: string }): Promise<{ output: ToolOutput; node?: string }> {
    const t0 = performance.now();
    let output: ToolOutput;
    let abandoned = false;
    try {
      output = await this.untilStopped(tool.execute(args, {
        session: this.id,
        callId,
        workDir: this.workDir,
        sessionDir: this.dir,
        signal,
        log: (kind, data) => (abandoned || this.parentAbandoned(callId) ? ({ id: 0, ts: "", session: this.id, kind, data } as Entry) : this.record.append(kind, data)),
        callTool: async (name, a) => {
          if (abandoned || this.parentAbandoned(callId)) return { ok: false, error: "the call was stopped" };
          const t = this.findTool(name);
          if (!t) return { ok: false, error: `no tool named ${name}` };
          const id = `${callId}.${++this.callCount}`;
          this.record.append("tool_call", { callId: id, tool: name, adapter: t.adapter, args: a, from: tool.name });
          const r = await this.pipeline(t, a, id, signal);
          return r.output ?? { ok: false, error: r.text };
        },
      }), signal, () => {
        abandoned = true;
        this.abandonedIds.add(callId);
        this.record.append("notice", { text: `The tool ${tool.name} did not stop ${this.abandonMs / 1000} s after you pressed Esc. Cuvette stopped waiting for it. It can still run in the background. Cuvette ignores its late result. If the next step of this program fails or waits, stop the program or start Cuvette again.`, warn: true });
        this.notes.push(`The tool ${tool.name} did not stop after the scientist pressed Esc. It can still run in the background and keep its program busy. Its late result is ignored. If the next call of this program fails or waits, tell the scientist.`);
      });
    } catch (e) {
      output = { ok: false, error: signal.aborted ? `interrupted: the scientist stopped this tool${abandoned ? `. The tool did not stop within ${this.abandonMs / 1000} s, so Cuvette stopped waiting for it` : ""}` : `${(e as Error).name}: ${(e as Error).message}` };
    }
    output = { ...output, ...(output.text === undefined ? {} : { text: cleanText(output.text) }), ...(output.summary === undefined ? {} : { summary: cleanText(output.summary) }), ...(output.error === undefined ? {} : { error: cleanText(output.error) }), ...(output.table === undefined ? {} : { table: cleanDeep(output.table) as ToolOutput["table"] }), ...(output.data === undefined ? {} : { data: cleanDeep(output.data) }), ...(output.metrics === undefined ? {} : { metrics: cleanDeep(output.metrics) as ToolOutput["metrics"] }) };
    if (this.parentAbandoned(callId)) return { output: { ok: false, error: "the call was stopped" } };
    const durationS = (performance.now() - t0) / 1000;
    const adapter = this.adapterOf(tool);
    const remote = tool.remoteName ?? tool.name;
    const entry = adapter?.mapEntry(remote, args);
    const mod = adapter ? await adapter.module() : {};
    const manualRoute = output.manualRoute ?? mod.manualRoute?.(remote, args) ?? entry?.route ?? "";
    const fidelity = output.fidelity ?? entry?.fidelity ?? (tool.source === "adapter" ? (manualRoute ? "close" : "none") : tool.source === "harness" ? undefined : "none");
    if ([...(output.outputs ?? []).map((o) => o.path), ...(output.images ?? [])].some(isSecretFile)) {
      output = { ...output, outputs: output.outputs?.filter((o) => !isSecretFile(o.path)), images: output.images?.filter((i) => !isSecretFile(i)) };
      this.record.append("notice", { text: `Cuvette did not keep a key or password file that the result of ${tool.name} named as an output.`, warn: true });
    }
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
        error: output.error === undefined ? undefined : hideKeys(output.error).text,
        summary: hideKeys(summary).text,
        text: hideKeys(output.text ?? "").text.slice(0, tool.name === "run_script" ? this.recordedTextLimit() : 4000),
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
      await this.starting;
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
        fidelity: fidelity ?? "none",
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

  private recordedTextLimit(): number {
    return this.provider.info.small ? Math.min(this.settings.maxResultChars, 6000) : this.settings.maxResultChars;
  }

  private render(tool: Tool, o: ToolOutput): { text: string; images?: string[] } {
    const adapter = this.adapterOf(tool);
    const cloud = isCloud(this.provider.info);
    const vis = cloud ? (adapter?.manifest.data_rules.cloud_visibility ?? "all") : "all";
    const small = this.provider.info.small;
    const limit = this.recordedTextLimit();
    if (o.text && !o.metrics && !o.table && !o.outputs?.length && vis === "all") {
      const reason = !o.ok && o.error && !o.text.includes(o.error) ? `ERROR: ${o.error}\n` : "";
      return { text: reason + (o.text.length > limit ? `${headText(o.text, limit)}\n[The harness cut ${o.text.length - limit} characters. Write long output to a file and read it in parts.]` : o.text) };
    }
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
      if (o.table && vis === "summaries") obj.note = "The harness does not send the rows of this table to a cloud model. Read the source file with read_file to see the data.";
    }
    if (o.manualRoute && !small) obj.manual_route = o.manualRoute;
    let text = small ? JSON.stringify(obj) : `{\n${Object.entries(obj).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n}`;
    if (text.length > limit) text = headText(text, limit) + `\n[cut ${text.length - limit} characters; read the files for the rest]`;
    const images = vis === "all" && this.provider.info.vision ? (o.outputs ?? []).filter((f) => f.kind === "image" && /\.(png|jpe?g)$/i.test(f.path)).map((f) => f.path).slice(0, 4) : [];
    return { text, images };
  }

  // ------------------------------------------------------------- decisions owned by the scientist

  private pathPlace(args: Args, onlyPrivate = false): { place: "ok" | "outside" | "link" | "private"; path: string } {
    const paths = ["path", "folder", "cwd"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && v.length > 0).map((v) => resolve(this.cwd, v.replace(/^~(?=[\\/]|$)/, homedir())));
    const ok = { place: "ok" as const, path: "" };
    if (!paths.length || paths.every(isCredentialsFile)) return ok;
    const named = this.record.entries(["user", "setup"]).flatMap((e) => stringsIn(e.data)).flatMap((t) => t.match(/(?:~|\/|[A-Za-z]:\\)[^\s"'`,;]+/g) ?? []).map((t) => resolve(this.cwd, t.replace(/^~(?=\/)/, process.env.HOME ?? "~").replace(/[.)\]]+$/, "")));
    const mine = [this.dir, this.workDir, this.place.outDir, ...this.adapters.map((a) => a.root)];
    const nodeFiles = this.record.nodes().flatMap((n) => n.outputs.map((o) => join(o.path, "..")));
    const within = (list: string[], p: string) => list.some((r) => {
      const rel = relative(r, p);
      return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
    });
    const home = [cuvetteHome(), realPath(cuvetteHome())];
    const private_ = home.flatMap((h) => [join(h, "sessions"), join(h, "projects")]);
    const indexed = (p: string) => home.some((h) => dirname(p) === h && basename(p).startsWith("sessions-index.json"));
    const ownRecord = realPath(this.dir).toLowerCase();
    const recordOf = (p: string) => {
      for (let at = p; dirname(at) !== at; at = dirname(at)) if (isRecordName(basename(at)) && realPath(at).toLowerCase() !== ownRecord && (existsSync(join(at, "log.jsonl")) || existsSync(join(at, "meta.json")))) return true;
      return false;
    };
    const hard = (p: string) => [p, realPath(p)].some((x) => within(private_, x) || indexed(x) || recordOf(x));
    const soft = (p: string) => [p, realPath(p)].some((x) => within(home, x));
    const asked = [...named.filter((n) => hard(n) || soft(n)), ...named.map((n) => join(n, "..")).filter((n) => soft(n) && !hard(n) && !home.includes(n))];
    const open = [...mine, ...nodeFiles, ...asked];
    const shut = (p: string) => {
      const free = (list: string[]) => within(list, p) && within(list, realPath(p));
      if (hard(p)) return !free(open);
      return soft(p) && !free([...open, this.cwd]);
    };
    const shutPath = paths.find(shut);
    if (shutPath !== undefined) return { place: "private", path: shutPath };
    if (onlyPrivate) return ok;
    const roots = [this.cwd, ...mine, ...named, ...named.map((n) => join(n, ".."))];
    roots.push(...nodeFiles);
    const outsidePath = paths.find((p) => !within(roots, p));
    if (outsidePath !== undefined) return { place: "outside", path: outsidePath };
    const real = roots.map(realPath);
    const linkPath = paths.find((p) => !within(real, realPath(p)));
    return linkPath === undefined ? ok : { place: "link", path: linkPath };
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
            try {
              await this.waitFor(q.qid, signal);
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
      const link = d?.links.find((l) => l.tool === (tool.remoteName ?? tool.name));
      const toolDefault = this.settings.headless && link ? (tool.inputSchema.properties as Record<string, { default?: unknown }> | undefined)?.[link.arg]?.default : undefined;
      const q = await this.questions.ask({
        decisionKey: key,
        title: d?.label ?? key,
        text: `${d?.help || `The agent needs a value for "${d?.label ?? key}".`} The agent wants to run ${tool.remoteName ?? tool.name}.`,
        options: d?.kind === "bool" && !d.choices.length ? [{ value: true, label: "yes" }, { value: false, label: "no" }] : (d?.choices ?? []).map((c) => ({ value: c, label: String(c) })),
        recommendation: hint ? { value: hint.value, reason: `The harness detected it from the files. ${hint.reason}` } : proposed !== undefined ? { value: proposed, reason: "The agent proposed this value in its tool call." } : d?.default !== undefined ? { value: d.default, reason: "This is the adapter default." } : toolDefault !== undefined ? { value: toolDefault, reason: `The tool uses this value if the call gives no ${link!.arg}. No one can answer in a headless run.` } : undefined,
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
      for (const qid of qids) await this.waitFor(qid, signal);
      return keys.every((k) => this.decisions.isSet(k));
    } catch {
      for (const qid of qids) if (!this.laterWaits.has(qid)) this.waitedQids.delete(qid);
      return false;
    }
  }

  private async askTool(spec: { question: string; options: string[]; recommendation?: string; reason?: string; wait: boolean }): Promise<ToolOutput> {
    const options = [...new Set(spec.options.map((o) => o.trim()).filter(Boolean))];
    if (!spec.question.trim()) return { ok: false, error: "The question is empty. Write the question for the scientist." };
    if (spec.question.length > ASK_MAX_QUESTION) return { ok: false, error: `The question has ${spec.question.length} characters. The limit is ${ASK_MAX_QUESTION}. Ask a shorter question.` };
    if (options.length > ASK_MAX_OPTIONS) return { ok: false, error: `You gave ${options.length} options. The limit is ${ASK_MAX_OPTIONS}. Group the options, or give no options so that the scientist types the answer.` };
    const long = options.find((o) => o.length > ASK_MAX_OPTION);
    if (long) return { ok: false, error: `An option has ${long.length} characters. The limit is ${ASK_MAX_OPTION}. Use short options and put the detail in the question.` };
    const q = await this.questions.ask({
      decisionKey: "",
      title: spec.question.length > 80 ? spec.question.slice(0, 77) + "..." : spec.question,
      text: spec.question,
      options: options.map((o) => ({ value: o, label: o })),
      recommendation: spec.recommendation ? { value: spec.recommendation, reason: spec.reason ?? "" } : undefined,
      evidence: "",
    });
    this.bus.emit({ type: "question", question: q });
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. Continue with other work.` };
    this.bus.emit({ type: "status", state: "waiting" });
    try {
      const done = await this.waitFor(q.qid);
      const last = this.record.entries(["answer"]).filter((e) => e.data.qid === q.qid).at(-1);
      const note = last?.data.note;
      if (last?.data.by === "default") return { ok: true, summary: `No answer was given; the harness used the default: ${String(done.answer)}${note ? ` (${note})` : ""}`, data: { answer: done.answer, note, by: "default" } };
      return { ok: true, summary: `The scientist answered: ${String(done.answer)}${note ? ` (${note})` : ""}`, data: { answer: done.answer, note } };
    } catch {
      return { ok: false, error: `Question ${q.qid} is still open. The scientist did not answer it yet.${this.steerText(q.qid)}` };
    }
  }

  private askedFor(f: { key: string; label: string; choices?: unknown[] }, value: unknown): boolean {
    if (this.scientistAsked === undefined || this.askedUsed.has(f.key)) return false;
    return namesValue(this.scientistAsked, f, value, this.decisions.fields());
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
    const typed = (() => {
      try {
        return this.decisions.validate(f.key, value);
      } catch {
        return value;
      }
    })();
    if (this.askedFor(f, typed)) {
      const asked = this.scientistAsked;
      this.askedUsed.add(f.key);
      this.decisions.change(f.key, value, { by: "human", reason: `the scientist asked: "${asked}"` });
      const t = this.pilotPlan ? settingsOf(this.pilotPlan.plan).find((x) => x.setting.key === f.key)?.setting : undefined;
      if (t) Object.assign(t, { value: this.decisions.value(f.key), by: "you" });
      return { ok: true, summary: `${f.label} is now ${JSON.stringify(this.decisions.value(f.key))}. The scientist asked for this change, so no card asks again.` };
    }
    const full = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
    const show = (v: unknown) => {
      const t = full(v);
      return t.length > 2000 ? `${cutText(t, 1000)} [${t.length - 1500} characters omitted of ${t.length}] ${t.slice(-500)}` : t;
    };
    const evidence = [value, current].some((v) => v !== undefined && full(v).length > 2000)
      ? [`Full new value (${full(value).length} characters):`, full(value), ...(current === undefined ? [] : [`Full current value (${full(current).length} characters):`, full(current)])].join("\n")
      : "";
    let q = this.questions.open().find((x) => x.decisionKey === f.key);
    if (!q) {
      q = await this.questions.ask({
        decisionKey: f.key,
        title: `Change ${f.label}?`,
        text: `The agent asks to change "${f.label}" from ${current === undefined ? "not set" : show(current)} to ${show(value)}. Your message did not name this value. Reason: ${spec.reason.trim().replace(/[.\s]+$/, "") || "the agent gave none"}.${current === undefined ? " To keep the setting as it is, answer later." : ""}`,
        options: [{ value, label: `Change to ${show(value)}` }, ...(current === undefined ? [] : [{ value: current, label: `Keep ${show(current)}` }])],
        evidence,
        ...(current === undefined ? {} : { default: current }),
      });
      this.bus.emit({ type: "question", question: q });
    }
    if ((!spec.wait && !this.settings.headless) || !this.settings.askWaits) return { ok: true, summary: `Question ${q.qid} is waiting for the scientist. The record changes only if the scientist agrees.` };
    this.bus.emit({ type: "status", state: "waiting" });
    try {
      await this.waitFor(q.qid);
      const now = this.decisions.value(f.key);
      return { ok: true, summary: `The scientist answered. The record now says ${JSON.stringify(now)} for ${f.label}.`, data: { key: f.key, value: now } };
    } catch {
      return { ok: false, error: `Question ${q.qid} is still open, so ${f.label} has not changed.${this.steerText(q.qid)}` };
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
    if ((this.mode === "plan" || this.mode === "teach") && !target.readOnly) return { ok: false, error: this.planning ? "Plan first: no analysis step runs before the scientist approves the plan. Comparison runs also wait." : `${this.mode === "plan" ? "Plan" : "Teach"} mode: the agent runs only read-only tools, so no comparison runs of ${last.tool}.` };
    const probe = { ...last.args, [link.arg]: values };
    const blind = blindCheck(target, probe);
    if (blind) return { ok: false, error: blind.message };
    const held = this.heldBack(probe);
    if (held) return { ok: false, error: `${basename(held)} is held back for the blind test. Do not read it.` };
    const signal = this.abort?.signal ?? new AbortController().signal;
    const perm = this.permitted(target, last.args);
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

  private async requestPermission(tool: Tool, args: Args, signal: AbortSignal, outward?: string, search?: { root: string; purpose: string }): Promise<{ ok: boolean; note: string; always: boolean; cancelled?: boolean }> {
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
    let res: { ok: boolean; note: string; always: boolean; cancelled?: boolean };
    try {
      res = await abortable(p, signal);
    } catch {
      res = { ok: false, note: "the turn stopped before an answer", always: false, cancelled: true };
    }
    this.permissionWaits.delete(rid);
    this.waiting.delete(rid);
    if (res.ok && res.always && !search) this.sessionAllow.add(tool.name);
    this.record.append("permission", { rid, tool: tool.name, decision: res.cancelled ? "cancelled" : res.ok ? "allowed" : "denied", by: res.cancelled ? "harness" : "scientist", note: res.note, always: res.always && !search, sha256, ...(search ? { search: search.root } : {}) });
    if (res.ok) this.bus.emit({ type: "status", state: "running", tool: tool.name, purpose: activity(tool.name, args, tool.source === "adapter" ? tool.title : undefined), since: Date.now() });
    return res;
  }

  respondPermission(rid: string, ok: boolean, note = "", always = false): void {
    this.permissionWaits.get(rid)?.resolve({ ok, note: this.withoutKeys(note), always });
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
        let late = false;
        state = (await this.untilStopped(stateTool.execute({}, { session: this.id, callId: `${callId}.state`, workDir: this.workDir, sessionDir: this.dir, signal, log: (k, d) => (late ? ({ id: 0, ts: "", session: this.id, kind: k, data: d } as Entry) : this.record.append(k, d)), callTool: async () => ({ ok: false }) }), signal, () => (late = true))).data;
      } catch {}
    }
    const cmp = compareNote(done.note, out.output.metrics ?? {});
    this.record.append("follow_step", { step, tool: remote, instruction: text, expected: out.output.metrics ?? {}, observed: { note: done.note, state }, match: cmp.match, checked: cmp.checked, differences: cmp.differences, status: "done" });
    const verdict = cmp.checked === 0 ? "The scientist gave no numbers to compare." : cmp.match ? "The scientist's numbers match the reference run." : `The numbers differ: ${cmp.differences.join("; ")}.`;
    return { text: `The scientist did step ${step} by hand. Their note: "${done.note}". ${verdict}\nReference run:\n${r.text}`, images: r.images, isError: !out.output.ok, output: out.output };
  }

  async followDone(step: number, note = "", agentDoes = false): Promise<void> {
    this.followWaits.get(step)?.resolve({ note: this.withoutKeys(note), agentDoes });
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
    for (const c of this.sideAborts) c.abort();
    for (const rt of this.runtimes) rt.cancel().catch(() => {});
  }

  private async checkTrust(interactive: boolean): Promise<void> {
    const t = trustStatus(this.cwd);
    if (t.scan.labProblem) {
      const text = `Cuvette could not read LAB.md in ${oneLine(t.scan.folder)}: ${oneLine(t.scan.labProblem)}. Cuvette ignores the file. Fix the file, then start the session again.`;
      if (!this.record.entries(["notice"]).some((n) => n.data.text === text)) this.record.append("notice", { text, warn: true });
    }
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
    const q = await this.questions.ask({ decisionKey: "", title: TRUST_TITLE, text: trustText(t), options: labLong(t.scan) || cannotTrust(t.scan) ? TRUST_OPTIONS.filter((o) => o.value === "no") : TRUST_OPTIONS, evidence: trustEvidence(t) });
    this.trustQid = q.qid;
    this.bus.emit({ type: "question", question: q });
    return q;
  }

  async setTrust(choice: TrustChoice): Promise<string> {
    const t = trustStatus(this.cwd);
    const refused = choice === "no" ? undefined : untrustable(t.scan) ?? (labLong(t.scan) ? longLabRefusal(t.scan) : undefined);
    if (refused) {
      this.record.append("notice", { text: refused, warn: true });
      return refused;
    }
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
    this.system = this.buildSystem();
    const project = projectSettings(this.cwd).reduce<Record<string, unknown>>((a, l) => Object.assign(a, l), {});
    const start = folderTrusted(this.cwd) ? (project.hooks as Settings["hooks"] | undefined)?.SessionStart : undefined;
    if (start?.length) {
      const runner = new HookRunner([], { SessionStart: start }, this.cwd);
      runner.onError = this.hooks.onError;
      await runner.event("SessionStart", { session: this.id });
    }
    const later = ["model", "referee", "mode", "effort", "promptCache", "show_thinking", "numCtx", "think", "defaultAdapters", "output_folder"].filter((k) => k in project && JSON.stringify(project[k]) !== JSON.stringify((before as Record<string, unknown>)[k]));
    const shadowed = this.adapters.filter((a) => { try { return findAdapter(a.name, this.cwd).root !== a.root; } catch { return false; } }).map((a) => a.name);
    const parts = [choice === "trust" ? "This folder is trusted. Its settings, hooks and adapters apply now." : "This folder is trusted for this session. Its settings, hooks and adapters apply now."];
    if (later.length) parts.push(`These folder settings apply in the next session: ${later.join(", ")}.`);
    if (shadowed.length) parts.push(`The session already uses the catalog version of ${shadowed.join(", ")}. Start a new session to use the folder version.`);
    const text = parts.join(" ");
    this.record.append("notice", { text });
    return text;
  }

  async answer(qid: string, value: unknown, note = "", by: "human" | "default" = "human"): Promise<void> {
    value = this.valueWithoutKeys(value);
    note = this.withoutKeys(note);
    if (qid === this.trustQid) {
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
    if (open?.tableFrom === "samples" && this.sheet && Array.isArray((value as { rows?: unknown })?.rows)) {
      const changes = sheetChanges(this.sheet.rows, gridRows((value as { rows: unknown[] }).rows));
      if (changes) value = { changes };
    }
    if (open?.decisionKey && open.status === "open") this.decisions.validate(open.decisionKey, this.questions.match(open, value));
    const q = this.questions.answer(qid, value, note, by);
    this.laterQids.delete(qid);
    if (q.decisionKey) this.decisions.change(q.decisionKey, q.answer, { by, reason: `answer to ${qid}` });
    if (waited) return;
    const quiet = isChecklistQuestion(q);
    this.notes.push(by === "default" ? `No answer was given to ${qid} (${q.title}); the harness used the default: ${String(q.answer)}${note ? ` - ${note}` : ""}.` : `The scientist answered ${qid} (${q.title}): ${String(q.answer)}${note ? ` - ${note}` : ""}.`);
    if (!quiet && !this.busy && this.settings.autoResume && this.history.length) void this.send("Continue the analysis with this answer.", { internal: true }).catch(() => {});
  }

  async changeAnswer(qid: string, value: unknown, note = ""): Promise<string[]> {
    value = this.valueWithoutKeys(value);
    note = this.withoutKeys(note);
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
    const provider = ["model", "effort", "promptCache", "show_thinking"].includes(name) ? await makeProvider(next.model, { effort: next.effort, numCtx: next.numCtx, think: next.think, cache: next.promptCache, showThinking: thinkingShown(next) }) : this.provider;
    const referee = ["model", "referee", "effort"].includes(name) || (name === "show_thinking" && next.referee === "same")
      ? next.referee === "same"
        ? provider
        : next.referee && next.referee !== "none"
          ? await makeProvider(next.referee, { effort: next.effort })
          : undefined
      : this.refereeProvider;
    const wasCloud = isCloud(this.provider.info);
    const wasDeferred = this.deferred();
    this.settings = next;
    this.provider = provider;
    this.refereeProvider = referee;
    if (isCloud(provider.info) && !wasCloud) this.phiFrom = 0;
    if (wasDeferred && !this.deferred()) {
      this.active.clear();
      this.chooseActiveTools();
    }
    if (name === "export_xlsx" || name === "figure_formats") this.dirs();
    if (["model", "export_xlsx", "figure_formats", "text_style"].includes(name)) this.system = this.buildSystem();
  }

  setMode(mode: Mode): void {
    if (this.planning && this.mode === "plan" && mode !== "plan") {
      if (mode === this.modeBefore) return;
      this.modeBefore = mode;
      this.record.append("notice", { text: `No step runs before you confirm the proposed analysis. After that, the mode is ${mode}.` });
      return;
    }
    if (mode === this.mode) return;
    this.record.append("mode", { old: this.mode, new: mode });
    this.mode = mode;
    this.notes.push(MODE_NOTE[mode]);
  }

  // ------------------------------------------------------------- analysis plan

  private realRequest(): Entry | undefined {
    return this.record.entries(["user"]).filter((e) => !e.data.during && !e.data.internal && !CONTINUE.test(String(e.data.text ?? "").trim())).at(-1);
  }

  private inHistory(text: string): boolean {
    const head = text.slice(0, 80);
    return this.history.some((m) => m.role === "user" && m.parts.some((p) => p.type === "text" && p.text.includes(head)));
  }

  // same: a "continue" or an answer that resumes the turn plans the same request again. The answers to its questions stay.
  private startPlanning(request: string, same = false) {
    if (!same) {
      for (const qid of this.clarifyLeft) this.questions.withdraw(qid, "A new request replaced this question.");
      this.clarifyLeft.clear();
    }
    const since = this.realRequest()?.id ?? 0;
    const answered = same && this.tools.has("clarify") && this.record.entries(["clarify"]).some((e) => e.id > since && e.data.action === "answered");
    this.planning = true;
    this.pilotStage = false;
    this.pilotPlan = undefined;
    this.scientistAsked = undefined;
    this.askedUsed.clear();
    this.planUpdate = this.approvedEntry > 0 && !!this.plan;
    this.planLooks = 0;
    if (!answered) this.inspection = undefined;
    if (!answered || !this.planStart) this.planStart = this.record.entries().at(-1)?.id ?? 0;
    this.toolsHinted = false;
    this.clarified = !this.tools.has("clarify") || answered;
    this.modeBefore = this.mode;
    this.refCandidates = this.findReferenceFiles(request);
    if (this.mode !== "plan") {
      this.record.append("mode", { old: this.mode, new: "plan", reason: "plan first" });
      this.mode = "plan";
    }
    if (this.planUpdate) this.notes.push(PLAN_UPDATE_NOTE);
    else if (!this.inHistory(PLAN_NOTE)) this.notes.push(`${PLAN_NOTE} ${DATA_CHECK_NOTE}`);
    else this.notes.push(answered ? "Plan first, as in the earlier note: no analysis step runs before the scientist confirms the proposed analysis. The scientist answered the questions above. Call plan now with the proposed metrics." : `Plan first, in the two phases of the earlier note: inspect_data, then clarify, then plan. No analysis step runs before the scientist confirms the proposed analysis.${same ? "" : " This is a new request."}`);
    const once = (text: string) => (same && this.inHistory(text)) || this.notes.push(text);
    if (!this.planUpdate && this.method) once(methodNote(this.method));
    if (!this.planUpdate && this.pick && !this.adapters.length) once("No adapter is loaded yet. Call list_adapters, then name the adapter for each part in programs, with its exact name. When the scientist confirms the plan, call use_adapter for it. The confirmation covers that load, so no second card shows.");
    if (!this.planUpdate && this.refCandidates.length)
      once(`Files in the project folder that may be earlier results on the same data: ${this.refCandidates.map(describeCandidate).join("; ")}. If one fits, name it in the reference section, state each measure in the reference's own terms, and ask in reference.question whether your measure is the same as the reference's measure.`);
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

  // A pilot that waits for its confirmation also waits for the approval of its plan. Without this, a resumed pilot confirms with no plan behind it.
  private restorePilot() {
    const plans = this.record.live(["plan"]);
    const asked = plans.filter((e) => e.data.action === "pilot_requested").at(-1);
    if (!asked) return;
    const after = (e: Entry) => e.id > asked.id;
    if (this.record.live(["plan_approved"]).some(after) || plans.some((e) => after(e) && ["cancelled", "proposed", "update_proposed"].includes(String(e.data.action)))) return;
    if (this.record.live(["mode"]).some((e) => after(e) && e.data.reason === "plan first")) return;
    const withPlan = [...plans.filter((e) => ["proposed", "update_proposed", "setting_changed", "pilot_changed", "updated", "status"].includes(String(e.data.action))), ...this.record.live(["plan_approved"])];
    const last = withPlan.filter((e) => e.data.plan).sort((x, y) => x.id - y.id).at(-1);
    if (!last) return;
    const version = Number(last.data.version) || Number(asked.data.version) || this.planVersion;
    const target = (asked.data.target as Mode | undefined) ?? (this.mode === "plan" ? "watch" : this.mode);
    this.pilotPlan = { plan: structuredClone(last.data.plan as unknown as AnalysisPlan), version, target, answers: (asked.data.answers as string[] | undefined) ?? [] };
    this.pilotStage = true;
    this.addPilotTools();
    this.notes.push(`The pilot on ${String(asked.data.sample)} still waits for the scientist. The proposed analysis is confirmed with the pilot. Run the method on the pilot sample, then call pilot_result.`);
  }

  // A clarify that a crash cut off has no turn that waits for its answers. A new plan asks again, so its questions close.
  private closeUnfinishedClarify() {
    const all = this.record.live(["clarify"]);
    const asked = all.filter((e) => e.data.action === "asked").at(-1);
    if (!asked || all.some((e) => e.id > asked.id && e.data.action !== "asked")) return;
    const reason = "The session stopped before the answers.";
    for (const e of this.record.entries(["question"]).filter((x) => x.id > asked.id)) this.questions.withdraw(String(e.data.qid), reason);
    this.record.append("clarify", { action: "stopped", phase: "Questions", found: asked.data.found, reason, answers: [] });
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
    if (this.settings.headless || !this.interactive || process.platform !== "darwin" || process.env.VITEST || process.env.CUVETTE_NO_OPEN === "1" || this.settings.openImages === "off") return;
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
      return await abortable(wait, this.cardSignal());
    } catch {
      return undefined;
    } finally {
      this.planWait = undefined;
      this.waiting.delete("plan");
    }
  }

  private noteDeviation(change: PlanChange, source: string, reason: string): void {
    const e = recordDeviation(this.record, change, source, reason);
    if (e) this.askMissingReason(e);
  }

  private askMissingReason(e: Entry): void {
    if (e.data.reason || !this.interactive || this.settings.headless) return;
    const d = e.data;
    void this.askDeviationReason(e.id, `${String(d.what)}${d.to !== undefined ? ` (${String(d.from ?? "none")} to ${String(d.to)})` : ""}`);
  }

  private async askDeviationReason(id: number, what: string): Promise<void> {
    const q = await this.questions.ask({
      decisionKey: "",
      title: "Why did the plan change?",
      text: `The confirmed plan changed: ${what}. The report lists each change with its reason. Type a short reason.`,
      options: [{ value: NO_REASON, label: NO_REASON }],
      recommendation: undefined,
      evidence: "",
    });
    this.bus.emit({ type: "question", question: q });
    const done = await this.questions.wait(q.qid);
    if (done.status === "answered" && typeof done.answer === "string" && done.answer !== NO_REASON) setDeviationReason(this.record, id, done.answer);
  }

  private changeDefinition(d: { measure: string; old: string; new: string }) {
    this.record.append("decision", { key: `definition:${d.measure}`, old: d.old, new: d.new, by: "human", reason: "the scientist changed the definition" });
  }

  // With no pending plan, a change on the pilot card goes into a new pending plan. The approved plan stays as it is until the scientist confirms the pilot.
  private pendingFromApproved(sample: string, reason: string) {
    if (!this.plan || !this.approvedEntry) return undefined;
    const target: Mode = this.mode === "plan" ? "watch" : this.mode;
    this.pilotPlan = { plan: structuredClone(this.plan), version: this.planVersion, target, answers: [] };
    this.pilotStage = true;
    this.replanReason = reason;
    this.record.append("plan", { action: "pilot_requested", phase: "Demonstration on a sample", version: this.planVersion, sample, target, answers: [], reason });
    return this.pilotPlan;
  }

  // The pending plan is the one that the pilot confirmation approves, so a definition change on the pilot card goes into it.
  private redefineOnPilot(plan: AnalysisPlan, d: { measure: string; new: string }) {
    const defs = (plan.definitions ??= []);
    const at = defs.find((x) => x.measure.toLowerCase() === d.measure.toLowerCase());
    if (at) at.definition = d.new;
    else defs.push({ measure: d.measure, definition: d.new });
    this.planVersion++;
    if (this.pilotPlan) this.pilotPlan.version = this.planVersion;
    const reason = `the scientist changed the definition of ${d.measure} on the pilot card`;
    this.record.append("plan", { action: "pilot_changed", phase: "Demonstration on a sample", version: this.planVersion, reason, text: planText(plan), plan: structuredClone(plan) });
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
    const before = this.plan;
    this.plan = structuredClone(plan);
    this.approvedEntry = this.record.append("plan_approved", { phase: "Confirmed", version, text, plan: structuredClone(plan), mode: target, update: this.planUpdate, answers, ...(pilot ? { pilot } : {}) }).id;
    if (!frozenPlan(this.record)) freezePlan(this.record, plan, version, this.approvedEntry);
    else if (before) for (const c of planChanges(before, plan, { settings: false })) this.noteDeviation(c, "replan", this.replanReason);
    this.replanReason = "";
    this.planWarned.clear();
    return this.approvedEntry;
  }

  private async pilotResult(a: Args): Promise<ToolOutput> {
    if (this.planning && !this.pilotStage) return { ok: false, error: "The scientist has not confirmed the proposed analysis yet. Call plan first. The pilot runs after the confirmation." };
    this.scientistAsked = undefined;
    const sample = String(a.sample ?? "").trim();
    if (!sample) return { ok: false, error: "Give the pilot sample." };
    const values: Record<string, number> = {};
    for (const [k, v] of Object.entries((a.values ?? {}) as Record<string, unknown>)) if ((typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v))) values[k] = Number(v);
    if (!Object.keys(values).length) return { ok: false, error: "Give the numbers for the pilot sample in values, one for each measure, for example {\"positive cells\": 296}." };
    const plan = this.pilotPlan?.plan ?? this.plan;
    const definitions = plan?.definitions ?? [];
    const figs = this.figuresDir();
    const image = /\.(png|jpe?g|gif|webp|svg|tiff?)$/i;
    const paths = [...new Set(Array.isArray(a.images) ? a.images.map((p) => resolve(this.cwd, String(p))) : [])];
    const realImage = (p: string) => {
      try {
        return image.test(realpathSync(p)) && statSync(p).isFile();
      } catch {
        return false;
      }
    };
    const images = paths.filter((p) => image.test(p) && realImage(p) && !isCredentialsFile(p)).map((p) => {
      if (statSync(p).size > COPY_LIMIT_BYTES) return p;
      const base = basename(p);
      const dot = base.lastIndexOf(".");
      const name = `pilot-${norm(sample).slice(0, 40) || "sample"}-${dot > 80 ? base.slice(0, 80) + base.slice(dot) : base}`;
      let to = join(figs, name);
      if (resolve(p) === to) return to;
      const at = name.lastIndexOf(".");
      for (let i = 2; existsSync(to); i++) to = join(figs, `${name.slice(0, at)}-${i}${name.slice(at)}`);
      try {
        copyFileSync(p, to);
        return to;
      } catch {
        return p;
      }
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
    if (!r) {
      const now = this.waitEnd() === "now";
      this.record.append("pilot_rejected", { run: entry, sample, reason: now ? "the scientist sent a message instead of an answer" : "the turn stopped before an answer" });
      if (now) return { ok: false, error: `The scientist sent a message instead of answering the pilot on ${sample}. Read it first. To show the same pilot again, call pilot_result again with the same values and images. Do not run the method again for that.` };
      return { ok: false, error: "the scientist stopped the turn before answering the pilot" };
    }
    if (r.action === "confirm") {
      const pilot = { entry, ...run } as PilotRun;
      this.record.append("pilot_approved", { run: entry, sample });
      this.pilotStage = false;
      if (pending) {
        this.approvePlan(pending.plan, pending.version, pending.target, pending.answers, pilot);
        this.pilotPlan = undefined;
      }
      const next = this.reference ? " After all samples ran, call batch_results with the value of each sample, so that the harness compares them with the reference." : "";
      const confirmed = `The scientist confirmed the ${pending ? "plan and the " : ""}pilot on ${sample}.`;
      const batch = await this.offerBatch(entry, confirmed, next);
      if (batch) return batch;
      return { ok: true, summary: `${confirmed} Run all samples now with the same method and settings.${next}` };
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
      if (!settingsOf(shownPlan)[r.index]) return { ok: false, error: "no such setting" };
      const p = pending ?? this.pendingFromApproved(sample, "the scientist changed a setting on the pilot card")!;
      const t = settingsOf(p.plan)[r.index]!.setting;
      const old = t.value;
      t.value = typeof old === "number" && typeof r.value === "string" && Number.isFinite(Number(r.value)) ? Number(r.value) : r.value;
      t.by = "you";
      p.version = ++this.planVersion;
      this.record.append("plan", { action: "setting_changed", phase: "Demonstration on a sample", version: this.planVersion, label: t.label, key: t.key, old: old ?? null, new: t.value, text: planText(p.plan), plan: structuredClone(p.plan) });
      this.commitSettings(p.plan);
      this.record.append("pilot_rejected", { run: entry, sample, reason: `${t.label} changed to ${String(t.value)}` });
      return { ok: true, summary: `The scientist changed ${t.label} from ${String(old)} to ${String(t.value)}. Run the demonstration again on ${sample} with this value, then call pilot_result.` };
    }
    if (r.action === "change") {
      if (r.definition) {
        this.changeDefinition(r.definition);
        const p = pending ?? this.pendingFromApproved(sample, `the scientist changed the definition of ${r.definition.measure} on the pilot card`);
        if (p) this.redefineOnPilot(p.plan, r.definition);
      }
      this.record.append("pilot_rejected", { run: entry, sample, reason: r.text });
      this.scientistAsked = r.text;
      this.askedUsed.clear();
      return { ok: true, summary: `The scientist asks for a change: "${r.text}". Change the metrics or the method, run the demonstration on ${sample} again, then call pilot_result. If the change is a setting with a key, call propose_change. If the request names the setting, the harness applies it at once, with no second card, because the scientist asked for it. For another setting, the scientist answers a card. ${r.definition ? `The harness already put the new definition of ${r.definition.measure} in the proposed analysis.` : "If a definition changes, call plan with the new definition and the reason."}` };
    }
    return { ok: false, error: "unknown answer" };
  }

  // The batch runner: after the pilot, the harness repeats the pilot steps on each other sample,
  // with the same settings and no model call. See docs/design-2026-10-11-separate-contexts.md.
  private async offerBatch(pilotEntry: number, confirmed: string, next: string): Promise<ToolOutput | undefined> {
    if (this.settings.headless) return undefined;
    const marks = this.record.entries(["pilot_rejected", "pilot_approved", "plan_approved"]).filter((e) => e.id < pilotEntry);
    const out = this.outputDir;
    const skip = [out, this.workDir, ...(basename(dirname(out)) === "cuvette" ? [dirname(out)] : [])];
    const plan = planBatch(this.record.nodes(), marks.at(-1)?.id ?? 0, pilotEntry, this.cwd, skip);
    if (!plan) return undefined;
    const names = plan.steps.map((n) => this.findTool(n.tool)?.title ?? n.tool.replace(/_/g, " "));
    const n = plan.samples.length;
    const RUN_STOP = "Run all, then stop";
    const RUN_SUM = "Run all, then the agent summarizes";
    const r = await this.askTool({
      question: `Run the confirmed steps (${names.join(", then ")}) with the same settings on the other ${n} ${n === 1 ? "sample" : "samples"} now? The harness runs them without a model, so the run costs no tokens. First samples: ${plan.samples.slice(0, 3).map((x) => x.label).join("; ")}${n > 3 ? "; ..." : ""}.`,
      options: [RUN_STOP, RUN_SUM, "Not now"],
      recommendation: RUN_STOP,
      reason: "The steps and settings are the ones you confirmed in the pilot. No model runs in the loop.",
      wait: true,
    });
    const answer = String((r.data as { answer?: unknown } | undefined)?.answer ?? "");
    if (!r.ok || !answer.startsWith("Run all")) return undefined;
    const rows = await this.runBatch(plan, names);
    const done = rows.filter((x) => x.ok).length;
    const failed = rows.filter((x) => !x.ok);
    const table = join(out, "batch-results.csv");
    mkdirSync(out, { recursive: true });
    writeTable(table, rows);
    const head = `The harness ran the pilot steps on ${rows.length} of ${n} samples: ${done} done, ${failed.length} with an error.${failed.length ? ` Errors: ${failed.slice(0, 5).map((x) => `${x.sample} (${x.error})`).join("; ")}${failed.length > 5 ? "; ..." : ""}.` : ""} Table: ${table}.`;
    this.record.append("note", { text: head, batch: { samples: n, done, failed: failed.length, table } });
    if (answer === RUN_SUM) return { ok: true, summary: `${confirmed} ${head} Do not run these samples again. Read the table, then make the summary that the plan asks for.${next}` };
    this.endTurn = `${head} Ask the agent for a summary when you want one.`;
    return { ok: true, summary: `${confirmed} ${head} The scientist asked to stop after the batch.` };
  }

  private async runBatch(plan: BatchPlan, names: string[]): Promise<BatchRow[]> {
    const signal = this.abort?.signal ?? new AbortController().signal;
    const rows: BatchRow[] = [];
    for (const n of plan.steps) this.batchAllow.add(this.findTool(n.tool)?.name ?? n.tool);
    try {
      for (const [i, s] of plan.samples.entries()) {
        if (signal.aborted) break;
        const map = new Map(s.files);
        const values: Record<string, number> = {};
        let error: string | undefined;
        for (const [k, step] of plan.steps.entries()) {
          const before = this.record.nodes().length;
          const args = { ...swapArgs(step.args, map, this.cwd), purpose: `${names[k]}: ${s.label}` };
          const res = await this.runOne({ type: "tool_call", id: `batch_${i + 1}_${k + 1}`, name: step.tool, args }, signal);
          const node = this.record.nodes().slice(before).find((x) => x.tool === step.tool && !x.sensitivityOf);
          if (res.type !== "tool_result" || res.isError || !node) {
            error = (res.type === "tool_result" ? res.text : "no result").replace(/^ERROR:\s*/, "").split("\n")[0]!.slice(0, 200);
            break;
          }
          step.outputs.forEach((o, j) => {
            const made = node.outputs[j]?.path;
            if (made) map.set(abs(o.path, this.cwd), abs(made, this.cwd));
          });
          for (const [key, v] of Object.entries(metricsOf(node.result))) values[`${step.tool}.${key}`] = v;
        }
        rows.push({ sample: s.label, ok: !error, error, values });
      }
    } finally {
      this.batchAllow.clear();
    }
    return rows;
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

  // A plan that the scientist confirms runs its steps, so plan mode becomes watch mode. A plan that ends with no confirmation goes back to the mode before it.
  private runMode(): Mode {
    return this.modeBefore === "plan" ? "watch" : this.modeBefore;
  }

  private endPlanning(target?: Mode) {
    this.planning = false;
    const to = target ?? this.modeBefore;
    if (this.mode === to) return;
    this.record.append("mode", { old: this.mode, new: to, reason: target ? "plan approved" : "plan ended" });
    this.mode = to;
  }

  private lastDecisionBy(key: string): string | undefined {
    return this.record.entries(["decision"]).filter((e) => e.data.key === key).at(-1)?.data.by as string | undefined;
  }

  private whoSet(key: string): string {
    const last = this.record.entries(["setup", "decision"]).filter((e) => (e.kind === "decision" ? e.data.key === key : key in ((e.data.values as object) ?? {}))).at(-1);
    if (!last) return "default";
    const how = String(last.kind === "decision" ? last.data.reason ?? "" : last.data.how ?? "");
    if (how.startsWith("from the method ") && !((last.data.defaultsAccepted as string[] | undefined) ?? []).includes(key)) return how.slice(9);
    if (last.kind === "decision") return last.data.by === "agent" ? "agent" : last.data.by === "default" ? "default" : String(last.data.reason ?? "").startsWith("set in the confirmed analysis") ? String(last.data.reason).replace(/^.*\((.*)\)$/, "$1") : "you";
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
          d.by = answered.data.by === "default" ? "default" : "you";
        } else if (d.by === "you") continue;
        else if (f && f.set && this.decisions.hasValue(f.key) && (d.value === undefined || this.whoSet(f.key) !== "default" || this.lastDecisionBy(f.key) === "default" || f.owner === "fixed")) {
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
        a ??= applyOverlay(findAdapter(name, this.cwd, { byName: true }));
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
        this.decisions.change(f.key, d.value, { by: f.owner === "agent" || (this.settings.headless && !(f.key in this.setupPreset && JSON.stringify(this.setupPreset[f.key]) === JSON.stringify(d.value))) ? "agent" : "human", reason: `set in the confirmed analysis (${d.by ?? "agent"})` });
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
    if (!this.planning && this.pilotPlan) {
      const p = this.pilotPlan;
      const next = mergePlan(p.plan, given);
      matchSettings(next, this.knownDecisions(next));
      this.fillDecisions(next);
      const open = openDecisions(next);
      if (open.length) return { ok: false, error: `Open settings: ${open.map((x) => x.decision.label).join("; ")}. Fill in every setting with a value and say who set it (default, from your answer, or agent). The pilot runs with these values.` };
      this.commitSettings(next);
      for (const d of given.definitions ?? []) {
        const old = p.plan.definitions?.find((x) => x.measure.toLowerCase() === d.measure.toLowerCase());
        if (old?.definition !== d.definition) this.record.append("decision", { key: `definition:${d.measure}`, old: old?.definition ?? null, new: d.definition, by: "agent", reason: reason || "the agent changed the definition" });
      }
      p.plan = next;
      p.version = ++this.planVersion;
      this.record.append("plan", { action: "pilot_changed", phase: "Demonstration on a sample", version: p.version, reason, text: planText(next), plan: structuredClone(next) });
      return { ok: true, summary: `The proposed analysis is now version ${p.version}. The scientist sees it on the pilot card and confirms it with the pilot. Run the demonstration on ${next.pilot?.sample ?? "the pilot sample"} again, then call pilot_result.` };
    }
    if (!this.planning) {
      if (!this.plan || !this.approvedEntry) {
        const draft = { steps: [], ...readPlan(a) } as AnalysisPlan;
        this.record.append("note", { text: `Plan:\n${planText(draft)}`, plan: draft.steps.map((x) => ({ step: x.step, status: x.status, ...(x.tool ? { tool: x.tool } : {}), ...(x.method ? { method: x.method } : {}) })), by: "agent" });
        return { ok: true, summary: `Plan with ${draft.steps.length} steps.` };
      }
      const prev = this.plan;
      const next = mergePlan(prev, given);
      const added = addedSteps(prev, next);
      const skipped = next.steps.filter((x) => x.status === "skipped" && prev.steps.find((p) => p.step.toLowerCase() === x.step.toLowerCase())?.status !== "skipped");
      const sections = (["restatement", "question", "definitions", "exclusions", "pilot", "reference", "data", "programs", "outputs", "checks", "out_of_scope"] as const).some((k) => given[k] !== undefined);
      const diffs = planChanges(prev, next);
      const changed = added.length > 0 || skipped.length > 0 || sections || diffs.length > 0;
      if (changed && !reason && (![...added, ...skipped].every((x) => x.reason) || diffs.some((c) => c.kind !== "step"))) return { ok: false, error: "Give the reason for this change of the approved plan in reason. The scientist sees it." };
      const ran = this.record.nodes().filter((n) => n.entry > this.approvedEntry && !n.sensitivityOf).map((n) => n.tool);
      for (const x of added) if (x.status === "todo" && ran.some((t) => matchStep({ steps: [x] }, t, this.findTool(t)?.adapter) === 0)) x.status = "done";
      for (const d of given.definitions ?? []) {
        const old = prev.definitions?.find((x) => x.measure.toLowerCase() === d.measure.toLowerCase());
        if (old?.definition !== d.definition) this.record.append("decision", { key: `definition:${d.measure}`, old: old?.definition ?? null, new: d.definition, by: "agent", reason: reason || "the agent changed the definition" });
      }
      this.plan = next;
      if (changed) this.planVersion++;
      for (const c of diffs) this.noteDeviation(c, "plan_update", reason || [...added, ...skipped].map((x) => x.reason).join(" "));
      this.record.append("plan", { action: changed ? "updated" : "status", version: this.planVersion, reason: reason || [...added, ...skipped].map((x) => x.reason).join(" "), text: planText(next), plan: structuredClone(next) });
      for (const x of skipped) this.record.append("notice", { text: `Skipped from the approved plan: ${x.step}. Reason: ${x.reason || reason}`, plan: "skipped" });
      for (const x of added) this.record.append("notice", { text: `Added to the approved plan: ${x.step}. Reason: ${x.reason || reason}`, plan: "added" });
      return { ok: true, summary: changed ? `The plan is now version ${this.planVersion}. The scientist sees the change and the reason.` : "Plan status saved." };
    }
    if (!this.planUpdate && !this.clarified) return { ok: false, error: "Phase 1 first: call clarify with what you found in the data and your clarifying questions about meaning (or none). Then call plan with the proposed analysis." };
    if (this.planUpdate && reason) this.replanReason = reason;
    if (!(this.planUpdate && this.plan) && a.steps === undefined) return { ok: false, error: "missing required arguments: steps" };
    const plan = this.planUpdate && this.plan ? mergePlan(this.plan, given) : ({ steps: [], ...readPlan(a) } as AnalysisPlan);
    if (this.method && !this.planUpdate) fillFromMethod(plan, this.method);
    if (plan.restatement) {
      const g = goalOnly(plan.restatement);
      plan.restatement = g.text;
      if (g.dropped.length) this.notes.push(`The restatement holds only the scientific goal. The harness took out: ${g.dropped.join(" ")} Answer such setup points briefly in your message.`);
    }
    const known = this.knownDecisions(plan);
    const m = matchSettings(plan, known);
    const stepTools = new Set(plan.steps.flatMap((x) => toolWords(x.tool ?? "")));
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
        mode: this.runMode(),
        restatement: plan.restatement,
        definitions: plan.definitions,
        pilot: plan.pilot?.sample,
        estimate: this.planEstimate(plan) || undefined,
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
    if (!r) {
      const now = this.waitEnd() === "now";
      this.record.append("plan", { action: "stopped", version, ...(now ? { reason: "the scientist sent a message instead of an answer" } : {}) });
      if (now) return { ok: false, error: `The scientist sent a message instead of answering the proposed analysis (version ${version}). Read it first. Then call plan again, changed if the message asks for a change. No step runs before the scientist confirms.` };
      return { ok: false, error: "the scientist stopped the turn before answering the proposed analysis" };
    }
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
    const target: Mode = r.mode && r.mode !== "plan" ? r.mode : this.runMode();
    const answers = [...this.planQids.values(), ...settingsOf(plan).map((x) => x.setting)].filter((d, i, all) => d.by === "you" && all.indexOf(d) === i).map((d) => `${d.label} = ${String(d.value)}`);
    this.setReference(r.reference);
    const refNote = this.reference ? (this.reference.mode === "blind" ? ` The reference ${basename(this.reference.path)} is held back for a blind test. Do not try to read it.` : ` The pilot compares with the reference ${basename(this.reference.path)}.`) : "";
    const methodPilot = !!this.method && !this.planUpdate && r.action === "approve" && !!plan.pilot;
    if (methodPilot) this.record.append("notice", { text: `The method ${this.method!.name} requires the demonstration on a sample before the batch. Demonstration sample: ${plan.pilot!.sample.replace(/[.\s]+$/, "")}.` });
    if ((r.action === "pilot" || methodPilot) && plan.pilot) {
      this.pilotPlan = { plan: structuredClone(plan), version, target, answers };
      this.pilotStage = true;
      this.record.append("plan", { action: "pilot_requested", phase: "Demonstration on a sample", version, sample: plan.pilot.sample, target, answers });
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
      execute: async (a, ctx) => this.inspectPath(resolve(this.cwd, String(a.path ?? ".").replace(/^~(?=[\\/]|$)/, homedir())), ctx.signal, this.callOrder.get(ctx.callId)),
    };
  }

  // Calls in one reply can run together. The inspection of the call that the agent made last stays, not the one that ends last.
  private async inspectPath(path: string, signal?: AbortSignal, order = ++this.callSeq): Promise<ToolOutput> {
    if (isCredentialsFile(path)) return { ok: false, error: `${path} holds the saved API keys. The agent cannot read it.` };
    const insp = await inspectData(path, join(this.workDir, "inspect"), signal);
    if (!insp.ok) return { ok: false, error: insp.error ?? "The inspection failed." };
    if (order >= this.inspectionOrder) {
      this.inspection = insp;
      this.inspectionOrder = order;
    }
    this.record.append("inspection", { path, kind: insp.kind, summary: insp.summary, colors: insp.colors, kinds: insp.kinds, groups: (insp.groups ?? []).map((g) => g.name), columns: (insp.columns ?? []).map((c) => c.name) });
    const { previews, ok: _ok, summary: _summary, error: _error, ...rest } = insp;
    const json = JSON.stringify(rest);
    const outputs = previews.map((p) => outputFile(p));
    return json.length <= 8000 ? { ok: true, summary: insp.summary, data: rest, text: json, outputs } : { ok: true, summary: insp.summary, text: json.slice(0, 8000), outputs };
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
    if (!this.inspection) {
      const looked = this.record.entries(["data_check"]).filter((e) => e.id > this.planStart).at(-1)?.data.source;
      if (looked && existsSync(String(looked))) await this.inspectPath(String(looked), this.abort?.signal);
    }
    const looked = this.record.entries(["data_check", "inspection"]).some((e) => e.id > this.planStart);
    if (!this.inspection && !looked) return { ok: false, error: "Look at the data first: call inspect_data on the data folder or file of the request (or . for the project folder). Then call clarify, with questions that fit what you found." };
    let found = String(a.found ?? "").trim();
    const wrong = this.inspection ? absentStains(found, this.inspection) : [];
    if (this.inspection && (!found || wrong.length)) {
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
    let cut: "stopped" | "now" | undefined;
    const take = async (q: Asked): Promise<boolean> => {
      const ans = await this.waitAnswer(q.qid);
      if (!ans) {
        const why = this.waitEnd(q.qid);
        if (why !== "later") return ((cut = why), false);
        this.clarifyLeft.add(q.qid);
        if (q.item) checkAnswers.push(`${q.item.text} Answer: none yet (the scientist answers later).`);
        return true;
      }
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
    const last = (qid: string) => this.record.entries(["answer"]).filter((e) => e.data.qid === qid && !e.data.withdrawn).at(-1);
    const answerLines = () => qs.filter((q) => !q.item).map((q) => (last(q.qid) ? `${q.question} -> ${String(last(q.qid)!.data.value ?? "")}${last(q.qid)!.data.note ? ` (${String(last(q.qid)!.data.note)})` : ""}` : `${q.question} -> ${CLARIFY_SKIP}`));
    const stopped = () => {
      const why = cut ?? this.waitEnd();
      const reason = why === "now" ? "The scientist sent a message instead of an answer." : "The turn stopped before an answer.";
      for (const q of qs) this.questions.withdraw(q.qid, reason);
      this.record.append("clarify", { action: "stopped", phase: "Questions", found, reason, answers: answerLines().filter((x) => !x.endsWith(CLARIFY_SKIP)) });
      if (why !== "now") return { ok: false, error: "the scientist stopped the turn before answering the questions" };
      this.clarified = true;
      const got = answerLines().filter((x) => !x.endsWith(CLARIFY_SKIP));
      return { ok: false, error: `The scientist sent a message instead of answering the questions. Read it first. ${got.length ? `Answers so far: ${got.join("; ")}. ` : ""}The other questions are closed. If one still matters after the message, call clarify again with only that question. Otherwise call plan.` };
    };
    for (const q of [...qs]) if (!(await take(q))) return stopped();
    answers.splice(0, answers.length, ...answerLines());
    if (!stops.length && this.sheet) {
      if (!(await this.askSheet(qs, emit))) return stopped();
      n ??= this.decisions.isSet("replicate") ? String(this.decisions.value("replicate")) : undefined;
      const issues = designChecks(this.sheet.rows, { n });
      this.record.append("samples", { action: "design_checks", n: n ?? null, issues });
      notes.push(...issues.filter((x) => x.level === "warn").map((x) => x.text));
      const before = qs.length;
      for (const i of issues.filter((x) => x.level === "ask")) await askItem(i, true);
      const more = qs.slice(before);
      if (more.length || notes.length) show(more);
      for (const q of more) if (!(await take(q))) return stopped();
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
    if (this.questions.open().some((q) => q.qid === qid)) this.bus.emit({ type: "status", state: "waiting" });
    try {
      await this.waitFor(qid);
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

  private compareWithMethod(now: DataSummary): CheckItem[] {
    if (!this.method) return [];
    if (!this.method.inputs?.length) {
      if (!this.noCompareNoted) this.record.append("notice", { text: `The method ${this.method.name} has no stored summary of its data. Cuvette cannot compare the new data with the old data. The next save of a method stores the summary.` });
      this.noCompareNoted = true;
      return [];
    }
    const before = matchSummary(this.method.inputs, now);
    if (!before) return [];
    const found = compareChecks(before, now);
    this.record.append("data_compare", { method: this.method.name, source: now.source, before: before.source, differences: found });
    return found.slice(0, 8).map((d) => ({
      id: `${METHOD_DATA_CHECK}:${now.source}:${d.id}`,
      check: METHOD_DATA_CHECK,
      level: "ask" as const,
      column: d.column,
      text: d.text,
      question: `${d.text} The method ${this.method!.name} used the old data. Continue with the new data, or stop?`,
      options: [{ value: "continue", label: "Continue. The new data is correct" }, { value: "stop", label: "Stop. I check the data" }],
      recommendation: d.kind === "unit" ? "stop" : "continue",
    }));
  }

  private async checkData(name: string, args: Args, output: ToolOutput): Promise<string> {
    const given = ["path", "folder", "input", "dir", "directory", "input_dir", "data_dir"].map((k) => args[k]).filter((v): v is string => typeof v === "string" && isAbsolute(v));
    const own = (p: string) => [this.dir, this.outputDir, cuvetteHome()].some((d) => p === d || p.startsWith(`${d}/`));
    const found: { path: string; label: string; kind: "table" | "files" }[] = [];
    const saved = /^(read|load|import|open)/.test(name) ? (output.table?.path ?? output.outputs?.find((o) => o.kind === "table")?.path) : undefined;
    if (saved && existsTable(saved)) found.push({ path: saved, label: given[0] ?? saved, kind: "table" });
    for (const g of given) {
      if (own(g) || !existsSync(g)) continue;
      if (statSync(g).isDirectory()) found.push({ path: g, label: g, kind: "files" });
      else if (!found.length && existsTable(g)) found.push({ path: g, label: g, kind: "table" });
    }
    const out: string[] = [];
    for (const p of [saved, ...given]) {
      if (!p || own(p) || this.checked.has(p) || !/\.(csv|tsv)$/i.test(p) || !existsSync(p) || !statSync(p).isFile() || existsTable(p)) continue;
      this.checked.add(p);
      out.push(`Data check by the harness: ${basename(p)} is larger than 20 MB. The harness did not check it for missing values, copies, mixed columns or extreme values.`);
    }
    for (const f of found) {
      if (this.checked.has(f.label)) continue;
      this.checked.add(f.label);
      let check: DataCheck;
      let sheet: SampleSheet | undefined;
      let summaryOf: DataSummary | undefined;
      try {
        if (f.kind === "files") {
          const rels = listDataFiles(f.path, 5000, 5, [outputRoot(this.cwd, this.settings.output_folder), dirname(this.outputDir), this.outputDir, this.workDir]);
          if (rels.length < 2) continue;
          check = checkFiles(await fileInfos(f.path, rels), f.path);
          const inside = (p: string) => {
            const r = relative(this.cwd, p);
            return (r && !r.startsWith("..") && !isAbsolute(r) ? r : p).split(sep).join("/");
          };
          if (!this.sheet) {
            const { files, tables } = sampleFiles(rels);
            if (files.length >= 2) sheet = sheetFromFiles(files.map((r) => inside(join(f.path, r))), f.path);
            for (const t of files.length >= 2 ? [] : tables.filter((r) => /\.(csv|tsv)$/i.test(r))) {
              const p = join(f.path, t);
              sheet = existsTable(p) ? sheetFromTable(readCsvTable(p), p) : undefined;
              if (sheet) break;
            }
          }
        } else {
          const t = readCsvTable(f.path);
          if (!t.rows.length) continue;
          check = checkTable(t, f.label);
          summaryOf = summarizeTable(t, f.label);
          if (!this.sheet) sheet = sheetFromTable(t, f.label);
        }
      } catch {
        continue;
      }
      const summary = f.kind === "table" ? summaryOf : undefined;
      if (summary) check.items.push(...this.compareWithMethod(summary));
      const text = dataCheckText(check);
      this.record.append("data_check", { source: f.label, kind: check.kind, size: check.size, items: check.items, groups: check.groups ?? null, units: check.units ?? [], text, summary: summary ?? null });
      out.push(`Data check by the harness (code, not a model):\n${text}`);
      if (check.items.some((i) => i.level === "ask")) out.push(this.planning ? "The harness asks the scientist about each problem under Problems found in the data in the Questions stage. Do not ask about them again." : "Ask the scientist about each problem under Problems found in the data before a step uses the data.");
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
    const logged = action === "drafted" ? undefined : replaySheet(this.record.live(["samples"]));
    const changes = logged && sheetChanges(logged, rows);
    this.sheet = { ...this.sheet, rows };
    const path = join(this.outputDir, "samples.csv");
    try {
      writeSheet(path, rows);
    } catch (e) {
      this.record.append("notice", { text: `The harness could not save ${path}: ${(e as Error).message}` });
    }
    this.record.append("samples", { action, source: this.sheet.source, from: this.sheet.from, path, ...(changes ? { changes, count: rows.length } : { rows }), said });
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
      table: sheetGrid(s.rows),
      tableFrom: "samples",
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
      if (!ans && this.waitEnd(q.qid) === "later") {
        this.questions.withdraw(q.qid, "The scientist chose to answer later. The sample sheet stays as it is.");
        this.sheetAnswer("accept");
        return true;
      }
      if (!ans) return false;
      const r = this.sheetAnswer(ans.value);
      if (r.done) return true;
      msg = r.said;
    }
  }

  private sheetAnswer(value: unknown): { done: boolean; said: string } {
    const v = value as { rows?: unknown; changes?: unknown };
    if (v && typeof v === "object" && (Array.isArray(v.rows) || Array.isArray(v.changes))) {
      const rows = Array.isArray(v.changes) ? applyChanges(this.sheet!.rows, v.changes as SheetChange[]) : gridRows(v.rows as unknown[]);
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
        const missing = (e as NodeJS.ErrnoException).code === "ENOENT";
        return { done: false, said: missing ? `The file ${join(this.outputDir, "samples.csv")} is not there. Type /samples to see the sheet. Change one cell to write the file again.` : `Could not read samples.csv: ${(e as Error).message}` };
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
    const i = matchStep(this.plan, name, tool.adapter);
    if (i >= 0) {
      if (this.plan.steps[i]!.status !== "skipped") this.plan.steps[i]!.status = "done";
      return;
    }
    if (tool.readOnly || this.planWarned.has(name)) return;
    this.planWarned.add(name);
    this.record.append("notice", { text: `Not in the approved plan: ${name}. Reason: ${lastSentence(this.lastSaid) || "the agent gave none yet."}`, plan: "deviation", tool: name });
    this.notes.push(`${name} is not in the approved plan. Call plan now to add it as a step, with the reason.`);
  }

  private noteSkippedSteps() {
    if (!this.plan || this.planning || !this.approvedEntry) return;
    const turnStart = this.realRequest()?.id ?? 0;
    if (this.approvedEntry < turnStart) return;
    for (const x of this.plan.steps) {
      if (!x.tool || x.status === "done" || x.status === "skipped" || this.planWarned.has(`skip:${x.step}`)) continue;
      this.planWarned.add(`skip:${x.step}`);
      this.record.append("notice", { text: `Not done from the approved plan: ${x.step}. Reason: none given.`, plan: "skipped" });
      recordDeviation(this.record, { kind: "step", what: `Not done: ${x.step}`, from: x.status ?? "todo" }, "not_done");
    }
  }

  startMethod(ref: string): Method {
    if (this.record.live(["user"]).some((e) => !e.data.internal)) throw new Error(`This session has a request already. Start a new session with the method: cuvette --method ${ref.length > 60 ? `${ref.slice(0, 59)}…` : ref} <folder>`);
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
    if (!x || !y) {
      const miss = !x ? a : b;
      throw new Error(`No branch named ${miss.length > 40 ? `${miss.slice(0, 39)}…` : miss}. Type /branches to see the list.`);
    }
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
    const asked = new Set(this.record.entries(["question"]).filter((e) => e.id > point.upTo).map((e) => String(e.data.qid)));
    this.scientistAsked = undefined;
    this.askedUsed.clear();
    this.record.append("rewind", { upTo: point.upTo, entry: point.entry, kind: point.kind, point: point.label, nodes });
    for (const q of this.questions.open()) if (asked.has(q.qid)) this.questions.withdraw(q.qid, "The scientist rewound the conversation to a point before this question.");
    const decisions = this.decisions.restoreTo(point.upTo, `rewind to ${point.label}`);
    const modeThen = this.record.entries(["mode"]).filter((e) => e.id <= point.upTo).at(-1)?.data.new ?? this.record.entries(["session"])[0]?.data.mode ?? this.mode;
    if (modeThen !== this.mode && modeThen !== "plan") {
      this.record.append("mode", { old: this.mode, new: modeThen, reason: "rewind" });
      this.mode = modeThen as Mode;
    }
    this.history = this.record.messages();
    this.phiFrom = 0;
    this.summaryFailed = false;
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
    if (this.refereeProvider && !this.refereeBlocked()) for (const f of await referee(this.refereeProvider, ctx)) out.push(this.findings.add(f, "referee"));
    return out;
  }

  async compact(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    const ctl = this.sideAbort();
    try {
      if (!(await this.phiGate(ctl.signal))) return false;
      return await this.maybeCompact(ctl.signal, true);
    } finally {
      this.sideAborts.delete(ctl);
      this.busy = false;
    }
  }

  // Work outside a turn (/compact, the ELN push card) also stops on Esc.
  private sideAborts = new Set<AbortController>();
  private sideAbort(): AbortController {
    const ctl = new AbortController();
    this.sideAborts.add(ctl);
    return ctl;
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
      case "script": return ex.exportScript(this.record, a, join(out, "replay.mts"));
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
      default:
        throw new Error(`No export format ${String(fmt)}. Use html, md, jsonl, pdf, protocol, script, notebook, flow, eln or xlsx.`);
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
    if (!cfg) throw new Error("eLabFTW has no saved address or key. Run `cuvette eln setup` or /eln setup.");
    const { elabftw } = await import("../eln/elabftw.ts");
    const sync = await import("../eln/sync.ts");
    const plan = sync.planPush(this, cfg.url);
    const phi = this.record.entries(["phi"]).length;
    if (phi) plan.display.patient_identifiers = `The patient identifier check found possible identifiers ${phi === 1 ? "one time" : `${phi} times`} in this session. The session log and the trail can hold them.`;
    const tool: Tool = { name: "eln_push", title: "Send to eLabFTW", description: "Send this session to the eLabFTW notebook.", inputSchema: {}, source: "harness", execute: async () => ({ ok: true }) };
    const ctl = this.sideAbort();
    const res = await this.requestPermission(tool, plan.display, ctl.signal, `Sends the listed data to ${plan.server}. It leaves this computer.`).finally(() => this.sideAborts.delete(ctl));
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
    if (!cfg) throw new Error("eLabFTW has no saved address or key. Run `cuvette eln setup` or /eln setup.");
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
    await this.starting.catch(() => {});
    this.releaseLock();
    await Promise.all(this.runtimes.map((r) => r.close().catch(() => {})));
  }
}

const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
const ESCAPES = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]{0,200}(?:\x07|\x1b\\)?|\x1b[@-Z\\-_]/g;

// Terminal escape codes and control characters in a tool result can change the screen of the scientist and fill the context of the model.
export function cleanText(value: unknown): string {
  const text = String(value);
  if (!CONTROL.test(text)) return text;
  const head = text.slice(0, 8000);
  if (head.includes("\0") || (head.match(/\ufffd/g)?.length ?? 0) > head.length / 10) return `[binary output, ${text.length} characters. The harness did not send it to the model.]`;
  return text.replace(ESCAPES, "").replace(new RegExp(CONTROL.source, "g"), "");
}

function cleanDeep(v: unknown): unknown {
  if (typeof v === "string") return cleanText(v);
  if (Array.isArray(v)) return v.map(cleanDeep);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanDeep(x)]));
  return v;
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

// Small models often give a number, a true or false, or a list as a string. The value changes only if the schema has no string type for it.
export function coerceArgs(args: Args, schema: Record<string, unknown>): Args {
  const props = (schema.properties ?? {}) as Record<string, { type?: unknown }>;
  for (const [k, v] of Object.entries(args)) {
    const t = props[k]?.type;
    const types = (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string");
    if (typeof v !== "string" || !types.length || types.includes("string")) continue;
    const s = v.trim();
    if ((types.includes("number") || (types.includes("integer") && /^-?\d+$/.test(s))) && s !== "" && Number.isFinite(Number(s))) args[k] = Number(s);
    else if (types.includes("boolean") && /^(true|false)$/i.test(s)) args[k] = s.toLowerCase() === "true";
    else if ((types.includes("array") || types.includes("object")) && /^[[{]/.test(s)) {
      try {
        const p = JSON.parse(s);
        if (types.includes(Array.isArray(p) ? "array" : "object")) args[k] = p;
      } catch {}
    }
  }
  return args;
}

interface CallOutcome {
  ok: boolean;
  key: string;
}

function realPath(p: string): string {
  let at = p;
  const rest: string[] = [];
  for (;;) {
    try {
      return join(realpathSync.native(at), ...rest);
    } catch {
      const up = dirname(at);
      if (up === at) return p;
      rest.unshift(basename(at));
      at = up;
    }
  }
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

const MAX_STOP_BLOCKS = 8;
const ASK_MAX_QUESTION = 2000;
const ASK_MAX_OPTIONS = 12;
const ASK_MAX_OPTION = 200;

const PARALLEL_TOOLS = new Set(["read_file", "list_dir", "inspect_data", "load_skill", "find_tools", "search_literature"]);

function countWord(n: number): string {
  return ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][n] ?? String(n);
}
