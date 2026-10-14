import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const fastqc = await programOf("fastqc");
const python = process.env.PYTHON3 ?? "python3";
const good = join(CATALOG, "fastqc/data/good_sequence_short.fastq.gz");
const bad = join(CATALOG, "fastqc/data/bad_sequence.fastq.gz");
const slow = 600_000;

interface Hand {
  total: number;
  length: number;
  gc: number;
  lowest_char: number;
  content: string;
  n_content: string;
  quality_33: string;
  quality_64: string;
}

// Hand computation from the reads with the Python standard library.
// Rules from the FastQC help pages (Babraham Bioinformatics):
//  per base sequence content: WARN if |A-T| or |G-C| is above 10 percent at any position, FAIL above 20.
//  per base N content: WARN if N is above 5 percent at any position, FAIL above 20.
//  per base sequence quality: WARN if a lower quartile is below 10 or a median is below 25, FAIL below 5 or below 20.
const hand = (file: string) => `
import gzip
lines = gzip.open(${JSON.stringify(file)}, "rt").read().split("\\n")
reads = [(lines[i + 1], lines[i + 3]) for i in range(0, len(lines) - 3, 4)]
n = len(reads); width = max(len(s) for s, _ in reads)
base = "".join(s for s, _ in reads)
acgt = sum(base.count(c) for c in "ACGT")
def status(worst, warn, fail):
    return "FAIL" if worst > fail else "WARN" if worst > warn else "PASS"
at = gc = nn = 0.0
for p in range(width):
    col = [s[p] for s, _ in reads]
    c = {k: col.count(k) for k in "ACGTN"}
    acgt_p = sum(c[k] for k in "ACGT")
    at = max(at, abs(c["A"] - c["T"]) / acgt_p * 100); gc = max(gc, abs(c["G"] - c["C"]) / acgt_p * 100)
    nn = max(nn, c["N"] / n * 100)
def quality(offset):
    worst = "PASS"
    for p in range(width):
        scores = sorted(ord(q[p]) - offset for _, q in reads)
        lower, median = scores[int(len(scores) * 0.25) - 1], scores[int(len(scores) * 0.5) - 1]
        if lower < 5 or median < 20: return "FAIL"
        if lower < 10 or median < 25: worst = "WARN"
    return worst
print(json.dumps({
    "total": n, "length": width, "gc": (base.count("G") + base.count("C")) / acgt * 100,
    "lowest_char": min(ord(c) for _, q in reads for c in q),
    "content": status(max(at, gc), 10, 20), "n_content": status(nn, 5, 20),
    "quality_33": quality(33), "quality_64": quality(64),
}))
`;

describe.skipIf(process.platform === "win32" || !fastqc || !existsSync(good) || !existsSync(bad))("FastQC against a hand computation on the reads", () => {
  let tool: OpenAdapter;
  beforeAll(async () => {
    tool = await openAdapter("fastqc");
  });
  afterAll(async () => {
    await tool?.close();
  });

  test.each([
    ["good_file", good],
    ["bad_file", bad],
  ])("the counts and the three module statuses of %s agree with the hand computation", { timeout: slow }, async (_name, file) => {
    const h = await pyJson<Hand>(python, hand(file));
    const out = await tool.run("run_fastqc", { path: file });
    expect(out.metrics!.total_sequences).toBe(h.total);
    expect(out.metrics!.sequence_length).toBe(h.length);
    expect(out.metrics!.gc_percent).toBe(Math.round(h.gc));
    expect(out.data!.module_per_base_sequence_content).toBe(h.content);
    expect(out.data!.module_per_base_n_content).toBe(h.n_content);
    expect(out.data!.module_per_base_sequence_quality).toBe(h.quality_33);
  });

  // The lowest quality character of bad_sequence is B (66), so the file has the Illumina 1.5 encoding. FastQC 0.13.0 decodes with offset 33 unless it gets --phred64.
  test("the encoding argument changes the quality status the way the hand computation with offset 64 does", { timeout: slow }, async () => {
    const h = await pyJson<Hand>(python, hand(bad));
    expect(h.lowest_char).toBeGreaterThanOrEqual(66);
    expect(h.quality_33).toBe("PASS");
    expect(h.quality_64).toBe("FAIL");
    const auto = await tool.run("run_fastqc", { path: bad });
    const old = await tool.run("run_fastqc", { path: bad, encoding: "phred64" });
    expect(auto.data!.encoding).toBe("Sanger / Illumina 1.9");
    expect(auto.data!.log_note).toMatch(/Phred64/);
    expect(old.data!.module_per_base_sequence_quality).toBe(h.quality_64);
  });
});
