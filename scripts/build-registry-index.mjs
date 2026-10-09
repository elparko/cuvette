#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { parse as parseYaml } from "yaml";

export async function buildIndex(folder, opts = {}) {
  const checker = await import("../src/onboarding/checker.ts");
  const source = await import("../src/adapters/source.ts");
  const root = resolve(folder);
  const adapters = [];
  const skipped = [];
  for (const dir of readdirSync(root).sort()) {
    const path = join(root, dir);
    if (!statSync(path).isDirectory() || !existsSync(join(path, "adapter.yaml"))) continue;
    const m = parseYaml(readFileSync(join(path, "adapter.yaml"), "utf8")) ?? {};
    const code = source.codeFilesIn(path);
    const staticOnly = !opts.runTests || code.length > 0;
    const report = await checker.checkAdapter(path, staticOnly ? { static: true } : { runTests: true });
    const tests = report.tests ?? [];
    const ran = tests.filter((t) => !t.skipped);
    const result = {
      name: m.adapter?.name ?? dir,
      version: String(m.adapter?.version ?? ""),
      description: String(m.adapter?.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
      program: m.program?.name ?? "",
      field: m.adapter?.field ?? "",
      file_types: m.adapter?.file_types ?? [],
      author: (m.adapter?.authors ?? []).join(", "),
      license: source.licenseOf(path),
      trust: "checked",
      lint: { ok: report.ok, errors: report.errors.length, warnings: report.warnings.length },
      tests: { ran: ran.length, passed: ran.filter((t) => t.ok).length, failed: ran.filter((t) => !t.ok).length },
      needs: {
        network: Boolean(m.connection?.network) || m.connection?.kind === "http" || source.networkFilesIn(path, code).length > 0,
        code: code.length > 0,
        programs: m.locate && (m.locate.env || m.locate.paths?.length || m.locate.which?.length) ? [m.program?.name ?? dir] : [],
      },
      citations: [...(Array.isArray(m.program?.citation) ? m.program.citation : m.program?.citation ? [m.program.citation] : []).map((c) => c.text), ...(m.citations ?? []).map((c) => c.text)],
      path: relative(opts.repoRoot ? resolve(opts.repoRoot) : root, path).split("\\").join("/"),
      git: opts.git ?? "",
      commit: opts.commit ?? "",
      sha256: source.hashFolder(path),
    };
    if (!report.ok || result.tests.failed > 0) skipped.push({ name: result.name, errors: report.errors.slice(0, 5), failedTests: result.tests.failed });
    else adapters.push(result);
  }
  return { index: { registry: opts.registry ?? "", generated: opts.generated ?? new Date().toISOString(), adapters }, skipped };
}

async function main() {
  const { register } = await import("tsx/esm/api");
  register();
  const { values: v, positionals } = parseArgs({
    allowPositionals: true,
    options: { out: { type: "string" }, git: { type: "string" }, commit: { type: "string" }, registry: { type: "string" }, "repo-root": { type: "string" }, "run-tests": { type: "boolean" } },
  });
  if (!positionals[0]) {
    console.error("Use: node scripts/build-registry-index.mjs <adapters folder> [--out index.json] [--git <repository address>] [--commit <sha>] [--repo-root <folder>] [--run-tests]");
    process.exit(2);
  }
  const { index, skipped } = await buildIndex(positionals[0], { git: v.git, commit: v.commit, registry: v.registry, repoRoot: v["repo-root"], runTests: v["run-tests"] });
  writeFileSync(v.out ?? "index.json", JSON.stringify(index, null, 2) + "\n");
  console.log(`Wrote ${v.out ?? "index.json"}: ${index.adapters.length} adapters.`);
  for (const s of skipped) console.error(`Left out ${s.name}: ${s.failedTests ? `${s.failedTests} failed tests. ` : ""}${s.errors.join("; ")}`);
  process.exitCode = skipped.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
