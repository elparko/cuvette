# Benchmark results: ollama:qwen3:8b

Date: 2026-10-08

| Scenario | Guidance | answer | traps | decisions | asking | claims | manual_route | overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| confound | on | 0.00 | 0.50 | 1.00 | 0.50 | 1.00 | 1.00 | 0.67 |
| confound | off | 1.00 | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.75 |
| confound | on minus off | -1.00 | +0.50 | +0.00 | +0.00 | +0.00 | +0.00 | -0.08 |
| illumination | on | 0.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.83 |
| illumination | off | 0.00 | 0.00 | 1.00 | 0.00 | 0.80 | 1.00 | 0.47 |
| illumination | on minus off | +0.00 | +1.00 | +0.00 | +1.00 | +0.20 | +0.00 | +0.37 |
| msi-lesion | on | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 0.99 | 0.75 |
| msi-lesion | off | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 1.00 | 0.72 |
| msi-lesion | on minus off | +0.00 | +0.17 | +0.00 | +0.00 | +0.00 | -0.01 | +0.03 |
| msi-rim-vs-core | on | 0.00 | 0.33 | 1.00 | 1.00 | 1.00 | 0.83 | 0.69 |
| msi-rim-vs-core | off | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 0.72 | 0.70 |
| msi-rim-vs-core | on minus off | +0.00 | -0.17 | +0.00 | +0.00 | +0.00 | +0.11 | -0.01 |
| pseudorep | on | 0.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 0.75 |
| pseudorep | off | 1.00 | 0.00 | 1.00 | 0.67 | 1.00 | 1.00 | 0.78 |
| pseudorep | on minus off | -1.00 | +0.50 | +0.00 | +0.33 | +0.00 | +0.00 | -0.03 |
| saturation | on | 0.00 | 0.50 | 1.00 | 0.80 | 1.00 | 1.00 | 0.72 |
| saturation | off | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 1.00 | 0.92 |
| saturation | on minus off | -1.00 | -0.50 | +0.00 | +0.30 | +0.00 | +0.00 | -0.20 |
| threshold | on | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| threshold | off | 0.00 | 0.00 | 1.00 | 0.67 | 1.00 | 1.00 | 0.61 |
| threshold | on minus off | +1.00 | +1.00 | +0.00 | +0.33 | +0.00 | +0.00 | +0.39 |
| all | on minus off | -0.29 | +0.36 | +0.00 | +0.28 | +0.03 | +0.01 | +0.07 |
