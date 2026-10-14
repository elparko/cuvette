import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const bcftools = await programOf("bcftools");
const python = process.env.PYTHON3 ?? "python3";
const data = join(CATALOG, "bcftools/data");
const toy = join(data, "toy.vcf");
const g1k = join(data, "g1k_chr20_1000000_1100000.vcf.gz");
const slow = 600_000;

// Hand count with the Python standard library, from the VCF text and the rules of the VCF 4.2 specification.
// A SNP has one base in REF and in ALT. A multi-base ALT with the length of REF is a multi-nucleotide change.
// An ALT with another length is an indel. A symbolic ALT (<...>) or a "*" is another type.
// Transitions are A<->G and C<->T. Ts and Tv count each SNP allele.
const parse = `
import gzip
def records(path):
    opener = gzip.open if path.endswith(".gz") else open
    for line in opener(path, "rt"):
        if line.startswith("#"): continue
        f = line.rstrip("\\n").split("\\t")
        info = dict((kv.split("=", 1) + [True])[:2] for kv in f[7].split(";")) if f[7] != "." else {}
        yield {"chrom": f[0], "pos": int(f[1]), "ref": f[3], "alts": f[4].split(","), "qual": None if f[5] == "." else float(f[5]), "filter": f[6], "info": info}
def kind(ref, alt):
    if alt.startswith("<") or alt == "*" or "[" in alt or "]" in alt: return "other"
    if len(ref) == len(alt): return "snp" if len(ref) == 1 else "mnp"
    return "indel"
def tally(recs):
    out = dict(n=0, snps=0, indels=0, others=0, multi=0, ts=0, tv=0)
    for r in recs:
        kinds = {kind(r["ref"], a) for a in r["alts"]}
        out["n"] += 1; out["snps"] += "snp" in kinds; out["indels"] += "indel" in kinds; out["others"] += bool(kinds & {"other", "mnp"}) and not (kinds & {"snp", "indel"})
        out["multi"] += len(r["alts"]) > 1
        for a in r["alts"]:
            if kind(r["ref"], a) == "snp":
                if {r["ref"], a} in ({"A", "G"}, {"C", "T"}): out["ts"] += 1
                else: out["tv"] += 1
    return out
`;

