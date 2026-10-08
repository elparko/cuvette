import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Decision, gaHome } from "../adapters/manifest.ts";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import type { AnalysisRecord } from "./record.ts";
import type { Args, Deviation, Enforcement, Hook, Owner, PreToolUseInput, PreToolUseResult } from "./types.ts";

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
  if (x !== undefined && y !== undefined) return Math.abs(x - y) <= 1e-9 + 1e-9 * Math.max(Math.abs(x), Math.abs(y));
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  return String(a) === String(b);
}

function coerce(def: Decision, raw: unknown): unknown {
  if (raw === undefined || raw === null) throw new Error(`${def.label} needs a value.`);
  if (def.kind === "float" || def.kind === "int") {
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
  return join(gaHome(), "profiles");
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

export class DecisionRecord {
  private states = new Map<string, State>();
  private setupDone = false;

  constructor(private adapters: LoadedAdapter[], private record: AnalysisRecord) {
    this.states.set(QUESTION_DECISION.key, {
      def: QUESTION_DECISION,
      adapters: [],
      owner: QUESTION_DECISION.owner,
      value: undefined,
      set: false,
    });
    for (const a of adapters) {
      for (const def of a.manifest.decisions) {
        const s = this.states.get(def.key);
        if (!s) this.states.set(def.key, { def, adapters: [a.name], owner: def.owner, value: undefined, set: false });
        else {
          if (s.adapters.length === 0) {
            s.def = def;
            s.owner = def.owner;
          }
          if (!s.adapters.includes(a.name)) s.adapters.push(a.name);
        }
      }
    }
    this.restore();
  }

  private restore(): void {
    for (const e of this.record.entries(["setup", "decision", "owner_change"])) {
      const d = e.data as any;
      if (e.kind === "setup") {
        this.setupDone = true;
        for (const [k, v] of Object.entries(d.values ?? {})) this.put(k, v);
        for (const [k, o] of Object.entries(d.owners ?? {})) this.putOwner(k, o as Owner);
      } else if (e.kind === "decision") this.put(d.key, d.new);
      else this.putOwner(d.key, d.new);
    }
  }

  private put(key: string, value: unknown): void {
    const s = this.states.get(key);
    if (s) {
      s.value = value;
      s.set = true;
    }
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

  value(key: string): unknown {
    return this.states.get(key)?.value;
  }

  isSet(key: string): boolean {
    return this.states.get(key)?.set ?? false;
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

  applySetup(values: Record<string, unknown>, opts: { profile?: string; how?: string } = {}): void {
    let profile: ReturnType<DecisionRecord["loadProfile"]> | undefined;
    if (opts.profile) profile = this.loadProfile(opts.profile);
    const given: Record<string, unknown> = { ...(profile?.values ?? {}), ...values };
    const coerced: Record<string, unknown> = {};
    for (const [k, raw] of Object.entries(given)) {
      const s = this.states.get(k);
      if (s) coerced[k] = coerce(s.def, raw);
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

  change(key: string, value: unknown, opts: { by?: "human" | "agent" | "profile"; reason?: string } = {}): string[] {
    const s = this.state(key);
    const next = coerce(s.def, value);
    if (s.set && same(s.value, next)) return [];
    const old = s.set ? s.value : null;
    const reason = opts.reason ?? "";
    const staleNodes = s.set ? this.record.markStale(key, reason || `${s.def.label} changed`) : [];
    this.record.append("decision", { key, old, new: next, by: opts.by ?? "human", reason, staleNodes });
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

  enforce(adapter: string, tool: string, args: Args, opts: { readOnly?: boolean } = {}): Enforcement {
    const out: Args = structuredClone(args ?? {});
    const deviations: Deviation[] = [];
    const waiting: string[] = [];
    const applied: Record<string, unknown> = {};
    const links = this.adapters.find((a) => a.name === adapter)?.linksFor(tool) ?? {};

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
          if (s.owner === "agent" && !opts.readOnly) this.change(key, given, { by: "agent", reason: "the agent changed its own choice" });
          else if (s.owner === "agent") deviations.push({ arg, key, setup: s.value, used: given });
          else {
            setPath(out, arg, s.value);
            deviations.push({ arg, key, setup: s.value, requested: given, used: s.value, overwritten: true });
          }
        }
      } else if (s.owner === "human" && s.def.stage === "when_needed") {
        if (!waiting.includes(key)) waiting.push(key);
      } else if (s.owner === "agent" && !opts.readOnly) {
        this.change(key, given, { by: "agent", reason: "chosen by the agent at first use" });
      }

      const effective = getPath(out, arg);
      if (effective !== undefined && effective !== null && effective !== "") applied[key] = effective;
    }
    return { args: out, applied, deviations, waiting };
  }

  brief(): string {
    const fields = this.fields();
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
      const e = dr.enforce(input.adapter, input.tool, input.args);
      const result: PreToolUseResult = { updatedArgs: e.args, deviations: e.deviations, applied: e.applied };
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
