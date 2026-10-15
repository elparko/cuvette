import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Decision, cuvetteHome } from "../adapters/manifest.ts";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import { frozenPlan, recordDeviation } from "./freeze.ts";
import type { Args, Deviation, Entry, Enforcement, Hook, Owner, PreToolUseInput, PreToolUseResult } from "./types.ts";

export interface DecisionField {
  key: string;
  label: string;
  kind: Decision["kind"];
  choices: unknown[];
  lo?: number;
  hi?: number;
  help: string;
  group: string;
  essential: boolean;
  owner: Owner;
  stage: Decision["stage"];
  adapters: string[];
  value: unknown;
  set: boolean;
  default: unknown;
}

interface State {
  def: Decision;
  adapters: string[];
  owner: Owner;
  value: unknown;
  set: boolean;
}

const QUESTION_DECISION: Decision = Decision.parse({
  key: "question",
  label: "What question are you asking?",
  kind: "text",
  owner: "human",
  group: "Question",
  essential: true,
  stage: "setup",
});

export const ADAPTER_DECISION: Decision = Decision.parse({
  key: "adapter",
  label: "Program (adapter)",
  kind: "text",
  owner: "agent",
  group: "Method",
  stage: "when_needed",
  help: "The programs that do the analysis, as adapter names. The agent chooses one with use_adapter and gives the reason. Change it with /program.",
});

export const TEST_DECISIONS: Decision[] = [
  Decision.parse({
    key: "test_family",
    label: "Group of tests for a correction",
    kind: "choice",
    choices: ["same_data", "one_family", "separate"],
    default: "same_data",
    owner: "human",
    group: "Statistics",
    stage: "when_needed",
    changes_conclusion: false,
    help: "same_data: tests on the same data file are one family. one_family: all tests in the session are one family. separate: each test is its own family and has no correction.",
  }),
  Decision.parse({
    key: "test_correction",
    label: "Correction for the tests in this session",
    kind: "choice",
    choices: ["holm", "benjamini_hochberg", "not_part_of_analysis"],
    owner: "human",
    group: "Statistics",
    stage: "when_needed",
    changes_conclusion: false,
    help: "Each test in a family adds a chance of a false positive. Holm controls the chance of any false positive. Benjamini-Hochberg controls the share of false positives among the positive tests. Choose not_part_of_analysis if the extra tests were only checks and not part of the analysis.",
  }),
];

export const REPORTING_DECISION: Decision = Decision.parse({
  key: "reporting_guideline",
  label: "Reporting guideline",
  kind: "choice",
  choices: ["arrive", "consort", "strobe", "miqe"],
  owner: "human",
  group: "Report",
  stage: "when_needed",
  help: "The guideline for the reporting checklist. arrive: animal studies. consort: randomized trials. strobe: observational studies. miqe: qPCR. Set it with /checklist.",
});

const HIDDEN_FROM_AGENT = new Set([ADAPTER_DECISION.key, REPORTING_DECISION.key]);

export function getPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

export function setPath(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    if (cur[part] === null || typeof cur[part] !== "object") cur[part] = {};
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as any)[k])]));
  }
  return v;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function same(a: unknown, b: unknown): boolean {
  const x = toNumber(a);
  const y = toNumber(b);
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (x !== undefined && y !== undefined) return Math.abs(x - y) <= 1e-9 + 1e-9 * Math.max(Math.abs(x), Math.abs(y));
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  return String(a) === String(b);
}

