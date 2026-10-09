import numpy as np
from scipy import stats, optimize

a = 0.05
z = stats.norm.ppf(1 - a / 2)


def pois_exact(x, t, per):
    lo = 0.0 if x == 0 else stats.gamma.ppf(a / 2, x) / t
    hi = stats.gamma.ppf(1 - a / 2, x + 1) / t
    return x / t * per, lo * per, hi * per


def binom_exact(x, n):
    lo = 0.0 if x == 0 else stats.beta.ppf(a / 2, x, n - x + 1)
    hi = 1.0 if x == n else stats.beta.ppf(1 - a / 2, x + 1, n - x)
    return x / n, lo, hi


def wilson(x, n):
    p = x / n
    c = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    h = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)
    return p, c - h, c + h


def midp_rr(x1, t1, x0, t0):
    n = x1 + x0
    f_lo = lambda p: stats.binom.sf(x1, n, p) + 0.5 * stats.binom.pmf(x1, n, p) - a / 2
    f_hi = lambda p: stats.binom.cdf(x1 - 1, n, p) + 0.5 * stats.binom.pmf(x1, n, p) - a / 2
    p_lo = optimize.brentq(f_lo, 1e-9, 1 - 1e-9)
    p_hi = optimize.brentq(f_hi, 1e-9, 1 - 1e-9)
    conv = lambda p: p / (1 - p) * t0 / t1
    return (x1 / t1) / (x0 / t0), conv(p_lo), conv(p_hi)


def exact_rr(x1, t1, x0, t0):
    n = x1 + x0
    p_lo = stats.beta.ppf(a / 2, x1, n - x1 + 1)
    p_hi = stats.beta.ppf(1 - a / 2, x1 + 1, n - x1)
    conv = lambda p: p / (1 - p) * t0 / t1
    return conv(p_lo), conv(p_hi)


def gamma_dsr(count, pop, std):
    count, pop, std = map(np.asarray, (count, pop, std))
    w = std / std.sum()
    dsr = np.sum(w * count / pop)
    var = np.sum(w**2 * count / pop**2)
    wm = np.max(w / pop)
    lo = stats.gamma.ppf(a / 2, dsr**2 / var, scale=var / dsr)
    hi = stats.gamma.ppf(1 - a / 2, (dsr + wm) ** 2 / (var + wm**2), scale=(var + wm**2) / (dsr + wm))
    return count.sum() / pop.sum(), dsr, lo, hi


print("pois_exact 15/19017 per 1000", [round(v, 6) for v in pois_exact(15, 19017, 1000)])
print("pois_exact 0/500 per 1000", [round(v, 6) for v in pois_exact(0, 500, 1000)])
print("binom_exact 12/18", [round(v, 6) for v in binom_exact(12, 18)])
print("binom_exact 2/31", [round(v, 6) for v in binom_exact(2, 31)])
print("wilson 12/18", [round(v, 6) for v in wilson(12, 18)])

print("rr midp rothman", [round(v, 6) for v in midp_rr(41, 28010, 15, 19017)])
print("rr exact rothman", [round(v, 6) for v in exact_rr(41, 28010, 15, 19017)])
r1, r0 = 41 / 28010, 15 / 19017
se = np.sqrt(41 / 28010**2 + 15 / 19017**2)
print("rate difference per 1000", round((r1 - r0) * 1000, 6), round((r1 - r0 - z * se) * 1000, 6), round((r1 - r0 + z * se) * 1000, 6))
rrw = np.exp(np.log(r1 / r0) + np.array([-1, 1]) * z * np.sqrt(1 / 41 + 1 / 15))
print("rr wald", np.round(rrw, 6))

x1, n1, x0, n0 = 12, 18, 2, 31
rr = (x1 / n1) / (x0 / n0)
se = np.sqrt(1 / x1 - 1 / n1 + 1 / x0 - 1 / n0)
print("risk ratio", round(rr, 6), np.round(np.exp(np.log(rr) + np.array([-1, 1]) * z * se), 6))
rd = x1 / n1 - x0 / n0
sd = np.sqrt(x1 / n1 * (1 - x1 / n1) / n1 + x0 / n0 * (1 - x0 / n0) / n0)
print("risk difference", round(rd, 6), round(rd - z * sd, 6), round(rd + z * sd, 6))
print("nnh", round(1 / rd, 6), round(1 / (rd + z * sd), 6), round(1 / (rd - z * sd), 6))
orr = x1 * (n0 - x0) / ((n1 - x1) * x0)
so = np.sqrt(1 / x1 + 1 / (n1 - x1) + 1 / x0 + 1 / (n0 - x0))
print("odds ratio", orr, np.round(np.exp(np.log(orr) + np.array([-1, 1]) * z * so), 6))
print("af exposed", round((rr - 1) / rr, 6))
pe = n1 / (n1 + n0)
print("paf levin sample prevalence", round(pe * (rr - 1) / (1 + pe * (rr - 1)), 6), "pe", round(pe, 6))

