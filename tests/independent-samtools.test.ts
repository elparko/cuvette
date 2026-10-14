import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const samtools = await programOf("samtools");
const python = process.env.PYTHON3 ?? "python3";
const slow = 600_000;

// Hand count with the Python standard library, from the flag bits of the SAM specification (section 1.4).
// The script writes a SAM file of 600 random reads in two reference sequences and counts it from the SAM text.
// A read overlaps a region if its first base is at or before the region end and its last base is at or after the region start.
// An unmapped read that has a position counts as one base long.
const makeSam = (path: string) => `
import random
random.seed(7)
refs = {"chr1": 2000, "chr2": 800}
pair_flags = [99, 147, 83, 163, 97, 145, 73, 133, 89, 165, 69, 137, 77, 141]
other = [0, 16, 4, 256, 272, 2048, 2064, 1024, 1040, 512, 99 + 1024, 147 + 256, 83 + 2048, 163 + 512]
rows = []
for i in range(600):
    flag = random.choice(pair_flags) if i % 3 else random.choice(other)
    mapped = not flag & 4
    chrom = random.choice(list(refs))
    pos = random.randint(1, refs[chrom] - 60)
    mapq = random.choice([0, 1, 4, 5, 10, 20, 30, 40, 60]) if mapped else 0
    mate_unmapped = bool(flag & 8)
    if flag & 1:
        mate_chrom = chrom if random.random() < 0.7 else random.choice([c for c in refs if c != chrom])
        mate_pos = random.randint(1, refs[mate_chrom] - 60)
        if mate_unmapped: mate_chrom, mate_pos = chrom, pos
    else:
        mate_chrom, mate_pos = "*", 0
    if not mapped and random.random() < 0.3:
        rname, p = "*", 0
    else:
        rname, p = chrom, pos
    rows.append((rname, p, i, flag, mapq, "50M" if mapped else "*", mate_chrom, mate_pos))
rows.sort(key=lambda r: (r[0] == "*", list(refs).index(r[0]) if r[0] != "*" else 0, r[1], r[2]))
with open(${JSON.stringify(path)}, "w") as out:
    for c, n in refs.items(): out.write(f"@SQ\\tSN:{c}\\tLN:{n}\\n")
    for rname, p, i, flag, mapq, cigar, mc, mp in rows:
        rnext = "=" if mc == rname and mc != "*" else mc
        out.write(f"r{i}\\t{flag}\\t{rname}\\t{p}\\t{mapq}\\t{cigar}\\t{rnext}\\t{mp}\\t0\\t{'A' * 50}\\t{'I' * 50}\\n")
def has(flag, bit): return bool(flag & bit)
def count(sel): return sum(1 for r in rows if sel(r))
def span(r):
    return (r[1], r[1] + 49) if not has(r[3], 4) else (r[1], r[1])
def in_region(r, c, a, b):
    if r[0] != c: return False
    s, e = span(r)
    return s <= b and e >= a
primary = lambda r: not has(r[3], 256 | 2048)
mapped = lambda r: not has(r[3], 4)
`;

