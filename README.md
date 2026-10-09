# guided-analysis

A terminal agent that analyzes data in existing science programs. The scientist owns the
method decisions. The agent does the work, logs each step, and shows how to repeat each step by
hand in the program.

It works like Claude Code: a terminal app with a model loop, tools, permission prompts, hooks,
skills and slash commands. The difference is what the harness enforces: the scientist's decision
record, a manual route for each step, and a record of every number.

## Install: terminal or desktop

There are two installs with one core:

- Terminal: the npm package gives the `cuvette` command (and `ga`). `cuvette app` opens the app in
  the browser. From this repository: `npm install`, then `npm link`.
- Desktop (Mac): open the .dmg and drag Cuvette to Applications. To get `cuvette` in Terminal
  too, choose Cuvette > Install Command Line Tool. It runs the core inside the app.

[docs/desktop.md](docs/desktop.md) has the details, the first open of the unsigned app, and the
build (`npm run desktop:build`).

## Start

Cuvette needs Node 22 or later. Only ImageJ needs Java.

```bash
npm install
node bin/ga.js --help
node bin/ga.js adapters
```

### First start and check

Start `ga` for the first time with no Claude API key and no local model. Then `ga` asks one
question with two answers. The answers are "Use Claude (needs an API key)" and "Use a local
model (Ollama, free, runs on this Mac)". It saves the choice, checks this Mac, and offers a 2-minute sample analysis. The sample
is the Student (1908) sleep data in `samples/sleep/` (public domain).

```bash
node bin/ga.js doctor          # ok, missing or old for Node, the model, Python, R, Java and each program
node bin/ga.js doctor --fix    # asks once, then installs the missing Python environments and R packages
```

For each item that is missing or old, `ga doctor` shows the install command or a download link.
`--fix` runs only the uv and R commands. It does not run Homebrew or download programs.

### Programs

`ga programs`, `/programs` in the terminal and the Programs page of the browser app show the
same list: each adapter, its program, the status, the version, the size of its environment, the
last use and the access settings, grouped by field.

```bash
ga programs                              # the list
ga programs install|update|remove|check <adapter>
ga programs path <adapter> <path|none>   # a program in a custom place, for example a Fiji in ~/Applications
ga programs enable|disable|approve <adapter>
ga programs network|code <adapter> on|off
```

Each change shows what it does and asks first. Bypass permissions does not skip this question.
Cuvette runs uv and R installs itself. It runs Homebrew only after you confirm. For a download it
shows the link. Remove deletes only a folder that Cuvette installs into, such as
`~/.guided-analysis/envs/<name>`. For any other program it shows "Installed outside Cuvette".
A turned-off adapter is not in `list_adapters`, and no session can load it. Each change goes in
`~/.guided-analysis/programs-log.jsonl` and in the record of the open session.

### Start without the terminal (macOS)

Do these steps one time, in Terminal:

1. Install Cuvette and link the command: `npm install`, then `npm link`.
2. Add the Finder action: `ga install-finder-action`.
3. Add the launcher app: `ga install-launcher`.

Then you do not need the terminal:

- In Finder, Control-click a folder (or a file), then choose Quick Actions > Analyze with Cuvette.
  Cuvette starts in that folder. For a file, it uses the folder of the file.
- Or double-click Cuvette in the Applications folder of your home folder. Choose the folder with
  your data.

Cuvette saves the results in that folder, in `cuvette/`. The two commands save the full path of
Node and of `ga`. If you move the repository or change the Node version, run the two commands
again. If the Quick Action is not in the menu, open System Settings > Keyboard > Keyboard
Shortcuts > Services > Files and Folders, and turn on "Analyze with Cuvette".

To remove them: `ga uninstall-finder-action` and `ga uninstall-launcher`.

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

Each session also loads the `tables` adapter. It reads CSV and Excel lab sheets, and it
summarizes and reshapes tables. It writes xlsx files and makes bar, box, scatter, line and
histogram plots. Each step gives the manual route in Excel. The setting `defaultAdapters` changes this list.

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