describe.skipIf(process.platform === "win32" || !bcftools)("bcftools adapter against a hand count of the VCF text", () => {
  let tool: OpenAdapter;
  beforeAll(async () => {
    tool = await openAdapter("bcftools");
  });
  afterAll(async () => {
    await tool?.close();
  });

  test("the record, SNP, indel, multiallelic and Ts/Tv counts of the 1000 Genomes region agree with the hand count", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(python, `${parse}\nprint(json.dumps(tally(records(${JSON.stringify(g1k)}))))`);
    const out = await tool.run("vcf_stats", { path: g1k });
    expect(out.metrics).toMatchObject({ n_records: hand.n, n_snps: hand.snps, n_indels: hand.indels, n_others: hand.others, n_multiallelic_sites: hand.multi, ts: hand.ts, tv: hand.tv });
    expect(Math.abs(out.metrics!.ts_tv - hand.ts / hand.tv)).toBeLessThan(0.005);
  });

  test("a region count includes each record that overlaps the region", { timeout: slow }, async () => {
    const hand = await pyJson<{ all: number; snps: number; ts: number; tv: number }>(
      python,
      `${parse}
sel = [r for r in records(${JSON.stringify(g1k)}) if r["pos"] <= 1050000 and r["pos"] + len(r["ref"]) - 1 >= 1000000]
t = tally(sel)
print(json.dumps({"all": t["n"], "snps": t["snps"], "ts": t["ts"], "tv": t["tv"]}))`,
    );
    const out = await tool.run("vcf_stats", { path: g1k, region: "chr20:1000000-1050000" });
    expect(out.metrics).toMatchObject({ n_records: hand.all, n_snps: hand.snps, ts: hand.ts, tv: hand.tv });
  });

  test("the allele frequency filter keeps the records that the hand count keeps", { timeout: slow }, async () => {
    const hand = await pyJson<{ kept: number; snps: number; total: number }>(
      python,
      `${parse}
recs = list(records(${JSON.stringify(g1k)}))
kept = [r for r in recs if any(float(v) >= 0.05 for v in str(r["info"].get("AF", "nan")).split(",") if v != ".")]
print(json.dumps({"kept": len(kept), "snps": tally(kept)["snps"], "total": len(recs)}))`,
    );
    const out = await tool.run("filter_variants", { path: g1k, expression: "INFO/AF>=0.05" });
    expect(out.metrics).toMatchObject({ n_before: hand.total, n_after: hand.kept, n_snps: hand.snps });
  });

  test("the filter status PASS keeps the records with a dot, and each toy filter keeps the records of the hand count", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(
      python,
      `${parse}
dots = list(records(${JSON.stringify(g1k)}))
toy = list(records(${JSON.stringify(toy)}))
q = [r for r in toy if r["qual"] >= 30 and int(r["info"]["DP"]) >= 10]
p = [r for r in q if r["filter"] in ("PASS", ".")]
s = [r for r in p if all(kind(r["ref"], a) == "snp" for a in r["alts"])]
print(json.dumps({"g1k_pass": sum(r["filter"] in ("PASS", ".") for r in dots), "q": len(q), "p": len(p), "s": len(s), "s_indels": tally(s)["indels"]}))`,
    );
    const pass = await tool.run("filter_variants", { path: g1k, min_qual: 0, min_depth: 0, variant_types: "all", filter_status: "PASS" });
    expect(pass.metrics!.n_after).toBe(hand.g1k_pass);
    const q = await tool.run("filter_variants", { path: toy, min_qual: 30, min_depth: 10 });
    const p = await tool.run("filter_variants", { path: toy, min_qual: 30, min_depth: 10, filter_status: "PASS" });
    const s = await tool.run("filter_variants", { path: toy, min_qual: 30, min_depth: 10, filter_status: "PASS", variant_types: "snps" });
    expect([q.metrics!.n_after, p.metrics!.n_after, s.metrics!.n_after]).toEqual([hand.q, hand.p, hand.s]);
    expect(s.metrics!.n_indels).toBe(hand.s_indels);
  });

  // Left alignment (Tan, Abecasis and Kang 2015): trim the common suffix, then move the indel left while the last bases of REF and ALT equal the base before it.
  test("normalization splits each multiallelic record and moves the indels that the hand left-alignment moves", { timeout: slow }, async () => {
    const hand = await pyJson<{ n_after: number; n_split: number; n_realigned: number }>(
      python,
      `${parse}
ref = {}
name = None
for line in open(${JSON.stringify(join(data, "toy.fa"))}):
    if line.startswith(">"): name = line[1:].strip(); ref[name] = ""
    else: ref[name] += line.strip()
n_after = n_split = n_real = 0
for rec in records(${JSON.stringify(toy)}):
    n_after += len(rec["alts"]); n_split += len(rec["alts"]) > 1
    for alt in rec["alts"]:
        if len(rec["ref"]) != len(alt):
            r, a, pos = rec["ref"], alt, rec["pos"]
            while len(r) > 1 and len(a) > 1 and r[-1] == a[-1]: r, a = r[:-1], a[:-1]
            while r[-1] == a[-1] and pos > 1:
                pos -= 1; base = ref[rec["chrom"]][pos - 1]; r, a = base + r[:-1], base + a[:-1]
                while len(r) > 1 and len(a) > 1 and r[-1] == a[-1]: r, a = r[:-1], a[:-1]
            n_real += (pos, r, a) != (rec["pos"], rec["ref"], alt)
print(json.dumps({"n_after": n_after, "n_split": n_split, "n_realigned": n_real}))`,
    );
    const out = await tool.run("normalize_variants", { path: toy, reference: join(data, "toy.fa"), split_multiallelic: "any" });
    expect(out.metrics).toMatchObject({ n_before: 11, n_after: hand.n_after, n_split: hand.n_split, n_realigned: hand.n_realigned });
  });
});
