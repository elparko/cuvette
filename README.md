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

### With Claude

```bash
export ANTHROPIC_API_KEY=sk-ant-...        # or: ant auth login
node bin/ga.js --adapter imagej --model claude
node bin/ga.js --adapter imagej --model claude:claude-sonnet-5-5 --referee claude:claude-haiku-5-5
```

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
| `/questions` | Open questions in this session and all sessions. |
| `/trail 1`, `/trail 2`, `/trail 3` | The audit trail: one line per step, then details, then the technical record. |
| `/graph`, `/window` | The analysis graph in the terminal, or in a browser window. |
| `/review`, `/findings` | Run the rule checks and the referee; accept, reject or fix each finding. |
| `/export html` | The trail as one HTML file. Also `md`, `jsonl`, `pdf`, `protocol`, `script`, `notebook`, `flow`. |
| `/lab` | Approve or reject lab rules that the agent proposed. |

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

| Adapter | Program | Connection |
| --- | --- | --- |
| `imagej` | ImageJ 1.x or Fiji | macro language, one batch run for each step |
| `smile-msi` | SMILE MSI | its MCP server, with a small wrapper |
| `onboarding` | the onboarding tools | MCP; used by `ga onboard` |
| `examples/adapters/*` | wc, a Python module, pandoc | command line and Python |

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

- [docs/design.md](docs/design.md): the goals and all intended features.
- [docs/architecture.md](docs/architecture.md): the modules and their contracts.
- [docs/harness-survey.md](docs/harness-survey.md): how Claude Code and OpenCode work, and what
  this harness takes from them.
- [docs/adapter-spec.md](docs/adapter-spec.md) and [docs/onboarding-guide.md](docs/onboarding-guide.md).
