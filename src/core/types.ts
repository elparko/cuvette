// Shared types. This file is the contract between modules. Change it only through the lead.

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type Args = Record<string, unknown>;

// ---------------------------------------------------------------- record

export type EntryKind =
  | "session" | "setup" | "user" | "message" | "assistant" | "thinking"
  | "tool_call" | "tool_result" | "node" | "stale" | "environment" | "rerun"
  | "decision" | "owner_change" | "deviation" | "blocked" | "permission" | "permission_mode"
  | "question" | "answer" | "sensitivity"
  | "finding" | "finding_resolution" | "claim_check"
  | "mode" | "follow_step" | "lab_memory" | "plan" | "plan_approved" | "clarify"
  | "pilot_run" | "pilot_approved" | "pilot_rejected" | "reference" | "validation"
  | "data_check" | "samples" | "eln_push" | "eln_link" | "setting" | "note" | "notice" | "error" | "usage" | "compaction" | "correction" | "adapter" | "title" | "program" | "trust" | "self_test"
  | "rewind" | "fork" | "branch" | "method" | "phi" | "inspection" | "plan_frozen" | "plan_deviation" | "data_compare";

export interface Entry {
  id: number;
  ts: string;
  session: string;
  kind: EntryKind;
  refs?: number[];
  node?: string;
  data: Record<string, unknown>;
}

export type Fidelity = "exact" | "close" | "code_only" | "none";

export interface OutputFile {
  path: string;
  kind: "image" | "table" | "file";
  name?: string;
  sha?: string;
  outside?: boolean;
}

export interface InputFile {
  path: string;
  size: number;
  mtime: string;
  sha256: string;
  outside?: boolean;
}

export interface TablePreview {
  columns: string[];
  rows: unknown[][];
  n_rows: number;
  path?: string;
}

export interface NodeIn {
  entry: number;
  adapter: string;
  adapterVersion: string;
  programVersion: string;
  tool: string;
  args: Args;
  decisions: Record<string, unknown>;
  codeHash: string;
  inputHashes: string[];
  inputFiles?: InputFile[];
  envHash?: string;
  outputs: OutputFile[];
  result: unknown;
  parents: string[];
  summary: string;
  model: string;
  manualRoute: string;
  fidelity: Fidelity;
  sensitivityOf?: string;
}

export interface Node extends NodeIn {
  id: string;
  ts: string;
}

// ---------------------------------------------------------------- messages (provider-neutral)

export type Part =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; id: string; name: string; args: unknown; parseError?: string }
  | { type: "tool_result"; callId: string; name: string; text: string; images?: string[]; isError?: boolean }
  | { type: "image"; path: string };

export interface Message {
  role: "user" | "assistant";
  parts: Part[];
  provider?: string;
  model?: string;
  raw?: unknown;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ModelInfo {
  provider: "claude" | "ollama" | "openai" | "fake";
  model: string;
  contextWindow: number;
  vision: boolean;
  small: boolean;
  local?: boolean;
}

export interface StepRequest {
  system: string;
  messages: Message[];
  tools: ToolSchema[];
  signal?: AbortSignal;
  onDelta?: (d: { type: "text" | "thinking"; text: string }) => void;
  onRetry?: (r: { attempt: number; of: number; waitMs: number; reason: string }) => void;
}

export interface StepResult {
  message: Message;
  usage: Usage;
  stopReason: "end" | "tool_use" | "max_tokens" | "refusal";
  note?: string;
}

export interface Provider {
  info: ModelInfo;
  step(req: StepRequest): Promise<StepResult>;
  complete(system: string, text: string, signal?: AbortSignal): Promise<string>;
  countTokens?(req: Omit<StepRequest, "signal" | "onDelta">): Promise<number>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly transient = false) {
    super(message);
  }
}

// ---------------------------------------------------------------- tools

export interface ToolOutput {
  ok: boolean;
  error?: string;
  text?: string;
  data?: unknown;
  summary?: string;
  metrics?: Record<string, number>;
  outputs?: OutputFile[];
  images?: string[];
  table?: TablePreview;
  manualRoute?: string;
  fidelity?: Fidelity;
}

export interface ToolContext {
  session: string;
  callId: string;
  workDir: string;
  sessionDir: string;
  signal: AbortSignal;
  log: (kind: EntryKind, data: Record<string, unknown>) => Entry;
  callTool: (name: string, args: Args) => Promise<ToolOutput>;
}

export interface Tool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  source: "core" | "harness" | "adapter" | "generic";
  adapter?: string;
  remoteName?: string;
  readOnly?: boolean;
  permission?: "allow" | "ask" | "deny";
  deferred?: boolean;
  execute(args: Args, ctx: ToolContext): Promise<ToolOutput>;
}

// ---------------------------------------------------------------- decisions and questions

export type Owner = "human" | "agent" | "fixed";
export type Mode = "watch" | "follow" | "teach" | "plan";

export interface Deviation {
  arg: string;
  key: string;
  setup: unknown;
  used: unknown;
  requested?: unknown;
  overwritten?: boolean;
}

