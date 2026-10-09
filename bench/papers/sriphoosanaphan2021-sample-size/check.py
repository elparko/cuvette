import math

from statsmodels.stats.power import TTestIndPower

d = 81 / 110
t = TTestIndPower()
n = t.solve_power(effect_size=d, alpha=0.05, power=0.8, alternative="two-sided")
print("d %.4f" % d)
print("two-sided: n per arm %.4f, rounded up %d, total %d" % (n, math.ceil(n), 2 * math.ceil(n)))
print("power with 30 per arm %.4f" % t.power(effect_size=d, nobs1=30, alpha=0.05))
n1 = t.solve_power(effect_size=d, alpha=0.05, power=0.8, alternative="larger")
print("one-sided (wrong for the paper): n per arm %.4f" % n1)
for drop in (0.15, 0.18, 0.19, 0.2):
    print("dropout %.2f: 30 / (1 - dropout) = %.2f" % (drop, 30 / (1 - drop)))
