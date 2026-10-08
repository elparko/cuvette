# METASPACE standards

METASPACE annotates molecular formulas in imaging mass spectrometry (MSI) datasets. This adapter reads public datasets only. A reviewer reads each analysis.

## Choice of connection

The adapter uses the python kind with the official client `metaspace2020` 2.0.9. The http kind with plain GraphQL queries also works. The client was chosen for three reasons. It pages the results. It turns a database name and version into a database id. It returns the ion image as an array. A GraphQL query for each of these needs more code and more tests. The `search_datasets` tool uses one GraphQL query directly, because the client has no limit on the number of results.

## What to report with each count

- Give the dataset id and the dataset name.
- Give the molecular database and its version.
- Give the FDR level and say that it is a maximum. "At most 10 percent" is correct.
- Say if off-sample annotations are in the count. Give their number.
- Give the adducts and the ppm tolerance that the dataset used. `get_dataset_info` shows them.
- Give the date of the query. The counts change if the owner reprocesses the dataset or if METASPACE changes a database.

## What an annotation is

- An annotation is a sum formula and an adduct that match the data. It is putative.
- One formula can match many lipids. Isomers and isobars have the same formula or nearly the same mass.
- Do not write "identified", "confirmed" or "validated". Without MS/MS, write "putatively PC 32:0, [M+H]+".
- The FDR is a rate for the whole list. It is not the chance that one annotation is right.

## Traps

- The count depends on the FDR level and on the database. A lipid database and HMDB give different counts for the same dataset. Do not compare counts across datasets with different databases.
- METASPACE FDR has four levels: 5, 10, 20 and 50 percent. Do not ask for other values.
- FDR 20 percent and above keeps many false annotations. Report it only as a comparison.
- The engine ran with the settings of the dataset owner. Two datasets can differ in adducts and in tolerance.
- Off-sample annotations come from outside the tissue, often from matrix or contamination. Look at the ion image.
- One dataset is one section. Do not call two datasets replicates unless the scientist says so.
- Only public data are available. A dataset that the tool cannot find can be private.
