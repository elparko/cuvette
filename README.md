# guided-analysis

A terminal agent that analyzes data in existing science programs. The scientist owns the
method decisions. The agent does the work, logs each step, and shows how to repeat each step by
hand in the program.

It works like Claude Code: a terminal app with a model loop, tools, permission prompts, hooks,
skills and slash commands. The difference is what the harness enforces: the scientist's decision
record, a manual route for each step, and a record of every number.

## Start

Needs Node 22 or later. Java is needed only for ImageJ.

```bash
npm install
node bin/ga.js --help
node bin/ga.js adapters
```

### With no adapter

```bash
node bin/ga.js --model claude
node bin/ga.js -p "Is drug 2 better than drug 1? Paired data: /data/sleep.csv" --model claude --answers answers.json
```

With no `--adapter`, the agent reads the request, calls `list_adapters`, and asks to load the
adapter that fits with `use_adapter`. The choice of program is your decision: a card shows the
adapter, the reason, and the other adapters that read the same file types. When the request
names files, the harness adds a one-line hint with the adapters for those file types. The
record keeps each load and its reason. In a run without the terminal UI, `"adapter": "biostats"`
in the answers file answers the card. `--adapter <name>` still loads adapters before the start.

### With Claude

```bash
node bin/ga.js --adapter imagej --model claude   # asks for the key at start if none is set
node bin/ga.js key                               # or save the key from the shell
node bin/ga.js key status                        # shows which key is used (masked)
node bin/ga.js --adapter imagej --model claude:claude-sonnet-5-5 --referee claude:claude-haiku-5-5
```

The harness checks the key with the API and saves it to `~/.guided-analysis/credentials.json`.
Only your user can read that file. Inside the app, type `/key` to change it, `/key status` to see
it masked, and `/key remove` to delete it. `ANTHROPIC_API_KEY` in the shell wins over the saved
key. `ant auth login` also works. A key that belongs to no workspace also needs
`node bin/ga.js key workspace <id>` (or `ANTHROPIC_WORKSPACE_ID`); a key made inside a workspace does not.

### With a small local model (Ollama)

```bash
ollama pull qwen3:8b                         # already present on this computer
node bin/ga.js --adapter imagej --model ollama:qwen3:8b
```

The harness talks to Ollama's own API and sets the context window (32k by default), because
Ollama's OpenAI-style endpoint can cut the context without a warning. With a small model, the
harness shows fewer tools at a time (the model uses `find_tools` for the rest), shortens tool
results, and summarizes old turns near the context limit.

### Things to try

- ImageJ: `Count the cells in catalog/imagej/data/blobs.gif and give me their mean size.`
- ImageJ trap scenario: `node bin/ga.js --adapter imagej` from `bench/pseudorep/data`, then
  `Are the cells in treated.png bigger than in control.png?`
- SMILE MSI: `node bin/ga.js --adapter smile-msi`, then
  `Open the demo slide and find lipids that differ between the regions.`
- Follow mode: press Shift+Tab until the status line says follow. The agent tells you each step
  in the program's own menus, waits, and checks your numbers.
- A run without the terminal UI:
  `node bin/ga.js -p "Count the cells in blobs.gif" --adapter imagej --model ollama:qwen3:8b`

### Keys and commands

| Key or command | What it does |
| --- | --- |
| Esc | Stop the agent. The results so far are kept. |
| Shift+Tab | Change the mode: watch, follow, teach, plan. |
| `/setup` | Fill in the decision record before the first result. |
| `/decisions`, `/owner` | See the decisions; give a decision type to the agent or keep it. |
| `/decisions agent`, `/decisions me` | Give all your decisions to the agent, or take them back. Fixed decisions do not change. |
| `/permissions bypass`, `/permissions ask` | Allow tool calls without a permission card, or show the cards again (the default). |
| `/questions` | Open questions in this session and all sessions. |
| `/trail 1`, `/trail 2`, `/trail 3` | The audit trail: one line per step, then details, then the technical record. |
| `/graph`, `/window` | The analysis graph in the terminal, or in a browser window. |
| `/review`, `/findings` | Run the rule checks and the referee; accept, reject or fix each finding. |
| `/export html` | The trail as one HTML file. Also `md`, `jsonl`, `pdf`, `protocol`, `script`, `notebook`, `flow`. |
| `/databook` | A data book (PDF and HTML): question, data, methods, results, figures, checks and the manual route. `/databook project` covers all sessions of the project folder. `/databook docx` needs pandoc. On the command line: `ga databook [<session folder>\|<project folder>]`. |
| `/lab` | Approve or reject lab rules that the agent proposed. |

### Bypass permissions

By default, a tool call that needs permission shows a card, and you allow or deny it. These
calls are `run_command`, `write_file`, `run_script`, adapter tools that ask, and a script that
searches the home folder or `/Volumes`.

WARNING: In bypass, the agent can run commands and write files without asking.

```
node bin/ga.js --adapter imagej --bypass-permissions
```

To start bypass in a session, type `/permissions bypass`. To stop it, type `/permissions ask`.
To start each session in bypass, put `"permissions": "bypass"` in
`~/.guided-analysis/settings.json` or in `.ga/settings.json` of the project. To keep rules in
the same file, use `"permissionMode": "bypass"` and keep the rules in `"permissions"`.

