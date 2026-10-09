# Patient data check

Warning: the check is a help, not a guarantee. It finds patterns. It does not find all identifiers, and it can be wrong.

## What the check does

- Before each model step, the harness reads the new content that goes to the model: your messages and the tool results (for example `read_file`, `read_table` and `inspect_data`).
- If the model is a cloud model and the content has a likely patient identifier, a card stops the turn. The card shows the kind, the masked value (`J*** D**`) and the place (file, column, line or row).
- The four actions:
  1. Send anyway. The record logs the choice.
  2. Mask the values and send. The model sees placeholders, such as `[NAME 1]` and `[MRN 1]`. The same value always gets the same placeholder. Your files do not change.
  3. Use a local model for this session. The card shows this action only if the `local_model` setting names a local model.
  4. Stop. Nothing goes to the model. A later turn sends a short text in place of the content.
- Your choice applies to the rest of the session. The record logs each decision as a `phi` entry, with masked values only.
- A local model (Ollama, or an OpenAI-style server on this computer) gets no card. The record logs a notice.
- A headless run has no one to answer the card. It masks the values and logs the decision.
- After "Mask", the harness does not send the record to a cloud referee or to the title model, because the record holds the values.

## Settings

| Setting | What it does |
| --- | --- |
| `phi_check` | on (the default) or off. Off needs a second confirmation. A project settings file cannot set it. |
| `local_model` | The local model that the card offers, for example `ollama:qwen3:8b`. |
| This folder has no patient data | yes or no, for the project folder. Yes needs a second confirmation. Cuvette keeps the answer in `~/.guided-analysis/settings.json`, key `no_patient_data_folders`, next to the folder trust list. |

## Reference: the HIPAA Safe Harbor list

The reference is the list of 18 identifiers in the HIPAA Privacy Rule, 45 CFR 164.514(b)(2), "Safe Harbor": <https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html>.

| # | Identifier | Checked |
| --- | --- | --- |
| 1 | Names | Partly: a name after "Patient:" or "Name:", after Mr, Mrs or Ms, before an age ("a 67-year-old"), or before a clinical verb ("was admitted"). Also columns such as patient_name, first name and last name. |
| 2 | Geographic subdivisions smaller than a state | Partly: street addresses with a street word, "City, ST 12345", and ZIP codes in a ZIP column or after "ZIP", if the same line or table has a date. |
| 3 | Dates (except year) for an individual, and ages over 89 | Partly: dates of birth only. Admission, discharge and death dates, and ages over 89, are not checked. |
| 4 | Telephone numbers | Yes, US numbers with separators, and phone columns. |
| 5 | Fax numbers | Yes, with the same pattern, and fax columns. |
| 6 | Email addresses | Yes, except near words such as contact, author or investigator. |
| 7 | Social Security numbers | Yes, with dashes in text, and SSN columns. |
| 8 | Medical record numbers | Yes, after "MRN" or "medical record number", and MRN columns. |
| 9 | Health plan beneficiary numbers | No |
| 10 | Account numbers | No |
| 11 | Certificate and license numbers | No |
| 12 | Vehicle identifiers | No |
| 13 | Device identifiers and serial numbers | No |
| 14 | Web addresses (URLs) | No |
| 15 | IP addresses | No |
| 16 | Biometric identifiers | No |
| 17 | Full-face photographs | No. The check does not read images. |
| 18 | Other unique identifying numbers | No |

## Limits

- The check does not read the system prompt, the images, or the messages of the helper agent of the `task` tool.
- The check reads text. It does not open binary files.
- A study code (for example `P001`) is not an identifier under Safe Harbor, so the check ignores it.
- The check was run on each text file of 1 MB or less in the benchmark data (`tests/phi.test.ts`). No file triggers it. Synthetic clinical tables and notes trigger it.
