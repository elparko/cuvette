# Runs with the mne adapter (gramfort2013-mne-sample)

Date: 2026-10-08. Model: `ollama:qwen3:8b`. Adapter: mne 0.1.0 (draft). Program: MNE-Python 1.13.2 on the sample file `sample_audvis_filt-0-40_raw.fif`.

Method: prompt-only emulation. One request that asks for the event counts, the epochs left, the auditory left-ear epochs, and the N100 latency and size in the gradiometers. The request names the file and the event ids, and no tool or setting. An answers file gives the pipeline decisions of `expected.yaml`.

Command (`<s>` is a scratch folder):

```
GA_HOME=<s>/home node bin/ga.js -p "$(cat <s>/prompt.txt)" --adapter catalog/mne --model ollama:qwen3:8b --answers <s>/answers.json --allow all --output json
```

answers.json: `bad_channels "MEG 2443,EEG 053", filter_low 0.1, filter_high 40, notch_freq none, reference average, use_ica no, epoch_tmin -0.2, epoch_tmax 0.5, baseline_start -0.2, baseline_end 0, reject_grad 4000, reject_mag 4000, reject_eeg 150, reject_eog 250, peak_ch_type grad, peak_tmin 0.08, peak_tmax 0.12`. These values come from the MNE overview tutorial and from my choice of the peak window. A person must confirm them.

## Result summary (run 2)

| Quantity | Expected | Run 2 | Pass |
| --- | --- | --- | --- |
| Events found | 319 | 319 | yes |
| Counts for ids 1, 2, 3, 4, 5, 32 | 72, 73, 73, 70, 15, 16 | 72, 73, 73, 70, 15, 16 | yes |
| Epochs dropped, all ids | 10 | 10 | yes |
| Epochs kept, all ids | 309 | 309 | yes |
| auditory/left epochs kept | 68 | 68 | yes |
| N100 latency, gradiometer global field power | 0.0932 s (+/- 0.007) | 0.093 s | yes |
| N100 amplitude, gradiometer global field power | 42.1 fT/cm (+/- 2) | 42.11 fT/cm | yes |
| Strongest gradiometer, latency | 0.0866 s (+/- 0.007) | 0.100 s | no |
| Strongest gradiometer, amplitude | 199 fT/cm absolute (+/- 8) | -161.12 fT/cm | no |
| EEG negative peak (tool call, not in the final text) | 0.0999 s, -6.0 uV | 0.100 s, -6.01 uV | yes |

Verdict: PASS on the counts and on the global field power values. FAIL on the strongest single gradiometer. The model set `mode` to `neg` for a gradiometer. A gradiometer value has a sign that depends on the sensor, so the negative peak is MEG 0243 at 0.100 s and not the strongest channel (MEG 1332 at 0.087 s with `abs`). The final text gave the global field power values as well, so the headline latency of 0.100 s is the single-channel one. This is a method difference that the model chose, not a tool fault. The tool description and `STANDARDS.md` say to use `abs` for MEG. The model did not follow it.

## Run 2 (final)

- Session: `20261008-121605-9ac3`. Adapter had the extra line in `STANDARDS.md` that says to answer every part of the request.
- Tool order: count_events (file path as raw), make_epochs, compute_evoked, measure_peak, plot_evoked. The model skipped load_raw and passed the path. All calls ok except one make_epochs call that had no raw argument.
- The harness replaced the model values for the window (baseline end 0.2 became 0), the EOG limit (150 became 250) and the peak window (0.01 to 0.1 became 0.08 to 0.12) with the answers file values.
- The sensitivity table for the EEG limit ran before the question: 100 uV keeps 286 epochs, 150 keeps 309, 200 keeps 310. The channel type comparison for the peak ran: global field power latency 0.093 s for grad and mag, 0.100 s for EEG.
- The review found two errors in the final text: it used "9" from the 200 uV comparison run, and it counted pieces of the file path as numbers. The first is a model slip in a side note.
- The condition was named "1" because the model gave the ids as "1=1,2=2,...". The result is the same.
- The model did not report the EEG peak or the bad channels in the final text. No referee model was set, so the text checks did not run.

