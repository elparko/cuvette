---
name: onboard
description: Procedure to build a new adapter for a science program. Load this at the start of an onboarding session.
---

Read the onboarding guide with `read_file`. The first message gives the path.
Follow the guide step by step.
Read the adapter spec with `read_file` when you write `adapter.yaml`.
Read the section "Adapter checklist" of the guide before you write `adapter.yaml`. Keep to each rule.
`write_adapter_file` runs the checklist (lint) when `adapter.yaml` exists. Fix each error that it reports.
Run `check_adapter` after each change to `adapter.yaml`. Finish only when it reports no error.
