import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAdapter } from "../../src/adapters/manifest.ts";
import type { AdapterCheckContext, AdapterModule, LoadedAdapter } from "../../src/adapters/manifest.ts";
import type { Entry, FindingIn, Node } from "../../src/core/types.ts";

const STAT_STEPS = new Set([
  "roi_comparison", "region_comparison", "class_comparison", "discriminating_features",
  "multigroup_features", "roi_localization", "marker_panel", "shrunken_centroids",
]);
const PQ_COLUMN = /\b(?:p_value|q_value|p-value|q-value|pval|qval|fdr)\b/i;
const ACK = /\b(?:fail(?:ed|s|ure|ing)?|errors?|errored|couldn['’]?t|could not|can['’]?t|cannot|unable|didn['’]?t work|did not work|went wrong|broke|crash(?:ed)?)\b/i;
const USER_STOPPED = /scientist (?:rejected|stopped)|interrupted|not run/i;
const LIPID = new RegExp(
  "\\b(?:LPC|LPE|LPS|LPI|LPG|LPA|HexCer|Hex2Cer|SHexCer|Sulfatide|Cer|PC|PE|PS|PI|PG|PA|SM|TG|TAG|DG|DAG|MG|FA|CL|ST|GM[123]|GD[123])" +
    "[\\s(-]*(?:[dtOP]-?)?[1-9]\\d:\\d{1,2}",
  "g",
);
const HEDGE = /putativ|tentativ|sum[- ]composition|MS\/MS|MS2|\bcandidates?\b|unconfirmed|not confirmed|isobar/i;
const PVAL = /\b[pPqQ](?:[ -]?values?)?\s*(=|<|>|≤|≥|<=|>=|~|of)\s*((?:\d*\.\d+|\d+)(?:\s*(?:[eE]|[x×]\s*10\^?)\s*-?\d+)?)/g;
const EFFECT = /\bAUC\b|\bAUROC\b|fold[- ]?change|\bfold\b|\blog2|log₂|\bFC\b|Cohen|effect size|odds ratio|Hedges|Cliff|\bd\s*=/i;
const ARTEFACT_WORDS = /isotop|matrix|off-tissue|background|adduct/i;
const EFFECT_WINDOW = 200;

function texts(ctx: AdapterCheckContext): { text: string; entry?: number }[] {
  const out: { text: string; entry?: number }[] = ctx.entries
    .filter((e) => e.kind === "assistant")
    .map((e) => ({ text: String(e.data.text ?? ""), entry: e.id }));
  if (ctx.answer && !out.some((o) => o.text === ctx.answer)) out.push({ text: ctx.answer });
  return out;
}

function tableOf(result: unknown): { columns: string[]; rows: unknown[][] } | undefined {
  const r = result as { table?: unknown; data?: { table?: unknown } } | undefined;
  const t = (r?.table ?? r?.data?.table) as { columns?: string[]; rows?: unknown[][] } | undefined;
  return t?.columns && t.rows ? { columns: t.columns, rows: t.rows } : undefined;
}

function pixelReplication(ctx: AdapterCheckContext): FindingIn[] {
  const unit = String(ctx.decisions.replicate ?? "pixels (exploratory)");
  if (!unit.startsWith("pixels")) return [];
  const hits = ctx.nodes.filter((n) => {
    if (n.tool === "run_analysis" && STAT_STEPS.has(String(n.args.step_id))) return true;
    return PQ_COLUMN.test(JSON.stringify(n.result ?? "").slice(0, 20000));
  });
  if (!hits.length) return [];
  const steps = [...new Set(hits.map((n) => String(n.args.step_id ?? n.tool)))].join(", ");
  return [{
    check: "pixel_replication",
    severity: "error",
    message:
      `The unit of replication is pixels, and statistical tests ran (${steps}). Neighboring pixels are not independent, ` +
      "so the p-values and q-values describe pixels and not biology. Report the effect sizes, call the results exploratory, " +
      "and confirm them on independent sections or animals.",
    nodes: hits.map((n) => n.id),
  }];
}

function failedIgnored(ctx: AdapterCheckContext): FindingIn[] {
  const out: FindingIn[] = [];
  const entries = [...ctx.entries].sort((a, b) => a.id - b.id);
  const blocked = new Set(entries.filter((e) => e.kind === "blocked").map((e) => String(e.data.callId)));
  entries.forEach((r, i) => {
    if (r.kind !== "tool_result" || r.data.ok !== false || blocked.has(String(r.data.callId))) return;
    if (USER_STOPPED.test(String(r.data.error ?? r.data.text ?? ""))) return;
    const after: Entry[] = [];
    for (const e of entries.slice(i + 1)) {
      if (e.kind === "user") break;
      after.push(e);
    }
    if (after.some((e) => e.kind === "assistant" && ACK.test(String(e.data.text ?? "")))) return;
    const tool = String(r.data.tool);
    const retried = entries.slice(i + 1).some((e) => e.kind === "tool_result" && e.data.tool === tool && e.data.ok !== false);
    const err = String(r.data.error ?? "").replace(/\s+/g, " ").slice(0, 160);
    out.push({
      check: "failed_result_ignored",
      severity: retried ? "warning" : "error",
      message:
        `The tool ${tool} failed${err ? ` (${err})` : ""} and the text after it never mentions the failure. ` +
        (retried ? "A later call to the same tool worked. Make sure that call used the same inputs." : "Later conclusions can rest on a step that did not run."),
      entries: [r.id],
      nodes: r.node ? [r.node] : undefined,
    });
  });
  return out;
}

function unhedgedIdentities(ctx: AdapterCheckContext): FindingIn[] {
  const entries: number[] = [];
  const names: string[] = [];
  for (const t of texts(ctx)) {
    const found = t.text.match(LIPID);
    if (found && !HEDGE.test(t.text)) {
      if (t.entry !== undefined) entries.push(t.entry);
      names.push(...found.map((f) => f.replace(/\s+/g, " ")));
    }
  }
  if (!names.length) return [];
  return [{
    check: "putative_identity_stated_as_fact",
    severity: "warning",
    message:
      `The text names lipids (${[...new Set(names)].slice(0, 8).join(", ")}) and does not say that they are putative or at sum-composition level. ` +
      "An identity from m/z alone is a candidate until MS/MS confirms it. Isobars and adducts can have the same mass.",
    entries,
  }];
}

function bareP(ctx: AdapterCheckContext): FindingIn[] {
  const maxQ = Number(ctx.decisions.max_q);
  const entries: number[] = [];
  let hit = false;
  for (const t of texts(ctx)) {
    for (const m of t.text.matchAll(PVAL)) {
      const num = Number(m[2]);
      if (["<", "≤", "<="].includes(m[1]) && Number.isFinite(maxQ) && num === maxQ) continue;
      const start = m.index ?? 0;
      const window = t.text.slice(Math.max(0, start - EFFECT_WINDOW), start + m[0].length + EFFECT_WINDOW);
      if (!EFFECT.test(window)) {
        hit = true;
        if (t.entry !== undefined) entries.push(t.entry);
        break;
      }
    }
  }
  if (!hit) return [];
  return [{
    check: "p_value_without_effect_size",
    severity: "warning",
    message: "The text gives p-values or q-values with no AUC, fold change or other effect size near them. With many pixels almost every difference is significant. The size of the difference matters.",
    entries,
  }];
}

function artefacts(ctx: AdapterCheckContext): FindingIn[] {
  const flagged: Node[] = [];
  for (const n of ctx.nodes) {
    const t = tableOf(n.result);
    const col = t?.columns.indexOf("isotopologue") ?? -1;
    const isotope = col >= 0 && t!.rows.some((r) => r[col] === true);
    if (isotope || JSON.stringify(n.result ?? "").includes("background_clusters")) flagged.push(n);
  }
  if (!flagged.length) return [];
  if (texts(ctx).some((t) => ARTEFACT_WORDS.test(t.text))) return [];
  return [{
    check: "artefacts_not_addressed",
    severity: "warning",
    message:
      "A result shows isotopes of other features or off-tissue background clusters. The text does not say how they were handled. " +
      "Matrix peaks, isotopes and adducts of another feature can look like separate lipids.",
    nodes: flagged.map((n) => n.id),
  }];
}

function noQuestion(ctx: AdapterCheckContext): FindingIn[] {
  if (String(ctx.decisions.question ?? "").trim()) return [];
  return [{
    check: "no_question",
    severity: "info",
    message: "The setup has no study question. A reader cannot tell planned choices from exploratory ones.",
  }];
}

const here = dirname(fileURLToPath(import.meta.url));
let adapter: LoadedAdapter | undefined;

function dotted(args: Record<string, unknown>, path: string): unknown {
  let cur: unknown = args;
  for (const p of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function smilePython(): string | undefined {
  const env = process.env.SMILE_MSI_PYTHON;
  if (env && existsSync(env)) return env;
  const rel = [".venv/bin/python", ".venv/Scripts/python.exe"];
  for (const root of ["Code", "code"]) {
    for (const r of rel) {
      const p = join(homedir(), root, "SMILE-MSI", r);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const mod: AdapterModule = {
  async openPanel(url, { sessionDir }) {
    const python = smilePython();
    if (!python) throw new Error("SMILE MSI was not found. Set SMILE_MSI_PYTHON to its Python.");
    const log = openSync(join(sessionDir, "panel-smile-msi.log"), "a");
    const child = spawn(python, [join(here, "panel", "panel.py"), url], { detached: true, stdio: ["ignore", log, log] });
    closeSync(log);
    child.on("error", () => {});
    child.unref();
    return { close: () => void child.kill() };
  },
  checks: {
    pixel_replication: pixelReplication,
    failed_result_ignored: failedIgnored,
    putative_identity_stated_as_fact: unhedgedIdentities,
    p_value_without_effect_size: bareP,
    artefacts_not_addressed: artefacts,
    no_question: noQuestion,
  },
  manualRoute(tool, args) {
    adapter ??= loadAdapter(here);
    const entry = adapter.mapEntry(tool, args);
    if (!entry) return undefined;
    const fields = entry.params
      .map((p) => ({ p, v: dotted(args, p.arg) }))
      .filter(({ v }) => v !== undefined && v !== null && v !== "")
      .map(({ p, v }) => `${p.label} = ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    if (!fields.length) return entry.route;
    return `${entry.route}. Settings: ${fields.join("; ")}.${entry.route.startsWith("Analyze") ? " Press Run." : ""}`;
  },
};

export default mod;
