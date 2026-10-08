# Benchmark results: ollama:qwen3:8b

Date: 2026-10-08

| Scenario | Guidance | answer | traps | decisions | asking | claims | manual_route | overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| confound | on | 1.00 | 0.00 | 1.00 | 0.80 | 1.00 | 1.00 | 0.80 |
| confound | off | 1.00 | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.75 |
| confound | on minus off | +0.00 | +0.00 | +0.00 | +0.30 | +0.00 | +0.00 | +0.05 |
| illumination | on | 0.00 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 | 0.67 |
| illumination | off | 0.00 | 0.75 | 1.00 | 0.00 | 0.86 | 1.00 | 0.60 |
| illumination | on minus off | +0.00 | +0.25 | -1.00 | +1.00 | +0.14 | +0.00 | +0.07 |
| msi-lesion | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.86 | 0.70 |
| msi-lesion | off | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 |
| msi-lesion | on minus off | +0.00 | -0.17 | +0.00 | +0.00 | +0.00 | -0.14 | -0.05 |
| msi-rim-vs-core | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.83 | 0.69 |
| msi-rim-vs-core | off | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 0.86 | 0.73 |
| msi-rim-vs-core | on minus off | +0.00 | -0.17 | +0.00 | +0.00 | +0.00 | -0.02 | -0.03 |
| pseudorep | on | 1.00 | 1.00 | 1.00 | 1.00 | 0.91 | 1.00 | 0.99 |
| pseudorep | off | 1.00 | 0.00 | 1.00 | 0.67 | 1.00 | 1.00 | 0.78 |
| pseudorep | on minus off | +0.00 | +1.00 | +0.00 | +0.33 | -0.09 | +0.00 | +0.21 |
| saturation | on | 0.00 | 0.50 | 1.00 | 0.50 | 1.00 | 1.00 | 0.67 |
| saturation | off | 1.00 | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.75 |
| saturation | on minus off | -1.00 | +0.50 | +0.00 | +0.00 | +0.00 | +0.00 | -0.08 |
| threshold | on | 0.00 | 0.50 | 1.00 | 0.67 | 1.00 | 1.00 | 0.69 |
| threshold | off | 0.00 | 0.00 | 1.00 | 0.67 | 0.83 | 1.00 | 0.58 |
| threshold | on minus off | +0.00 | +0.50 | +0.00 | +0.00 | +0.17 | +0.00 | +0.11 |
| all | on minus off | -0.14 | +0.27 | -0.14 | +0.23 | +0.03 | -0.02 | +0.04 |
