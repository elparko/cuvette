import csv
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import mageck_version, Fail, as_list, copy_out, number, read_counts, read_tsv, run_mageck, run_tool, table_of, work_dir, write_clean_table

NORM = ["median", "total", "none", "control"]


def read_design(path, samples):
    if not path:
        raise Fail("give design, the path of the design matrix: a tab-separated file with the sample names in the first column and one column of 0 and 1 for each condition, including a column named baseline")
    if not os.path.isfile(path):
        raise Fail("design: file not found: %s" % path)
    with open(path, newline="") as f:
        head = f.readline()
        f.seek(0)
        delim = "\t" if "\t" in head else ("," if "," in head else None)
        rows = [r for r in csv.reader(f, delimiter=delim) if r] if delim else [r.split() for r in f.read().splitlines() if r.strip()]
    header = [h.strip() for h in rows[0]]
    if len(header) < 2:
        raise Fail("design: %s needs a header row with the sample column and one column for each condition" % path)
    labels = header[1:]
    if "baseline" not in labels:
        raise Fail("design: %s has no column named baseline. Add a column of 1 for all samples. Columns: %s" % (path, ", ".join(header)))
    names = [r[0].strip() for r in rows[1:]]
    for n in names:
        if n not in samples:
            raise Fail("design: the sample '%s' is not a column of the count table. Samples: %s" % (n, ", ".join(samples)))
    for r in rows[1:]:
        if len(r) != len(header):
            raise Fail("design: the row of sample '%s' has %d fields, but the header has %d" % (r[0], len(r), len(header)))
        for v in r[1:]:
            if v.strip() not in ("0", "1"):
                raise Fail("design: the row of sample '%s' has the value '%s'. Each value must be 0 or 1." % (r[0], v))
    return header, rows[1:], labels


def body(p):
    header, rows = read_counts(p.get("counts"))
    dheader, drows, labels = read_design(p.get("design"), header[2:])
    norm = p.get("norm_method")
    if not norm:
        raise Fail("norm_method is not set. It is the decision 'Normalization of the read counts'. Ask the scientist.")
    if norm not in NORM:
        raise Fail("norm_method '%s' is not known. Choices: %s" % (norm, ", ".join(NORM)))
    control_sgrna = p.get("control_sgrna")
    if norm == "control" and not control_sgrna:
        raise Fail("norm_method control needs control_sgrna, the path of a text file with one control sgRNA name on each line")
    rounds = p.get("permutation_rounds")
    rounds = 10 if rounds in (None, "") else int(rounds)
    if rounds < 0:
        raise Fail("permutation_rounds must be 0 or more (count), not %d. Use 0 to skip the permutation and keep the Wald p values." % rounds)
    fdr_cutoff = number(p.get("fdr_cutoff"))
    fdr_cutoff = 0.05 if fdr_cutoff is None else fdr_cutoff
    top_n = int(p.get("top_n") or 20)
    report_genes = as_list(p.get("report_genes"))

    work = work_dir()
    table = os.path.join(work, "counts.txt")
    write_clean_table(header, rows, table)
    design = os.path.join(work, "design.txt")
    with open(design, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        w.writerow(dheader)
        w.writerows(drows)
    args = ["mle", "-k", table, "-d", design, "-n", "model", "--norm-method", norm, "--permutation-round", str(rounds)]
    if control_sgrna:
        args += ["--control-sgrna", control_sgrna]
    log = run_mageck(args, work, "mle")

    path = os.path.join(work, "model.gene_summary.txt")
    genes = read_tsv(path)
    copy_out("gene_summary", path)
    copy_out("sgrna_summary", os.path.join(work, "model.sgrna_summary.txt"))
    conds = [c for c in labels if c != "baseline"]
    if not conds:
        raise Fail("design: %s has only the baseline column. Add a column for each condition that you want a beta score for." % p.get("design"))
    metrics = {"n_genes": len(genes), "n_sgrnas": len(rows), "permutation_rounds": rounds, "fdr_cutoff": fdr_cutoff}
    for c in conds:
        beta = [(number(g.get(c + "|beta")), number(g.get(c + "|fdr")) if rounds > 0 else number(g.get(c + "|wald-fdr"))) for g in genes]
        metrics["n_neg_%s" % c] = sum(1 for b, f in beta if b is not None and f is not None and b < 0 and f < fdr_cutoff)
        metrics["n_pos_%s" % c] = sum(1 for b, f in beta if b is not None and f is not None and b > 0 and f < fdr_cutoff)
    by_id = {g["Gene"]: g for g in genes}
    missing = [g for g in report_genes if g not in by_id]
    if missing:
        raise Fail("report_genes names genes that are not in the screen: %s" % ", ".join(missing))
    for name in report_genes:
        g = by_id[name]
        for c in conds:
            for f in ("beta", "z", "p-value", "fdr", "wald-p-value", "wald-fdr"):
                v = number(g.get("%s|%s" % (c, f)))
                if v is not None:
                    metrics["%s_%s_%s" % (name, c, f.replace("-", "_"))] = v
        metrics["%s_sgrnas" % name] = number(g.get("sgRNA"))

    show = conds[0]
    ordered = sorted(genes, key=lambda g: number(g.get(show + "|beta")) if number(g.get(show + "|beta")) is not None else 0.0)
    cols = ["gene", "sgRNAs"] + ["%s %s" % (show, f) for f in ("beta", "z", "p value", "FDR")]
    shown = [[g["Gene"], number(g["sgRNA"]), number(g[show + "|beta"]), number(g[show + "|z"]), number(g[show + "|p-value"]), number(g[show + "|fdr"])] for g in ordered[:top_n]]
    per = "; ".join("%s: %d genes with beta below 0 and %s FDR < %g, %d above 0" % (c, metrics["n_neg_%s" % c], "permutation" if rounds > 0 else "Wald", fdr_cutoff, metrics["n_pos_%s" % c]) for c in conds)
    warns = []
    if rounds == 0:
        warns.append("no permutation: the counts of genes use the Wald false discovery rate, and the permutation p values are empty. The beta scores do not depend on the rounds.")
    elif rounds < 10:
        warns.append("%d permutation rounds are too few for stable p values. The beta scores do not depend on the rounds." % rounds)
    return {
        "ok": True,
        "summary": "Beta scores for %d genes and %d sgRNAs, conditions %s, normalization %s. %s. The table shows the most negative beta of %s." % (len(genes), len(rows), ", ".join(conds), norm, per, show),
        "metrics": metrics,
        "data": {"program_version": mageck_version(), "gene_summary_file": os.environ.get("GA_OUTPUT_GENE_SUMMARY", ""), "sgrna_summary_file": os.environ.get("GA_OUTPUT_SGRNA_SUMMARY", ""), "conditions": conds, "normalization": norm,
                 "p_values_note": "The permutation p values and FDR change a little between runs. The beta and z values do not.", "warnings": warns},
        "table": table_of(cols, shown, os.environ.get("GA_OUTPUT_GENE_SUMMARY", "")),
        "manualRoute": "mageck mle -k counts.txt -d designmat.txt -n model --norm-method %s --permutation-round %d" % (norm, rounds),
    }


run_tool(body)
