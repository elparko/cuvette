import csv
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

DATE_GENE = re.compile(r"^(\d{4}-\d{2}-\d{2}|\d{1,2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{1,2})", re.I)


class Fail(Exception):
    pass


def read_params():
    with open(sys.argv[1]) as f:
        return json.load(f)


def emit(result):
    sys.stdout.write(json.dumps(result, allow_nan=False, default=str) + "\n")
    sys.stdout.flush()
    sys.exit(0)


def run_tool(body):
    try:
        emit(body(read_params()))
    except Fail as e:
        emit({"ok": False, "error": str(e)})
    except Exception as e:
        step = os.path.splitext(os.path.basename(sys.argv[0]))[0]
        emit({"ok": False, "error": "%s failed. Python says: %s: %s" % (step, type(e).__name__, e)})


def as_list(v):
    if v is None:
        return []
    if isinstance(v, str):
        text = v.strip()
        if text.startswith("["):
            try:
                v = json.loads(text)
            except ValueError:
                raise Fail("the list '%s' is not valid JSON. Give a list or comma text." % text)
        else:
            v = text.split(",")
    return [str(x).strip() for x in v if str(x).strip() and str(x).strip().lower() != "none"]


def out_path(key):
    return os.environ.get("GA_OUTPUT_" + key.upper(), "")


def number(x):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if v == v and abs(v) != float("inf") else None


def mageck_bin():
    return os.path.join(os.path.dirname(sys.executable), "mageck")


def mageck_version():
    try:
        p = subprocess.run([mageck_bin(), "--version"], capture_output=True, text=True, env=mageck_env())
        return "MAGeCK " + p.stdout.strip().splitlines()[-1]
    except Exception:
        return "MAGeCK"


def mageck_env():
    env = dict(os.environ)
    env["PATH"] = os.path.dirname(sys.executable) + os.pathsep + env.get("PATH", "")
    for k in ("OMP_NUM_THREADS", "VECLIB_MAXIMUM_THREADS", "OPENBLAS_NUM_THREADS"):
        env[k] = "2"
    return env


def read_counts(path, arg="counts"):
    if not path:
        raise Fail("give %s, the path of the sgRNA read count table" % arg)
    if not os.path.isfile(path):
        raise Fail("%s: file not found: %s" % (arg, path))
    with open(path, newline="") as f:
        head = f.readline()
        f.seek(0)
        delim = "\t" if head.count("\t") >= 2 else ","
        rows = list(csv.reader(f, delimiter=delim))
    if len(rows) < 3 or len(rows[0]) < 4:
        raise Fail("%s: %s needs a header row, an sgRNA column, a gene column and at least two sample columns. It has %d rows and %d columns." % (arg, path, len(rows), len(rows[0]) if rows else 0))
    header = [h.strip() for h in rows[0]]
    body = rows[1:]
    bad_width = [i + 2 for i, r in enumerate(body) if len(r) != len(header)]
    if bad_width:
        raise Fail("%s: %s has %d rows whose number of fields differs from the header (%d fields). First row: %d." % (arg, path, len(bad_width), len(header), bad_width[0]))
    dates = [(i + 2, r[1]) for i, r in enumerate(body) if DATE_GENE.match(r[1].strip())]
    if dates:
        raise Fail("%s: %d gene names in %s look like dates, such as '%s' in row %d. Excel changes gene symbols such as SEPT1 and MARCH1 to dates. Restore the symbols (the sgRNA name '%s' can show the symbol) and run again." % (arg, len(dates), path, dates[0][1], dates[0][0], body[dates[0][0] - 2][0]))
    for i, r in enumerate(body):
        for j in range(2, len(header)):
            if number(r[j]) is None or float(r[j]) < 0:
                raise Fail("%s: %s has a count that is not a number of at least 0 in row %d, column '%s': '%s'" % (arg, path, i + 2, header[j], r[j]))
    ids = [r[0] for r in body]
    if len(set(ids)) != len(ids):
        dup = next(x for x in ids if ids.count(x) > 1)
        raise Fail("%s: %s repeats the sgRNA name '%s'. Each sgRNA must appear once." % (arg, path, dup))
    return header, body


def write_clean_table(header, body, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f, delimiter="\t", lineterminator="\n")
        w.writerow(header)
        w.writerows(body)


def check_labels(header, labels, arg):
    samples = header[2:]
    if not labels:
        raise Fail("give %s: the sample labels in the count table. Samples: %s" % (arg, ", ".join(samples)))
    for lab in labels:
        if lab not in samples:
            raise Fail("%s names the sample '%s', which is not a column of the count table. Samples: %s" % (arg, lab, ", ".join(samples)))


def run_mageck(args, work, log_name):
    cmd = [mageck_bin()] + args
    p = subprocess.run(cmd, cwd=work, env=mageck_env(), capture_output=True, text=True)
    log = os.path.join(work, log_name + ".stderr.txt")
    with open(log, "w") as f:
        f.write(p.stdout + p.stderr)
    if p.returncode != 0:
        tail = [x for x in (p.stdout + p.stderr).strip().splitlines() if x.strip()][-3:]
        raise Fail("mageck %s stopped with exit code %d. Last lines: %s" % (args[0], p.returncode, " | ".join(tail)))
    return p.stdout + p.stderr


def work_dir():
    base = os.environ.get("GA_WORK_DIR") or tempfile.gettempdir()
    d = tempfile.mkdtemp(prefix="mageck-", dir=base)
    return d


def read_tsv(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def copy_out(key, src):
    dst = out_path(key)
    if dst:
        shutil.copyfile(src, dst)
    return dst


def table_of(columns, rows, path=None, max_rows=40):
    return {"columns": columns, "rows": [list(r) for r in rows[:max_rows]], "n_rows": len(rows), "path": path}
