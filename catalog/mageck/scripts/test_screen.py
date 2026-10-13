import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import mageck_version, Fail, as_list, check_labels, copy_out, number, read_counts, read_tsv, run_mageck, run_tool, table_of, work_dir, write_clean_table

NORM = ["median", "total", "none", "control"]
REMOVE_ZERO = ["none", "control", "treatment", "both", "any"]
ADJUST = ["fdr", "holm", "pounds"]
LFC = ["median", "alphamedian", "mean", "alphamean", "secondbest"]


def pick_choice(p, key, default, choices):
    v = p.get(key)
    if v in (None, ""):
        v = default
    if v not in choices:
        raise Fail("%s '%s' is not known. Choices: %s" % (key, v, ", ".join(choices)))
    return v


def body(p):
    header, rows = read_counts(p.get("counts"))
    treatment = as_list(p.get("treatment"))
    control = as_list(p.get("control"))
    check_labels(header, treatment, "treatment")
    check_labels(header, control, "control")
    both = set(treatment) & set(control)
    if both:
        raise Fail("the sample '%s' is in both treatment and control. Each sample must be in one group." % sorted(both)[0])
    norm = pick_choice(p, "norm_method", None, NORM) if p.get("norm_method") else None
    if norm is None:
        raise Fail("norm_method is not set. It is the decision 'Normalization of the read counts'. Ask the scientist.")
    remove_zero = pick_choice(p, "remove_zero", None, REMOVE_ZERO) if p.get("remove_zero") else None
    if remove_zero is None:
        raise Fail("remove_zero is not set. It is the decision 'sgRNAs with zero counts'. Ask the scientist.")
    adjust = pick_choice(p, "adjust_method", "fdr", ADJUST)
    lfc_method = pick_choice(p, "gene_lfc_method", "median", LFC)
    direction = pick_choice(p, "direction", "neg", ["neg", "pos"])
    paired = bool(p.get("paired"))
    if paired and len(treatment) != len(control):
        raise Fail("paired is true but treatment has %d samples and control has %d. A paired test needs the same number, in the same order." % (len(treatment), len(control)))
    threshold = number(p.get("gene_test_threshold"))
    threshold = 0.25 if threshold is None else threshold
    if not 0 < threshold <= 1:
        raise Fail("gene_test_threshold must be a fraction above 0 and at most 1, not %s" % p.get("gene_test_threshold"))
    fdr_cutoff = number(p.get("fdr_cutoff"))
    fdr_cutoff = 0.05 if fdr_cutoff is None else fdr_cutoff
    top_n = int(p.get("top_n") or 20)
    report_genes = as_list(p.get("report_genes"))
    control_sgrna = p.get("control_sgrna")
    if norm == "control" and not control_sgrna:
        raise Fail("norm_method control needs control_sgrna, the path of a text file with one control sgRNA name on each line")
    if control_sgrna and not os.path.isfile(control_sgrna):
        raise Fail("control_sgrna: file not found: %s" % control_sgrna)

    work = work_dir()
    table = os.path.join(work, "counts.txt")
    write_clean_table(header, rows, table)
    args = ["test", "-k", table, "-t", ",".join(treatment), "-c", ",".join(control), "-n", "screen", "--norm-method", norm,
            "--remove-zero", remove_zero, "--adjust-method", adjust, "--gene-lfc-method", lfc_method, "--gene-test-fdr-threshold", str(threshold), "--sort-criteria", direction]
    if paired:
        args.append("--paired")
    if control_sgrna:
        args += ["--control-sgrna", control_sgrna]
    log = run_mageck(args, work, "test")

    genes = read_tsv(os.path.join(work, "screen.gene_summary.txt"))
    sg = os.path.join(work, "screen.sgrna_summary.txt")
    copy_out("gene_summary", os.path.join(work, "screen.gene_summary.txt"))
    copy_out("sgrna_summary", sg)
    n_sgrna = len(read_tsv(sg))
    factors = re.findall(r"Final size factor: (.*)", log)
    removed = re.findall(r"Before RRA, (\d+) sgRNAs are removed", log)

    def col(g, name):
        return number(g.get(name))

    def below(g, name):
        v = col(g, name)
        return v is not None and v < fdr_cutoff

    sign = {"neg": "neg", "pos": "pos"}
    n_neg = sum(1 for g in genes if below(g, "neg|fdr"))
    n_pos = sum(1 for g in genes if below(g, "pos|fdr"))
    ranked = sorted(genes, key=lambda g: int(g[sign[direction] + "|rank"]))
    metrics = {"n_genes": len(genes), "n_sgrnas": n_sgrna, "n_neg_fdr": n_neg, "n_pos_fdr": n_pos, "fdr_cutoff": fdr_cutoff,
               "sgrnas_removed_zero": int(removed[0]) if removed else 0}
    if factors:
        for i, f in enumerate(factors[0].split()):
            metrics["size_factor_%d" % (i + 1)] = float(f)
    by_id = {g["id"]: g for g in genes}
    missing = [g for g in report_genes if g not in by_id]
    if missing:
        raise Fail("report_genes names genes that are not in the screen: %s" % ", ".join(missing))
    for name in report_genes:
        g = by_id[name]
        for f in ("score", "p-value", "fdr", "rank", "lfc"):
            v = col(g, "neg|" + f)
            if v is not None:
                metrics["%s_neg_%s" % (name, f.replace("-", "_"))] = v
        for f in ("score", "p-value", "fdr", "rank"):
            v = col(g, "pos|" + f)
            if v is not None:
                metrics["%s_pos_%s" % (name, f.replace("-", "_"))] = v
        metrics["%s_sgrnas" % name] = col(g, "num")

    cols = ["gene", "sgRNAs", direction + " score", direction + " p value", direction + " FDR", direction + " rank", "good sgRNAs", "log2 fold change"]
    shown = [[g["id"], int(g["num"]), col(g, direction + "|score"), col(g, direction + "|p-value"), col(g, direction + "|fdr"), int(g[direction + "|rank"]), int(g[direction + "|goodsgrna"]), col(g, direction + "|lfc")] for g in ranked[:top_n]]
    top_names = ", ".join(g["id"] for g in ranked[:5])
    warns = []
    if n_neg == 0 and n_pos == 0:
        warns.append("no gene passes FDR < %g in either direction. Lower the cutoff only if the scientist agrees. Look at the top genes and the log2 fold change." % fdr_cutoff)
    if len(treatment) < 2 or len(control) < 2:
        warns.append("one sample in a group: the sgRNA p values come from a variance model that borrows across all sgRNAs. Replicates make the result more reliable.")
    summary = "%d genes, %d sgRNAs, normalization %s, gene log2 fold change %s. Genes with FDR < %g: %d negatively selected (depleted), %d positively selected (enriched). Top %d by %s selection: %s.%s" % (
        len(genes), n_sgrna, norm, lfc_method, fdr_cutoff, n_neg, n_pos, min(5, len(ranked)), "negative" if direction == "neg" else "positive", top_names, (" Warnings: " + "; ".join(warns)) if warns else "")
    return {
        "ok": True,
        "summary": summary,
        "metrics": metrics,
        "data": {"program_version": mageck_version(), "gene_summary_file": os.environ.get("CUVETTE_OUTPUT_GENE_SUMMARY", ""), "sgrna_summary_file": os.environ.get("CUVETTE_OUTPUT_SGRNA_SUMMARY", ""), "normalization": norm, "direction": direction,
                 "treatment": treatment, "control": control, "p_values_note": "The RRA p values come from a permutation test. They change a little between runs.", "warnings": warns},
        "table": table_of(cols, shown, os.environ.get("CUVETTE_OUTPUT_GENE_SUMMARY", "")),
        "manualRoute": "mageck test -k counts.txt -t %s -c %s -n screen --norm-method %s" % (",".join(treatment), ",".join(control), norm),
    }


run_tool(body)
