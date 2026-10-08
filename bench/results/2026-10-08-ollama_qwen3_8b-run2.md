# Benchmark results: ollama:qwen3:8b

Date: 2026-10-08

| Scenario | Guidance | answer | traps | decisions | asking | claims | manual_route | overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| confound | on | 0.00 | 1.00 | 1.00 | 0.50 | 1.00 | 0.50 | 0.67 |
| confound | off | 1.00 | 0.50 | 1.00 | 0.50 | 1.00 | 1.00 | 0.83 |
| confound | on minus off | -1.00 | +0.50 | +0.00 | +0.00 | +0.00 | -0.50 | -0.17 |
| illumination | on | 0.00 | 0.75 | 1.00 | 0.67 | 1.00 | 1.00 | 0.74 |
| illumination | off | 0.00 | 0.50 | 1.00 | 0.00 | 0.75 | 1.00 | 0.54 |
| illumination | on minus off | +0.00 | +0.25 | +0.00 | +0.67 | +0.25 | +0.00 | +0.19 |
| msi-lesion | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.83 | 0.69 |
| msi-lesion | off | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 |
| msi-lesion | on minus off | +0.00 | -0.17 | +0.00 | +0.00 | +0.00 | -0.17 | -0.06 |
| msi-rim-vs-core | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.83 | 0.69 |
| msi-rim-vs-core | off | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.92 | 0.71 |
| msi-rim-vs-core | on minus off | +0.00 | +0.00 | +0.00 | +0.00 | +0.00 | -0.08 | -0.01 |
| pseudorep | on | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 |
| pseudorep | off | 0.00 | 0.50 | 1.00 | 0.67 | 1.00 | 1.00 | 0.69 |
| pseudorep | on minus off | +0.00 | +0.00 | +0.00 | +0.33 | +0.00 | +0.00 | +0.06 |
| saturation | on | 0.00 | 0.00 | 1.00 | 0.50 | 1.00 | 0.50 | 0.50 |
| saturation | off | 1.00 | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.75 |
| saturation | on minus off | -1.00 | +0.00 | +0.00 | +0.00 | +0.00 | -0.50 | -0.25 |
| threshold | on | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| threshold | off | 0.00 | 0.00 | 1.00 | 0.67 | 0.86 | 1.00 | 0.59 |
| threshold | on minus off | +1.00 | +1.00 | +0.00 | +0.33 | +0.14 | +0.00 | +0.41 |
| all | on minus off | -0.14 | +0.23 | +0.00 | +0.19 | +0.06 | -0.18 | +0.03 |
