# Runs: kovacs2026-mycoplasma-mic (Mycoplasma anserisalpingitidis, MIC50 and MIC90)

Date: 2026-10-09. Model: claude:claude-haiku-5-5 (blind mode on). Adapter: amr 0.1.0 (draft). Program: AMR 3.0.1.

Command:

```
node bin/ga.js bench papers --papers kovacs2026-mycoplasma-mic --models claude:claude-haiku-5-5 --runs 1
```

## Result summary

Computed 14/14 and reported 14/14, plus one reference item. 129 s. `check.py` (pandas and plain Python, no AMR) gives the same MIC50 and MIC90 of nine drugs with the ceiling rank rule and with the rounded rank rule of the paper (`check.out`).