describe.skipIf(process.platform === "win32" || !samtools)("samtools adapter against a hand count of the SAM flags", () => {
  let tool: OpenAdapter;
  let root: string;
  let bam: string;
  const sam = () => join(root, "reads.sam");
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-samtools-"));
    tool = await openAdapter("samtools");
  });
  afterAll(async () => {
    await tool?.close();
    rmSync(root, { recursive: true, force: true });
  });

  async function indexed() {
    if (bam) return bam;
    const converted = await tool.run("convert_to_bam", { path: sam() });
    const sorted = await tool.run("sort_bam", { path: converted.data.bam });
    bam = (await tool.run("index_bam", { path: sorted.data.bam })).data.indexed_bam;
    return bam;
  }

  test("the read counts of flagstat agree with the flag bits counted in the SAM text", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(
      python,
      `${makeSam(join(root, "reads.sam"))}
paired = lambda r: primary(r) and has(r[3], 1)
print(json.dumps({
  "total": len(rows), "primary": count(primary), "secondary": count(lambda r: has(r[3], 256)), "supplementary": count(lambda r: has(r[3], 2048)),
  "duplicates": count(lambda r: has(r[3], 1024)), "mapped": count(mapped), "primary_mapped": count(lambda r: primary(r) and mapped(r)),
  "paired_in_sequencing": count(paired), "read1": count(lambda r: paired(r) and has(r[3], 64)), "read2": count(lambda r: paired(r) and has(r[3], 128)),
  "properly_paired": count(lambda r: paired(r) and has(r[3], 2) and mapped(r)),
  "singletons": count(lambda r: paired(r) and mapped(r) and has(r[3], 8)),
  "qc_failed": count(lambda r: has(r[3], 512)),
}))`,
    );
    const out = await tool.run("flagstat", { path: await indexed() });
    expect(out.metrics).toMatchObject({
      primary: hand.primary,
      secondary: hand.secondary,
      supplementary: hand.supplementary,
      duplicates: hand.duplicates,
      primary_mapped: hand.primary_mapped,
      paired_in_sequencing: hand.paired_in_sequencing,
      read1: hand.read1,
      read2: hand.read2,
      properly_paired: hand.properly_paired,
      singletons: hand.singletons,
    });
    expect(out.metrics!.total).toBe(hand.total);
    expect(out.metrics!.qc_failed).toBe(hand.qc_failed);
    expect(out.metrics!.mapped).toBe(hand.mapped);
    expect(out.metrics!.mapped_pct).toBeCloseTo((100 * hand.mapped) / hand.total, 2);
  });

  test("the flagstat total counts the reads that fail the quality check, as the convert tool does", { timeout: slow }, async () => {
    const convertedReads = (await tool.run("convert_to_bam", { path: sam() })).metrics!.n_reads;
    const out = await tool.run("flagstat", { path: await indexed() });
    expect(out.metrics!.total).toBe(convertedReads);
  });

  test("the counts of idxstats agree with the alignments per reference sequence in the SAM text", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(
      python,
      `${makeSam(join(root, "reads.sam"))}
print(json.dumps({"chr1": count(lambda r: r[0] == "chr1" and mapped(r)), "chr2": count(lambda r: r[0] == "chr2" and mapped(r)),
  "placed_unmapped": count(lambda r: r[0] != "*" and not mapped(r)), "unplaced": count(lambda r: r[0] == "*")}))`,
    );
    const out = await tool.run("idxstats", { path: await indexed() });
    expect(out.metrics).toMatchObject({ mapped_chr1: hand.chr1, mapped_chr2: hand.chr2, mapped_total: hand.chr1 + hand.chr2, length_chr1: 2000, length_chr2: 800, n_references: 2 });
    expect(out.metrics!.unmapped_placed).toBe(hand.placed_unmapped);
    expect(out.metrics!.unmapped_unplaced).toBe(hand.unplaced);
  });

  test("filtered and region counts agree with the hand count of mapping quality, flags and overlap", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(
      python,
      `${makeSam(join(root, "reads.sam"))}
print(json.dumps({
  "q30": count(lambda r: r[4] >= 30), "q0": len(rows),
  "no_dup_secondary_unmapped": count(lambda r: not has(r[3], 1024 | 256 | 4)),
  "proper": count(lambda r: has(r[3], 2)), "read1_proper": count(lambda r: has(r[3], 2 | 64) and (r[3] & 66) == 66),
  "region": count(lambda r: in_region(r, "chr1", 500, 700)),
  "region_q20_nodup": count(lambda r: in_region(r, "chr2", 100, 300) and r[4] >= 20 and not has(r[3], 1024)),
}))`,
    );
    const path = await indexed();
    expect((await tool.run("count_reads", { path, min_mapq: 30 })).metrics!.count).toBe(hand.q30);
    expect((await tool.run("count_reads", { path })).metrics!.count).toBe(hand.q0);
    expect((await tool.run("count_reads", { path, exclude_flags: 1284 })).metrics!.count).toBe(hand.no_dup_secondary_unmapped);
    expect((await tool.run("count_reads", { path, require_flags: 2 })).metrics!.count).toBe(hand.proper);
    expect((await tool.run("count_reads", { path, require_flags: 66 })).metrics!.count).toBe(hand.read1_proper);
    expect((await tool.run("count_reads", { path, region: "chr1:500-700" })).metrics!.count).toBe(hand.region);
    expect((await tool.run("count_reads", { path, region: "chr2:100-300", min_mapq: 20, exclude_flags: 1024 })).metrics!.count).toBe(hand.region_q20_nodup);
  });
});
