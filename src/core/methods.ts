import { createHash } from "node:crypto";
import { existsSync, mkdirSync, realpathSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { writeFileAtomic } from "./atomic.ts";
import type { DataSummary } from "./datacompare.ts";
import { approvedPlan, currentPlan, planText, type AnalysisPlan } from "./plan.ts";
import type { AnalysisRecord } from "./record.ts";
import { afterProjectWrite, folderTrusted, trustStatus } from "./trust.ts";

export const METHOD_FORMAT = 1;

export interface Method {
  cuvette_method: number;
  name: string;
  saved: string;
  from?: { session: string; folder: string; title: string };
  request?: string;
  questions: { question: string; answer: string }[];
  analysis: AnalysisPlan;
  programs: { adapter: string; version: string; program?: string; programVersion?: string }[];
  decisions: Record<string, unknown>;
  pilot: { required: boolean; shows: string[] };
  inputs?: DataSummary[];
}

export function methodsDir(): string {
  return join(cuvetteHome(), "methods");
}

function check(name: string): string {
  const n = name.trim();
  if (!/^[\w][\w.-]*$/.test(n)) throw new Error("A method name can use letters, digits, dot, dash and underscore.");
  if (n.length > 100) throw new Error("A method name can have 100 characters or fewer.");
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(n)) throw new Error(`The name ${n} is reserved by the operating system. Use another name.`);
  return n;
}

export function projectMethodsDir(project: string): string {
  return join(project, ".cuvette", "methods");
}

const pathOf = (name: string, dir = methodsDir()) => join(dir, `${check(name)}.json`);

