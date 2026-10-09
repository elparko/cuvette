# Aulicino 2022: baculovirus delivery of large DNA inserts for CRISPR docking

## Citation
- Aulicino F et al. Highly efficient CRISPR-mediated large DNA docking and multiplexed prime editing using a single baculovirus. Nucleic Acids Research (2022). DOI: 10.1093/nar/gkac587. License CC BY.
- Data: figshare 10.6084/m9.figshare.20110364 (raw FCS, CC BY 4.0). The benchmark uses 9 files of Fig 2b (day 10).

## Data
- BD LSRFortessa. Three replicates for each design (HDR, HITI-2c). Three untransfected control samples.
- The mCherry signal is in the channel PE-CF594-A. The files hold linear, uncompensated values; the matrix in the header is the identity.
- fetch.sh downloads the 9 files and checks their SHA-256 sums.

## Tool
- flowcore adapter: population_stats (control file, control_percentile 99.9) and compare_groups (Welch).
- Independent check: fcsparser, NumPy and SciPy (`check.py`, output in `check.out`).

## Numbers to reproduce
- About 5% (HDR) and about 20% (HITI-2c) of mCherry-positive cells. The tool gives 4.42 and 20.90.
- The paper gives no cutoff and no test for the comparison. The other items are computed.

## Decisions the scientist owns
- The percentile of the control for the cutoff (99.9).
- The test for the two designs (Welch).
