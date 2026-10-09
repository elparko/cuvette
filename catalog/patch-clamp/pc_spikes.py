import numpy as np
from scipy import signal
from scipy.optimize import curve_fit

from pc_read import idx

DVDT_FILTER_KHZ = 10.0
AHP_WINDOW_MS = 10.0
MIN_HEIGHT_MV = 2.0
MAX_UPSTROKE_MS = 5.0
UPSTROKE_FRACTION = 0.05


def dvdt(v, rate):
    nyq = rate / 2.0
    cut = DVDT_FILTER_KHZ * 1e3
    if cut < nyq:
        b, a = signal.bessel(4, cut / nyq, "low")
        v = signal.filtfilt(b, a, v)
    return np.diff(v) * rate * 1e-3


def detect(v, rate, t0, cutoff, min_peak, method, window=None):
    d = dvdt(v, rate)
    lo, hi = 0, len(d)
    if window is not None:
        lo, hi = int(round(window[0] * rate)), min(int(round(window[1] * rate)), len(d))
    seg = d[lo:hi]
    cross = np.flatnonzero(np.diff((seg >= cutoff).astype(int)) == 1) + lo
    if len(cross) == 0:
        return []
    keep = [cross[0]]
    for prev, s in zip(cross[:-1], cross[1:]):
        if np.any(d[prev:s] < 0):
            keep.append(s)
    cross = np.array(keep)
    ends = np.append(cross[1:], min(hi, len(v) - 1))
    peaks = np.array([int(np.argmax(v[s:e])) + s for s, e in zip(cross, ends)])
    ok = np.ones(len(cross), bool)
    for k in range(len(cross) - 1):
        ok[k] = bool(np.any(d[peaks[k]:cross[k + 1]] < 0))
    cross, peaks = cross[ok], peaks[ok]
    good = (v[peaks] >= min_peak) & ((v[peaks] - v[cross]) >= MIN_HEIGHT_MV)
    cross, peaks = cross[good], peaks[good]
    far = (peaks - cross) <= int(MAX_UPSTROKE_MS * 1e-3 * rate)
    cross, peaks = cross[far], peaks[far]
    if len(cross) == 0:
        return []
    ups = np.array([int(np.argmax(d[s:p])) + s for s, p in zip(cross, peaks)])
    thr = cross.copy()
    if method == "dvdt_fraction_of_upstroke":
        target = d[ups].mean() * UPSTROKE_FRACTION
        prev = np.append([0], ups)
        thr = []
        for u, p in zip(ups, prev[:-1]):
            below = np.flatnonzero(d[u:p:-1] <= target) if u > p else np.array([])
            thr.append(p if below.size == 0 else u - below[0])
        thr = np.array(thr)
    out = []
    for k in range(len(cross)):
        t_i, p_i, u_i = int(thr[k]), int(peaks[k]), int(ups[k])
        nxt = int(thr[k + 1]) if k + 1 < len(thr) else len(v) - 1
        trough_end = min(nxt, p_i + int(AHP_WINDOW_MS * 1e-3 * rate))
        tr = int(np.argmin(v[p_i:trough_end + 1])) + p_i if trough_end > p_i else p_i
        amp = v[p_i] - v[t_i]
        half = v[t_i] + amp / 2.0
        up = _cross(v, t_i, p_i, half, True)
        dn = _cross(v, p_i, trough_end if trough_end > p_i else min(p_i + 1, len(v) - 1), half, False, fallback_to=nxt)
        width = (dn - up) / rate * 1e3 if np.isfinite(up) and np.isfinite(dn) else float("nan")
        seg_dn = d[p_i:max(tr, p_i + 1)]
        down = float(seg_dn.min()) if seg_dn.size else float("nan")
        out.append({"time_s": t0 + t_i / rate, "threshold_index": t_i, "peak_index": p_i, "threshold_mv": float(v[t_i]),
                    "peak_mv": float(v[p_i]), "amplitude_mv": float(amp), "half_width_ms": float(width),
                    "trough_mv": float(v[tr]), "ahp_mv": float(v[t_i] - v[tr]), "upstroke_mv_per_ms": float(d[u_i]),
                    "downstroke_mv_per_ms": down, "upstroke_downstroke_ratio": float(d[u_i] / -down) if down < 0 else float("nan")})
    return out


def _cross(v, a, b, level, rising, fallback_to=None):
    if b <= a:
        return float("nan")
    seg = v[a:b + 1]
    if rising:
        hits = np.flatnonzero(seg >= level)
    else:
        hits = np.flatnonzero(seg <= level)
    if hits.size == 0 and fallback_to is not None and fallback_to > b:
        seg = v[a:fallback_to + 1]
        hits = np.flatnonzero(seg <= level)
    if hits.size == 0:
        return float("nan")
    j = int(hits[0])
    if j == 0:
        return float(a)
    y0, y1 = seg[j - 1], seg[j]
    frac = (level - y0) / (y1 - y0) if y1 != y0 else 0.0
    return a + j - 1 + frac


def exp_curve(x, a, k, y0):
    return y0 + a * np.exp(-k * x)


def time_constant(t, v, start, end, frac=0.1, max_fit_end=None):
    ia, ib = idx(t, start), idx(t, end)
    base_a = max(ia - int(0.1 / (t[1] - t[0])), 0)
    base = float(np.mean(v[base_a:ia]))
    seg = v[ia:ib]
    pk = int(np.argmin(seg)) + ia
    if max_fit_end is not None:
        pk = min(pk, idx(t, max_fit_end))
    peak = v[pk]
    noise = float(np.std(v[base_a:ia]))
    if noise > 0 and abs(base - peak) / noise < 20.0:
        return float("nan")
    hit = np.flatnonzero(v[ia:] <= frac * (peak - base) + base)
    if hit.size == 0:
        return float("nan")
    fa = ia + int(hit[0])
    if pk - fa < 5:
        return float("nan")
    tw = (t[fa:pk] - t[fa]).astype(float)
    vw = v[fa:pk].astype(float)
    try:
        popt, _ = curve_fit(exp_curve, tw, vw, p0=(v[fa] - v[pk], 50.0, v[pk]))
    except RuntimeError:
        return float("nan")
    rmse = float(np.sqrt(np.mean((exp_curve(tw, *popt) - vw) ** 2)))
    if rmse > 1.0 or popt[1] <= 0:
        return float("nan")
    return float(1.0 / popt[1])
