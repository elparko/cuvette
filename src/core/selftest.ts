import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { cuvetteHome, type KnownAnswerTest, type LoadedAdapter } from "../adapters/manifest.ts";
import { judge, runTests, type RuntimeLike, type TestOutcome } from "../onboarding/kat.ts";
import { captureEnv, envTarget } from "./envlock.ts";

type Expect = KnownAnswerTest["expect"][number];

export interface Miss {
  label: string;
  by?: number;
  text: string;
}

export interface SelfTestResult {
  status: "pass" | "fail" | "error";
  test: string;
  source: string;
  misses: Miss[];
  message: string;
  checkedAt: string;
  durationMs: number;
}

export interface SelfTestRuntime extends RuntimeLike {
  interpreter?: string[];
  programPath?: string;
  programVersion: string;
}

export function selfTestEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !/^(0|off|no|false)$/i.test(env.CUVETTE_SELF_TEST ?? "");
}

export function selfTestOf(adapter: LoadedAdapter): KnownAnswerTest | undefined {
  return adapter.manifest.tests.find((t) => t.self_test);
}

export function formatDistance(n: number): string {
  return String(Number(n.toPrecision(2)));
}

function distance(e: Expect, got: unknown): number | undefined {
  if (typeof got !== "number" || Number.isNaN(got)) return undefined;
  if (e.approx !== undefined) return Math.abs(got - e.approx);
  if (typeof e.equals === "number") return Math.abs(got - e.equals);
  if (e.min !== undefined && got < e.min) return e.min - got;
  if (e.max !== undefined && got > e.max) return got - e.max;
  return undefined;
}

export function compareValue(e: Expect, got: unknown): Miss | undefined {
  const problems = judge(e, got);
  if (!problems.length) return undefined;
  return { label: e.label || e.path, by: distance(e, got), text: problems.join("; ") };
}

export function describeResult(status: SelfTestResult["status"], misses: Miss[], error = ""): string {
  if (status === "pass") return "Passes";
  if (status === "error") return `Could not run: ${error}`;
  const [first, ...rest] = misses;
  const head = first!.by !== undefined ? `Fails by ${formatDistance(first!.by)} on ${first!.label}` : `Fails on ${first!.label}: ${first!.text}`;
  return rest.length ? `${head}. Also fails on ${rest.map((m) => m.label).join(", ")}` : head;
}

export function resultOf(test: KnownAnswerTest, outcome: TestOutcome): SelfTestResult {
  const base = { test: test.id, source: test.source, checkedAt: new Date().toISOString(), durationMs: outcome.durationMs };
  if (!outcome.values?.length) {
    const error = outcome.failures[0] ?? "the test gave no values";
    return { ...base, status: "error", misses: [], message: describeResult("error", [], error) };
  }
  const misses = outcome.values.flatMap((v) => compareValue(v.expect, v.got) ?? []);
  const status = misses.length ? "fail" : "pass";
  return { ...base, status, misses, message: describeResult(status, misses) };
}

function cacheFile(): string {
  return join(cuvetteHome(), "cache", "self-tests.json");
}

function readCache(): Record<string, SelfTestResult> {
  try {
    return JSON.parse(readFileSync(cacheFile(), "utf8"));
  } catch {
    return {};
  }
}

function writeCache(key: string, r: SelfTestResult): void {
  try {
    mkdirSync(dirname(cacheFile()), { recursive: true });
    writeFileSync(cacheFile(), JSON.stringify({ ...readCache(), [key]: r }, null, 2));
  } catch {}
}

export function selfTestKey(adapter: LoadedAdapter, test: KnownAnswerTest, envHash: string): string {
  const digest = createHash("sha256").update(JSON.stringify({ version: adapter.manifest.adapter.version, envHash, test })).digest("hex");
  return `${adapter.name}:${digest.slice(0, 16)}`;
}

export async function selfTestFor(adapter: LoadedAdapter, runtime: SelfTestRuntime, opts: { force?: boolean; callTimeoutMs?: number } = {}): Promise<{ result: SelfTestResult; cached: boolean } | undefined> {
  const test = selfTestOf(adapter);
  if (!test) return undefined;
  const m = adapter.manifest;
  const target = envTarget({ kind: m.connection.kind, interpreter: runtime.interpreter ?? [], programPath: runtime.programPath, program: m.program.name, programVersion: runtime.programVersion });
  const lock = await captureEnv(target).catch(() => undefined);
  const key = selfTestKey(adapter, test, lock?.hash ?? runtime.programVersion);
  const hit = opts.force ? undefined : readCache()[key];
  if (hit) return { result: hit, cached: true };
  const work = mkdtempSync(join(tmpdir(), "cuvette-selftest-"));
  try {
    const [outcome] = await runTests(adapter, runtime, { only: [test.id], workDir: work, callTimeoutMs: opts.callTimeoutMs ?? 90_000 });
    const result = resultOf(test, outcome ?? { id: test.id, ok: false, failures: ["the test did not run"], durationMs: 0, outputs: [] });
    if (result.status !== "error") writeCache(key, result);
    return { result, cached: false };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function warningCard(name: string, r: SelfTestResult) {
  return {
    decisionKey: "",
    title: `Self-test failed: ${name}`,
    text: `The known-answer test of the adapter ${name} gives a different number on this computer. ${r.message}. An update of the program or of a package can change a number. The results of this adapter can differ from the published values.`,
    options: [
      { value: "continue", label: `Continue with ${name} anyway` },
      { value: "stop", label: `Stop. Do not use ${name}` },
    ],
    recommendation: { value: "stop", reason: "A number that differs from the published value makes every result of this adapter doubtful." },
    evidence: `Test ${r.test}. Source: ${r.source}. Checked ${r.checkedAt.slice(0, 10)}.`,
  };
}
