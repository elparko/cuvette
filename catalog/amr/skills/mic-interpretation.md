---
name: mic-interpretation
description: Steps to read a MIC table as S, I or R and to report MIC50, MIC90 and percent susceptible.
---

# MIC interpretation

1. Read the file. Find the species column and the drug columns, or the drug column and the MIC column.
2. Ask the scientist for the standard and the year (EUCAST or CLSI). Do not choose it for the scientist.
3. Ask if the isolates come from urine, and what host they come from.
4. Run show_breakpoints for the main organism and drugs. Tell the scientist the S and R breakpoints.
5. Run interpret_mic. Read the counts, the percents and the note about values with no breakpoint.
6. Run mic_summary for the MIC50 and the MIC90.
7. Report the settings, n, the MIC50 and the MIC90. Report the percent S and the percent R with their 95% intervals, and the percent I.
