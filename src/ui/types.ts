import type { Bus } from "../core/bus.ts";
import type { AnalysisRecord } from "../core/record.ts";
import type { BusEvent, Entry, Finding, Mode, ModelInfo, Owner, PlanResponse, Question } from "../core/types.ts";
import type { SampleRow } from "../core/samples.ts";

export interface DecisionFieldLike {
  key: string;
  label: string;
  kind: string;
  choices?: any[];
  lo?: number;
  hi?: number;
  help?: string;
  group?: string;
  essential?: boolean;
  owner: Owner;
  stage?: string;
  adapters?: string[];
  value: unknown;
  set: boolean;
  default?: unknown;
}

export interface SessionLike {
  id: string;
  dir: string;
  workDir: string;
  folderLine?: string;
  cwd?: string;
  settings?: Record<string, unknown>;
  applySetting?(name: string, value: unknown): Promise<void>;
  mode: Mode;
  permissionMode: "ask" | "bypass";
  busy: boolean;
  model: ModelInfo;
  adapterInfo: { name: string; title: string; version: string; programVersion: string }[];
  bus: Bus;
  record: AnalysisRecord;
  decisions: {
    fields(): DecisionFieldLike[];
    applySetup(values: Record<string, unknown>, opts?: { profile?: string; how?: string }): void;
    value(key: string): unknown;
    owner(key: string): Owner;
    values(): Record<string, unknown>;
  };
  questions: { open(): Question[] };
  findings: { list(status?: Finding["status"]): Finding[]; resolve(fid: string, action: "accept" | "reject" | "fix", reason?: string): void };
  send(text: string, opts?: { internal?: boolean; plan?: boolean }): Promise<string>;
  steer?(text: string, now?: boolean): void;
  takeSteered?(): string[];
  planFirst?: boolean;
  respondPlan?(r: PlanResponse): void;
  setPlanFirst?(on: boolean): void;
  setPilot?(on: boolean): void;
  interrupt(): void;
  respondPermission(rid: string, ok: boolean, note?: string, always?: boolean): void;
  answer(qid: string, value: unknown, note?: string): Promise<void>;
  setDecision(key: string, value: unknown, reason?: string): string[];
  setOwner(key: string, owner: Owner): void;
  changeProgram?(name: string): Promise<{ ok: boolean; text: string }>;
  setMode(mode: Mode): void;
  setPermissionMode(m: "ask" | "bypass"): void;
  followDone(step: number, note?: string, agentDoes?: boolean): Promise<void>;
  review(): Promise<Finding[]>;
  compact(): Promise<void>;
  exportAs(fmt: any): Promise<string>;
  elnPush?(): Promise<{ experiment: number; url: string; version: number; hash: string; created: boolean }>;
  elnLink?(id: number): Promise<{ text: string; proposals: { key: string; label: string; value: unknown }[] }>;
  openEvents?(): BusEvent[];
  sampleSheet?(): { rows: SampleRow[]; path: string; from: string } | undefined;
  editSamples?(text: string): Promise<string>;
  markOpen?(extra?: Record<string, unknown>): void;
  close(): Promise<void>;
}

export type { Entry };
