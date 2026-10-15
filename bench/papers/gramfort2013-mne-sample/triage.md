# Triage: gramfort2013-mne-sample

Entry numbers (eNN) are ids in the log.jsonl of the session folder.
Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- qwen3:8b: `20261008-145154-a83b`

| Model | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| qwen3:8b | events_id1 | 72 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_id2 | 73 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_id3 | 73 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_id4 | 70 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_id5 | 15 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_id32 | 16 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | events_total | 319 | computed 60 and 9 (channel counts) | a, d | In e13 and e33 the model set `min_duration` to 0.1 s. No pulse on STI 014 lasts that long, so count_events found 0 events. The summary was "0 events on STI 014: ." and gave no reason. The model repeated the call and then wrote a final answer that says the data may have no events (e46). | d2c5e79 (the summary gives the count without the limit and says what to change). Model fault for the unneeded argument. |
| qwen3:8b | epochs_kept | 309 | computed none | d | The run stopped after count_events. No epoching step ran. | model fault |
| qwen3:8b | epochs_dropped | 10 | computed none | d | The run stopped after count_events. No epoching step ran. | model fault |
| qwen3:8b | auditory_left_kept | 68 | computed none | d | The run stopped after count_events. No epoching step ran. | model fault |
| qwen3:8b | n100_latency_gfp | 0.0932 | computed by chance from file metrics | d | No evoked step ran. | model fault |
| qwen3:8b | n100_amplitude_gfp | 42.1 | computed by chance from file metrics | d | No evoked step ran. | model fault |
| qwen3:8b | strongest_grad_latency | 0.0866 | computed by chance from file metrics | d | No evoked step ran. | model fault |
| qwen3:8b | strongest_grad_amplitude | 199 | computed by chance from file metrics | d | No evoked step ran. | model fault |
| qwen3:8b | n100_amplitude_eeg | -6.0 | computed 0 | c | The prompt asks for the peak in the gradiometers only. The two EEG items are not asked for. | 0c6459c (reference item) |
| claude | n100_amplitude_eeg | -6.0 | computed -0.2 | c | Same cause. The other items pass. | 0c6459c |

Other findings:

- Claude, e21 and e23 (a): count_events and set_bad_channels failed because raw was the text {"handle": "h1"}, not an object. The tool read the text as a file name. Fixed in cd9940b. Claude then retried and passed all other items.

Commits in this branch for this paper: cd9940b, d2c5e79, 0c6459c
