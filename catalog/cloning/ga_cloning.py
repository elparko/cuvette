import os
import re
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import primer3
from Bio import Restriction, SeqIO
from Bio.Align import PairwiseAligner
from Bio.Seq import Seq
from Bio.SeqUtils import gc_fraction
from Bio.SeqUtils import MeltingTemp as mt

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
SETTINGS = os.path.join(HERE, "data", "primer3web_v4_0_0_default_settings.txt")
FORMATS = {".gb": "genbank", ".gbk": "genbank", ".genbank": "genbank", ".fa": "fasta", ".fasta": "fasta", ".fna": "fasta",
           ".dna": "snapgene", ".ab1": "abi", ".abi": "abi", ".fastq": "fastq", ".fq": "fastq"}
SALT = {"santalucia": "santalucia", "schildkraut": "schildkraut"}


def _fail(message):
    return {"ok": False, "error": message}


def _style():
    plt.rcParams.update({
        "font.size": 10, "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none",
    })


def _save(fig, stem):
    png = os.path.join(os.getcwd(), stem + ".png")
    svg = os.path.join(os.getcwd(), stem + ".svg")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(svg, bbox_inches="tight")
    plt.close(fig)
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def _table(frame, name, limit=20):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    rows = [[(None if isinstance(v, float) and np.isnan(v) else (v.item() if hasattr(v, "item") else v)) for v in r]
            for r in frame.head(limit).itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _read(path):
    path = os.path.expanduser(str(path))
    if not os.path.exists(path):
        return None, "File not found: %s." % path
    ext = os.path.splitext(path)[1].lower()
    fmt = FORMATS.get(ext)
    if not fmt:
        return None, "Unknown sequence file type %s in %s. Use FASTA, GenBank, SnapGene .dna, ABI .ab1 or FASTQ." % (ext, path)
    try:
        records = list(SeqIO.parse(path, fmt))
    except Exception as e:
        return None, "Could not read %s as %s: %s" % (path, fmt, e)
    if not records:
        return None, "No sequence in %s (read as %s)." % (path, fmt)
    return records, fmt


def _template(path_or_seq):
    text = str(path_or_seq or "").strip()
    if re.fullmatch(r"[ACGTUNacgtunRYKMSWBDHVrykmswbdhv\s]+", text) and len(text) >= 10:
        return re.sub(r"\s", "", text).upper(), "sequence", None
    records, fmt = _read(text)
    if records is None:
        return None, None, fmt
    rec = records[0]
    return str(rec.seq).upper(), rec.id, rec


def _topology(rec, fmt, choice):
    if choice in ("linear", "circular"):
        return choice
    top = (rec.annotations.get("topology") if rec is not None else None) or ""
    return top if top in ("linear", "circular") else None


def read_sequence(path):
    records, fmt = _read(path)
    if records is None:
        return _fail(fmt)
    rec = records[0]
    seq = str(rec.seq)
    metrics = {"n_records": len(records), "length_bp": len(seq), "gc_percent": round(100 * gc_fraction(seq), 3) if seq else 0.0,
               "n_features": len(rec.features)}
    data = {"id": rec.id, "format": fmt, "topology": rec.annotations.get("topology", "not stated")}
    summary = "%s: %s, %d bp, GC %.1f%%, topology %s, %d features." % (os.path.basename(path), fmt, len(seq), metrics["gc_percent"], data["topology"], len(rec.features))
    out = {"ok": True, "metrics": metrics, "data": data}
    if fmt == "abi":
        q = np.array(rec.letter_annotations.get("phred_quality", []), dtype=float)
        trimmed = SeqIO.read(os.path.expanduser(path), "abi-trim")
        metrics.update({"trimmed_length_bp": len(trimmed), "mean_quality": round(float(q.mean()), 3) if q.size else 0.0,
                        "bases_q20_or_more": int((q >= 20).sum())})
        data["sample_well"] = (rec.annotations.get("sample_well") or b"").decode(errors="replace") if isinstance(rec.annotations.get("sample_well"), bytes) else rec.annotations.get("sample_well")
        summary = "%s: ABI trace, %d bases called, %d after Mott quality trimming, mean Phred quality %.1f, %d bases at Q20 or more." % (
            os.path.basename(path), len(seq), len(trimmed), metrics["mean_quality"], metrics["bases_q20_or_more"])
    if rec.features:
        rows = []
        for f in rec.features:
            label = f.qualifiers.get("label", f.qualifiers.get("gene", f.qualifiers.get("product", [""])))
            rows.append({"type": f.type, "start_1based": int(f.location.start) + 1, "end": int(f.location.end),
                         "strand": f.location.strand, "label": label[0] if label else ""})
        out["table"] = _table(pd.DataFrame(rows), "features")
    out["summary"] = summary
    return out


def _conditions(na_mM, mg_mM, dntp_mM, primer_nM):
    for name, v in (("na_mM", na_mM), ("mg_mM", mg_mM), ("dntp_mM", dntp_mM), ("primer_nM", primer_nM)):
        if v is None:
            return "%s is missing. It is a decision: the buffer of the polymerase sets it." % name
        if float(v) < 0:
            return "%s is %s. It must be 0 or more." % (name, v)
    return None


def primer_properties(primers, na_mM=None, mg_mM=None, dntp_mM=None, primer_nM=None, tm_method="primer3", salt_correction="santalucia"):
    if isinstance(primers, str):
        primers = [p for p in re.split(r"[,\s]+", primers) if p]
    if not primers:
        return _fail("primers is empty. Give one or more primer sequences, 5' to 3'.")
    problem = _conditions(na_mM, mg_mM, dntp_mM, primer_nM)
    if problem:
        return _fail(problem)
    if tm_method not in ("primer3", "biopython"):
        return _fail("tm_method %s is not known. Use primer3 or biopython." % tm_method)
    if salt_correction not in SALT:
        return _fail("salt_correction %s is not known. Use santalucia or schildkraut." % salt_correction)
    rows = []
    for i, p in enumerate(primers):
        s = re.sub(r"\s", "", str(p)).upper()
        if not re.fullmatch(r"[ACGT]+", s):
            return _fail("Primer %d (%s) has a letter that is not A, C, G or T. Remove tails with modifications or ambiguity codes first." % (i + 1, p))
        if tm_method == "primer3":
            tm = primer3.calc_tm(s, mv_conc=na_mM, dv_conc=mg_mM, dntp_conc=dntp_mM, dna_conc=primer_nM, tm_method="santalucia", salt_corrections_method=SALT[salt_correction])
        else:
            tm = mt.Tm_NN(s, Na=na_mM, Mg=mg_mM, dNTPs=dntp_mM, dnac1=primer_nM / 2.0, dnac2=primer_nM / 2.0, saltcorr=7 if mg_mM else 5)
        hp = primer3.calc_hairpin(s, mv_conc=na_mM, dv_conc=mg_mM, dntp_conc=dntp_mM, dna_conc=primer_nM)
        hd = primer3.calc_homodimer(s, mv_conc=na_mM, dv_conc=mg_mM, dntp_conc=dntp_mM, dna_conc=primer_nM)
        rows.append({"primer": i + 1, "sequence": s, "length": len(s), "gc_percent": round(100 * gc_fraction(s), 2), "tm_c": round(tm, 3),
                     "hairpin_tm_c": round(hp.tm, 2) if hp.structure_found else None, "hairpin_dg_kcal": round(hp.dg / 1000, 2) if hp.structure_found else 0.0,
                     "self_dimer_dg_kcal": round(hd.dg / 1000, 2) if hd.structure_found else 0.0})
    frame = pd.DataFrame(rows)
    metrics = {"n_primers": len(rows), "tm_c_1": rows[0]["tm_c"], "gc_percent_1": rows[0]["gc_percent"]}
    summary = "Tm (%s, salt correction %s, Na %g mM, Mg %g mM, dNTP %g mM, primer %g nM): %s." % (
        "Primer3 SantaLucia 1998" if tm_method == "primer3" else "Biopython Tm_NN", salt_correction if tm_method == "primer3" else ("Owczarzy 2008" if mg_mM else "SantaLucia"),
        na_mM, mg_mM, dntp_mM, primer_nM, "; ".join("%s %.2f C, GC %.0f%%" % (r["sequence"], r["tm_c"], r["gc_percent"]) for r in rows))
    if len(rows) >= 2:
        het = primer3.calc_heterodimer(rows[0]["sequence"], rows[1]["sequence"], mv_conc=na_mM, dv_conc=mg_mM, dntp_conc=dntp_mM, dna_conc=primer_nM)
        metrics["tm_c_2"] = rows[1]["tm_c"]
        metrics["tm_difference_c"] = round(abs(rows[0]["tm_c"] - rows[1]["tm_c"]), 3)
        metrics["pair_dimer_dg_kcal"] = round(het.dg / 1000, 2) if het.structure_found else 0.0
        summary += " Primers 1 and 2 differ by %.2f C; pair dimer dG %.2f kcal/mol." % (metrics["tm_difference_c"], metrics["pair_dimer_dg_kcal"])
    return {"ok": True, "summary": summary, "metrics": metrics, "table": _table(frame, "primer_properties")}


def _settings():
    out = {}
    for line in open(SETTINGS):
        line = line.strip()
        if "=" not in line or line.startswith("P3_") or line == "=":
            continue
        k, v = line.split("=", 1)
        if not k.startswith("PRIMER_") or k in ("PRIMER_MISPRIMING_LIBRARY", "PRIMER_INTERNAL_MISHYB_LIBRARY"):
            continue
        if k == "PRIMER_PRODUCT_SIZE_RANGE":
            out[k] = [[int(a) for a in r.split("-")] for r in v.split()]
            continue
        try:
            out[k] = int(v) if "." not in v else float(v)
        except ValueError:
            out[k] = v
    return out


def _ranges(text):
    if isinstance(text, list):
        text = " ".join(str(t) for t in text)
    ranges = []
    for part in re.split(r"[,\s]+", str(text or "").strip()):
        m = re.fullmatch(r"(\d+)-(\d+)", part)
        if not m or int(m.group(1)) > int(m.group(2)):
            return None
        ranges.append([int(m.group(1)), int(m.group(2))])
    return ranges or None


def design_primers(template, product_size_range=None, opt_tm_c=None, min_tm_c=None, max_tm_c=None, target_start=None, target_length=None,
                   na_mM=None, mg_mM=None, dntp_mM=None, primer_nM=None, num_return=5):
    seq, name, rec = _template(template)
    if seq is None:
        return _fail(rec if isinstance(rec, str) else "Could not read the template %s." % template)
    ranges = _ranges(product_size_range)
    if not ranges:
        return _fail("product_size_range %r is not valid. Give one or more ranges such as 100-300, separated by commas." % (product_size_range,))
    for name_, v in (("opt_tm_c", opt_tm_c), ("min_tm_c", min_tm_c), ("max_tm_c", max_tm_c)):
        if v is None:
            return _fail("%s is missing. The Tm window is a decision." % name_)
    if not (min_tm_c <= opt_tm_c <= max_tm_c):
        return _fail("The Tm window must have min_tm_c <= opt_tm_c <= max_tm_c. It has %s, %s, %s." % (min_tm_c, opt_tm_c, max_tm_c))
    problem = _conditions(na_mM, mg_mM, dntp_mM, primer_nM)
    if problem:
        return _fail(problem)
    g = _settings()
    g.update({"PRIMER_PRODUCT_SIZE_RANGE": ranges, "PRIMER_OPT_TM": float(opt_tm_c), "PRIMER_MIN_TM": float(min_tm_c), "PRIMER_MAX_TM": float(max_tm_c),
              "PRIMER_SALT_MONOVALENT": float(na_mM), "PRIMER_SALT_DIVALENT": float(mg_mM), "PRIMER_DNTP_CONC": float(dntp_mM),
              "PRIMER_DNA_CONC": float(primer_nM), "PRIMER_NUM_RETURN": int(num_return)})
    args = {"SEQUENCE_ID": str(name), "SEQUENCE_TEMPLATE": seq}
    if target_start is not None and target_length:
        args["SEQUENCE_TARGET"] = [int(target_start), int(target_length)]
    try:
        r = primer3.bindings.design_primers(args, g)
    except Exception as e:
        return _fail("primer3 design_primers stopped on the template %s (%d bp): %s" % (name, len(seq), e))
    n = int(r.get("PRIMER_PAIR_NUM_RETURNED", 0))
    if n == 0:
        return _fail("primer3 found no primer pair in %s (%d bp). Pairs: %s. Left: %s. Right: %s. Widen the Tm window or the product size range." % (
            name, len(seq), r.get("PRIMER_PAIR_EXPLAIN", ""), r.get("PRIMER_LEFT_EXPLAIN", ""), r.get("PRIMER_RIGHT_EXPLAIN", "")))
    rows = []
    for i in range(n):
        L, R = r["PRIMER_LEFT_%d" % i], r["PRIMER_RIGHT_%d" % i]
        rows.append({"pair": i, "left_sequence": r["PRIMER_LEFT_%d_SEQUENCE" % i], "right_sequence": r["PRIMER_RIGHT_%d_SEQUENCE" % i],
                     "left_start_1based": L[0], "right_end_1based": R[0], "left_tm_c": round(r["PRIMER_LEFT_%d_TM" % i], 3),
                     "right_tm_c": round(r["PRIMER_RIGHT_%d_TM" % i], 3), "left_gc_percent": round(r["PRIMER_LEFT_%d_GC_PERCENT" % i], 2),
                     "right_gc_percent": round(r["PRIMER_RIGHT_%d_GC_PERCENT" % i], 2), "product_bp": r["PRIMER_PAIR_%d_PRODUCT_SIZE" % i],
                     "penalty": round(r["PRIMER_PAIR_%d_PENALTY" % i], 6)})
    frame = pd.DataFrame(rows)
    _style()
    fig, ax = plt.subplots(figsize=(7, 0.6 + 0.35 * n))
    ax.plot([1, len(seq)], [n, n], color="#444444", lw=3)
    for i, row in enumerate(rows):
        y = n - 1 - i
        ax.plot([row["left_start_1based"], row["right_end_1based"]], [y, y], color="#0072B2", lw=1)
        ax.annotate("", xy=(row["left_start_1based"] + 20, y), xytext=(row["left_start_1based"], y), arrowprops={"arrowstyle": "->", "color": "#D55E00"})
        ax.annotate("", xy=(row["right_end_1based"] - 20, y), xytext=(row["right_end_1based"], y), arrowprops={"arrowstyle": "->", "color": "#D55E00"})
        ax.text(row["right_end_1based"] + len(seq) * 0.01, y, "pair %d, %d bp" % (i, row["product_bp"]), va="center", fontsize=8)
    if "SEQUENCE_TARGET" in args:
        ax.axvspan(int(target_start), int(target_start) + int(target_length), color="#F0E442", alpha=0.4, lw=0)
    ax.set_yticks([])
    ax.set_xlabel("Template position (bp)")
    ax.set_title("Primer3 pairs on %s (%d bp)" % (name, len(seq)), fontsize=10)
    best = rows[0]
    metrics = {"n_pairs": n, "product_bp": best["product_bp"], "left_tm_c": best["left_tm_c"], "right_tm_c": best["right_tm_c"],
               "left_start_1based": best["left_start_1based"], "right_end_1based": best["right_end_1based"], "template_bp": len(seq)}
    summary = "Primer3 returned %d pairs for %s (%d bp). Best pair: %s (%.2f C) and %s (%.2f C), product %d bp, positions %d to %d. Product size range %s, Tm %g to %g C (optimum %g)." % (
        n, name, len(seq), best["left_sequence"], best["left_tm_c"], best["right_sequence"], best["right_tm_c"], best["product_bp"],
        best["left_start_1based"], best["right_end_1based"], ", ".join("%d-%d" % tuple(x) for x in ranges), min_tm_c, max_tm_c, opt_tm_c)
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"explain_pairs": r.get("PRIMER_PAIR_EXPLAIN", "")},
            "table": _table(frame, "primer_pairs"), "outputs": _save(fig, "primer_pairs")}


