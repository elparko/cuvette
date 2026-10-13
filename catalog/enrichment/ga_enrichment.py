import os
import re
import urllib.parse
import urllib.request
import warnings
from datetime import date

import matplotlib

matplotlib.use("Agg")
import gseapy as gp
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

BACKGROUNDS = ("measured genes", "measured genes in the gene sets", "all genes in the gene sets", "20000 genes (the Enrichr default)")


def _fail(message):
    return {"ok": False, "error": message}


def _style():
    plt.rcParams.update({
        "font.size": 9, "font.family": "sans-serif", "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "axes.spines.top": False, "axes.spines.right": False, "svg.fonttype": "none",
    })


def _save(fig, stem):
    png = os.path.join(os.getcwd(), stem + ".png")
    svg = os.path.join(os.getcwd(), stem + ".svg")
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(svg, bbox_inches="tight")
    plt.close(fig)
    return [{"path": png, "kind": "image", "name": os.path.basename(png)}, {"path": svg, "kind": "file", "name": os.path.basename(svg)}]


def _clean(v):
    if isinstance(v, (float, np.floating)):
        return None if np.isnan(v) else float(v)
    if isinstance(v, np.integer):
        return int(v)
    return v


def _table(frame, name, limit=20):
    path = os.path.join(os.getcwd(), name + ".csv")
    frame.to_csv(path, index=False)
    short = frame.head(limit).copy()
    for c in ("genes", "leading_edge_genes"):
        if c in short.columns:
            short[c] = short[c].astype(str).map(lambda g: g if g.count(";") < 10 else ";".join(g.split(";")[:10]) + "; ... (full list in the CSV file)")
    rows = [[_clean(v) for v in r] for r in short.itertuples(index=False, name=None)]
    return {"columns": [str(c) for c in frame.columns], "rows": rows, "n_rows": int(len(frame)), "path": path}


def _read_table(path):
    path = os.path.expanduser(str(path))
    if not os.path.exists(path):
        return None, "File not found: %s." % path
    low = path.lower()
    try:
        if low.endswith(".rnk"):
            frame = pd.read_csv(path, sep="\t", header=None, comment="#")
            frame.columns = ["gene", "score"] + ["col%d" % i for i in range(3, frame.shape[1] + 1)]
        elif low.endswith((".tsv", ".txt", ".tab")):
            frame = pd.read_csv(path, sep="\t")
        elif low.endswith((".xlsx", ".xls")):
            frame = pd.read_excel(path)
        else:
            frame = pd.read_csv(path)
    except Exception as e:
        return None, "Could not read the table %s: %s" % (path, e)
    return frame, None


