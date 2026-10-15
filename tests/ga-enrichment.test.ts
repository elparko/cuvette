import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const PY = process.env.CUVETTE_ENRICHMENT_PYTHON || join(homedir(), ".cuvette/envs/enrichment/bin/python");
const DIR = resolve("catalog/enrichment");

function call(fn: string, args: Record<string, unknown>): { ok: boolean; error?: string; summary?: string; data?: { rule?: string } } {
  const code = `import json, sys\nsys.path.insert(0, ${JSON.stringify(DIR)})\nimport ga_enrichment as e\nprint(json.dumps(e.${fn}(**json.loads(sys.argv[1])), default=str))`;
  const out = execFileSync(PY, ["-c", code, JSON.stringify(args)], { encoding: "utf8", cwd: mkdtempSync(join(tmpdir(), "enrichment-")), env: { ...process.env, PYTHONWARNINGS: "ignore" } });
  return JSON.parse(out.trim().split("\n").at(-1)!.replace(/\bNaN\b/g, "null"));
}

describe.skipIf(!existsSync(PY))("enrichment run_ora with lfc_min", () => {
  const root = mkdtempSync(join(tmpdir(), "enrichment-data-"));
  const genes = Array.from({ length: 30 }, (_, i) => `g${i + 1}`);
  const table = join(root, "de.csv");
  writeFileSync(table, "gene,padj,lfc\n" + genes.map((g, i) => `${g},${i < 10 ? 0.001 : 0.5},${i < 6 ? 2 : 0.2}`).join("\n") + "\n");
  const sets = join(root, "sets.gmt");
  writeFileSync(sets, `A\tx\t${genes.slice(0, 8).join("\t")}\nB\tx\t${genes.slice(8, 20).join("\t")}\nC\tx\t${genes.slice(20).join("\t")}\n`);
  const base = { path: table, gene_sets: sets, id_column: "gene", background: "measured genes", min_size: 2, max_size: 100 };

  test("lfc_min without lfc_column stops with a plain message", () => {
    const r = call("run_ora", { ...base, padj_column: "padj", padj_max: 0.05, lfc_min: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/lfc_min 1 needs lfc_column/);
  });

  test("lfc_min with lfc_column shows lfc_min in the rule text", () => {
    const r = call("run_ora", { ...base, padj_column: "padj", padj_max: 0.05, lfc_column: "lfc", lfc_min: 1 });
    expect(r.ok).toBe(true);
    expect(r.data!.rule).toBe("padj < 0.05, |lfc| > 1 (lfc_min)");
  });
});