IUPAC = {"A": "A", "C": "C", "G": "G", "T": "T", "U": "T", "R": "AG", "Y": "CT", "S": "CG", "W": "AT", "K": "GT",
         "M": "AC", "B": "CGT", "D": "AGT", "H": "ACT", "V": "ACG", "N": "ACGT", "I": "ACGT"}


def _revcomp(s):
    pairs = {"A": "T", "C": "G", "G": "C", "T": "A", "U": "A", "R": "Y", "Y": "R", "S": "S", "W": "W", "K": "M",
             "M": "K", "B": "V", "V": "B", "D": "H", "H": "D", "N": "N", "I": "N"}
    return "".join(pairs[c] for c in reversed(s))


def _pattern(primer):
    return re.compile("".join("[%s]" % IUPAC[c] for c in primer))


def _bind(primer, target, k):
    """Positions on target where the 3' end of primer matches for at least k bases."""
    seed = _pattern(primer[-k:])
    hits = []
    for m in re.finditer("(?=(%s))" % seed.pattern, target):
        end = m.start() + k
        foot = k
        while foot < len(primer) and m.start() - (foot - k) - 1 >= 0 and _pattern(primer[-foot - 1]).match(target[m.start() - (foot - k) - 1]):
            foot += 1
        hits.append({"end": end, "footprint": foot})
    return hits