In bypass, the harness allows each call that has a permission card. The record logs each of
these calls as a `permission` entry with the reason `bypass permissions`. The record also logs
a `permission_mode` entry when bypass starts or stops. The status line shows
`bypass permissions` in yellow for as long as bypass is on.

Bypass does not change these:

- Method decisions, such as the test, the threshold or the program, stay with you. To give all
  of them to the agent, type `/decisions agent`. To take them back, type `/decisions me`.
- Plan mode and teach mode still block the steps.
- The blind rules of the benchmark and the macOS sandbox of `run_script` still apply.
- A push to eLabFTW sends data out of the computer, so it still asks.
- A `deny` rule in a settings file still denies the call.

## What the harness enforces

- **Decisions.** Each adapter lists the choices that can change a result. Each choice has an owner:
  the scientist, the agent, or a fixed lab value. The harness fills the values into each tool
  call. A different value is logged as a deviation. A tool call that needs a decision that the
  scientist has not made stops; the harness first runs the options side by side (a sensitivity
  check) and then asks the scientist.
- **Manual routes.** Each step shows the menu path and the dialog values. `/export protocol`
  writes the steps as a protocol that a lab member can follow by hand.
- **Records.** Each session has one append-only log, `~/.guided-analysis/sessions/<id>/log.jsonl`.
  Each result is a node with its arguments, its decisions, and the hashes of its input and output
  files. A changed decision marks the results that used the old value as out of date.
- **Claims.** Each number in the final answer is matched to a logged result. A number with no
  source gets a `[no source]` flag. Rule checks and a referee review the answer; the agent must
  fix error findings once before the answer reaches the scientist. The referee reads only the
  log, in a fresh context. By default it is the agent's own model; `--referee claude:claude-haiku-5-5`
  picks another model, and `--referee none` turns it off.

## Adapters

An adapter connects one program. It is a folder: `adapter.yaml` (tools, decisions, the
tool-to-UI map, checks, known-answer tests), `STANDARDS.md`, `skills/*.md`, and an optional
`adapter.ts`. See [docs/adapter-spec.md](docs/adapter-spec.md).

| Adapter | Program | Connection | Field |
| --- | --- | --- | --- |
| `imagej` | ImageJ 1.x or Fiji | macro language, one batch run for each step | microscopy |
| `smile-msi` | SMILE MSI | its MCP server, with a small wrapper | mass-spectrometry imaging |
| `pyimzml` | pyimzML | Python library | mass-spectrometry imaging files |
| `pyopenms` | pyOpenMS | Python library | mass spectrometry |
| `metaspace` | METASPACE | Python client over the web API | MSI annotation |
| `mzmine` | MZmine | batch file, command line | LC-MS features |
| `scikit-image` | scikit-image | Python library | image segmentation |
| `cellpose` | Cellpose | Python library | cell segmentation |
| `cellprofiler` | CellProfiler | pipeline file, headless | image cytometry |
| `qupath` | QuPath | Groovy scripts, one batch run for each step | histology |
| `bftools` | Bio-Formats tools | command line | image formats |
| `scanpy` | scanpy | Python library | single-cell RNA |
| `samtools` | samtools | command line | sequencing alignments |
| `fastqc` | FastQC | command line | sequencing quality |
| `rdkit` | RDKit | Python library | chemistry |
| `openbabel` | Open Babel | command line | chemistry |
| `onboarding` | the onboarding tools | MCP; used by `ga onboard` | any |

`examples/adapters/` holds three small worked examples (a command-line tool, a Python module,
pandoc). Every catalog adapter has status `draft`: approve each one with
`node bin/ga.js adapter approve <name>` after you read it. The Python adapters use virtual
environments in `~/.guided-analysis/envs/`; large programs and paper data are on the T7 drive
(`/Volumes/T7/guided-analysis/`). See `docs/onboarding-queue.md`. The `run_script` tool uses
`~/.guided-analysis/envs/science`. Its packages are in `src/tools/science-requirements.txt`.

New program: `node bin/ga.js onboard <program> --model claude`. The agent finds the program,
reads its help and docs, writes a draft adapter in `~/.guided-analysis/drafts/`, and runs the
checker. Check an adapter with `node bin/ga.js adapter check <dir> --run-tests`. Approve it with
`node bin/ga.js adapter approve <dir>`.

## Benchmark

`node bin/ga.js bench all --model ollama:qwen3:8b --guidance both` runs the trap scenarios in
`bench/` with the guidance on and off, and writes six scores for each run (answer, traps,
decisions, asking, claims, manual route) to `bench/results/`.

## Development

```bash
npm test                 # unit tests; no network, Java or model needed
GA_LIVE=1 npm test       # also the live tests: ImageJ, SMILE MSI, Ollama
npx tsc --noEmit
```

## Documents

- [docs/status-2026-10-08.md](docs/status-2026-10-08.md): what was built and tested overnight, and
  the known limits. Start here.
- [docs/design.md](docs/design.md): the goals and all intended features.
- [docs/architecture.md](docs/architecture.md): the modules and their contracts.
- [docs/harness-survey.md](docs/harness-survey.md): how Claude Code and OpenCode work, and what
  this harness takes from them.
- [docs/adapter-spec.md](docs/adapter-spec.md) and [docs/onboarding-guide.md](docs/onboarding-guide.md).
