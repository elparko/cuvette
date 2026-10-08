# Andrews: FastQC, official example reports

## Citation
- Andrews S. FastQC: a quality control tool for high throughput sequence data. Babraham Bioinformatics (2010-). https://www.bioinformatics.babraham.ac.uk/projects/fastqc/
- DOI: none. FastQC has no journal paper and no DOI that I found. This entry does not meet the DOI rule; use it as a fallback.
- Numbers come from the official example reports for the two example files (read 2026-10-07).

## Data
- good_sequence_short.txt (39.5 MB) and bad_sequence.txt (63.2 MB): Illumina 1.5 FASTQ, 40 bp reads, from the FastQC project page. The extension is .txt but the content is FASTQ.
- Matching example reports: good_sequence_short_fastqc.html, bad_sequence_fastqc.html.
- License: FastQC is GPL v3 or later (project page). The example data have no stated license. Treat as freely downloadable test data, confirm before redistribution.
- Local path: /Volumes/T7/guided-analysis/data/andrews-fastqc/
- Not human patient data as far as the page states.

## Tool
- FastQC (command line, needs Java). Not installed on this machine. The project page lists version 0.12.0 as current; the example reports do not state the version that made them.

## Method steps
1. Run `fastqc good_sequence_short.txt bad_sequence.txt -o outdir` (FastQC default parameters).
2. Read the summary: 11 modules, each PASS, WARN or FAIL.
3. Read the Basic Statistics table.

## Numbers to reproduce (from the example reports)
| Quantity | good_sequence_short | bad_sequence |
|---|---|---|
| Total sequences | 250000 | 395288 |
| Total bases | 10 Mbp | 15.8 Mbp |
| Sequences flagged as poor quality | 0 | 0 |
| Sequence length | 40 | 40 |
| %GC | 45 | 47 |
| Encoding | Illumina 1.5 | Illumina 1.5 |
| Per base sequence quality | PASS | FAIL |
| Per tile sequence quality | PASS | FAIL |
| Per sequence quality scores | PASS | PASS |
| Per base sequence content | PASS | WARNING |
| Per sequence GC content | PASS | WARNING |
| Per base N content | PASS | PASS |
| Sequence length distribution | PASS | PASS |
| Sequence duplication levels | PASS | WARNING |
| Overrepresented sequences | PASS | WARNING |
| Adapter content | PASS | PASS |

## Decisions the scientist owns
- Whether a FAIL or WARNING means the library is unusable or only needs trimming. FastQC thresholds are heuristics, not pass/fail rules for the experiment.
- Trimming or filtering after the report (not part of FastQC).
- Which adapter set to test.
