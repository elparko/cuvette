import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { CATALOG, openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("phylo");
const python = join(homedir(), ".cuvette/envs/biostats/bin/python");
const mafft = ["/opt/homebrew/bin/mafft", "/usr/local/bin/mafft"].find(existsSync);
const phy = join(CATALOG, "phylo/data/example.phy");
const unaligned = join(CATALOG, "phylo/data/unaligned.fasta");
const slow = 600_000;

const alignmentCode = `
import numpy as np
def read_phylip(path):
    rows = [l.split(None, 1) for l in open(path).read().split("\\n")[1:] if l.strip()]
    return [r[0] for r in rows], [r[1].replace(" ", "").upper() for r in rows]
def read_fasta(path):
    names, seqs = [], []
    for l in open(path).read().split("\\n"):
        if l.startswith(">"): names.append(l[1:].split()[0]); seqs.append("")
        elif l.strip(): seqs[-1] += l.strip().upper()
    return names, seqs
def stats(seqs):
    a = np.array([list(s) for s in seqs])
    n, L = a.shape
    gap = (a == "-")
    constant = sum(1 for j in range(L) if not gap[:, j].any() and len(set(a[:, j])) == 1)
    ident = []
    for i in range(n):
        for k in range(i + 1, n):
            ok = ~gap[i] & ~gap[k]
            if ok.any(): ident.append((a[i][ok] == a[k][ok]).mean())
    return {"n": n, "length": L, "gap_fraction": float(gap.mean()), "constant": constant, "identity": float(np.mean(ident))}
`;

describe.skipIf(!found || !mafft || !existsSync(python))("phylo against numpy and a pruning likelihood", () => {
  let phylo: OpenAdapter;
  let root: string;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "cuvette-phylo-"));
    phylo = await openAdapter("phylo");
  });
  afterAll(async () => {
    await phylo?.close();
    rmSync(root, { recursive: true, force: true });
  });

  // Felsenstein (1981) pruning on the tree that IQ-TREE writes, with the Jukes-Cantor model (1969): P(same) = 1/4 + 3/4 exp(-4t/3), P(other) = 1/4 - 1/4 exp(-4t/3).
  // A gap counts as a missing state. The first lines of the code read the Newick text with a small parser written for this test.
  test("the log-likelihood and the tree length of a JC tree equal the pruning likelihood of the written tree, and MFP picks the BIC model", { timeout: slow }, async () => {
    const out = await phylo.run("infer_tree", { path: phy, model: "JC", bootstrap_type: "none", seed: 1 });
    const hand = await pyJson<{ ll: number; length: number; patterns: number; leaves: number }>(
      python,
      `${alignmentCode}
import re
names, seqs = read_phylip(${JSON.stringify(phy)})
text = open(${JSON.stringify(out.data.treefile)}).read().strip()
pos = 0
def parse():
    global pos
    if text[pos] == "(":
        pos += 1
        kids = []
        while True:
            kids.append(parse())
            if text[pos] == ",": pos += 1; continue
            break
        pos += 1
        m = re.match(r"[^:,();]*", text[pos:]); pos += len(m.group(0))
        node = {"kids": kids}
    else:
        m = re.match(r"[^:,();]+", text[pos:]); pos += len(m.group(0))
        node = {"name": m.group(0)}
    if text[pos] == ":":
        m = re.match(r":([0-9.eE+-]+)", text[pos:]); pos += len(m.group(0)); node["t"] = float(m.group(1))
    else: node["t"] = 0.0
    return node
tree = parse()
idx = {n: i for i, n in enumerate(names)}
code = {"A": 0, "C": 1, "G": 2, "T": 3}
L = len(seqs[0])
tip = np.ones((len(seqs), L, 4))
for i, s in enumerate(seqs):
    for j, c in enumerate(s):
        if c in code: tip[i, j] = 0; tip[i, j, code[c]] = 1
def partial(node):
    if "name" in node: return tip[idx[node["name"]]]
    out = np.ones((L, 4))
    for k in node["kids"]:
        t = k["t"]; e = np.exp(-4 * t / 3)
        P = np.full((4, 4), 0.25 - 0.25 * e) + np.eye(4) * e
        out = out * (partial(k) @ P.T)
    return out
ll = float(np.log((partial(tree) * 0.25).sum(1)).sum())
def total(n): return n["t"] + sum(total(k) for k in n.get("kids", []))
def leaves(n): return 1 if "name" in n else sum(leaves(k) for k in n["kids"])
cols = {tuple(c) for c in zip(*seqs)}
print(json.dumps({"ll": ll, "length": total(tree), "patterns": len(cols), "leaves": leaves(tree)}))`,
    );
    expect(hand.leaves).toBe(17);
    expect(Math.abs(out.metrics.log_likelihood - hand.ll)).toBeLessThan(0.01);
    expect(Math.abs(out.metrics.tree_length - hand.length)).toBeLessThan(0.001);
    expect(out.metrics.n_sequences).toBe(17);
    expect(out.metrics.n_sites).toBe(1998);
    expect(out.metrics.site_patterns).toBeLessThanOrEqual(hand.patterns);

    const select = await phylo.run("select_model", { path: phy, seed: 1 });
    const auto = await phylo.run("infer_tree", { path: phy, model: "MFP", bootstrap_type: "none", seed: 1 });
    const bic = String(select.data.best_model_bic).split(/\s+/)[0];
    expect(String(auto.data.model).replace(/\s.*/, "")).toBe(bic);
  });

  // numpy counts: a constant column has one letter and no gap. The identity of two sequences uses the columns where both have a letter.
  test("the alignment statistics of the PHYLIP example agree with numpy", { timeout: slow }, async () => {
    const fasta = join(root, "example.fasta");
    const hand = await pyJson<{ n: number; length: number; gap_fraction: number; constant: number; identity: number }>(
      python,
      `${alignmentCode}
names, seqs = read_phylip(${JSON.stringify(phy)})
open(${JSON.stringify(fasta)}, "w").write("".join(">%s\\n%s\\n" % (a, b) for a, b in zip(names, seqs)))
print(json.dumps(stats(seqs)))`,
    );
    const out = await phylo.run("alignment_stats", { path: fasta });
    expect(out.metrics.n_sequences).toBe(hand.n);
    expect(out.metrics.alignment_length).toBe(hand.length);
    expect(out.metrics.constant_columns).toBe(hand.constant);
    expect(Math.abs(out.metrics.gap_fraction - hand.gap_fraction)).toBeLessThan(5e-5);
    expect(Math.abs(out.metrics.mean_pairwise_identity - hand.identity)).toBeLessThan(5e-5);

    for (const maxGap of [0, 0.05, 0.5]) {
      const trimmed = await phylo.run("trim_alignment", { path: fasta, max_gap_fraction: maxGap });
      const want = await pyJson<{ kept: number }>(
        python,
        `${alignmentCode}
names, seqs = read_fasta(${JSON.stringify(fasta)})
a = np.array([list(s) for s in seqs])
print(json.dumps({"kept": int(((a == "-").mean(0) <= ${maxGap}).sum())}))`,
      );
      expect(trimmed.metrics.alignment_length, `max gap ${maxGap}`).toBe(want.kept);
      expect(trimmed.metrics.columns_removed).toBe(hand.length - want.kept);
    }
  });

  test("an MAFFT alignment keeps every input sequence and its statistics agree with numpy", { timeout: slow }, async () => {
    const out = await phylo.run("align_sequences", { path: unaligned, algorithm: "linsi" });
    const hand = await pyJson<{ n: number; length: number; gap_fraction: number; constant: number; identity: number; intact: boolean }>(
      python,
      `${alignmentCode}
names, seqs = read_fasta(${JSON.stringify(out.data.alignment)})
n0, s0 = read_fasta(${JSON.stringify(unaligned)})
r = stats(seqs)
r["intact"] = names == n0 and [s.replace("-", "") for s in seqs] == s0
print(json.dumps(r))`,
    );
    expect(hand.intact).toBe(true);
    expect(out.metrics.sequences_intact).toBe(1);
    expect(out.metrics.alignment_length).toBe(hand.length);
    expect(out.metrics.constant_columns).toBe(hand.constant);
    expect(Math.abs(out.metrics.gap_fraction - hand.gap_fraction)).toBeLessThan(5e-5);
    expect(Math.abs(out.metrics.mean_pairwise_identity - hand.identity)).toBeLessThan(5e-5);
    expect(readFileSync(out.data.alignment, "utf8").startsWith(">")).toBe(true);
  });
});