function coerce(def: Decision, raw: unknown): unknown {
  if (raw === undefined || raw === null) throw new Error(`${def.label} needs a value.`);
  if (def.kind === "float" || def.kind === "int") {
    if (typeof raw === "string" && raw.trim() === "") return "";
    const n = toNumber(raw);
    if (n === undefined) throw new Error(`${def.label} must be a number.`);
    if (def.kind === "int" && !Number.isInteger(n)) throw new Error(`${def.label} must be a whole number.`);
    if (def.lo !== undefined && n < def.lo) throw new Error(`${def.label} must be at least ${def.lo}.`);
    if (def.hi !== undefined && n > def.hi) throw new Error(`${def.label} must be at most ${def.hi}.`);
    return n;
  }
  if (def.kind === "choice") {
    if (def.choices.length === 0) return String(raw).trim();
    const hit = def.choices.find((c) => c === raw || String(c) === String(raw).trim());
    if (hit === undefined) throw new Error(`${def.label} must be one of: ${def.choices.map(String).join(", ")}.`);
    return hit;
  }
  if (def.kind === "bool") {
    if (typeof raw === "boolean") return raw;
    const s = String(raw).trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(s)) return true;
    if (["false", "no", "n", "0"].includes(s)) return false;
    throw new Error(`${def.label} must be yes or no.`);
  }
  return String(raw).trim().slice(0, 500);
}

function profilesDir(): string {
  return join(cuvetteHome(), "profiles");
}