def simulate_pcr(template, forward, reverse, min_anneal_bp=None, topology="file"):
    if min_anneal_bp is None:
        return _fail("min_anneal_bp is missing. It is a decision: the shortest 3' match that counts as a binding site.")
    seq, name, rec = _template(template)
    if seq is None:
        return _fail(rec if isinstance(rec, str) else "Could not read the template %s." % template)
    top = _topology(rec if not isinstance(rec, str) else None, None, topology) or "linear"
    primers = {}
    for label, p in (("forward", forward), ("reverse", reverse)):
        s = re.sub(r"\s", "", str(p or "")).upper()
        bad = sorted(set(s) - set(IUPAC))
        if not s or bad:
            return _fail("The %s primer %r has a letter that is not a DNA or IUPAC ambiguity code: %s." % (label, p, ", ".join(bad) or "it is empty"))
        if len(s) < int(min_anneal_bp):
            return _fail("The %s primer is %d bases long, shorter than min_anneal_bp (%s)." % (label, len(s), min_anneal_bp))
        primers[label] = s
    k = int(min_anneal_bp)
    target = seq + seq if top == "circular" else seq
    fwd = _bind(primers["forward"], target, k)
    rev = [{"start": len(target) - h["end"], "footprint": h["footprint"]} for h in _bind(primers["reverse"], _revcomp(target), k)]
    other_f = [{"start": len(target) - h["end"]} for h in _bind(primers["forward"], _revcomp(target), k)]
    other_r = _bind(primers["reverse"], target, k)
    sites = {"forward primer on the top strand": len([h for h in fwd if h["end"] - h["footprint"] < len(seq)]),
             "reverse primer on the bottom strand": len([h for h in rev if h["start"] < len(seq)]),
             "forward primer on the bottom strand": len([h for h in other_f if h["start"] < len(seq)]),
             "reverse primer on the top strand": len([h for h in other_r if h["end"] - h["footprint"] < len(seq)])}
    rows = []
    seen = set()
    for f in fwd:
        f_start = f["end"] - f["footprint"]
        if f_start >= len(seq):
            continue
        for r in rev:
            r_end = r["start"] + r["footprint"]
            span = r_end - f_start
            if span <= 0 or span > len(seq):
                continue
            product = len(primers["forward"]) - f["footprint"] + span + len(primers["reverse"]) - r["footprint"]
            key = (f_start % len(seq), r_end % len(seq) or len(seq))
            if key in seen:
                continue
            seen.add(key)
            rows.append({"forward": "forward", "reverse": "reverse", "product_bp": product, "start_1based": f_start % len(seq) + 1,
                         "end_1based": (r_end - 1) % len(seq) + 1, "forward_footprint_bp": f["footprint"], "reverse_footprint_bp": r["footprint"],
                         "_seq": primers["forward"] + seq_slice(seq, f_start + f["footprint"], r_end - r["footprint"]) + _revcomp(primers["reverse"])})
    n_sites = sum(sites.values())
    if not rows:
        return _fail("No PCR product on %s (%d bp, %s). Binding sites with a 3' match of %s bp or more: %s. Check the primer orientation (both 5' to 3') and the template." % (
            name, len(seq), top, min_anneal_bp, ", ".join("%s: %d" % (key, v) for key, v in sites.items() if v) or "none"))
    frame = pd.DataFrame(rows).sort_values("product_bp").reset_index(drop=True)
    fasta = os.path.join(os.getcwd(), "pcr_products.fasta")
    with open(fasta, "w") as fh:
        for i, r in frame.iterrows():
            fh.write(">product_%d_%dbp\n%s\n" % (i + 1, r["product_bp"], r["_seq"]))
    frame = frame.drop(columns=["_seq"])
    main = frame.iloc[0]
    metrics = {"n_products": len(rows), "product_bp": int(main["product_bp"]), "start_1based": int(main["start_1based"]),
               "end_1based": int(main["end_1based"]), "n_binding_sites": n_sites, "template_bp": len(seq)}
    summary = "In-silico PCR on %s (%d bp, %s), minimum 3' match %s bp: %d product(s). Shortest product %d bp, positions %d to %d." % (
        name, len(seq), top, min_anneal_bp, len(rows), metrics["product_bp"], metrics["start_1based"], metrics["end_1based"])
    if len(rows) > 1:
        summary += " More than one product: sizes %s bp." % ", ".join(str(int(x)) for x in frame["product_bp"])
    _style()
    fig, ax = plt.subplots(figsize=(7, 1.4))
    ax.plot([1, len(seq)], [0, 0], color="#444444", lw=3)
    for r in rows:
        spans = [(r["start_1based"], r["end_1based"])] if r["start_1based"] <= r["end_1based"] else [(r["start_1based"], len(seq)), (1, r["end_1based"])]
        for a, b in spans:
            ax.plot([a, b], [0.3, 0.3], color="#0072B2", lw=6)
        ax.text((r["start_1based"] + r["end_1based"]) / 2, 0.55, "%d bp" % r["product_bp"], ha="center", fontsize=8)
    ax.set_ylim(-0.4, 1)
    ax.set_yticks([])
    ax.set_xlabel("Template position (bp)")
    ax.set_title("PCR products on %s" % name, fontsize=10)
    outputs = _save(fig, "pcr_products") + [{"path": fasta, "kind": "file", "name": "pcr_products.fasta"}]
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"topology": top, "sites": sites},
            "table": _table(frame, "pcr_products"), "outputs": outputs}


