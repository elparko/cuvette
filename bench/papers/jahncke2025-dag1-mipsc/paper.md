# Jahncke 2025: mIPSCs of Purkinje cells in Dag1 conditional knockout mice

## Citation
- Jahncke JN, Schnell E, Wright KM. Distinct functional domains of Dystroglycan regulate inhibitory synapse formation and maintenance in cerebellar Purkinje cells. Communications Biology 8(1):878 (2025). DOI: 10.1038/s42003-025-08323-1. Open access.
- Data: Figshare DOI 10.6084/m9.figshare.29083331, CC BY 4.0. Code of the paper: github.com/jnjahncke/mini_analysis (Igor Pro).

## Data
- 32 Igor Pro files, one for each Purkinje cell of the experiment "P30 Calb1 DG": 16 Ctrl and 16 cKO cells from 12 mice (6 and 6). Each file has 10 sweeps of 30 s at 10 kHz. The waves have no unit; the values are in pA.
- `cells_metadata.csv` (made by `fetch.sh` from `phys_metadata.csv`) has the columns cell, animal and group.
- Local path: /Volumes/T7/guided-analysis/data/jahncke2025-dag1-mipsc/ (384 MB).

## Tool
- `catalog/patch-clamp`: `detect_events_for_cells` (Neo with igor2 reads the files), then `compare_cell_groups`.
- Independent check of the group statistics: R 4.6.1 `t.test`, `aggregate` and `aov` (`catalog/patch-clamp/checks/check_groups.R`).

## Method steps
1. Read each file with Neo. Set the unit to pA.
2. Skip the first second of each sweep (a test pulse) and the last half second.
3. Detect inward events with a scaled template (rise 0.7 ms, decay 8 ms) at a detection threshold of 4 times the noise SD of the detection trace.
4. Take the frequency (events per second), the mean amplitude, the 10-90% rise time and the decay time constant of each cell.
5. Compare Ctrl and cKO with a Welch t-test, each cell as one observation.

## Numbers to reproduce
| Quantity | Paper | Computed |
|---|---|---|
| Cells and animals | 16 cells, 6 animals in each group | 16 and 6 |
| p of the frequency | 0.018 | 0.0119 |
| p of the amplitude | 0.017 | 0.0277 |
| p of the rise time | 0.38 | 0.495 |
| p of the decay time | 0.36 | 0.154 |
| Decay of the Ctrl cells | 7.87 ms | 8.04 ms |
| Frequency, Ctrl and cKO | bar chart | 2.97 Hz and 1.76 Hz |
| Amplitude, Ctrl and cKO | bar chart | 51.9 pA and 38.3 pA |

## Numbers that do not match
The p values of the paper come from a different detection method (an Igor Pro script with a cutoff of -12000). Our p values have the same direction and order. The decay of the cKO cells is 8.77 ms in the paper and 7.07 ms here, so it is not an item.

## The trap
Cells from one animal are not independent. With the animal as the unit (6 against 6), the amplitude p value is 0.067 and the frequency p value is 0.025. A report that gives n as 16 cells and does not say so fails the review check `cells_counted_as_n`.

## Decisions the scientist owns
- The detection method, the threshold, the template kinetics and the analysis window.
- The unit of replication and the test.