function profileVersions(name: string): number[] {
  const dir = join(profilesDir(), name);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((f) => /^v(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

const PLAN_FLOW_REASON = /^(set in the confirmed analysis|the scientist approved plan version|from the method|from the answers file|changed during the demonstration)/;
const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

export class DecisionRecord {
  private states = new Map<string, State>();
  private setupDone = false;
  onDeviation?: (e: Entry) => void;

  constructor(private adapters: LoadedAdapter[], private record: AnalysisRecord, harness: Decision[] = []) {
    for (const def of harness) this.states.set(def.key, { def, adapters: [], owner: def.owner, value: undefined, set: false });
    this.states.set(QUESTION_DECISION.key, {
      def: QUESTION_DECISION,
      adapters: [],
      owner: QUESTION_DECISION.owner,
      value: undefined,
      set: false,
    });
    for (const a of adapters) this.register(a);
    this.restore();
  }

  private register(a: LoadedAdapter): string[] {
    const added: string[] = [];
    for (const def of a.manifest.decisions) {
      const s = this.states.get(def.key);
      if (!s) {
        this.states.set(def.key, { def, adapters: [a.name], owner: def.owner, value: undefined, set: false });
        added.push(def.key);
      } else {
        if (s.adapters.length === 0) {
          s.def = def;
          s.owner = def.owner;
        }
        if (!s.adapters.includes(a.name)) s.adapters.push(a.name);
      }
    }
    return added;
  }

  addAdapter(a: LoadedAdapter, preset: Record<string, unknown> = {}, how = ""): string[] {
    if (!this.adapters.includes(a)) this.adapters.push(a);
    const added = this.register(a);
    if (!this.setupDone) return added;
    const values: Record<string, unknown> = {};
    const defaultsAccepted: string[] = [];
    for (const k of added) {
      const s = this.state(k);
      if (s.def.stage !== "setup") continue;
      if (k in preset) values[k] = coerce(s.def, preset[k]);
      else if (s.def.default !== undefined) {
        values[k] = coerce(s.def, s.def.default);
        defaultsAccepted.push(k);
      }
    }
    if (!Object.keys(values).length) return added;
    for (const [k, v] of Object.entries(values)) this.put(k, v);
    this.record.append("setup", { values, owners: {}, profile: null, how: how || `when the adapter ${a.name} was loaded`, defaultsAccepted, adapter: a.name });
    return added;
  }

  private restore(): void {
    for (const e of this.record.entries(["setup", "decision", "owner_change"])) {
      const d = e.data as any;
      if (e.kind === "setup") {
        this.setupDone = true;
        for (const [k, v] of Object.entries(d.values ?? {})) this.put(k, v);
        for (const [k, o] of Object.entries(d.owners ?? {})) this.putOwner(k, o as Owner);
      } else if (e.kind === "decision") {
        if (d.unset) this.unput(d.key);
        else this.put(d.key, d.new);
      } else this.putOwner(d.key, d.new);
    }
  }

  private put(key: string, value: unknown): void {
    const s = this.states.get(key);
    if (s) {
      s.value = value;
      s.set = true;
    }
  }

  private unput(key: string): void {
    const s = this.states.get(key);
    if (s) {
      s.value = undefined;
      s.set = false;
    }
  }

  valuesAt(upTo: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const e of this.record.entries(["setup", "decision"])) {
      if (e.id > upTo) break;
      const d = e.data as any;
      if (e.kind === "setup") Object.assign(out, d.values ?? {});
      else if (d.unset) delete out[d.key];
      else out[d.key] = d.new;
    }
    return out;
  }

  restoreTo(upTo: number, reason: string): { key: string; from: unknown; to: unknown }[] {
    const then = this.valuesAt(upTo);
    const out: { key: string; from: unknown; to: unknown }[] = [];
    for (const s of this.states.values()) {
      const k = s.def.key;
      const had = Object.hasOwn(then, k);
      if (had === s.set && (!had || same(then[k], s.value))) continue;
      out.push({ key: k, from: s.set ? s.value : null, to: had ? then[k] : null });
      this.record.append("decision", { key: k, old: s.set ? s.value : null, new: had ? then[k] : null, by: "human", reason, rewind: true, ...(had ? {} : { unset: true }) });
      if (had) this.put(k, then[k]);
      else this.unput(k);
    }
    return out;
  }

  revert(key: string, to: { value: unknown } | undefined, reason: string): void {
    const s = this.state(key);
    if (!to ? !s.set : s.set && same(to.value, s.value)) return;
    this.record.append("decision", { key, old: s.set ? s.value : null, new: to ? to.value : null, by: "human", reason, rewind: true, ...(to ? {} : { unset: true }) });
    if (to) this.put(key, to.value);
    else this.unput(key);
  }

  private putOwner(key: string, owner: Owner): void {
    const s = this.states.get(key);
    if (s) s.owner = owner;
  }

  private state(key: string): State {
    const s = this.states.get(key);
    if (!s) throw new Error(`Unknown decision "${key}".`);
    return s;
  }

  fields(): DecisionField[] {
    return [...this.states.values()].map((s) => ({
      key: s.def.key,
      label: s.def.label,
      kind: s.def.kind,
      choices: s.def.choices,
      lo: s.def.lo,
      hi: s.def.hi,
      help: s.def.help,
      group: s.def.group,
      essential: s.def.essential,
      owner: s.owner,
      stage: s.def.stage,
      adapters: s.adapters,
      value: s.value,
      set: s.set,
      default: s.def.default,
    }));
  }

  has(key: string): boolean {
    return this.states.has(key);
  }

  value(key: string): unknown {
    return this.states.get(key)?.value;
  }

  isSet(key: string): boolean {
    return this.states.get(key)?.set ?? false;
  }

  hasValue(key: string): boolean {
    const s = this.states.get(key);
    return Boolean(s?.set) && s?.value !== null && s?.value !== "";
  }

  owner(key: string): Owner {
    return this.state(key).owner;
  }

  values(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const s of this.states.values()) if (s.set) out[s.def.key] = s.value;
    return out;
  }

  private loadProfile(spec: string): { name: string; version: number; values: Record<string, unknown>; owners: Record<string, Owner> } {
    const [name, v] = spec.split("@");
    const versions = profileVersions(name);
    const version = v ? Number(v) : versions[versions.length - 1];
    if (!versions.includes(version)) throw new Error(`No profile "${spec}".`);
    const data = JSON.parse(readFileSync(join(profilesDir(), name, `v${version}.json`), "utf8"));
    return { name, version, values: data.values ?? {}, owners: data.owners ?? {} };
  }

  validate(key: string, raw: unknown): unknown {
    return coerce(this.state(key).def, raw);
  }

  applySetup(values: Record<string, unknown>, opts: { profile?: string; how?: string } = {}): void {
    let profile: ReturnType<DecisionRecord["loadProfile"]> | undefined;
    if (opts.profile) profile = this.loadProfile(opts.profile);
    const given: Record<string, unknown> = { ...(profile?.values ?? {}), ...values };
    const coerced: Record<string, unknown> = {};
    for (const [k, raw] of Object.entries(given)) {
      const s = this.states.get(k);
      if (s && raw !== undefined && raw !== null) coerced[k] = coerce(s.def, raw);
    }

    if (this.setupDone) {
      for (const [k, v] of Object.entries(coerced)) {
        const s = this.state(k);
        if (!s.set || !same(s.value, v)) this.change(k, v, { by: "human", reason: "setup edited" });
      }
      return;
    }

    const owners: Record<string, Owner> = {};
    for (const [k, o] of Object.entries(profile?.owners ?? {})) {
      const s = this.states.get(k);
      if (s && s.owner !== o) {
        s.owner = o;
        owners[k] = o;
      }
    }
    const defaultsAccepted: string[] = [];
    for (const s of this.states.values()) {
      const k = s.def.key;
      if (k in coerced) continue;
      if (s.def.stage === "setup" && s.def.default !== undefined) {
        coerced[k] = coerce(s.def, s.def.default);
        defaultsAccepted.push(k);
      }
    }
    for (const [k, v] of Object.entries(coerced)) this.put(k, v);

    const content = { values: coerced, owners };
    const hash = createHash("sha256").update(JSON.stringify(canonical(content))).digest("hex");
    this.record.append("setup", {
      values: coerced,
      owners,
      profile: profile ? { name: profile.name, version: profile.version, hash } : null,
      how: opts.how ?? "form",
      defaultsAccepted,
    });
    this.setupDone = true;
  }

  change(key: string, value: unknown, opts: { by?: "human" | "agent" | "profile" | "default"; reason?: string } = {}): string[] {
    const s = this.state(key);
    const next = coerce(s.def, value);
    if (s.set && same(s.value, next)) return [];
    const old = s.set ? s.value : null;
    const reason = opts.reason ?? "";
    const staleNodes = s.set ? this.record.markStale(key, reason || `${s.def.label} changed`) : [];
    this.record.append("decision", { key, old, new: next, by: opts.by ?? "human", reason, staleNodes });
    if (s.set && !PLAN_FLOW_REASON.test(reason) && frozenPlan(this.record)) {
      const e = recordDeviation(this.record, { kind: "setting", what: s.def.label, from: show(old), to: show(next) }, "decision", reason);
      if (e) this.onDeviation?.(e);
    }
    s.value = next;
    s.set = true;
    return staleNodes;
  }

  setOwner(key: string, owner: Owner, by = "human"): void {
    const s = this.state(key);
    if (s.owner === owner) return;
    this.record.append("owner_change", { key, old: s.owner, new: owner, by });
    s.owner = owner;
  }

  enforce(adapter: string, tool: string, args: Args, opts: { readOnly?: boolean; defer?: boolean } = {}): Enforcement {
    const out: Args = structuredClone(args ?? {});
    const deviations: Deviation[] = [];
    const waiting: string[] = [];
    const applied: Record<string, unknown> = {};
    const links = this.adapters.find((a) => a.name === adapter)?.linksFor(tool) ?? {};
    const pending: (() => void)[] = [];
    const agentChange = (key: string, value: unknown, reason: string) => (opts.defer ? pending.push(() => void this.change(key, value, { by: "agent", reason })) : void this.change(key, value, { by: "agent", reason }));

    for (const [arg, key] of Object.entries(links)) {
      const s = this.states.get(key);
      if (!s) continue;
      const given = getPath(out, arg);
      const missing = given === undefined || given === null || given === "";
      if (s.set && (s.value === null || s.value === "")) {
        if (!missing) applied[key] = given;
        continue;
      }

      if (missing) {
        if (s.set) setPath(out, arg, s.value);
        else if (s.owner === "human" && s.def.stage === "when_needed" && !waiting.includes(key)) waiting.push(key);
      } else if (s.set) {
        if (!same(s.value, given)) {
          if (s.owner === "agent" && !opts.readOnly) agentChange(key, given, "the agent changed its own choice");
          else if (s.owner === "agent") deviations.push({ arg, key, setup: s.value, used: given });
          else {
            setPath(out, arg, s.value);
            deviations.push({ arg, key, setup: s.value, requested: given, used: s.value, overwritten: true });
          }
        }
      } else if (s.owner === "human" && s.def.stage === "when_needed") {
        if (!waiting.includes(key)) waiting.push(key);
      } else if (s.owner === "agent" && !opts.readOnly) {
        agentChange(key, given, "chosen by the agent at first use");
      }

      const effective = getPath(out, arg);
      if (effective !== undefined && effective !== null && effective !== "") applied[key] = effective;
    }
    return { args: out, applied, deviations, waiting, ...(pending.length ? { commit: () => pending.forEach((f) => f()) } : {}) };
  }

  brief(keys?: string[]): string {
    const fields = this.fields().filter((f) => (!keys || keys.includes(f.key)) && !HIDDEN_FROM_AGENT.has(f.key));
    const lines: string[] = [];
    const groups = new Map<string, DecisionField[]>();
    for (const f of fields.filter((f) => f.set)) groups.set(f.group, [...(groups.get(f.group) ?? []), f]);
    if (groups.size) {
      lines.push("Setup values:");
      for (const [g, fs] of groups) {
        lines.push(`${g}:`);
        for (const f of fs) lines.push(`- ${f.label} (${f.key}): ${String(f.value)}`);
      }
    }
    const choose = fields.filter((f) => f.owner === "agent");
    if (choose.length) lines.push(`You choose: ${choose.map((f) => `${f.label} (${f.key})`).join(", ")}.`);
    const ask = fields.filter((f) => f.owner === "human" && f.stage === "when_needed" && !f.set);
    if (ask.length) lines.push(`Ask the scientist: ${ask.map((f) => `${f.label} (${f.key})`).join(", ")}.`);
    const fixed = fields.filter((f) => f.owner === "fixed");
    if (fixed.length) {
      lines.push(`Fixed by the lab: ${fixed.map((f) => `${f.label} (${f.key})${f.set ? ` = ${String(f.value)}` : ""}`).join(", ")}.`);
    }
    lines.push(
      "The harness fills these values into your tool calls automatically. If you give a different value, the harness logs a deviation and shows it to the scientist.",
    );
    return lines.join("\n");
  }

  saveProfile(name: string): { name: string; version: number } {
    if (!/^[\w.-]+$/.test(name)) throw new Error("A profile name can use letters, digits, dot, dash and underscore.");
    const versions = profileVersions(name);
    const version = (versions[versions.length - 1] ?? 0) + 1;
    const owners = Object.fromEntries([...this.states.values()].map((s) => [s.def.key, s.owner]));
    mkdirSync(join(profilesDir(), name), { recursive: true });
    const body = { name, version, saved: new Date().toISOString(), values: this.values(), owners };
    writeFileSync(join(profilesDir(), name, `v${version}.json`), JSON.stringify(body, null, 2));
    return { name, version };
  }

  static listProfiles(): { name: string; version: number }[] {
    if (!existsSync(profilesDir())) return [];
    return readdirSync(profilesDir())
      .map((name) => ({ name, version: profileVersions(name).at(-1) ?? 0 }))
      .filter((p) => p.version > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function decisionHook(dr: DecisionRecord): Hook {
  return {
    name: "decisions",
    event: "PreToolUse",
    run(input: PreToolUseInput): PreToolUseResult {
      if (!input.adapter) return {};
      const e = dr.enforce(input.adapter, input.tool, input.args, { defer: true });
      const result: PreToolUseResult = { updatedArgs: e.args, deviations: e.deviations, applied: e.applied, commit: e.commit };
      if (e.waiting.length) {
        const labels = e.waiting.map((k) => dr.fields().find((f) => f.key === k)?.label ?? k);
        return {
          ...result,
          decision: "block",
          waitingOn: e.waiting,
          reason: `The scientist must decide first: ${labels.join(", ")}.`,
        };
      }
      return result;
    },
  };
}
