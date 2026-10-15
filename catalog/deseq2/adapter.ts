import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AdapterModule } from "../../src/adapters/manifest.ts";

const QUANT = /(^|[\\/])(quant\.sf(\.gz)?|abundance\.(h5|tsv))$|\.(genes|isoforms)\.results(\.gz)?$/;

function program(file: string): string {
  if (/quant\.sf/.test(file)) return "Salmon quant.sf";
  if (/abundance\./.test(file)) return "kallisto abundance";
  return "RSEM .results";
}

function files(dir: string, depth = 2): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (depth > 0) out.push(...files(p, depth - 1));
    } else out.push(p);
  }
  return out;
}

function head(path: string, bytes = 65536): string {
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(bytes);
  const n = readSync(fd, buf, 0, bytes, 0);
  closeSync(fd);
  return buf.subarray(0, n).toString("utf8");
}

export function detectInput(args: Record<string, unknown>): { value: string; reason: string } | undefined {
  const path = typeof args.counts === "string" ? args.counts : "";
  if (!path || !existsSync(path)) return undefined;
  if (/\.rds$/i.test(path)) return { value: "SummarizedExperiment rds", reason: "The input is a saved R object (.rds)." };
  if (statSync(path).isDirectory()) {
    const quant = files(path).filter((f) => QUANT.test(f));
    if (quant.length) return { value: "transcript quantification", reason: `The folder has ${quant.length} ${program(quant[0])} files.` };
    return { value: "count matrix", reason: "The folder has no Salmon, kallisto or RSEM files, so it is read as one HTSeq count file for each sample." };
  }
  if (QUANT.test(path)) return { value: "transcript quantification", reason: `The input is a ${program(path)} file.` };
  if (typeof args.lengths === "string" && args.lengths) return { value: "counts and lengths", reason: "A length table was given with the counts." };
  const lines = head(path).split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
  const sep = lines[0]?.includes("\t") ? "\t" : ",";
  const decimal = lines.slice(1, -1).some((l) => l.split(sep).slice(1).some((v) => /^-?\d*\.\d*[1-9]\d*(e[-+]?\d+)?$/i.test(v.trim())));
  if (decimal) return { value: "counts and lengths", reason: "The counts have decimals. They look like estimated counts from Salmon, kallisto or RSEM, which need the transcript lengths." };
  return { value: "count matrix", reason: "The table has whole-number counts." };
}

const mod: AdapterModule = {
  suggest(key, args) {
    return key === "input_type" ? detectInput(args) : undefined;
  },
};

export default mod;