The harness talks to Ollama's own API and sets the context window (32k by default). The
OpenAI-style endpoint of Ollama can cut the context without a warning. With a small model, the
harness shows fewer tools at a time. The model uses `find_tools` for the rest. The harness also
shortens tool results and summarizes old turns near the context limit.

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
| `/rewind` | Return the conversation to an earlier message or confirmed stage. Later results stay in the folder and the record, marked rewound. Decisions return to their values at that point. |
| `/branch <name>`, `/branches`, `/compare <a> <b>` | Copy the session into a linked folder next to it to try another method; list the branches with a one-line result; show the key numbers of two branches side by side. |
| `/save-method <name>`, `/method <name>` | Save the confirmed analysis as a method in `~/.guided-analysis/methods/` (or, with `project`, in `.cuvette/methods/` of the project folder, which loads only in a trusted folder); start a new session from it. The questions come with the saved answers, and the demonstration still runs. Also `ga --method <name> <folder>` and `ga method list\|show\|delete\|export\|import`. |
| `/review`, `/findings` | Run the rule checks and the referee; accept, reject or fix each finding. |
| `/export html` | The trail as one HTML file. Also `md`, `jsonl`, `pdf`, `protocol`, `script`, `notebook`, `flow`. |
| `/databook` | A data book (PDF and HTML): question, data, methods, results, figures, checks and the manual route. `/databook project` covers all sessions of the project folder. `/databook docx` needs pandoc. On the command line: `ga databook [<session folder>\|<project folder>]`. |
| `/cite` | The programs and methods to cite for this session. Only what ran is listed. A method that ran only in a comparison run is listed apart. `/cite vancouver` or `/cite apa` changes the style for one list; the setting `citation_style` changes it for all outputs. `/cite bibtex`, `/cite ris` and `/cite text` save the list in the output folder. `/cite programs` shows how to cite each program. In the app: the Cite section of the Results tab. |
| `/lab` | Approve or reject lab rules that the agent proposed. |
| `/usage` | The cost and the tokens of each turn, and how full the context is. The status line and the app header show the short form, for example `$0.42 · context 18%`. A local model shows `local, $0`. |

### Input box keys

The setting `input_keys` (in `/config`, group Session) sets the keys of the input box. The
change applies at once. `/help` shows the keys of the current style.

