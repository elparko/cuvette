# uv run --no-project --with fcsparser --with numpy --with matplotlib python check_gates.py /Volumes/T7/guided-analysis/data/white2021-flowkit/src/data/8_color_data_set
# fcsparser reads the FCS file. The workspace XML, compensation, logicle transform and gates are numpy code here (no FlowKit, no flowio).
import sys
import xml.etree.ElementTree as ET

import fcsparser
import numpy as np
from matplotlib.path import Path

d = sys.argv[1]
SAMPLE = "101_DEN084Y5_15_E01_008_clean.fcs"
NS = {
    "gating": "http://www.isac-net.org/std/Gating-ML/v2.0/gating",
    "transforms": "http://www.isac-net.org/std/Gating-ML/v2.0/transformations",
    "data-type": "http://www.isac-net.org/std/Gating-ML/v2.0/datatypes",
}
T = "{%s}" % NS["transforms"]
G = "{%s}" % NS["gating"]
DT = "{%s}" % NS["data-type"]

root = ET.parse(f"{d}/8_color_ICS.wsp").getroot()
sample = next(s for s in root.iter("Sample") if s.find("SampleNode").get("name") == SAMPLE)
node = sample.find("SampleNode")

print("FlowJo counts stored in the workspace:")
print("  events:", node.get("count"))


def walk(n, path=""):
    for p in n.findall("Subpopulations/Population"):
        yield path + "/" + p.get("name"), p
        yield from walk(p, path + "/" + p.get("name"))


pops = dict(walk(node))
for k, p in pops.items():
    print(f"  {k}: {p.get('count')}")

spill = sample.find(f"{T}spilloverMatrix")
chans = [p.get(f"{DT}name") for p in spill.find(f"{DT}parameters")]
S = np.array([[float(c.get(f"{T}value")) for c in row.findall(f"{T}coefficient")] for row in spill.findall(f"{T}spillover")])

logicle = {}
for x in sample.find("Transformations"):
    if x.tag.endswith("logicle"):
        name = x.find(f"{DT}parameter").get(f"{DT}name")
        logicle[name] = tuple(float(x.get(T + k)) for k in "TWMA")


def logicle_fn(T_, W, M, A):
    w = W / (M + A)
    x2 = A / (M + A)
    x1 = x2 + w
    x0 = x2 + 2 * w
    b = (M + A) * np.log(10)
    lo, hi = 1e-12, b
    for _ in range(200):
        dd = (lo + hi) / 2
        if 2 * (np.log(dd) - np.log(b)) + w * (b + dd) > 0:
            hi = dd
        else:
            lo = dd
    dd = (lo + hi) / 2
    ca = np.exp(x0 * (b + dd))
    mfa = np.exp(b * x1) - ca / np.exp(dd * x1)
    a = T_ / (np.exp(b) - mfa - ca / np.exp(dd))
    c, f = ca * a, -mfa * a

    def inverse(y):
        y = np.asarray(y, float)
        r = np.where(y >= x1, y, 2 * x1 - y)
        v = a * np.exp(b * r) + f - c * np.exp(-dd * r)
        return np.where(y >= x1, v, -v)

    def forward(v):
        v = np.asarray(v, float)
        lo_, hi_ = np.full(v.shape, -2.0), np.full(v.shape, 2.0)
        for _ in range(80):
            mid = (lo_ + hi_) / 2
            up = inverse(mid) < v
            lo_ = np.where(up, mid, lo_)
            hi_ = np.where(up, hi_, mid)
        return (lo_ + hi_) / 2

    return forward


meta, ev = fcsparser.parse(f"{d}/fcs_files/{SAMPLE}", reformat_meta=True)
raw = {c: ev[c].to_numpy(float) for c in ev.columns}
raw["Time"] = raw["Time"] * float(meta["$TIMESTEP"])
print("events in the FCS file:", len(ev))
comp = np.column_stack([raw[c] for c in chans]) @ np.linalg.inv(S)


def column(name, compensate):
    if name.startswith("Comp-"):
        base = name[5:]
        return comp[:, chans.index(base)] if compensate else raw[base]
    return raw[name]


def xform(name):
    return logicle_fn(*logicle[name]) if name in logicle else (lambda v: np.asarray(v, float))


def inside(p, compensate):
    g = p.find("Gate")[0]
    dims = [e.get(f"{DT}name") for e in g.findall(f"{G}dimension/{DT}fcs-dimension")]
    if g.tag.endswith("RectangleGate"):
        m = np.ones(len(ev), bool)
        for dim, e in zip(dims, g.findall(f"{G}dimension")):
            x = column(dim, compensate)
            if e.get(f"{G}min") is not None:
                m &= x >= float(e.get(f"{G}min"))
            if e.get(f"{G}max") is not None:
                m &= x < float(e.get(f"{G}max"))
        return m
    verts = np.array([[float(c.get(f"{DT}value")) for c in v.findall(f"{G}coordinate")] for v in g.findall(f"{G}vertex")])
    fx, fy = xform(dims[0]), xform(dims[1])
    pts = np.column_stack([fx(column(dims[0], compensate)), fy(column(dims[1], compensate))])
    poly = np.column_stack([fx(verts[:, 0]), fy(verts[:, 1])])
    return Path(poly).contains_points(pts)


for compensate in (True, False):
    print("gate counts, compensation", "from the workspace" if compensate else "none")
    masks = {}
    for k, p in pops.items():
        parent = k.rsplit("/", 1)[0]
        masks[k] = inside(p, compensate) & masks.get(parent, np.ones(len(ev), bool))
        print(f"  {k}: {int(masks[k].sum())}")
    if compensate:
        for k in ("CD3+", "CD3+/CD4+", "CD3+/CD8+"):
            path = "/Time/Singlets/aAmine-/" + k
            fj = int(pops[path].get("count"))
            print(f"  difference for {k}, percent of the FlowJo count: {100 * (int(masks[path].sum()) - fj) / fj:.3f}")
