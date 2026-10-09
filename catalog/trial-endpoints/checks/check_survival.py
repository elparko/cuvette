import sys
from pathlib import Path

import numpy as np
import pandas as pd
from lifelines import CoxPHFitter
from lifelines.statistics import logrank_test

data = Path(sys.argv[1])
Z = 1.959964


def km(t, e):
    times = np.unique(t[e == 1])
    s = 1.0
    out = []
    g = 0.0
    for u in times:
        n = np.sum(t >= u)
        d = np.sum((t == u) & (e == 1))
        s *= 1 - d / n
        g += d / (n * (n - d)) if n > d else np.inf
        out.append((u, s, g, n, d))
    return out


def surv_at(curve, x):
    s, g = 1.0, 0.0
    for u, su, gu, n, d in curve:
        if u <= x:
            s, g = su, gu
    return s, s * np.sqrt(g)


def rmst(curve, tau):
    pts = [(0.0, 1.0)] + [(u, s) for u, s, g, n, d in curve if u <= tau]
    area = 0.0
    for i, (u, s) in enumerate(pts):
        nxt = pts[i + 1][0] if i + 1 < len(pts) else tau
        area += s * (nxt - u)
    var = 0.0
    for u, s, g, n, d in curve:
        if u > tau:
            break
        rest = 0.0
        pts2 = [(u, s)] + [(v, sv) for v, sv, gv, nv, dv in curve if u < v <= tau]
        for i, (v, sv) in enumerate(pts2):
            nxt = pts2[i + 1][0] if i + 1 < len(pts2) else tau
            rest += sv * (nxt - v)
        var += rest**2 * d / (n * (n - d)) if n > d else 0.0
    return area, np.sqrt(var)


def report(name, df, tau, landmark):
    print(f"== {name}")
    a = df[df.arm == 1]
    b = df[df.arm == 0]
    print(f"n_a {len(a)} n_b {len(b)} events_a {int(a.event.sum())} events_b {int(b.event.sum())}")
    cph = CoxPHFitter()
    cph.fit(df[["time", "event", "arm"]], "time", "event")
    s = cph.summary.loc["arm"]
    print(f"hazard ratio {np.exp(s['coef']):.6f} CI {np.exp(s['coef lower 95%']):.6f} {np.exp(s['coef upper 95%']):.6f} p {s['p']:.6f}")
    lr = logrank_test(a.time, b.time, a.event, b.event)
    print(f"logrank chi2 {lr.test_statistic:.6f} p {lr.p_value:.6f}")
    ca = km(a.time.to_numpy(), a.event.to_numpy())
    cb = km(b.time.to_numpy(), b.event.to_numpy())
    if landmark:
        sa, sea = surv_at(ca, landmark)
        sb, seb = surv_at(cb, landmark)
        d = sa - sb
        se = np.sqrt(sea**2 + seb**2)
        print(f"landmark {landmark} surv_a {sa:.6f} se {sea:.6f} surv_b {sb:.6f} se {seb:.6f} diff {d:.6f} CI {d - Z * se:.6f} {d + Z * se:.6f}")
    if tau:
        ra, sa = rmst(ca, tau)
        rb, sb = rmst(cb, tau)
        d = ra - rb
        se = np.sqrt(sa**2 + sb**2)
        print(f"tau {tau} rmst_a {ra:.6f} se {sa:.6f} rmst_b {rb:.6f} se {sb:.6f} diff {d:.6f} CI {d - Z * se:.6f} {d + Z * se:.6f}")
        rat = ra / rb
        se_log = np.sqrt((sa / ra) ** 2 + (sb / rb) ** 2)
        print(f"rmst ratio {rat:.6f} CI {np.exp(np.log(rat) - Z * se_log):.6f} {np.exp(np.log(rat) + Z * se_log):.6f}")
        la, lb = tau - ra, tau - rb
        lrat = la / lb
        se_log = np.sqrt((sa / la) ** 2 + (sb / lb) ** 2)
        print(f"rmtl ratio {lrat:.6f} CI {np.exp(np.log(lrat) - Z * se_log):.6f} {np.exp(np.log(lrat) + Z * se_log):.6f}")


pbc = pd.read_csv(data / "pbc_rmst.csv").rename(columns={"status": "event"})
report("PBC sample data of survRM2", pbc, 10, None)

sh = pd.read_csv(data / "shock_endpoints.csv").dropna(subset=["time_days", "death"])
sh = sh.assign(arm=(sh.arm == "early_revascularization").astype(int), event=sh.death.astype(int), time=sh.time_days)
report("SHOCK trial, all follow-up", sh, 1000, 365)
