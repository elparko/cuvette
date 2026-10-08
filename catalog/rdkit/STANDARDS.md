# RDKit reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Molecules

- Report the number of molecules read, parsed and dropped. Say why each group was dropped.
- Do not drop an invalid SMILES without a count in the answer.
- Say how salts were handled. The default keeps each molecule as given.
- Strip spaces from SMILES text. A trailing space is a common error in CSV files.

## Descriptors

- Name the function for each descriptor. logP is Crippen MolLogP. It is not the Daylight cLogP.
- Say which donor and acceptor functions you used. The Lipinski module and rdMolDescriptors give different counts.
- Give the RDKit version.

## Rule of five

- State the cutoffs and the number of violations that you allowed.
- A violation needs a value above the cutoff, not equal to it.
- Report the count with zero violations, with one violation and with two or more.
- Counts can change by a few molecules between RDKit versions.

## Solubility model

- Write the equation or the fitted coefficients with the descriptors that they belong to.
- Say which R squared you report. Give the definition: 1 minus residual over total sum of squares, or the squared correlation. The two values differ.
- Report the root mean square error in log units.
- A model that you score on its training data gives a result that is too good. Report the test result.
- For a refit, report the test fraction and the seed.
- The published ESOL coefficients come from a secondary source. Say so.
- Do not claim that the result reproduces the model of the 2004 paper. That model used Daylight cLogP and nine descriptors.
- A good fit does not prove that a descriptor causes solubility.
