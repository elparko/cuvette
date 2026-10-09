import sys
from pathlib import Path

import primer3

TM = {"0": "breslauer", "1": "santalucia"}
SC = {"0": "schildkraut", "1": "santalucia"}
rows = [l.split() for l in (Path(__file__).resolve().parent.parent / "data" / "primer3_oligotm.txt").read_text().splitlines()[1:] if l.strip()]
used = [r for r in rows if r[1] in TM and r[2] in SC]
bad = 0
print("primer3-py", primer3.__version__)
for s, tm, sc, na, mg, dntp, exp in used:
    got = primer3.calc_tm(s, mv_conc=float(na), dv_conc=float(mg), dntp_conc=float(dntp), dna_conc=50, tm_method=TM[tm], salt_corrections_method=SC[sc])
    ok = abs(got - float(exp)) < 1e-4
    bad += not ok
    print("%-32s %s %-11s Na %-4s Mg %-4s dNTP %-4s expected %s got %.6f %s" % (s, TM[tm], SC[sc], na, mg, dntp, exp, got, "ok" if ok else "DIFF"))
print("rows used %d of %d, differences %d" % (len(used), len(rows), bad))
print("Rows with the owczarzy salt correction (code 2) or Tm model 2 are left out: primer3-py 2.3.1 gives different values for them.")
sys.exit(1 if bad else 0)
