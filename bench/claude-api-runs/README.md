# Real Claude API runs (API key, `--model claude`)

Date: 2026-10-08, 09:54 to 09:59 local time. Model: claude-opus-5-5 through the Anthropic SDK with the
scientist's own API key and workspace ID. Headless mode (`ga -p`) with `--allow all`. Questions
were answered with the recommendation of each question. Both runs ran at the same time.

| Program | Request | Model requests | Tool calls | Input / output tokens | Time | Result |
| --- | --- | --- | --- | --- | --- | --- |
| ImageJ 1.53k | Count the cells in `blobs.gif` and give me their mean size. | 17 | 26 | 249k / 12.6k (126k cache reads) | 3 min 46 s | 50 cells, mean area 359.6 px² (Default threshold, watershed, edge cells left out). Without watershed: 46 cells, 384.5 px². Triangle gives 82. |
| SMILE MSI | Open the demo slide and find lipids that differ between the regions. | 19 | 26 | 851k / 16.9k (200k cache reads) | 4 min 22 s | No lipid differs between left and right with TIC normalization. Ten ions separate the ring, core and patch compartments (AUC 1.0, exploratory, pixels as replicates). |

Files: `imagej.json`, `smile-msi.json` (answer and findings), `*-log.jsonl` (full session
records), `imagej-first-key-log.jsonl` (an earlier run that stopped at request 7 with a credentials
error).

## What the harness did

- ImageJ: the harness compared the threshold methods (Default, Otsu, Triangle, Li) before it
  asked about the threshold method. It kept the scientist's Default when Claude asked for Otsu and
  Li. The review sent the first answer back once with three errors: numbers from comparison runs
  given as results, a misreported threshold method, and unsourced numbers.
- SMILE MSI: Claude asked for `norm = none`; the harness kept the recorded TIC and said so. The
  review flagged pixels as replicates and a failed `send_regions` step. The referee flagged that
  the compartments were defined from the same ions that then separate them.

## Faults found and fixed after these runs

1. A key that belongs to no workspace failed. Added `ga key workspace <id>` and a clear error.
2. Numbers that a script printed, and numbers in a file that the agent read, were flagged
   `[no source]`. The claim check now links them to the step that made them, and reads the saved
   copy of the file. Lipid names such as `PI 38:4` are no longer read as numbers. Rechecked on
   these two answers: unsourced numbers went from 12 to 0 (ImageJ) and from 22 to 0 (SMILE MSI).
3. An overwritten value was logged as `used: none` although the step ran with TIC. Claude and the
   referee both read it wrongly. The log now records `requested` (the model's value) and `used`
   (the value that ran).

## Runs after the fixes (10:41 to 11:06)

| Run | What it shows | Requests | Uncached input | Cache reads | Cache writes | Output |
| --- | --- | --- | --- | --- | --- | --- |
| ImageJ in the terminal (`imagej-2-tui-log.jsonl`) | `propose_change` changed the smallest size from 0 to 50 px² after the scientist agreed; `compare_options` ran Otsu, Huang, Li, IsoData and Triangle as comparison runs. 47 cells, mean 382.1 px². | see log | | | | |
| SMILE MSI (`smile-msi-2-log.jsonl`) | Same request as before. Claude used `compare_options` for the normalization check and labelled those numbers "comparison run". | 16 | 600k | 173k | | 15.7k |
| SMILE MSI with conversation caching (`smile-msi-3-log.jsonl`) | The cache breakpoint on the latest message works on the real API. | 20 | 44 | 1.19M | 96k | 20.2k |

Cache reads cost about one tenth of uncached input, and cache writes cost 1.25 times. For runs of this size the input cost falls by about 60%.
