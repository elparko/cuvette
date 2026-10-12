# Self-test check: a changed package must fail the test

Date: 12 October 2026. This is a dated record. It checks proposal 3.2.

Proposal 3.2 says: change a package version on purpose to one that gives a different number. The test must fail.

## Result

The self-test fails when the number changes. It finds no bug in `src/core/selftest.ts`.

- Adapter: scikit-image. Test: `blobs_count_edges_included`.
- Real version, 0.26.0: the test passes.
- Real older version, 0.22.0: the test passes. No real version in reach gives a different number.
- Patched copy of 0.22.0: the test fails. The patch is the fallback from step 3 of the plan.
- The cache key changes with the installed package version.

## What was changed

All changes are in a temporary folder. The real `~/.cuvette` and the real environments were not changed.

1. `uv venv --python 3.12 v22` made a new Python environment.
2. `uv pip install scikit-image==0.22.0 "numpy<2" pillow imageio tifffile scipy pandas matplotlib` filled it.
3. `CUVETTE_HOME` pointed to an empty temporary folder. The cache of the check stays there.
4. `SKIMAGE_PYTHON` pointed to `v22/bin/python`. The `locate.env` setting of the adapter reads this variable. It has priority over `~/.cuvette/envs/skimage`.
5. The patch: in `skimage/filters/thresholding.py`, function `threshold_isodata`, the last line `return thresholds[0]` became `return thresholds[0] + 20`. The adapter calls this function for the isodata threshold.
6. The version label of the patched copy changed: the folder `scikit_image-0.22.0.dist-info` became `scikit_image-0.22.0+patched.dist-info`. The line `Version:` in `METADATA` became `0.22.0+patched`.

## How the adapter finds its environment

- The Python adapter reads `locate.env` (here `SKIMAGE_PYTHON`) first. Then it reads `locate.paths` (`~/.cuvette/envs/skimage/bin/python`).
- `src/core/envlock.ts` runs that Python and lists every installed package with its version.
- The hash of that list goes into the cache key. The key is in `selfTestKey` in `src/core/selftest.ts`.
- The environment lock itself is cached in `env-locks.json`. It is valid while the modification times of the interpreter and of `site-packages` do not change.

## Doctor output

`cuvette doctor --adapter scikit-image` always runs the test again (`force: true` in `src/core/doctor.ts`).

Real environment, scikit-image 0.26.0:

    Known-answer tests
      pass     scikit-image: Passes

Separate environment, scikit-image 0.22.0, no patch:

    Programs
      ok       scikit-image: scikit-image 0.22.0 (.../chk/v22/bin/python)
    Known-answer tests
      pass     scikit-image: Passes

Separate environment, patched 0.22.0+patched:

    Known-answer tests
      fail     scikit-image: Fails by 2 on the object count. Also fails on metrics.threshold, the total area, the mean area, table.n_rows
               Source: ImageJ 1.53 particle analyzer on the NIH sample image blobs.gif: 64 particles, total area 22243, mean area 347.547.

    0 pass, 1 fail, 0 could not run, 0 skipped.

## Cache key check

The session start calls `selfTestFor` with no `force`. A script that does the same call gave this output. Each line is one start.

| Environment state | Output |
| --- | --- |
| 0.22.0+patched, first call after doctor | `cached: true`, fail |
| 0.22.0+patched, second call | `cached: true`, fail |
| 0.22.0+patched2 (label changed) | `cached: false`, fail. The test ran again. |
| 0.22.0+patched2, next call | `cached: true`, fail |

After these runs the cache file held four entries: 0.26.0, 0.22.0, 0.22.0+patched and 0.22.0+patched2. Each entry has its own key.

## Limit

The key uses the package name and version, not the files. A change of code with the same version label gives the same key. A session start then shows the old cached result. `cuvette doctor` is not affected, because it always runs the test again. A normal `pip install` of another version changes the label, so the normal case works.

## How to repeat the check

1. Make a temporary folder and go into it.
2. Run `uv venv --python 3.12 v22`.
3. Run `uv pip install --python v22/bin/python scikit-image==0.22.0 "numpy<2" pillow imageio tifffile scipy pandas matplotlib`.
4. Edit `v22/lib/python3.12/site-packages/skimage/filters/thresholding.py`. In `threshold_isodata`, change the last `return thresholds[0]` to `return thresholds[0] + 20`.
5. Rename `scikit_image-0.22.0.dist-info` to `scikit_image-0.22.0+patched.dist-info`. Set `Version: 0.22.0+patched` in `METADATA`.
6. Make an empty folder `home`.
7. Run `CUVETTE_HOME=$PWD/home SKIMAGE_PYTHON=$PWD/v22/bin/python node bin/cuvette.js doctor --adapter scikit-image` from the repository.
8. Make sure the output shows `Fails by 2 on the object count`.
9. Delete the temporary folder.

For R adapters (vegan, lme4), use the same method with `R_LIBS` and a separate library folder. This check did not do that.