def seq_slice(seq, a, b):
    if b <= len(seq):
        return seq[a:b]
    return seq[a:] + seq[: b - len(seq)]


def _ladder_y(bp):
    return -np.log10(np.asarray(bp, dtype=float))


def digest_sequence(template, enzymes, topology="file"):
    if isinstance(enzymes, str):
        enzymes = [e for e in re.split(r"[,\s]+", enzymes) if e]
    if not enzymes:
        return _fail("enzymes is empty. Name one or more enzymes, such as EcoRI.")
    seq, name, rec = _template(template)
    if seq is None:
        return _fail(rec if isinstance(rec, str) else "Could not read the template %s." % template)
    top = _topology(rec if not isinstance(rec, str) else None, None, topology)
    if top is None:
        return _fail("The topology of %s is not in the file. Set topology to linear or circular." % name)
    unknown = [e for e in enzymes if not hasattr(Restriction, e) or not isinstance(getattr(Restriction, e), Restriction.Restriction.RestrictionType)]
    if unknown:
        return _fail("Unknown enzyme name: %s. Use the REBASE name with its case, such as EcoRI, HindIII or BamHI." % ", ".join(unknown))
    batch = Restriction.RestrictionBatch([getattr(Restriction, e) for e in enzymes])
    linear = top == "linear"
    hits = batch.search(Seq(seq), linear=linear)
    cuts = sorted({c for e in hits for c in hits[e]})
    per = {str(e): sorted(v) for e, v in hits.items()}
    L = len(seq)
    if not cuts:
        frags = [(1, L, L)]
    elif linear:
        b = [1] + cuts + [L + 1]
        frags = [(b[i], b[i + 1] - 1, b[i + 1] - b[i]) for i in range(len(b) - 1)]
    else:
        frags = [(cuts[i], cuts[i + 1] - 1, cuts[i + 1] - cuts[i]) for i in range(len(cuts) - 1)]
        frags.append((cuts[-1], cuts[0] - 1 if cuts[0] > 1 else L, L - cuts[-1] + cuts[0]))
    frame = pd.DataFrame([{"start_1based": a, "end_1based": b_, "length_bp": n} for a, b_, n in frags]).sort_values("length_bp", ascending=False)
    sizes = frame["length_bp"].tolist()
    _style()
    fig, ax = plt.subplots(figsize=(2.6, 4.2))
    ladder = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 500]
    for bp in ladder:
        ax.plot([0.6, 1.4], [_ladder_y(bp)] * 2, color="#888888", lw=1.5)
        ax.text(0.5, _ladder_y(bp), str(bp), ha="right", va="center", fontsize=7)
    for bp in sizes:
        ax.plot([1.8, 2.6], [_ladder_y(bp)] * 2, color="#0072B2", lw=2.5)
    ax.set_xlim(-0.2, 3)
    ax.set_ylim(_ladder_y(min(sizes + ladder) * 0.8), _ladder_y(max(sizes + ladder) * 1.3))
    ax.set_xticks([1, 2.2])
    ax.set_xticklabels(["1 kb ladder", "+".join(enzymes)], fontsize=8)
    ax.set_yticks([])
    ax.set_title("Virtual gel, log scale", fontsize=9)
    metrics = {"n_fragments": len(sizes), "n_cuts": len(cuts), "largest_bp": int(sizes[0]), "smallest_bp": int(sizes[-1]), "template_bp": L}
    summary = "Digest of %s (%d bp, %s) with %s: %d cut(s), %d fragment(s): %s bp. Cut positions (first base after the cut): %s." % (
        name, L, top, "+".join(enzymes), len(cuts), len(sizes), ", ".join(str(s) for s in sizes),
        "; ".join("%s %s" % (k, v if v else "no site") for k, v in per.items()))
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"topology": top, "cuts": per},
            "table": _table(frame, "fragments", limit=40), "outputs": _save(fig, "virtual_gel")}