export interface Enforcement {
  args: Args;
  applied: Record<string, unknown>;
  deviations: Deviation[];
  waiting: string[];
}

export interface QuestionOption {
  value: unknown;
  label: string;
}

export interface Question {
  qid: string;
  session: string;
  decisionKey: string;
  title: string;
  text: string;
  options: QuestionOption[];
  recommendation?: { value: unknown; reason: string };
  evidence: string;
  default?: unknown;
  timeoutS?: number;
  useDefaultOnTimeout?: boolean;
  status: "open" | "answered" | "timed_out" | "defaulted";
  answer?: unknown;
  created: string;
  answered?: string;
  table?: { columns: string[]; rows: string[][] };
  tableFrom?: "samples";
}

export interface SensitivityResult {
  decisionKey: string;
  options: { value: unknown; ok: boolean; metrics: Record<string, number>; summary: string; node?: string }[];
  table: string;
  holds: string[];
  depends: string[];
}

// ---------------------------------------------------------------- hooks

export type HookEvent =
  | "SessionStart" | "UserPromptSubmit" | "PreToolUse" | "PostToolUse"
  | "PreAnswer" | "Stop" | "QuestionAsked" | "DecisionChanged";

export interface PreToolUseInput {
  event: "PreToolUse";
  session: string;
  mode: Mode;
  tool: string;
  adapter?: string;
  args: Args;
}

export interface PreToolUseResult {
  decision?: "allow" | "deny" | "ask" | "block" | "instruct";
  reason?: string;
  updatedArgs?: Args;
  additionalContext?: string;
  waitingOn?: string[];
  deviations?: Deviation[];
  applied?: Record<string, unknown>;
}

export interface PostToolUseInput {
  event: "PostToolUse";
  session: string;
  tool: string;
  adapter?: string;
  args: Args;
  output: ToolOutput;
  node?: string;
}

export interface PostToolUseResult {
  additionalContext?: string;
  findings?: FindingIn[];
}

export interface PreAnswerInput {
  event: "PreAnswer";
  session: string;
  answer: string;
}

export interface PreAnswerResult {
  answer?: string;
  additionalContext?: string;
  findings?: FindingIn[];
}

export interface Hook {
  name: string;
  event: HookEvent;
  matcher?: string;
  run(input: any): Promise<any> | any;
}

// ---------------------------------------------------------------- review and claims

export interface FindingIn {
  check: string;
  severity: "info" | "warning" | "error";
  message: string;
  nodes?: string[];
  entries?: number[];
}

export interface Finding extends FindingIn {
  fid: string;
  source: "rule" | "referee" | "hook";
  status: "open" | "accepted" | "rejected" | "fixed";
}

export interface Claim {
  text: string;
  value: number | null;
  label: "measured" | "inferred" | "literature" | "unsourced";
  node?: string;
}

// ---------------------------------------------------------------- events on the bus

export type BusEvent =
  | { type: "entry"; entry: Entry }
  | { type: "delta"; kind: "text" | "thinking"; text: string }
  | { type: "status"; state: "idle" | "thinking" | "running" | "waiting"; tool?: string; purpose?: string; since?: number }
  | { type: "permission"; rid: string; tool: string; args: Args; code?: string; touches: string; search?: { root: string; purpose: string } }
  | { type: "question"; question: Question }
  | { type: "instruction"; step: number; tool: string; text: string }
  | PlanEvent
  | { type: "clarify"; found: string; qids: string[]; skipped: string[]; check?: string; notes?: string[] }
  | PhiEvent;

export interface PhiEvent {
  type: "phi";
  rid: string;
  model: string;
  hits: { kind: string; label: string; masked: string; where: string }[];
  more: number;
  local?: string;
}

export interface PlanEvent {
  type: "plan";
  stage: "plan" | "pilot";
  version: number;
  text: string;
  update: boolean;
  qids: string[];
  programs: { part: string; adapter: string; alternatives: string[]; program?: string; why?: string }[];
  mode: Mode;
  restatement?: string;
  definitions?: { measure: string; definition: string }[];
  pilot?: string;
  reference?: { question: string; candidates: { path: string; sheet?: string; columns: string[]; label: string }[] };
  images?: string[];
  details?: string;
  estimate?: string;
  settings?: { index: number; step: number; label: string; key?: string; value?: unknown; by?: string; options?: string[] }[];
}

export interface ReferenceChoice {
  mode: "compare" | "blind" | "none";
  path?: string;
  sheet?: string;
  sample_column?: string;
  columns?: string[];
}

export type PlanResponse =
  | { action: "approve"; mode?: Mode; reference?: ReferenceChoice }
  | { action: "pilot"; mode?: Mode; reference?: ReferenceChoice }
  | { action: "confirm" }
  | { action: "another"; text?: string }
  | { action: "change"; text: string; definition?: { measure: string; old: string; new: string } }
  | { action: "set"; index: number; value: unknown }
  | { action: "cancel" };
