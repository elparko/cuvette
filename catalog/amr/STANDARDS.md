# AMR reporting standards

Follow these rules in each answer. The review checks look for the same errors.

## Tools

- interpret_mic reads each MIC as S, SDD, I or R with a breakpoint table. It gives counts and percents for each organism and drug.
- mic_summary gives the MIC50, the MIC90, the range, the mode and the geometric mean. It needs no breakpoint.
- show_breakpoints shows the S and R breakpoints in use. Run it before you read the percents.

## What to report

- The standard and the year, such as EUCAST 2024 or CLSI 2024. Also the host, and the urinary tract choice.
- The count of isolates (n) for each organism and drug.
- The percent S, the percent I or SDD, and the percent R. Say what the percent susceptible counts: S only, or S and I.
- A 95% interval or the count of isolates if the group has fewer than 30 isolates.
- The MIC50 and the MIC90 as concentrations in mg/L. Say how you read a value with a limit sign.
- The AMR version.

## How to read the result

- EUCAST I means susceptible, increased exposure. CLSI I means intermediate. CLSI SDD means susceptible, dose-dependent.
- A MIC with no breakpoint has no S, I or R. The tool shows the count. Do not call it S.
- The MIC90 of a group with fewer than 10 isolates is the highest or the second highest value.
- EUCAST and CLSI breakpoints differ for many drugs. Do not compare percents from two standards.

## Do not claim

- Do not give percent resistant without the standard and the year.
- Do not call a drug effective for a patient from a MIC table alone.
- Do not combine isolates from one patient as independent isolates without saying so.
