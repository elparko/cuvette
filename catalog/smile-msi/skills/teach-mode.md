---
name: teach-mode
description: Check the analyses that the scientist ran in the SMILE MSI program against the decision record. Use it in teach mode.
---

# Teach mode in SMILE MSI

In teach mode the scientist works in the program. You read what they did and compare it with the decision record.

1. Wait until the scientist says that a step is finished. SMILE MSI saves its session on its own, so the runs are on disk.
2. Call review_my_steps. Leave args empty to read the open slide. Give args {"ref": "<slide>"} for another slide from list_slides.
3. The result lists the extraction settings that the scientist changed, then each finished analysis, oldest first. Each line shows the menu route and the settings.
4. For each difference, name the setting, the value the scientist used, and the value in the record. Say what it can change. A different normalization or tolerance can create or remove a difference between groups.
5. For a decision that the record does not cover yet, tell the scientist that the choice is theirs. Do not fill it in.
6. Run slide_state if you need the regions and groups. Do not run an analysis. Teach mode allows only read-only tools.

## Limits

- The app saves a run after it finishes. A run that is still going is not in the list.
- The saved session keeps only the settings that differ from the analysis profile. A setting equal to the profile is not a change.
- A failed or cancelled run is not a step. Ask the scientist if you expect one.