| Action | `mac` (default) | `emacs` | `vim` |
| --- | --- | --- | --- |
| Send | Enter | Enter | Enter |
| New line | Shift+Enter, Option+Enter, `\` then Enter | Alt+Enter, `\` then Enter | Shift+Enter in insert mode, `o` |
| Word left, right | Option+Left, Option+Right | Alt+B, Alt+F | `b`, `w` |
| Line start, end | Cmd+Left, Cmd+Right, Home, End | Ctrl+A, Ctrl+E | `0`, `$` |
| Delete word before | Option+Backspace | Alt+Backspace, Ctrl+W | Ctrl+W in insert mode |
| Delete word after | Fn+Option+Backspace | Alt+D | `dw` |
| Delete to line start | Cmd+Backspace | Ctrl+U | Ctrl+U in insert mode |
| Lines, then past messages | Up, Down | Up, Down, Ctrl+P, Ctrl+N | `k`, `j` |
| Undo | Ctrl+Z, Cmd+Z | Ctrl+_ | `u` |
| Stop the agent | Esc | Esc | Esc in normal mode (Esc twice from insert mode) |

`classic` is a one-line box with the plain keys. A paste with line breaks stays one message in each style.
Shift+Tab, Ctrl+O, Ctrl+T, Ctrl+C twice, Tab and the `!` prefix work in each style.
Ctrl+T cycles the setting `footer_hints` (group Display): `full`, `short` (mode and model only) or `off`.
The text fields on the cards and in `/config` use the same keys as the input box, in one line.

To record the raw key bytes for a bug report, start with `CUVETTE_KEYLOG=/tmp/keys.log ga` (or `GA_KEYLOG`).

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
`~/.guided-analysis/settings.json` or in `.ga/settings.json` of the project. A project file
applies only after you trust the folder (see Folder trust). To keep rules in
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

### Folder trust

WARNING: The settings, hooks and adapters of a project folder can run programs on this computer.

A project folder can have Cuvette files in `.ga/` or `.cuvette/`:

- `settings.json` and `settings.local.json`. These can set hooks, permission rules and bypass permissions.
- `adapters/`. An adapter here replaces a catalog adapter with the same name.

Cuvette reads these files only in the project folder. It does not read them in a parent folder.
Cuvette ignores these files until you trust the folder. Only display settings apply without trust:
`animations`, `input_keys`, `openImages`, `databook_paper` and `databook_author`.

When a session starts in a folder that is not trusted, a card shows:

- The folder path.
- Each settings key that would change, with its value.
- Each hook command in full.
- Each adapter, with "replaces the catalog adapter X" when it replaces one.
- Whether the files turn on bypass permissions.

The card has three choices:

1. Trust this folder. Cuvette saves the folder in `trusted_folders` in
   `~/.guided-analysis/settings.json`, with a SHA-256 hash of each file.
2. Trust once (this session). Nothing is saved.
3. Do not trust. The session runs with your user settings only.

If a trusted file changes, the card shows again with a list of the changes. A setting that you
save with `/config` keeps the folder trusted.

A run with `-p` and `ga mcp` show no card. They ignore the files and write one line about it.
To use the files in a script, add `--trust-folder`. This trusts the folder for that run only.

```
ga trust list                  # the trusted folders
ga trust add <folder>          # trust a folder
ga trust remove <folder>       # remove the trust
ga trust show <folder>         # what the folder contains
```

In a session, `/trust` shows the folder and its files. `/trust on`, `/trust once` and
`/trust off` change the trust. `/config` and the Settings page of the app have a "Folder trust" row.

The benchmark (`ga bench papers`) trusts its own checkout. It passes the model options `think`,
`numCtx` and `effort` from the `.ga` settings of the checkout to each run.

## What the harness enforces

- **Decisions.** Each adapter lists the choices that can change a result. Each choice has an owner:
  the scientist, the agent, or a fixed lab value. The harness fills the values into each tool
  call. The record logs a different value as a deviation. A tool call stops if it needs a
  decision that the scientist has not made. The harness first runs the options side by side (a
  sensitivity check). Then it asks the scientist.
- **Manual routes.** Each step shows the menu path and the dialog values. `/export protocol`
  writes the steps as a protocol that a lab member can follow by hand.
- **Records.** Each session has one append-only log, `~/.guided-analysis/sessions/<id>/log.jsonl`.
  Each result is a node with its arguments, its decisions, and the hashes of its input and output
  files. A changed decision marks the results that used the old value as out of date.
- **Claims.** The harness matches each number in the final answer to a logged result. A number with no
  source gets a `[no source]` flag. Rule checks and a referee review the answer; the agent must
  fix error findings once before the answer reaches the scientist. The referee reads only the
  log, in a fresh context. By default it is the agent's own model; `--referee claude:claude-haiku-5-5`
  picks another model, and `--referee none` turns it off.

## Patient data

**Warning: the patient identifier check is a help, not a guarantee. Do not send patient data to a cloud model unless your institution allows it.**

- Before content goes to a cloud model (Claude), the harness looks for likely patient identifiers:
  names next to clinical words, dates of birth, medical record numbers, Social Security numbers,
  phone numbers, email addresses, street addresses, and ZIP codes with dates. It also looks for
  table columns such as name, MRN, DOB, patient, SSN and address.
- If it finds one, a card shows what it found and where (file, column, line), with the values
  masked, for example `J*** D**`. You choose: send anyway (the record logs it), mask the values
  and send (the model sees `[NAME 1]`; your files do not change), use a local model for this
  session, or stop.
- A local model (Ollama) gets no card. The record still logs a notice.
- Settings: `phi_check` (on by default; off needs a second confirmation), `local_model` (the
  model that the card offers, for example `ollama:qwen3:8b`), and `no_patient_data` ("No
  patient data here") for the project folder. All three are in `/config`, under Patient data.
- The reference is the HIPAA Safe Harbor list of 18 identifiers, 45 CFR 164.514(b)(2). The check
  covers only some of them. [docs/patient-data.md](docs/patient-data.md) lists what it checks
  and what it does not check.

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
| `image-assays` | scikit-image and SciPy | Python library | bench image assays: colony counts, colocalization, cell uptake |
| `qupath` | QuPath | Groovy scripts, one batch run for each step | histology |
| `bftools` | Bio-Formats tools | command line | image formats |
| `scanpy` | scanpy | Python library | single-cell RNA |
| `harmony` | harmonypy | Python library | single-cell sample integration |
| `squidpy` | Squidpy | Python library | spatial transcriptomics |
| `samtools` | samtools | command line | sequencing alignments |
| `fastqc` | FastQC | command line | sequencing quality |
| `rdkit` | RDKit | Python library | chemistry |
| `cloning` | Biopython, primer3-py | Python library | sequences, primers, cloning |
| `enrichment` | gseapy | Python library | gene set enrichment |
| `chromatography` | hplc-py | Python library | chromatogram peaks |
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
`bench/` with the guidance on and off. It writes six scores for each run to `bench/results/`:
answer, traps, decisions, asking, claims and manual route.

## Development

```bash
npm test                 # unit tests; no network, Java or model needed
GA_LIVE=1 npm test       # also the live tests: ImageJ, SMILE MSI, Ollama
npx tsc --noEmit
npm run lint:text        # the text rules (ASD-STE100) for the README, docs and UI strings
```

All text in this repository uses Simplified Technical English (ASD-STE100). See
[CLAUDE.md](CLAUDE.md). The setting `text_style` (`ste` or `plain`) sets the text rules in the
agent's prompt.

## Documents

- [docs/status-2026-10-08.md](docs/status-2026-10-08.md): what we built and tested overnight, and
  the known limits. Start here.
- [docs/design.md](docs/design.md): the goals and all intended features.
- [docs/architecture.md](docs/architecture.md): the modules and their contracts.
- [docs/harness-survey.md](docs/harness-survey.md): how Claude Code and OpenCode work, and what
  this harness takes from them.
- [docs/proprietary-alternatives.md](docs/proprietary-alternatives.md): the programs that labs buy, the
  open-source alternative for each one, and the adapter that runs it.
- [docs/adapter-spec.md](docs/adapter-spec.md) and [docs/onboarding-guide.md](docs/onboarding-guide.md).
