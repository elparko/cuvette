# Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit e44260a. No code, adapter or expected.yaml file was changed. Ollama was free, so each run took 40 seconds to 5 minutes. Every run ended with exit code 0. No run crashed.

Files for each run (prompt, setup, answers, `out.json`, `GA_HOME` with `log.jsonl`): `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/`.

Runs: one per paper. Two for bedtools (two overlap rules cannot share one setup) and two for MDAnalysis (the trajectory and structure parts, as before). No run was repeated.

## Scoring

- Strict: the correct number is in the final answer text.
- With tool results: the number is in the final answer or in a tool result in `log.jsonl`.
- The earlier column uses the count that each runs file recorded. Some earlier counts used tool results.
- The prompts for iqtree (guided), MNE, flowkit and bedtools were written again from the notes in the runs files. The earlier prompt files were not kept.

## Items passed

| Paper | Adapter | Items | Before | After (strict) | After (with tool results) |
| --- | --- | --- | --- | --- | --- |
| minh2020-iqtree2 (guided) | phylo | 4 | 0 | 0 | 0 |
| danecek2021-bcftools | bcftools | 6 | 5 | 4 | 5 |
| quinlan2010-bedtools | bedtools | 5 | 4 | 4 | 5 |
| gramfort2013-mne-sample | mne | 10 | 8 | 3 | 8 |
| gowers2016-mdanalysis | mdanalysis | 8 | 6 | 1 | 7 |
| white2021-flowkit | flowkit | 11 | 9 | 10 | 11 |
| lazear2023-sage (guided) | sage | 6 | 5 | 2 | 5 |
| ljosa2012-bbbc005 (100-image sample) | cellprofiler | 3 | 2 | 2 | 3 |
| Total | | 53 | 39 | 26 | 44 |

The items are the rows of the table in each runs file. In bbbc005 the third item (true total 5007) was not recorded before.

## Result in short

- The merge question in bedtools is now answered (11270). The flowkit no-compensation question is answered. The empty `regions` value in bcftools no longer stops the run.
- The model reaches the right numbers in tool results in most papers. The final answer often does not hold them.
- Two harness faults remove correct numbers from the final answer (MDAnalysis, Sage). They cause 9 of the 27 failed items.
- The new tools were not used. The log shows zero `calculate` calls, zero `compare_options` calls and three `propose_change` calls (all in bbbc005, two of them with keys that are not decisions).

## Remaining failure causes (27 failed items, strict count)

### 1. Model never called the needed tool (5 items)

- iqtree: called `align_sequences` on an aligned PHYLIP file (ids 7, 16, 23). Never called the model or tree tool. 4 items.
- bcftools: never asked for chr20:1000000-1050000 (id 7 has the whole slice). 1 item.

### 2. Model called the tool with a wrong argument (3 items)

- mne: `measure_peak` with `mode` neg for gradiometers (id 64). 2 items (strongest channel latency and amplitude).
- mdanalysis: `measure_distance` with N and C atoms, not CA (run 2 id 17). 1 item.

### 3. Model left out a number that a tool returned (7 items)

- bedtools: 129 pairs (id 8). 1 item.
- bcftools: 2210 total records (id 8). 1 item.
- mne: 319 events (id 8), 10 dropped (ids 41, 53), EEG peak (id 70). 3 items.
- flowkit: 135381 CD3+ events without compensation (id 33). 1 item.
- bbbc005: 5007 true total (id 89). 1 item.

### 4. Model reported a wrong number or a wrong setting (3 items, plus wrong statements)

- sage: 207 reported as the 5% count. The call ran at 0.01. The tool result and its note told the model to use `propose_change` or `compare_options` (ids 20 to 23). 1 item.
- mne: the single-channel peak (0.100 s, -161.12 fT/cm) reported as the response peak. The global field power values are in id 66. 2 items.
- Wrong statements without an item: bbbc005 reports diameter 10 to 40 and discard True (tool used 15 to 60 and False; ids 88, 101, 102). It also claims a variation below 20 percent across methods, but all 9 comparison runs failed (id 103). mdanalysis run 2 says "backbone atoms" for a CA fit (finding id 43).

### 5. Harness fault: correct numbers lost before the final answer (9 items)

- mdanalysis, 6 items. Run 1 lost atoms, frames, RMSD and radius of gyration (faults 1 and 2 below). Run 2 lost the chain A and chain B residue counts (fault 3 below).
- sage, 3 items: 303 PSMs, 43 decoys, 1 decoy among kept (fault 4 below).

## Harness faults found, with log evidence

1. Nudge limit and wrong "final" (mdanalysis run 1, session 20261008-132856-2391). The model ended three turns with "Next, I will ..." and no tool call (ids 13, 23, 35). The harness nudged twice (ids 14, 24). The code allows two (`nudges < 2` in `src/core/session.ts`). The third promise became the final answer. It had no result.
2. Digits in file names count as unsourced numbers (same run). The claim check made the numbers 4 and 1 from `4AKE.pdb` and `1AKE.pdb` (ids 37, 39). The review demanded a revision. The revised answer (id 44) holds no result. Every trajectory number from the earlier turns is gone.
3. The final answer is the text of the last turn only (mdanalysis run 2, session 20261008-133033-babf). The chain A residue count (id 13) and the distance (id 23) were in earlier turns. They are not in the final answer (id 46). The model also pasted the review text into the answer.
4. One review round deletes numbers and keeps errors (sage, session 20261008-133633-3d1a). The first draft (id 24) had 303 PSMs and 43 decoys. The revision (id 39) dropped them. It kept the wrong 5% claim that three referee findings flag (ids 33, 34, 38). bbbc005 (session 20261008-133828-12b8) shipped three flagged errors in the same way (ids 101 to 103).
5. Comparison runs reuse invalid model arguments (bbbc005). The model passed `dividing_lines` "None". The tool rejects it. The nine comparison runs for diameter, threshold method and declump method all failed (ids 12 to 14, 19 to 21, 25 to 27). The user would see no comparison table.
6. The setup value replaces a what-if value (sage ids 19 to 21, flowkit ids 43 to 45 and 50 to 52, bcftools ids 17 to 19). The tool result now says how to change the value. The model ignored the note in sage and flowkit. The replacement itself is still active, and it wasted two flowkit calls.
7. Empty tool error (iqtree). The error is "mafft failed:" with no reason (ids 8, 17). The nudge "fix the input and try again" gives the model nothing to fix.
8. Minor: the `merge_intervals` summary rounds 3258788 bases to 3258790 (bedtools run 1, ids 14, 15).

## What the fixes changed

- Fixed and seen: empty setup value for `regions` (bcftools), merge question called (bedtools), no-compensation counts (flowkit, with `compare_compensation`), model reads the tool result for ratio and error (bbbc005).
- Not fixed by the harness: the model does not use `calculate`, `compare_options` or `propose_change` when it should.
- Worse than before in the strict count: mne, mdanalysis, sage. For mdanalysis and sage the cause is group 5. For mne the cause is groups 2, 3 and 4.
