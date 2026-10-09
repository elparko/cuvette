# Triage: hahne2009-flowcore-compdata

Classes: a = tool or adapter fault, b = harness fault, c = benchmark spec fault, d = model fault.

- claude-haiku-5-5 run 1 (blind): computed 12/12, reported 12/12, 69 s, 0 paths outside the allow list.

| Run | Item | Expected | Got | Class | Cause | Fix |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | none | | | | No item failed. | none |

Other findings:

- The model gave 2 or 3 significant digits in the answer. The rounding rule accepted 0.141, 0.015, 0.176 and 0.23 for tolerances of 0.00005. The computed score reads the exact tool values (0.1407882 and others).
- The tolerance of two items is larger (0.0004 for FL1-H into FL3-H and 0.0002 for FL2-H into FL4-H). The tool and the flowCore reference differ there (0.032409 against 0.032084, and 0.002740 against 0.002633). The reference comes from the flowStats code of 2009, which picks the positive events in a different way.