export function methodFrom(record: AnalysisRecord, name: string, decisions: Record<string, unknown>, from?: Method["from"]): Method {
  const a = approvedPlan(record);
  if (!a) throw new Error("No confirmed analysis yet. Confirm the proposed analysis first, then save it as a method.");
  const plan = structuredClone(currentPlan(record) ?? a.plan);
  for (const s of plan.steps) s.status = "todo";
  const asked = new Set(((record.live(["clarify"]).filter((e) => e.data.action === "asked" && e.id < a.entry).at(-1)?.data.questions as string[]) ?? []));
  const answered = record.live(["clarify"]).filter((e) => e.data.action === "answered" && e.id < a.entry).at(-1);
  const noted = record.entries(["answer"]).filter((e) => typeof e.data.note === "string" && e.data.note !== "").map((e) => ({ value: String(e.data.value ?? ""), line: `${String(e.data.value ?? "")} (${String(e.data.note)})` }));
  const questions = ((answered?.data.answers as string[]) ?? [])
    .map((x) => {
      const question = [...asked].find((q) => x.startsWith(`${q} -> `));
      const i = question === undefined ? x.lastIndexOf(" -> ") : question.length;
      const answer = x.slice(i + 4);
      const hit = noted.find((n) => n.line === answer);
      return { question: x.slice(0, i), answer: hit ? hit.value : answer };
    })
    .filter((q) => asked.has(q.question));
  const programs = new Map<string, Method["programs"][number]>();
  for (const e of record.live(["session", "adapter"])) {
    const list = e.kind === "session" ? ((e.data.adapters as { name: string; version: string; programVersion?: string }[]) ?? []) : [e.data as { name: string; version: string; program?: string; programVersion?: string }];
    for (const x of list) programs.set(x.name, { adapter: x.name, version: String(x.version ?? ""), ...("program" in x && x.program ? { program: String(x.program) } : {}), ...(x.programVersion ? { programVersion: String(x.programVersion) } : {}) });
  }
  const inputs = new Map<string, DataSummary>();
  for (const e of record.live(["data_check"])) if (e.data.summary) inputs.set(String((e.data.summary as DataSummary).source), e.data.summary as DataSummary);
  const { question: _q, ...rest } = decisions;
  return {
    cuvette_method: METHOD_FORMAT,
    name: check(name),
    saved: new Date().toISOString(),
    from,
    request: String(record.live(["user"]).find((e) => !e.data.internal && !e.data.during)?.data.text ?? ""),
    questions,
    analysis: plan,
    programs: [...programs.values()],
    decisions: rest,
    pilot: { required: true, shows: plan.pilot?.shows ?? [] },
    ...(inputs.size ? { inputs: [...inputs.values()].slice(-5) } : {}),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => v === undefined || typeof v === "string";
const listOf = (v: unknown, each: (x: unknown) => boolean) => v === undefined || (Array.isArray(v) && v.every(each));
const objectsWith = (v: unknown, ...keys: string[]) => listOf(v, (x) => isObject(x) && keys.every((k) => typeof x[k] === "string"));

function damage(m: Record<string, unknown>): string | undefined {
  const a = m.analysis as Record<string, unknown>;
  const pilot = a.pilot;
  const checks: [string, boolean][] = [
    ["saved", text(m.saved)],
    ["request", text(m.request)],
    ["questions", objectsWith(m.questions, "question", "answer")],
    ["programs", listOf(m.programs, isObject)],
    ["decisions", m.decisions === undefined || isObject(m.decisions)],
    ["pilot", m.pilot === undefined || (isObject(m.pilot) && listOf(m.pilot.shows, (x) => typeof x === "string"))],
    ["inputs", listOf(m.inputs, isObject)],
    ["restatement", text(a.restatement)],
    ["question", text(a.question)],
    ["definitions", objectsWith(a.definitions, "measure", "definition")],
    ["exclusions", objectsWith(a.exclusions, "what")],
    ["checks", objectsWith(a.checks, "check")],
    ["analysis programs", objectsWith(a.programs, "part", "adapter")],
    ["outputs", listOf(a.outputs, (x) => typeof x === "string")],
    ["out_of_scope", listOf(a.out_of_scope, (x) => typeof x === "string")],
    ["analysis pilot", pilot === undefined || (isObject(pilot) && typeof pilot.sample === "string" && listOf(pilot.shows, (x) => typeof x === "string"))],
    ["reference", a.reference === undefined || isObject(a.reference)],
    ["data", a.data === undefined || (isObject(a.data) && listOf(a.data.files, (x) => typeof x === "string"))],
    ["steps", objectsWith(a.steps, "step")],
    ["settings", (a.steps as unknown[]).every((s) => isObject(s) && objectsWith(s.decisions, "label") && text(s.method) && text(s.tool) && text(s.reason))],
  ];
  return checks.find(([, ok]) => !ok)?.[0];
}

export function readMethod(raw: string, source = "the file"): Method {
  let m: Method;
  try {
    m = JSON.parse(raw) as Method;
  } catch {
    throw new Error(`${source} is not a method file.`);
  }
  if (isObject(m) && typeof m.cuvette_method === "number" && m.cuvette_method > METHOD_FORMAT) throw new Error(`${source} is a Cuvette method file of format ${m.cuvette_method}. This version of Cuvette reads format ${METHOD_FORMAT}. Update Cuvette to use it.`);
  if (!isObject(m) || m.cuvette_method !== METHOD_FORMAT || typeof m.name !== "string" || !m.name || !isObject(m.analysis) || !Array.isArray(m.analysis.steps)) throw new Error(`${source} is not a Cuvette method file (format ${METHOD_FORMAT}).`);
  const bad = damage(m as unknown as Record<string, unknown>);
  if (bad) throw new Error(`${source} is damaged: the part "${bad}" has a wrong form.`);
  m.saved ??= "";
  m.questions ??= [];
  m.programs ??= [];
  m.decisions ??= {};
  m.pilot ??= { required: true, shows: [] };
  m.pilot.shows ??= [];
  return m;
}

export function saveMethod(m: Method, project?: string): string {
  const dir = project ? projectMethodsDir(project) : methodsDir();
  const p = pathOf(m.name, dir);
  const before = project ? trustStatus(project).state : undefined;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileAtomic(p, JSON.stringify(m, null, 2) + "\n");
  } catch (e) {
    if (["EACCES", "EPERM", "EROFS"].includes((e as NodeJS.ErrnoException).code ?? "")) throw new Error(`Cannot write the method file ${p}. Check that the folder is not read-only.`);
    throw e;
  }
  if (project) afterProjectWrite(project, before!);
  return p;
}

export interface MethodRow {
  name: string;
  saved: string;
  path: string;
  question: string;
  where: "home" | "project";
  trusted: boolean;
}

function rowsIn(dir: string, where: MethodRow["where"], trusted: boolean): MethodRow[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const path = join(dir, f);
      try {
        const m = readMethod(readFileSync(path, "utf8"), f);
        return [{ name: basename(f, ".json"), saved: m.saved, path, question: m.analysis.restatement ?? m.analysis.question ?? m.request ?? "", where, trusted }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listMethods(project?: string): MethodRow[] {
  return [...(project ? rowsIn(projectMethodsDir(project), "project", folderTrusted(project)) : []), ...rowsIn(methodsDir(), "home", true)];
}

const realPath = (p: string): string => {
  try {
    return realpathSync.native(p);
  } catch {
    return resolve(p);
  }
};

const inside = (file: string, folder: string) => realPath(file).startsWith(realPath(folder) + sep);

export function resumeMethodAllowed(file: string, project: string): boolean {
  return inside(file, methodsDir()) || (inside(file, projectMethodsDir(project)) && trustStatus(project).state === "trusted");
}

export function loadMethod(ref: string, project?: string): Method & { path: string; hash: string } {
  const local = project && !ref.endsWith(".json") ? pathOf(ref, projectMethodsDir(project)) : undefined;
  if (local && existsSync(local) && !folderTrusted(project!)) throw new Error(`The method ${ref} is in the project folder, and this folder is not trusted. Check the folder with /trust, then trust it with /trust on.`);
  const path = local && existsSync(local) ? local : ref.endsWith(".json") && existsSync(ref) ? ref : pathOf(ref);
  if (!existsSync(path)) throw new Error(`No method named ${ref}. Type /method in a session, or cuvette method list, to see the list.`);
  const text = readFileSync(path, "utf8");
  return { ...readMethod(text, basename(path)), path, hash: createHash("sha256").update(text).digest("hex") };
}

export function deleteMethod(name: string): string {
  const p = pathOf(name);
  if (!existsSync(p)) throw new Error(`No method named ${name}.`);
  rmSync(p);
  return p;
}

export function exportMethod(name: string, to: string): string {
  const m = loadMethod(name);
  const { path: _p, hash: _h, ...plain } = m;
  const dest = to.endsWith(".json") ? to : join(to, `${m.name}.cuvette-method.json`);
  writeFileSync(dest, JSON.stringify(plain, null, 2) + "\n");
  return dest;
}

export function importMethod(file: string, as?: string): string {
  const m = readMethod(readFileSync(file, "utf8"), basename(file));
  if (as) m.name = check(as);
  if (existsSync(pathOf(m.name))) throw new Error(`A method named ${m.name} exists. Import it with another name: cuvette method import <file> <name>.`);
  return saveMethod(m);
}

export function methodText(m: Method): string {
  const out = [`Method: ${m.name}`, `Saved: ${m.saved.slice(0, 16).replace("T", " ")}${m.from?.title ? ` from the session "${m.from.title}"` : ""}`];
  if (m.questions.length) out.push("", "Questions and answers", ...m.questions.map((q) => `- ${q.question} -> ${q.answer}`));
  out.push("", planText(m.analysis, { view: "full" }));
  if (m.programs.length) out.push("", "Program versions", ...m.programs.map((p) => `- ${p.adapter} ${p.version}${p.program ? `, ${p.program}` : ""}${p.programVersion ? ` ${p.programVersion}` : ""}`));
  const keys = Object.entries(m.decisions);
  if (keys.length) out.push("", "Decisions", ...keys.map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`));
  out.push("", `Demonstration on a sample: ${m.pilot.required ? "required before the batch" : "not required"}.`);
  return out.join("\n");
}

export function methodNote(m: Method): string {
  return `The scientist started this session from the saved method "${m.name}". Propose the same analysis for the new data: the same metrics and definitions, the same steps with the same settings, the same exclusions and programs, and a demonstration on one sample. Change only what the new data needs, and say why. The saved method:\n${planText(m.analysis, { view: "full" })}`;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function fillFromMethod(plan: AnalysisPlan, m: Method): AnalysisPlan {
  const saved = m.analysis;
  plan.definitions = plan.definitions?.length ? plan.definitions : saved.definitions;
  plan.exclusions = plan.exclusions?.length ? plan.exclusions : saved.exclusions;
  plan.programs = plan.programs?.length ? plan.programs : saved.programs;
  plan.checks = plan.checks?.length ? plan.checks : saved.checks;
  plan.pilot ??= saved.pilot ?? { sample: "one sample of the new data", shows: m.pilot.shows };
  if (!plan.steps.length) plan.steps = structuredClone(saved.steps);
  const settings = saved.steps.flatMap((s) => s.decisions ?? []);
  for (const s of plan.steps)
    for (const d of s.decisions ?? []) {
      if (d.value !== undefined && d.value !== null && d.value !== "") continue;
      const hit = settings.find((x) => (d.key && x.key === d.key) || norm(x.label) === norm(d.label));
      if (hit?.value === undefined || hit.value === null || hit.value === "") continue;
      d.value = hit.value;
      d.by = `method ${m.name}`;
    }
  return plan;
}
