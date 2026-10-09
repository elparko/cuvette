# Calcium imaging paper candidates

Checked on 2026-10-09. A candidate passes if the printed numbers reproduce from deposited traces or small stacks with the `calcium-imaging` adapter.

## Outcome

No paper qualifies. The benchmark has no calcium imaging paper. The adapter has known-answer tests on designed traces, one Allen Institute ground truth neuron and the CaImAn demo movie (see `catalog/calcium-imaging/data/SOURCES.md`).

## Search

The search used about 20 Europe PMC full-text queries (open access, CC BY) with the terms calcium imaging, GCaMP, Fluo-4, Fura-2, source data, responsive cells, pairwise correlation and event frequency. It then checked the data deposits (Dryad, figshare, Zenodo, DataCite) of about 200 papers.

## Candidates and why they fail

| Paper | Data | Result |
| --- | --- | --- |
| GCaMP-X chronic imaging of cortical neurons, eLife 76691, DOI 10.7554/eLife.76691 | Dryad 10.5061/dryad.zw3r22893, CC0, one 2 MB zip | Good fit by size and license. The paper prints event frequency and amplitude. Dryad refuses a script download (HTTP 401 and 403), so no test can fetch it. Try it again if a download link without a login appears. |
| Müller glia calcium transients, eLife 73202 | Dryad | Same download problem. |
| Astrocyte hM3Dq mice, Lab Animal 2025, DOI 10.1038/s41684-025-01587-4 | figshare 26999464, CC BY 4.0, one 33 KB workbook | 4 to 7 ROIs in each recording. Too small for the fraction of responsive cells or a group test. The paper has no open full text to check the printed numbers. |
| Sweat gland Fura Red and Fluo-4, PLOS ONE 0323255, DOI 10.1371/journal.pone.0323255 | figshare 28961864, CC BY 4.0 | Tissue-level traces, not cells. |
| Geosmin in honey bees, Sci Rep 2023, DOI 10.1038/s41598-023-30796-5 | figshare 22312216, CC BY 4.0, one 2 MB CSV file | Antennal lobe regions, not cells. The printed numbers were not checked. |
| BetaBuddy, beta cells, PLOS ONE | Zenodo 10476949 | One 6.8 GB zip. Too large. |
| Amyloid-beta neuronal silencing, PNAS | Zenodo 16837260 | One 74 MB zip. Over the size limit. |
| Longitudinal tracking, eLife | Zenodo 17091226 | 9.9 GB. |
| Retinal waves, eLife 81983 | Dryad | 7.9 GB. |

## Data used for tests instead

- The Cascade ground truth database (Rupprecht et al. 2021, DOI 10.1038/s41593-021-00895-5) holds cell-attached spike times with calcium traces. The adapter tests use neuron 101084 of dataset 12 (Allen Institute, GCaMP6s). The test checks the event counts against an independent count. The sensitivity and precision against the reference spikes are tool values, not published values.
- The CaImAn demo movie (Giovannucci et al. 2019, DOI 10.7554/eLife.38173) has no printed result. The adapter uses it for a test of the whole light pipeline and of Suite2p.
