---
name: compare-with-pathologist
description: Steps to measure the agreement of the tool and a pathologist, or of two pathologists.
---

# Agreement of two scorers

1. Make a table with one row for each case and one column for each scorer. Use the same cases and the same scale for all scorers.
2. Ask the scientist for the reference scorer. Ask for the cut points if the score is an H-score. Allred scores need no cut points.
3. Ask for the weights of the kappa and the form of the intraclass correlation. Explain the choice in one sentence each.
4. Run compare_scorers. Add the other scorers in extra_scorers if there are more than two.
5. Read the mean difference and the limits of agreement first. A bias shows that one scorer scores higher.
6. Report the weighted kappa, the ICC with its interval, the mean difference and the number of cases.
7. Do not call the scorers in agreement from the correlation alone.
