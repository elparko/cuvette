---
name: time-frequency-power
description: How to compute and report Morlet wavelet power for one condition.
---

# Time-frequency power

1. Run make_epochs first. Use a window that holds the baseline and the response.
2. Run time_frequency with the condition. The harness asks for the lowest and highest frequency, the cycles divisor and the baseline mode.
3. A wavelet must be shorter than the epoch. If the tool says it is not, use a larger divisor or longer epochs.
4. Open the PNG. Read the table. Report the frequency range, the cycles, the baseline interval and the baseline mode.
5. Power at low frequencies near the epoch edges is not reliable. Say so.