## Run 1

- Session: `20261008-120422-9188`. Same prompt and adapter, without the extra `STANDARDS.md` line.
- Counts, 309 epochs and 68 auditory left epochs were correct. The model ended with the sentence "Next, I will measure the peak" and gave no peak. The harness nudged it once. It did not call `measure_peak`.
- This is a model stop, not an adapter fault. I added the line to `STANDARDS.md` before run 2.

## Notes

- Hand check with the tool functions (no model) on the same file: global field power latency 0.0932 s and 42.106 fT/cm (grad), 0.0999 s and 4.144 uV (EEG), strongest channel MEG 1332 at 0.0866 s (198.96 fT/cm) with `abs`.
- The hand-run values in `expected.yaml` that the tutorial does not print were computed with these tools. They show that the tools are stable. They are not independent published numbers.
- Next change to try: make `mode` of `measure_peak` a decision with default `abs`, so that the scientist owns the sign.

## Rerun after harness fixes (2026-10-08)

Model: `ollama:qwen3:8b`. Harness commit e44260a. Fresh `GA_HOME` for each run under `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/<run>/home`. Prompt, setup and answers files are in `/Volumes/T7/guided-analysis/tools/rerun-2026-10-08/<paper-id>/`. Each run ended with exit code 0. No run crashed.

Scoring rules for the tables below:

- Pass: the correct number is in the final answer text.
- Tool only: the correct number is in a tool result in `log.jsonl`, but not in the final answer. This counts as fail in the strict count.
- The earlier column repeats the earlier result from this file.

Command: same as above. The prompt names the file and the six event ids and asks the three Plain questions. The answers file is the same as above. One run. Session `20261008-132711-7154`. The prompt was written again from the description above, because the earlier prompt file was not kept.

| Item | Expected | Earlier result (run 2) | Rerun result | Pass |
| --- | --- | --- | --- | --- |
| events found | 319 | 319 | 319 in tool result id 8, not in the answer | tool only |
| counts for ids 1, 2, 3, 4, 5, 32 | 72, 73, 73, 70, 15, 16 | same | 72, 73, 73, 70, 15, 16 (answer) | pass |
| epochs dropped | 10 | 10 | 10 in tool results ids 41 and 53, not in the answer | tool only |
| epochs kept | 309 | 309 | 309 (answer) | pass |
| auditory/left epochs kept | 68 | 68 | 68 (answer) | pass |
| N100 latency, gradiometer global field power | 0.0932 s (+/- 0.007) | 0.093 s | answer: 0.100 s. 0.093 s is in id 66 only. | tool only |
| N100 amplitude, gradiometer global field power | 42.1 fT/cm (+/- 2) | 42.11 | answer: -161.12 fT/cm. 42.11 is in id 66 only. | tool only |
| strongest gradiometer, latency | 0.0866 s (+/- 0.007) | 0.100 s (fail) | 0.100 s | fail |
| strongest gradiometer, amplitude | 199 fT/cm absolute (+/- 8) | -161.12 (fail) | -161.12 | fail |
| EEG negative peak | 0.0999 s, -6.0 uV | 0.100 s, -6.01 (tool call) | 0.100 s, -6.01 uV in id 70, not in the answer | tool only |

Result: 8 of 10 before (tool calls counted), 3 of 10 strict after, 8 of 10 with tool results.

Failure causes:

- Model called the tool with a wrong argument. `measure_peak` got `mode` neg for gradiometers (id 64). The tool description says to use abs. This gives the same two failures as before.
- Model reported the wrong quantity. The answer gives the single-channel negative peak (0.100 s, -161.12 fT/cm) as the response peak. The global field power values (0.093 s, 42.11 fT/cm) are in id 66 and are not in the answer.
- Model left out tool numbers: 319 events, 10 dropped, EEG peak.
- The sensitivity comparisons ran before the questions (ids 45 and 72), as before. The model values 400 for reject_grad and 0.1 and 0.4 for the peak window were replaced by the answers file values (ids 41, 83). No harness fault.
- The referee model confirmed the three answer parts as correct (ids 89 to 91). It did not flag the sign problem.