pop = np.array([[230061, 329449, 114920, 39487, 14208, 3052], [72202, 326701, 208667, 83228, 28466, 5375], [15050, 175702, 207081, 117300, 45026, 8660], [2293, 68800, 132424, 98301, 46075, 9834], [327, 30666, 123419, 149919, 104088, 34392]], dtype=float)
cnt = np.array([[107, 141, 60, 40, 39, 25], [25, 150, 110, 84, 82, 39], [3, 71, 114, 103, 108, 75], [1, 26, 64, 89, 137, 96], [0, 8, 63, 112, 262, 295]], dtype=float)
std = pop.mean(axis=0)
for j, name in enumerate(["1", "2", "3", "4", "5 or more"]):
    c, d, lo, hi = gamma_dsr(cnt[j], pop[j], std)
    print("fay-feuer", name, [round(v * 1e5, 4) for v in (c, d, lo, hi)])

dth60 = np.array([141, 926, 1253, 1080, 1869, 4891, 14956, 30888, 41725, 26501, 5928.0])
pop60 = np.array([1784033, 7065148, 15658730, 10482916, 9939972, 10563872, 9114202, 6850263, 4702482, 1874619, 330915.0])
dth40 = np.array([45, 201, 320, 670, 1126, 3160, 9723, 17935, 22179, 13461, 2238.0])
pop40 = np.array([906897, 3794573, 10003544, 10629526, 9465330, 8249558, 7294330, 5022499, 2920220, 1019504, 142532.0])
c, d, lo, hi = gamma_dsr(dth40, pop40, pop60)
print("selvin direct 1940 to 1960 standard", [round(v * 1e5, 4) for v in (c, d, lo, hi)])
exp_ = np.sum(dth60 / pop60 * pop40)
obs = dth40.sum()
sir = obs / exp_
print("selvin indirect observed", obs, "expected", round(exp_, 4), "sir", round(sir, 6))
print("sir log ci", np.round(sir * np.exp(np.array([-1, 1]) * z / np.sqrt(obs)), 6))
elo = stats.gamma.ppf(a / 2, obs) / exp_
ehi = stats.gamma.ppf(1 - a / 2, obs + 1) / exp_
print("sir exact ci", round(elo, 6), round(ehi, 6))
print("isr per 100000", round(sir * dth60.sum() / pop60.sum() * 1e5, 4))

w = np.array([13818, 55317, 145565, 138646, 135573, 162613, 134834, 87247, 66037, 44842, 15508.0])
sets = {
    "all_2020": [524.3, 22.7, 13.7, 84.2, 159.5, 248.0, 473.5, 1038.9, 2072.3, 4997.0, 15210.9],
    "all_2019": [553.0, 23.3, 13.4, 69.7, 128.8, 199.2, 392.4, 883.3, 1764.6, 4308.3, 13228.6],
    "heart_2020": [6.5, 0.7, 0.4, 2.0, 8.6, 28.9, 84.6, 208.8, 414.2, 1017.2, 3822.1],
    "male_2020": [569.1, 25.5, 16.1, 121.9, 221.1, 325.5, 601.5, 1323.3, 2581.7, 5937.2, 16354.9],
    "female_2020": [477.5, 19.7, 11.3, 44.8, 95.7, 170.7, 348.8, 773.1, 1626.8, 4261.1, 14560.0],
}
adj = {k: float(np.sum(w / w.sum() * np.array(v))) for k, v in sets.items()}
for k, v in adj.items():
    print("nchs", k, round(v, 4))
x1, n1, x0, n0 = 10, 100, 13, 100
rd = x1 / n1 - x0 / n0
sd = np.sqrt(x1 / n1 * (1 - x1 / n1) / n1 + x0 / n0 * (1 - x0 / n0) / n0)
print("nnt example rd", round(rd, 6), round(rd - z * sd, 6), round(rd + z * sd, 6), "nnt", round(1 / abs(rd), 6), "rrr", round(1 - (x1 / n1) / (x0 / n0), 6))
print("ratio 2020/2019", round(adj["all_2020"] / adj["all_2019"], 5), "male/female", round(adj["male_2020"] / adj["female_2020"], 5))
