import csv
import statistics


class Column:
    def __init__(self, name, values):
        self.name = name
        self.values = values

    def __repr__(self):
        return "Column(%r, n=%d)" % (self.name, len(self.values))


def _values(v):
    return v.values if isinstance(v, Column) else [float(x) for x in v]


def load_csv_column(path, column):
    with open(path, newline="", encoding="utf-8") as f:
        values = [float(row[column]) for row in csv.DictReader(f)]
    return Column(column, values)


def describe(values):
    v = _values(values)
    return {
        "n": len(v),
        "mean": statistics.fmean(v),
        "median": statistics.median(v),
        "sd": statistics.stdev(v) if len(v) > 1 else 0.0,
        "min": min(v),
        "max": max(v),
    }


def threshold(values, cutoff):
    v = _values(values)
    above = sum(1 for x in v if x > cutoff)
    return {"n_above": above, "fraction_above": above / len(v)}
