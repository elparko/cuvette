import math

values = ["0.06"] * 2 + ["0.125"] * 4 + ["0.25"] * 4 + ["0.5"] * 4 + ["1"] * 3 + ["2", "8", ">8"]
rank = {"": 0, ">": 1}
parsed = sorted((float(v.lstrip(">")), rank[">" if v.startswith(">") else ""]) for v in values)
n = len(parsed)
mic50 = parsed[math.ceil(0.5 * n) - 1][0]
mic90 = parsed[math.ceil(0.9 * n) - 1][0]
next_dilution = [float(v[1:]) * 2 if v.startswith(">") else float(v) for v in values]
as_written = [float(v.lstrip(">")) for v in values]
gm = lambda xs: math.exp(sum(math.log(x) for x in xs) / len(xs))
print("n", n)
print("mic50", mic50)
print("mic90", mic90)
print("geometric_mean next dilution", round(gm(next_dilution), 6))
print("geometric_mean as written", round(gm(as_written), 6))

ladder = [2.0**k for k in range(-4, 7)]
for uti, s_max in ((False, 8.0), (True, 32.0)):
    cats = ["S" if x <= s_max else "R" for x in ladder]
    print("amc uti", uti, "S", cats.count("S"), "R", cats.count("R"))
