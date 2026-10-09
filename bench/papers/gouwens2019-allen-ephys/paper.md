# Gouwens 2019: Allen Cell Types electrophysiology features of three cells

## Citation
- Gouwens NW, Sorensen SA, Berg J, Lee C, Jarsky T, Ting J, et al. Classification of electrophysiological and morphological neuron types in the mouse visual cortex. Nature Neuroscience 22(7):1182-1195 (2019). DOI: 10.1038/s41593-019-0417-0.
- Data: Allen Cell Types Database, https://celltypes.brain-map.org/. Allen Institute Terms of Use.

## Data
- Three NWB 1.0 files (16 to 21 MB each): the cells 567987585 (Pvalb-IRES-Cre, VISl layer 4), 595511209 (Tlx3-Cre_PL56, VISp layer 4) and 563220277 (Sim1-Cre_KJ18, VISp layer 5).
- Each file holds many sweeps at 50 kHz. The Long Square sweeps are a 1 s current step that starts at 1.02 s.
- `fetch.sh` downloads the files and checks each SHA-256.
- Local path: /Volumes/T7/guided-analysis/data/gouwens2019-allen-ephys/

## Tool
- `catalog/patch-clamp`: `measure_spikes` and `measure_passive`, with the sweep label "Long Square".
- The tools follow the Allen Institute `ipfx` definitions of the features (the source files are in the `AllenInstitute/ipfx` repository).

## Method steps
1. Keep the sweeps whose label holds "Long Square".
2. Detect spikes: dV/dt of 20 mV per ms, then back to 5 percent of the mean upstroke, peak at -30 mV or higher.
3. Rheobase: the smallest positive step with a spike. F-I slope: a line through the rate of every sweep with spikes.
4. Input resistance: a line through the peak voltage deflection of the steps between -100 and 0 pA, in MOhm. Time constant: the mean of single-exponential fits from 10 percent of the peak deflection to the peak.
5. Upstroke to downstroke ratio of the first spike at rheobase.

## Numbers to reproduce
| Quantity | Cell 567987585 | Cell 595511209 | Cell 563220277 |
|---|---|---|---|
| Rheobase (pA) | 230 | 70 | 90 |
| F-I slope (Hz per pA) | 1.0717 | 0.1152 | 0.2075 |
| Input resistance (MOhm) | 129.84 | 187.19 | 128.52 |
| Time constant (ms) | 8.26 | 32.56 | 14.87 |
| Upstroke to downstroke ratio | 1.1458 | 3.8746 | 3.2259 |

## Numbers that do not match
The time constant differs from the database by 0.4 percent (cell 567987585) and 0.9 percent (cell 595511209). In cell 563220277 the tool gives no fit for one of three sweeps, so its mean is 15.79 ms against 14.87 ms. The cause is not known.

## Decisions the scientist owns
- The threshold definition, the dV/dt cutoff and the lowest peak.
- The baseline window, the sweeps and the junction potential correction.
- The deflection for the input resistance (peak here).
