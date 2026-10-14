import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("cloning");
const python = join(homedir(), ".cuvette/envs/cloning/bin/python");
const data = join(CATALOG, "cloning/data");
const slow = 600_000;

describe.skipIf(!found || !existsSync(python))("cloning adapter against hand computations", () => {
  let cloning: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-cloning-"));
    cloning = await openAdapter("cloning");
  });
  afterAll(async () => {
    await cloning?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // Mott's rule (Richterich 1998, as in Phred and Biopython abi-trim): the score of a base is 0.05 minus its error probability.
  // The kept part is the stretch of bases with the largest sum of scores. The hand search tries every start and end.
  test("the quality trim of a FASTQ read keeps the stretch with the largest score sum, also after a long bad stretch", { timeout: slow }, async () => {
    const fastq = join(root, "bad_middle.fastq");
    const hand = await pyJson<{ start: number; end: number; length: number; ref_start: number }>(
      python,
      `
import numpy as np
from Bio import SeqIO
ref = str(next(SeqIO.parse(${JSON.stringify(join(data, "sanger_reference.fasta"))}, "fasta")).seq).upper()
seq = ref[100:290]
qual = [40] * 60 + [3] * 30 + [40] * 100
score = [0.05 - 10 ** (-q / 10) for q in qual]
best = (-1e9, 0, 0)
for i in range(len(score)):
    total = 0.0
    for j in range(i, len(score)):
        total += score[j]
        if total > best[0] + 1e-12: best = (total, i, j + 1)
with open(${JSON.stringify(fastq)}, "w") as f:
    f.write("@r\\n%s\\n+\\n%s\\n" % (seq, "".join(chr(33 + q) for q in qual)))
print(json.dumps({"start": best[1], "end": best[2], "length": best[2] - best[1], "ref_start": 100 + best[1] + 1}))`,
    );
    const out = await cloning.run("align_sanger_read", { read: fastq, reference: join(data, "sanger_reference.fasta"), trim: true });
    expect(hand).toMatchObject({ start: 90, end: 190 });
    expect(out.metrics.read_length_used).toBe(hand.length);
    expect(out.metrics.aligned_ref_start_1based).toBe(hand.ref_start);
    expect(out.metrics.mismatches).toBe(0);
  });

  // Biopython abi-trim keeps one base fewer at the 3' end than the classic rule (see the test sanger-synthetic of the adapter).
  test("the quality trim of a FASTQ read is within one base of Biopython abi-trim for the same bases and qualities", { timeout: slow }, async () => {
    const fastq = join(root, "from_ab1.fastq");
    const hand = await pyJson<number>(
      python,
      `
from Bio import SeqIO
read = SeqIO.read(${JSON.stringify(join(data, "3730.ab1"))}, "abi")
SeqIO.write(read, ${JSON.stringify(fastq)}, "fastq")
print(len(SeqIO.read(${JSON.stringify(join(data, "3730.ab1"))}, "abi-trim")))`,
    );
    const out = await cloning.run("align_sanger_read", { read: fastq, reference: join(data, "sanger_reference.fasta"), trim: true });
    expect(Math.abs(out.metrics.read_length_used - hand)).toBeLessThanOrEqual(1);
  });
});
