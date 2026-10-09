# Rees 2019: nanoparticle uptake per cell

## Citation
Rees P, Wills JW, Brown MR, Barnes CM, Summers HD. The origin of heterogeneous nanoparticle uptake by cells. Nature Communications 10:2341, 2019. DOI: 10.1038/s41467-019-10112-4. CC BY 4.0.

## Data
- BioImage Archive S-BSST249: 1_BEAS_0.5nM_1h_1.lsm to _3.lsm (fields Image01 to Image03), 2048 by 2048 pixels, 16 bit, 0.346 micrometers per pixel. Channel 0 Hoechst 33342, channel 1 WGA-555, channel 2 Qtracker 705.
- The CellProfiler 2.2 result file 1_BEAS_0.5nM_1h.mat (in the reference folder) holds the pipeline and the counts of each field.
- The BioStudies record states no license; the files are fetched, not committed.

## Method in the paper
CellProfiler: nuclei by a threshold (bounded below at 0.1) with declumping, cells by Propagation into the WGA channel, vesicles by a threshold on the Qtracker channel after subtraction of its Otsu value, vesicles related to cells. Cells and nuclei at the image border were discarded.

## Numbers to reproduce (check.py, check.out)
| Field | Nuclei | Cells | Vesicles | Vesicles in cells | Cells with a vesicle |
| --- | --- | --- | --- | --- | --- |
| 1 | 229 | 222 | 189 | 158 | 102 |
| 2 | 216 | 215 | 141 | 119 | 83 |
| 3 | 137 | 135 | 131 | 110 | 65 |
| Sum | 582 | 572 | 461 | 387 | 250 |

Pooled: 0.6766 vesicles per cell; 0.4371 of the cells hold at least one vesicle.

## Method in this benchmark
count_cell_uptake on the folder, membrane mode, with the pipeline values converted to raw 16-bit units (case.yaml lists each one).

Pilot run before the blind run: nuclei 566, vesicles 448, cells 459, 0.769 vesicles per cell, fraction 0.501. The nuclei and the vesicles agree within 3 percent. The cell count is 20 percent lower: the tool grows cells with a watershed, which gives larger cells than CellProfiler Propagation, so more cells touch the image edge and are left out. The per-cell values are higher for the same reason. Their tolerances were set after the pilot, and the cell count is a reference item.
