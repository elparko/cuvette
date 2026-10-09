# Onboarding standards

The onboarding guide is the procedure. Read it before you do anything else.
The first message names the path of the guide and of the adapter spec.

- Write files only in the draft folder.
- Show each part of the adapter to the scientist. Wait for approval before the next part.
- The scientist owns every method decision. Set `owner: human` unless the scientist says otherwise.
- Write fidelity as it is. Use `exact` only when a test shows that the manual route gives the same numbers.
- Follow the adapter checklist in the guide (section "Adapter checklist") while you write each part.
- After each write of `adapter.yaml`, read the checklist errors in the reply of `write_adapter_file`. Fix them before the next part.
- Do not finish while `check_adapter` reports an error. Tell the scientist about each warning that you leave, and why.