def align_sanger_read(read, reference, trim=True):
    rrecs, rfmt = _read(read)
    if rrecs is None:
        return _fail(rfmt)
    ref, ref_name, refrec = _template(reference)
    if ref is None:
        return _fail(refrec if isinstance(refrec, str) else "Could not read the reference %s." % reference)
    rec = rrecs[0]
    raw_len = len(rec.seq)
    if trim and rfmt == "abi":
        rec = SeqIO.read(os.path.expanduser(read), "abi-trim")
    elif trim and "phred_quality" not in rec.letter_annotations:
        return _fail("trim is true, but %s has no base qualities (%s). Use an .ab1 or FASTQ file, or ask the scientist to change the decision quality_trim to false." % (read, rfmt))
    elif trim:
        q = np.array(rec.letter_annotations["phred_quality"])
        prefix = np.concatenate([[0.0], np.cumsum(0.05 - 10 ** (-q / 10.0))])
        gain = prefix[1:] - np.minimum.accumulate(prefix)[:-1]
        end = int(np.argmax(gain)) + 1
        start = int(np.argmin(prefix[:end]))
        rec = rec[start:end]
    qual = rec.letter_annotations.get("phred_quality")
    aligner = PairwiseAligner(mode="local", match_score=5, mismatch_score=-4, open_gap_score=-10, extend_gap_score=-0.5)
    best = None
    for strand, s in (("forward", str(rec.seq).upper()), ("reverse complement", str(rec.seq.reverse_complement()).upper())):
        a = aligner.align(ref, s)[0]
        if best is None or a.score > best[1].score:
            best = (strand, a, s)
    strand, aln, s = best
    q_list = list(qual) if qual is not None else None
    if strand == "reverse complement" and q_list is not None:
        q_list = q_list[::-1]
    rows = []
    matches = mismatches = ins = dels = 0
    for (rs, re_), (qs, qe) in zip(*aln.aligned):
        for k in range(re_ - rs):
            r_b, q_b = ref[rs + k], s[qs + k]
            if r_b == q_b:
                matches += 1
            else:
                mismatches += 1
                rows.append({"kind": "mismatch", "ref_position_1based": rs + k + 1, "ref_base": r_b, "read_base": q_b,
                             "read_position_1based": qs + k + 1, "quality": q_list[qs + k] if q_list else None})
    blocks = list(zip(*aln.aligned))
    for (r1, q1), (r2, q2) in zip(blocks, blocks[1:]):
        if r2[0] > r1[1]:
            dels += r2[0] - r1[1]
            rows.append({"kind": "deletion in read", "ref_position_1based": r1[1] + 1, "ref_base": ref[r1[1]:r2[0]], "read_base": "-",
                         "read_position_1based": q1[1], "quality": None})
        if q2[0] > q1[1]:
            ins += q2[0] - q1[1]
            rows.append({"kind": "insertion in read", "ref_position_1based": r1[1], "ref_base": "-", "read_base": s[q1[1]:q2[0]],
                         "read_position_1based": q1[1] + 1, "quality": None})
    aligned_cols = matches + mismatches + ins + dels
    ref_start, ref_end = int(aln.aligned[0][0][0]) + 1, int(aln.aligned[0][-1][1])
    metrics = {"read_length_raw": raw_len, "read_length_used": len(s), "aligned_ref_start_1based": ref_start, "aligned_ref_end_1based": ref_end,
               "matches": matches, "mismatches": mismatches, "inserted_bases": ins, "deleted_bases": dels,
               "identity_percent": round(100.0 * matches / aligned_cols, 3) if aligned_cols else 0.0, "score": float(aln.score)}
    frame = pd.DataFrame(rows, columns=["kind", "ref_position_1based", "ref_base", "read_base", "read_position_1based", "quality"])
    _style()
    fig, ax = plt.subplots(figsize=(7, 2.4))
    if q_list:
        ax.plot(range(1, len(q_list) + 1), q_list, color="#999999", lw=0.6, label="Phred quality")
        ax.axhline(20, color="#E69F00", lw=0.8, ls="--", label="Q20")
    for r in rows:
        ax.axvline(r["read_position_1based"], color="#D55E00", lw=0.8)
    ax.set_xlabel("Read position, after trimming (bases)")
    ax.set_ylabel("Phred quality")
    ax.set_title("%s on %s: %d mismatches, %d indel bases (red lines)" % (os.path.basename(str(read)), ref_name, mismatches, ins + dels), fontsize=9)
    if q_list:
        ax.legend(fontsize=7, loc="lower center")
    summary = "Read %s (%d bases raw, %d used%s) aligned to %s positions %d to %d on the %s strand: identity %.2f%%, %d mismatches, %d inserted and %d deleted bases." % (
        os.path.basename(str(read)), raw_len, len(s), ", Mott trimmed" if trim else ", not trimmed", ref_name, ref_start, ref_end, strand,
        metrics["identity_percent"], mismatches, ins, dels)
    if rows:
        summary += " Differences: %s." % "; ".join("%s at %d (%s>%s%s)" % (r["kind"], r["ref_position_1based"], r["ref_base"], r["read_base"],
                                                                         ", Q%d" % r["quality"] if r["quality"] is not None else "") for r in rows[:10])
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"strand": strand},
            "table": _table(frame, "read_differences", limit=40), "outputs": _save(fig, "read_alignment")}
