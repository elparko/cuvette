# Benchmark results: ollama:qwen3:8b

Date: 2026-10-08

| Scenario | Guidance | answer | traps | decisions | asking | claims | manual_route | overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| confound | on | 0.00 | 0.50 | 1.00 | 0.80 | 1.00 | 1.00 | 0.72 |
| confound | off | 1.00 | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.75 |
| confound | on minus off | -1.00 | +0.50 | +0.00 | +0.30 | +0.00 | +0.00 | -0.03 |
| illumination | on | 0.00 | 0.75 | 1.00 | 0.67 | 1.00 | 1.00 | 0.74 |
| illumination | off | 0.00 | 0.75 | 1.00 | 0.00 | 0.86 | 1.00 | 0.60 |
| illumination | on minus off | +0.00 | +0.00 | +0.00 | +0.67 | +0.14 | +0.00 | +0.13 |
| msi-lesion | on | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 0.86 | 0.73 |
| msi-lesion | off | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.90 | 0.71 |
| msi-lesion | on minus off | +0.00 | +0.17 | +0.00 | +0.00 | +0.00 | -0.04 | +0.02 |
| msi-rim-vs-core | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.92 | 0.71 |
| msi-rim-vs-core | off | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.92 | 0.71 |
| msi-rim-vs-core | on minus off | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 |
| pseudorep | on | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| pseudorep | off | 1.00 | 0.00 | 1.00 | 0.67 | 1.00 | 1.00 | 0.78 |
| pseudorep | on minus off | +0.00 | +1.00 | +0.00 | +0.33 | +0.00 | +0.00 | +0.22 |
| saturation | on | 0.00 | 0.50 | 1.00 | 0.80 | 1.00 | 1.00 | 0.72 |
| saturation | off | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.92 |
| saturation | on minus off | -1.00 | -0.50 | +0.00 | +0.30 | +0.00 | +0.00 | -0.20 |
| threshold | on | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.83 |
| threshold | off | 0.00 | 0.00 | 1.00 | 0.67 | 1.00 | 1.00 | 0.61 |
| threshold | on minus off | +0.00 | +1.00 | +0.00 | +0.33 | +0.00 | +0.00 | +0.22 |
| all | on minus off | -0.29 | +0.31 | +0.00 | +0.28 | +0.02 | -0.01 | +0.05 |