def _gene_sets(gene_sets):
    text = str(gene_sets or "").strip()
    if not text:
        return None, "gene_sets is empty. Give the path of a GMT file, or run fetch_gene_sets first."
    path = os.path.expanduser(text)
    if not os.path.exists(path):
        return None, "Gene set file not found: %s. Give a GMT file, or run fetch_gene_sets to download an Enrichr library." % path
    sets = {}
    with open(path, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 3:
                sets[parts[0]] = [g for g in parts[2:] if g]
    if not sets:
        return None, "No gene set in %s. A GMT line is: name, description, then the genes, separated by tabs." % path
    return sets, None


def _bg_size(bg):
    return bg if isinstance(bg, int) else len(bg)


def _ids(series):
    return series.dropna().astype(str).str.strip().str.replace(r"\.\d+$", "", regex=True)


def _id_kind(ids):
    s = pd.Series(list(ids)[:2000])
    if s.str.match(r"^ENS[A-Z]*G\d+").mean() > 0.5:
        return "Ensembl gene"
    if s.str.match(r"^\d+$").mean() > 0.5:
        return "Entrez (NCBI) gene"
    return "gene symbol"


def inspect_gene_table(path, gene_sets=None, id_column=None):
    frame, err = _read_table(path)
    if frame is None:
        return _fail(err)
    rows = []
    for c in frame.columns:
        s = frame[c]
        numeric = pd.api.types.is_numeric_dtype(s)
        rows.append([str(c), str(s.dtype), int(s.isna().sum()), int(s.nunique()), _clean(s.min()) if numeric else None, _clean(s.max()) if numeric else None])
    table = pd.DataFrame(rows, columns=["column", "dtype", "n_missing", "n_unique", "min", "max"])
    col = id_column or frame.columns[0]
    if col not in frame.columns:
        return _fail("Unknown id_column: %s. The columns are: %s." % (col, ", ".join(map(str, frame.columns))))
    ids = _ids(frame[col])
    metrics = {"n_rows": len(frame), "n_columns": frame.shape[1], "n_unique_ids": int(ids.nunique()), "n_duplicate_ids": int(ids.duplicated().sum())}
    summary = "%d rows x %d columns. ID column %s: %d unique IDs, %d duplicates, they look like %s IDs." % (
        len(frame), frame.shape[1], col, metrics["n_unique_ids"], metrics["n_duplicate_ids"], _id_kind(ids))
    if gene_sets:
        sets, err = _gene_sets(gene_sets)
        if sets is None:
            return _fail(err)
        annotated = {g for v in sets.values() for g in v}
        found = int(ids.isin(annotated).sum())
        metrics.update({"n_gene_sets": len(sets), "n_annotated_genes": len(annotated), "n_ids_in_gene_sets": found})
        summary += " %d of %d IDs (%.1f%%) are in the %d gene sets, which hold %s IDs." % (
            found, len(ids), 100.0 * found / max(len(ids), 1), len(sets), _id_kind(annotated))
        if found < 0.1 * len(ids):
            summary += " Fewer than 10% match: the ID type or the species of the table and the gene sets probably differ."
    return {"ok": True, "summary": summary, "metrics": metrics, "table": _table(table, "columns", limit=40)}


def fetch_gene_sets(library, organism="Human"):
    name = str(library or "").strip()
    if not name:
        return _fail("library is empty. Name an Enrichr library, such as MSigDB_Hallmark_2020 or GO_Biological_Process_2023.")
    base = {"Human": "", "Mouse": "Mouse", "Yeast": "Yeast", "Fly": "Fly", "Fish": "Fish", "Worm": "Worm"}.get(organism)
    if base is None:
        return _fail("organism %r is not known. Use Human, Mouse, Yeast, Fly, Fish or Worm." % organism)
    host = "https://maayanlab.cloud/%sEnrichr" % base
    url = "%s/geneSetLibrary?mode=text&libraryName=%s" % (host, urllib.parse.quote(name))
    try:
        with urllib.request.urlopen(url, timeout=300) as fh:
            text = fh.read().decode("utf-8", errors="replace")
    except Exception as e:
        try:
            known = gp.get_library_name(organism=organism)
            close = [k for k in known if name.lower().split("_")[0] in k.lower()][:10]
        except Exception:
            close = []
        return _fail("Could not download the Enrichr library %s for %s from %s: %s.%s" % (
            name, organism, host, e, (" Similar names: " + ", ".join(close)) if close else ""))
    sets = {}
    dropped = 0
    for line in text.splitlines():
        parts = [x.strip() for x in line.rstrip("\n").split("\t")]
        if len(parts) < 3 or not parts[0]:
            dropped += int(bool(line.strip()))
            continue
        genes = [g.split(",")[0] for g in parts[2:] if g and g.split(",")[0]]
        if genes:
            sets[parts[0]] = genes
        else:
            dropped += 1
    if not sets:
        return _fail("The Enrichr library %s for %s came back with no gene set. The server returned %d characters." % (name, organism, len(text)))
    stamp = date.today().isoformat()
    path = os.path.join(os.getcwd(), "%s_%s_%s.gmt" % (re.sub(r"\W+", "_", name), organism, stamp))
    with open(path, "w") as fh:
        for k, v in sets.items():
            fh.write("\t".join([k, "Enrichr %s %s downloaded %s" % (name, organism, stamp)] + list(v)) + "\n")
    sizes = [len(v) for v in sets.values()]
    note = " %d line(s) had no name or no gene; the tool left them out." % dropped if dropped else ""
    return {"ok": True, "summary": "Downloaded the Enrichr library %s (%s) on %s: %d gene sets, median size %d genes. Saved %s.%s" % (
        name, organism, stamp, len(sets), int(np.median(sizes)), path, note),
        "metrics": {"n_gene_sets": len(sets), "median_set_size": float(np.median(sizes))},
        "data": {"gmt": path, "library": name, "organism": organism, "date": stamp},
        "outputs": [{"path": path, "kind": "file", "name": os.path.basename(path)}]}


def _dotplot(frame, x, size_col, color_col, title, stem, xlabel):
    _style()
    top = frame.head(15).iloc[::-1]
    fig, ax = plt.subplots(figsize=(6.5, 0.3 * len(top) + 1.2))
    sc = ax.scatter(top[x], range(len(top)), s=20 + 8 * top[size_col] ** 0.8, c=top[color_col], cmap="viridis_r")
    ax.set_yticks(range(len(top)))
    ax.set_yticklabels([t if len(t) < 60 else t[:57] + "..." for t in top["term"]])
    ax.set_xlabel(xlabel)
    ax.set_title(title, fontsize=9)
    cb = fig.colorbar(sc, ax=ax, shrink=0.6)
    cb.set_label(color_col)
    return _save(fig, stem)


def run_ora(path, gene_sets, id_column, background, padj_column=None, padj_max=None, lfc_column=None, lfc_min=None, direction="both",
            min_size=None, max_size=None, gene_list=None):
    if background not in BACKGROUNDS:
        return _fail("background %r is not known. Use one of: %s." % (background, "; ".join(BACKGROUNDS)))
    for k, v in (("min_size", min_size), ("max_size", max_size)):
        if v is None:
            return _fail("%s is missing. The gene set size limits are a decision." % k)
    sets, err = _gene_sets(gene_sets)
    if sets is None:
        return _fail(err)
    frame, err = _read_table(path)
    if frame is None:
        return _fail(err)
    need = [c for c in (id_column, padj_column, lfc_column) if c]
    missing = [c for c in need if c not in frame.columns]
    if missing:
        return _fail("Unknown column: %s. The columns are: %s." % (", ".join(missing), ", ".join(map(str, frame.columns))))
    frame = frame.copy()
    frame["_id"] = frame[id_column].astype(str).str.strip().str.replace(r"\.\d+$", "", regex=True)
    measured = set(frame["_id"].dropna())
    if gene_list:
        query = {str(g).strip() for g in (gene_list.split(",") if isinstance(gene_list, str) else gene_list) if str(g).strip()}
        rule = "the given list of %d genes" % len(query)
    else:
        if not (padj_column and padj_max is not None) and not (lfc_column and lfc_min is not None):
            return _fail("A gene list needs padj_column with padj_max, or lfc_column with lfc_min, or gene_list. The cutoff for a significant gene is a decision.")
        if padj_max is not None and float(padj_max) < 1 and not padj_column:
            return _fail("padj_column is missing, so the cutoff padj_max %g cannot apply. Give the adjusted p value column." % float(padj_max))
        sel = pd.Series(True, index=frame.index)
        rules = []
        if padj_column and padj_max is not None:
            sel &= frame[padj_column].notna() & (frame[padj_column] < float(padj_max))
            rules.append("%s < %g" % (padj_column, float(padj_max)))
        rule = ", ".join(rules)
        if lfc_column and (lfc_min is not None or direction != "both"):
            lfc = frame[lfc_column]
            cut = float(lfc_min or 0)
            if direction == "up":
                sel &= lfc > cut
                rule += (", " if rule else "") + "%s > %g" % (lfc_column, cut)
            elif direction == "down":
                sel &= lfc < -cut
                rule += (", " if rule else "") + "%s < -%g" % (lfc_column, cut)
            else:
                sel &= lfc.abs() > cut
                rule += (", " if rule else "") + "|%s| > %g" % (lfc_column, cut)
        elif lfc_column is None and direction != "both":
            return _fail("direction %s needs lfc_column, the log2 fold change column." % direction)
        query = set(frame.loc[sel, "_id"])
    annotated = {g for v in sets.values() for g in v}
    if background == "measured genes":
        bg = measured
    elif background == "measured genes in the gene sets":
        bg = measured & annotated
    elif background == "all genes in the gene sets":
        bg = annotated
    else:
        bg = 20000
    q_in = query if isinstance(bg, int) else query & bg
    if not q_in or not (query & annotated):
        return _fail("No gene of the list (%d genes, rule %s) is in the background (%s, %d genes) or in any gene set. Check the ID type: the table has %s IDs, the gene sets %s IDs." % (
            len(query), rule, background, _bg_size(bg), _id_kind(measured), _id_kind(annotated)))
    kept = {k: v for k, v in sets.items() if min_size <= len(set(v) if isinstance(bg, int) else set(v) & bg) <= max_size}
    if not kept:
        return _fail("No gene set has between %d and %d genes in the background (%s genes)." % (min_size, max_size, _bg_size(bg)))
    try:
        tag = lambda xs: ["id:" + x for x in xs]
        back = bg if isinstance(bg, int) else set(tag(bg))
        enr = gp.enrich(gene_list=tag(sorted(query)), gene_sets={k: tag(v) for k, v in kept.items()}, background=back, outdir=None, cutoff=1.0, no_plot=True)
    except Exception as e:
        return _fail("gseapy enrich stopped (list of %d genes, %d gene sets, background %s genes): %s" % (len(query), len(kept), _bg_size(bg), e))
    res = enr.results.copy() if isinstance(enr.results, pd.DataFrame) else pd.DataFrame()
    if res.empty:
        return _fail("No gene set shares a gene with the list (%d genes in the background). Tested %d gene sets." % (len(q_in), len(kept)))
    res["overlap_n"] = res["Overlap"].str.split("/").str[0].astype(int)
    res["set_size_in_background"] = res["Overlap"].str.split("/").str[1].astype(int)
    x = res["overlap_n"].astype(float)
    m = res["set_size_in_background"].astype(float)
    n_list = float(len(q_in))
    total = float(_bg_size(bg))
    out = pd.DataFrame({"term": res["Term"], "overlap": res["overlap_n"], "set_size": res["set_size_in_background"],
                        "list_size": len(q_in), "background_size": _bg_size(bg), "p_value": res["P-value"], "p_adjusted_bh": res["Adjusted P-value"],
                        "odds_ratio": (x * (total - m - n_list + x) / np.maximum((m - x) * (n_list - x), 1.0)),
                        "odds_ratio_haldane": res["Odds Ratio"],
                        "genes": res["Genes"].str.replace("id:", "", regex=False)}).sort_values(["p_value", "term"]).reset_index(drop=True)
    sig = out[out["p_adjusted_bh"] < 0.05]
    metrics = {"list_size": len(query), "list_size_in_background": len(q_in), "background_size": _bg_size(bg), "n_sets_tested": len(kept),
               "n_sets_with_overlap": len(out), "n_sets_significant": len(sig), "top_overlap": int(out.loc[0, "overlap"]),
               "top_set_size": int(out.loc[0, "set_size"]), "top_p_value": float(out.loc[0, "p_value"]),
               "top_p_adjusted": float(out.loc[0, "p_adjusted_bh"]), "top_odds_ratio": float(out.loc[0, "odds_ratio"])}
    for i in range(min(5, len(out))):
        metrics["overlap_%d" % (i + 1)] = int(out.loc[i, "overlap"])
        metrics["set_size_%d" % (i + 1)] = int(out.loc[i, "set_size"])
        metrics["p_value_%d" % (i + 1)] = float(out.loc[i, "p_value"])
        metrics["p_adjusted_%d" % (i + 1)] = float(out.loc[i, "p_adjusted_bh"])
    plot = out.copy()
    plot["gene_ratio"] = plot["overlap"] / plot["list_size"]
    plot["-log10 adjusted p"] = -np.log10(plot["p_adjusted_bh"].clip(lower=1e-300))
    outputs = _dotplot(plot, "gene_ratio", "overlap", "-log10 adjusted p", "Over-representation, %s, background %s (%d genes)" % (rule, background, _bg_size(bg)), "ora_dotplot", "Gene ratio (overlap / list size)")
    top = out.head(5)
    summary = "ORA (hypergeometric, BH): %d genes pass %s, %d of them in the background (%s, %d genes). %d gene sets tested (size %d to %d), %d with adjusted p < 0.05. Top: %s." % (
        len(query), rule, len(q_in), background, _bg_size(bg), len(kept), min_size, max_size, len(sig),
        "; ".join("%s %d/%d, p = %.3g, adjusted p = %.3g" % (r.term, r.overlap, r.set_size, r.p_value, r.p_adjusted_bh) for r in top.itertuples()))
    return {"ok": True, "summary": summary, "metrics": metrics, "data": {"rule": rule, "background": background},
            "table": _table(out, "ora_results"), "outputs": outputs}


def _rank(frame, id_column, rank_metric, rank_column, lfc_column, p_column):
    if rank_metric == "column":
        if not rank_column or rank_column not in frame.columns:
            return None, "rank_metric column needs rank_column, a numeric column. The columns are: %s." % ", ".join(map(str, frame.columns))
        score = frame[rank_column].astype(float)
        how = rank_column
    elif rank_metric == "signed_log10_p":
        miss = [c for c in (lfc_column, p_column) if not c or c not in frame.columns]
        if miss:
            return None, "rank_metric signed_log10_p needs lfc_column and p_column. The columns are: %s." % ", ".join(map(str, frame.columns))
        score = np.sign(frame[lfc_column].astype(float)) * -np.log10(frame[p_column].astype(float).clip(lower=1e-300))
        how = "sign(%s) x -log10(%s)" % (lfc_column, p_column)
    elif rank_metric == "log2_fold_change":
        if not lfc_column or lfc_column not in frame.columns:
            return None, "rank_metric log2_fold_change needs lfc_column. The columns are: %s." % ", ".join(map(str, frame.columns))
        score = frame[lfc_column].astype(float)
        how = lfc_column
    else:
        return None, "rank_metric %r is not known. Use column, signed_log10_p or log2_fold_change." % rank_metric
    r = pd.DataFrame({"gene": frame[id_column].astype(str).str.strip().str.replace(r"\.\d+$", "", regex=True), "score": score})
    n0 = len(r)
    r = r.replace([np.inf, -np.inf], np.nan).dropna()
    dropped_na = n0 - len(r)
    r = r.reindex(r["score"].abs().sort_values(ascending=False).index).drop_duplicates("gene")
    dup = n0 - dropped_na - len(r)
    return (r.sort_values("score", ascending=False).reset_index(drop=True), how, dropped_na, dup), None


def run_gsea_prerank(path, gene_sets, id_column, rank_metric, rank_column=None, lfc_column=None, p_column=None, permutations=None, seed=None,
                     min_size=None, max_size=None, weight=1.0, focus_terms=None):
    for k, v in (("permutations", permutations), ("seed", seed), ("min_size", min_size), ("max_size", max_size)):
        if v is None:
            return _fail("%s is missing. It is a decision." % k)
    sets, err = _gene_sets(gene_sets)
    if sets is None:
        return _fail(err)
    frame, err = _read_table(path)
    if frame is None:
        return _fail(err)
    if id_column not in frame.columns:
        return _fail("Unknown id_column: %s. The columns are: %s." % (id_column, ", ".join(map(str, frame.columns))))
    got, err = _rank(frame, id_column, rank_metric, rank_column, lfc_column, p_column)
    if got is None:
        return _fail(err)
    rnk, how, dropped_na, dup = got
    annotated = {g for v in sets.values() for g in v}
    n_found = int(rnk["gene"].isin(annotated).sum())
    if n_found == 0:
        return _fail("No ranked gene is in the gene sets. The table has %s IDs, the gene sets %s IDs." % (_id_kind(rnk["gene"]), _id_kind(annotated)))
    try:
        pre = gp.prerank(rnk=rnk, gene_sets=sets, min_size=int(min_size), max_size=int(max_size), permutation_num=int(permutations), seed=int(seed),
                         weight=float(weight), threads=2, outdir=None, no_plot=True, verbose=False)
    except Exception as e:
        return _fail("gseapy prerank stopped (%d ranked genes, %d gene sets, size %s to %s): %s" % (len(rnk), len(sets), min_size, max_size, e))
    res = pre.res2d.copy()
    if res.empty:
        return _fail("No gene set has between %s and %s ranked genes. %d of %d ranked genes are in the gene sets." % (min_size, max_size, n_found, len(rnk)))
    res["size"] = res["Tag %"].str.split("/").str[1].astype(int)
    res["leading_edge_n"] = res["Tag %"].str.split("/").str[0].astype(int)
    out = pd.DataFrame({"term": res["Term"], "size": res["size"], "es": res["ES"].astype(float), "nes": res["NES"].astype(float),
                        "p_value": res["NOM p-val"].astype(float), "fdr_q": res["FDR q-val"].astype(float), "leading_edge_n": res["leading_edge_n"],
                        "leading_edge_genes": res["Lead_genes"]})
    out = out.assign(_abs_nes=out["nes"].abs()).sort_values(["p_value", "_abs_nes"], ascending=[True, False]).drop(columns="_abs_nes").reset_index(drop=True)
    floor = 1.0 / (int(permutations) + 1)
    sig = out[out["fdr_q"] < 0.25]
    metrics = {"n_ranked_genes": len(rnk), "n_ranked_in_gene_sets": n_found, "n_sets_tested": len(out), "n_sets_fdr_q_below_025": len(sig),
               "n_dropped_missing": dropped_na, "n_dropped_duplicate": dup, "p_floor": floor}
    data = {"rank_metric": how, "permutations": int(permutations), "seed": int(seed), "weight": float(weight)}
    if isinstance(focus_terms, str):
        focus_terms = [t.strip() for t in focus_terms.split(";") if t.strip()]
    focus = []
    for i, t in enumerate(focus_terms or []):
        hit = out[out["term"] == t]
        if hit.empty:
            close = [k for k in out["term"] if t.lower() in k.lower()][:5]
            return _fail("focus term %r was not tested (not in the gene sets, or outside the size limits %s to %s).%s" % (
                t, min_size, max_size, (" Similar names: " + ", ".join(close)) if close else ""))
        r = hit.iloc[0]
        focus.append(r)
        metrics.update({"es_%d" % (i + 1): float(r["es"]), "nes_%d" % (i + 1): float(r["nes"]), "size_%d" % (i + 1): int(r["size"]),
                        "leading_edge_n_%d" % (i + 1): int(r["leading_edge_n"]), "p_value_%d" % (i + 1): float(r["p_value"]), "fdr_q_%d" % (i + 1): float(r["fdr_q"])})
    term = focus[0]["term"] if focus else out.loc[0, "term"]
    outputs = []
    _style()
    top = pd.concat([out[out.nes > 0].head(10), out[out.nes < 0].head(10)]).sort_values("nes")
    fig, ax = plt.subplots(figsize=(6.5, 0.28 * len(top) + 1.2))
    ax.barh(range(len(top)), top["nes"], color=["#D55E00" if v > 0 else "#0072B2" for v in top["nes"]])
    ax.set_yticks(range(len(top)))
    ax.set_yticklabels([t if len(t) < 60 else t[:57] + "..." for t in top["term"]])
    ax.axvline(0, color="#444444", lw=0.8)
    ax.set_xlabel("Normalized enrichment score (NES)")
    ax.set_title("Preranked GSEA, ranked by %s" % how, fontsize=9)
    outputs += _save(fig, "gsea_nes")
    if term in pre.results:
        r = pre.results[term]
        fig, (a1, a2) = plt.subplots(2, 1, figsize=(6, 3.6), sharex=True, gridspec_kw={"height_ratios": [3, 1]})
        a1.plot(r["RES"], color="#009E73", lw=1)
        a1.axhline(0, color="#444444", lw=0.6)
        a1.set_ylabel("Running enrichment score")
        a1.set_title("%s: ES %.3f, NES %.3f" % (term, r["es"], r["nes"]), fontsize=9)
        a2.vlines(r["hits"], 0, 1, color="#444444", lw=0.4)
        a2.set_yticks([])
        a2.set_xlabel("Rank in the gene list (1 = highest %s)" % how)
        outputs += _save(fig, "gsea_running_score")
    def fmt(r):
        p = "p < %.2g" % floor if r.p_value == 0 else "p = %.3g" % r.p_value
        q = "FDR q < %.2g" % floor if r.fdr_q == 0 else "FDR q = %.3g" % r.fdr_q
        return "%s ES %.4f, NES %.3f, %s, %s, leading edge %d/%d" % (r.term, r.es, r.nes, p, q, r.leading_edge_n, r.size)

    summary = "Preranked GSEA (gseapy, weight %g, %d permutations, seed %d), %d genes ranked by %s, %d in the gene sets. %d gene sets tested (size %s to %s), %d with FDR q < 0.25. Top: %s." % (
        float(weight), int(permutations), int(seed), len(rnk), how, n_found, len(out), min_size, max_size, len(sig),
        "; ".join(fmt(r) for r in out.head(5).itertuples()))
    if focus:
        summary += " Requested: %s." % "; ".join(fmt(r) for r in pd.DataFrame(focus).itertuples())
    if dropped_na or dup:
        summary += " Removed %d genes with a missing score and %d duplicate IDs (kept the largest absolute score)." % (dropped_na, dup)
    return {"ok": True, "summary": summary, "metrics": metrics, "data": data, "table": _table(out, "gsea_results"), "outputs": outputs}

