# Adapter spec, version 1

An adapter tells the harness how to run one science program, what the scientist must decide,
and how to check the results. This file is the published spec. A person or a model can build
an adapter from it.

The schema in `src/adapters/manifest.ts` is the source of truth. The tables below follow that
schema. The checker (`ga adapter check <dir>`) rejects any field that this spec does not list.

## Folder layout

```
my-adapter/
  adapter.yaml        required. The manifest.
  STANDARDS.md        always loaded into the model's context.
  skills/*.md         procedures, loaded when the task needs them.
  adapter.ts          optional. Checks, hooks, extra tools, manual routes.
  data/               small test datasets and reference outputs.
  data/SOURCES.md     required if the tests read data. Source and license of each file.
  evidence/           optional. Notes, macro recorder output, demonstrations.
  server.ts           optional. Code for an MCP server or a worker that the adapter starts.
```

| File | Purpose |
| --- | --- |
| `adapter.yaml` | Tools, tool-to-UI map, decisions, checks, known-answer tests, connection. |
| `STANDARDS.md` | How results in this field must be reported. Plain text. The `standards` field in `adapter.yaml` is added in front of it. |
| `skills/*.md` | One procedure per file. Each file starts with frontmatter that has `name` and `description`. |
| `adapter.ts` | A module named in the `module` field. Its default export has the keys `checks`, `hooks`, `tools` and `manualRoute`. |
| `data/` | Files that known-answer tests read. Refer to them with `{adapter_dir}/data/<file>`. |
| `data/SOURCES.md` | One table, `| File | Source | License |`, with a row for each file or folder that the tests read. For made-up data, name the script and write "synthetic". "not confirmed" in the license column gives a warning. |

A skill file looks like this:

```markdown
---
name: grayscale-threshold
description: How to choose and report an image threshold.
---

Body text.
```

The checker reports an error for a skill with no `name` or no `description`.

### The module

`adapter.ts` exports an object. All keys are optional.

| Key | Type | Meaning |
| --- | --- | --- |
| `checks` | object of functions | One function for each check id that has no `rule` and no `text`. The function takes `{ entries, nodes, decisions, answer }` and returns a list of findings. A finding has `check`, `severity` (`info`, `warning`, `error`) and `message`. It can also have `nodes` and `entries`. |
| `hooks` | list | Extra hooks. Each has `name`, `event`, an optional `matcher`, and a `run` function. |
| `tools` | list | Extra tools. Each has `name`, `description`, `inputSchema`, `source: "adapter"` and `execute(args, ctx)`. |
| `manualRoute` | function | `(tool, args) => string or undefined`. It returns the manual route for a call when a fixed template is not enough. |
| `suggest` | function | `(key, args) => { value, reason } or undefined`. When a call waits for a decision, the harness calls it with the decision key and the call arguments. The card of the question shows the value as the recommendation and the reason as evidence. Use it to detect a value from the input files. |

## `adapter.yaml`

The top level has these keys. A key with a default can be left out.

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `adapter` | object | required | Name, version and approval state of this adapter. |
| `program` | object | required | The program that the adapter runs. |
| `connection` | object | required | How the harness talks to the program. |
| `locate` | object | empty | How to find the program and read its version. |
| `standards` | text | `""` | Standards text. The harness puts it before `STANDARDS.md`. |
| `module` | text | `""` | Path of the module, such as `adapter.ts`. |
| `decisions` | list | `[]` | Choices that can change a result. |
| `map` | list | `[]` | The tool-to-UI map. |
| `checks` | list | `[]` | Review checks. |
| `tests` | list | `[]` | Known-answer tests. |
| `tools` | list | `[]` | Tools that the adapter declares. |
| `batch_tools` | list of text | `[]` | Tools from an MCP server or the module that process many files in each call. A tool in `tools` uses its own `batch` field. |
| `citations` | list | `[]` | Method citations for tools that `tools` does not declare. Each has `tool` and the citation fields. See `tools`. |
| `data_rules` | object | see below | What the cloud model can see. |

Every object is strict. An unknown key is an error. A duplicate decision key, check id, test id
or tool name is an error. Two map entries with the same tool and the same `match` are an error.

### `adapter`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | text | required | Lower case letters, digits and hyphens. It must start with a letter or digit. |
| `title` | text | `""` | Name for people to read. |
| `version` | text | `0.1.0` | Version of this adapter. |
| `spec` | text | `1` | Version of this spec. |
| `description` | text | `""` | One sentence. `list_adapters` shows the first sentence. |
| `field` | text | `""` | The science field, such as `statistics` or `mass spectrometry imaging`. `list_adapters` shows it. |
| `file_types` | list of text | `[]` | The input files that the adapter reads. An entry that starts with a dot is a file ending, such as `.bam` or `.vcf.gz`. Another entry is a file name, such as `quant.sf` or `matrix.mtx.gz`. Case does not matter. Put the main type first. The harness uses the list for the file-type hint and for the other options on the program card. |
| `authors` | list of text | `[]` | Who wrote the adapter. |
| `status` | `draft`, `approved`, `locked` | `draft` | Approval state. See "Versioning and approval". |
| `approved_by` | text | `""` | Who approved the adapter. |
| `approved_on` | text | `""` | Date of approval, `YYYY-MM-DD`. |

### `program`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | text | required | Program name. |
| `version` | text | `""` | Version that the author used. |
| `tested_versions` | list of text | `[]` | Versions that passed the known-answer tests. |
| `homepage` | text | `""` | Web address. |
| `docs` | list of text | `[]` | Documentation addresses. |
| `install` | text | `""` | How to install the program, in one or two sentences. If the program is not found when the agent loads the adapter, the harness shows this text. If it is empty, the harness makes a hint from `homepage` and `locate`. |
| `citation` | list of citations | `[]` | The references that the authors of the program ask users to cite. A program adapter must have at least one citation with a `doi` or a `url`. One citation without a list is also accepted. |

A citation has these fields:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `text` | text | required | The full reference in APA style, such as `Love, M. I., Huber, W., & Anders, S. (2014). Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology, 15(12), 550.` |
| `doi` | text | `""` | The DOI without `https://doi.org/`, such as `10.1186/s13059-014-0550-8`. |
| `url` | text | `""` | A web address. Use it when the reference has no DOI. |
| `bibtex` | text | `""` | A BibTeX entry. If it is empty, the harness makes one from `text` and `doi`. |
| `kind` | `program`, `method`, `model`, `dataset` | `program` in `program.citation`, `method` in a tool | What the reference describes. |
| `when` | argument name to value | `{}` | Only in a tool citation. The citation applies only to a call whose arguments have these values, such as `{ adjust: BH }`. A list of values matches any one of them. The value `set` matches an argument that is present and is not 0, false, empty or `none`. If the call does not give the argument, the harness uses the linked decision, then the `default` of the parameter. |

Use the citation that the program asks for. Look on the program website, in `citation("Package")`
for an R package, and in `CITATION.cff` or the package metadata for a Python package. Do not
write a reference from memory. Check that each DOI resolves.

Example:

```yaml
program:
  name: DESeq2
  citation:
    - text: "Love, M. I., Huber, W., & Anders, S. (2014). Moderated estimation of fold change and dispersion for RNA-seq data with DESeq2. Genome Biology, 15(12), 550."
      doi: 10.1186/s13059-014-0550-8
```

### `locate`

The harness tries `env`, then `paths`, then `which`. The first hit whose version output matches
`identity` is the program path. Use it as `{program_path}` in other fields. `version_command`
can also use `{adapter_dir}`. On macOS, a path must match the file name with the same case.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `env` | text | `""` | Name of an environment variable that holds the program path. |
| `paths` | list of text | `[]` | Paths to try. `*` matches any characters in one path part. `~` is the home folder. `{env:NAME}` reads an environment variable. |
| `which` | list of text | `[]` | Command names to search for on `PATH`. |
| `version_command` | list of text | `[]` | Command that prints the version. It can use `{program_path}`. |
| `version_pattern` | text | `""` | Regular expression. Group 1 is the version. If empty, the first output line is the version. |
| `identity` | text | `""` | Regular expression that the output of `version_command` must match, such as `samtools \d`. Required when `env`, `paths` or `which` is set. The harness tries each candidate path in order and takes the first one whose output matches. A file with the right name that is a different program is skipped. For a Python environment, print the module name with the version: `print('scanpy', scanpy.__version__)`. |

### `connection`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `kind` | one of the kinds below | required | `mcp`, `cli`, `python`, `script`, `http`, `macro`, `files`, `screen`. |
| `transport` | `stdio` or `http` | `stdio` | For `mcp`. How to reach the server. |
| `command` | list of text | `[]` | For `mcp` and `macro`. The command that starts the server or the program. |
| `env` | text to text | `{}` | Environment variables for the child process. Values can use placeholders. |
| `cwd` | text | `""` | Working folder of the child process. If empty, each call gets its own folder. |
| `url` | text | `""` | For `mcp` over `http`. Address of the server. |
| `interpreter` | list of text | `[]` | For `python` and `script`. The command that runs the code, such as `["Rscript"]`. |
| `macro_ext` | text | `.txt` | For `macro`. File extension of a macro file. |
| `base_url` | text | `""` | For `http`. Start of every request address. |
| `headers` | text to text | `{}` | For `http`. Headers for every request. |
| `network` | true or false | `false` | For `http`. The adapter can reach the network only if this is `true`. |
| `watch` | list of text | `[]` | Folders or files that the program writes. The harness reads new files from them. |
| `state_tool` | text | `""` | Name of a tool that returns the current state of the program. |
| `history_tool` | text | `""` | Name of a tool that returns the steps that the program recorded itself. |
| `startup_timeout_s` | number | `60` | Seconds to wait for the program to start. |
| `call_timeout_s` | number | `600` | Seconds to wait for one call. |

Placeholders work in `command`, `env`, `cwd`, `interpreter` and in tool templates:

| Placeholder | Value |
| --- | --- |
| `{node}` | Path of the Node.js program that runs the harness. |
| `{tsx}` | Path of the `tsx` command line program. |
| `{adapter_dir}` | The adapter folder. |
| `{work_dir}` | The work folder of the session. |
| `{session_dir}` | The folder of the session. |
| `{program_path}` | The program path from `locate`. |
| `{env:NAME}` | The value of an environment variable. |

The child process gets `GA_WORK_DIR`, `GA_SESSION_DIR`, `GA_ADAPTER_DIR` and `GA_PROGRAM_PATH`.
Do not put a secret in `adapter.yaml`. Use `{env:NAME}`.

### `tools`

A tool is one job. The harness shows each tool to the model with its parameters.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `name` | text | required | Tool name. Use `verb_noun`. |
| `description` | text | required | What the tool does, in one or two sentences. |
| `title` | text | `""` | Short name for people to read. |
| `params` | name to JSON Schema | `{}` | One JSON Schema for each argument, such as `{ type: number, minimum: 0 }`. |
| `required` | list of text | `[]` | Argument names that the model must give. Each must be in `params`. |
| `read_only` | true or false | `false` | `true` if the tool changes nothing. Read-only tools run in plan mode. |
| `batch` | true or false | `false` | `true` if each call processes many files. The pilot gate holds the tool until the scientist approves a pilot on one sample. A tool that takes a folder, a pattern or a list of files must state `batch: true` or `batch: false`. With `false`, the harness still detects a folder or 3 or more paths at run time. |
| `approval` | true or false | `false` | `true` if the scientist must approve each call. |
| `outputs` | name to output spec | `{}` | Files that the tool writes. The harness gives each file a path. |
| `command` | list of text | `[]` | For `cli`. The command template. |
| `function` | text | `""` | For `python`. `module:function`. |
| `script` | text | `""` | For `script`. Path of the script in the adapter folder. |
| `macro` | text | `""` | For `macro`. The macro text with placeholders. |
| `request` | object | `{}` | For `http`. `method`, `path`, `query`, `body`, `headers`. |
| `parse` | `text`, `json`, `csv`, `keyvalue` | `text` | How to read the output of a `cli` or `script` tool. |
| `citations` | list of citations | `[]` | The published methods that the tool uses, such as the Benjamini-Hochberg adjustment of p values. The fields are the same as in `program.citation`. `kind` is `method` by default. Use `when` for a method that applies only to some arguments. |

An output spec has these fields: `kind` (`image`, `table`, `file`, `text`, `json`; default
`file`), `ext` (default empty) and `description` (default empty).

An `mcp` adapter declares no tools. The server lists them. To cite a method of a tool that the
adapter does not declare in `tools`, such as a tool of an MCP server or of the module, add a
citation to the top-level `citations` list with the field `tool` set to the tool name.

The harness cites only what ran. The program citations apply when the session loads the
adapter. A tool citation applies when the tool runs with arguments that match `when`. A citation
that applies only in a comparison run goes in a separate list, "Used in a comparison". A `files` adapter gets four built-in
tools: `list_files`, `read_table`, `image_info` and `wait_for_file`.

Template rules for `command`, `macro` and `request`:

- The harness replaces `{name}` with the argument `name`. `{a.b}` reads a nested value.
- `{output.key}` is the path of the output file `key`.
- If an optional argument is absent, the harness removes its item. It also removes a flag item
  just before it.
- An argument that is a list and is the whole item expands to several items.
- The harness never passes a template to a shell. Each item is one argument.

### `decisions`

A decision is a choice that can change a conclusion. The harness keeps a record of each one.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `key` | text | required | Identifier. Unique in the adapter. |
| `label` | text | required | Name for people to read. |
| `kind` | `text`, `choice`, `float`, `int`, `bool` | `text` | Type of the value. |
| `default` | any | none | Value that the setup form shows first. |
| `choices` | list | `[]` | Allowed values for `choice`. The default must be one of them. |
| `lo`, `hi` | number | none | Range for `float` and `int`. |
| `owner` | `human`, `agent`, `fixed` | `human` | Who decides. See below. |
| `group` | text | `Method` | Heading in the setup form. |
| `help` | text | `""` | One or two sentences for the scientist. |
| `essential` | true or false | `false` | `true` shows the decision in the short setup form. |
| `stage` | `setup`, `when_needed` | `setup` | When the harness asks. |
| `links` | list of links | `[]` | Tool arguments that the decision sets. |
| `sensitivity` | object | none | A sensitivity check for this decision. |
| `changes_conclusion` | true or false | `true` | `false` for a choice that cannot change the result. |

Owners:

| Owner | Meaning |
| --- | --- |
| `human` | The agent stops and asks. A `when_needed` decision has no value until the scientist answers. |
| `agent` | The agent chooses and records the reason. |
| `fixed` | The lab profile gives the value. The harness overwrites any other value. A `fixed` decision needs a default. |

Stages: `setup` decisions get a value before the first tool call. `when_needed` decisions wait
until the agent calls a linked tool.

A link is `{ tool: <tool name>, arg: <argument name> }`. The `arg` can be a dotted path into a
nested argument, such as `params.tol_ppm`. The first part of the path must be an argument of the
tool. If the model leaves out a linked argument, the harness fills in the decision value. If the
model gives a different value, the harness logs a deviation.

Sensitivity re-runs one tool with other values of one decision. Fields:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `options` | list | `[]` | Values to try. |
| `tool` | text | `""` | Tool to re-run. The tool must exist. |
| `args` | object | `{}` | Extra arguments for each run. |
| `compare` | list of text | `[]` | Metric names to compare across the runs. |
| `max_runs` | integer | `3` | Maximum number of runs. |

### `map`

The map links each tool to the manual route: the steps a person does in the program to get the
same result.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `tool` | text | required | Tool name. |
| `match` | name to value | `{}` | The entry applies only if these arguments have these values. An entry with more matches wins. |
| `route` | text | required | The manual route: menu path, dialog, button, or the command line. |
| `steps` | list of text | `[]` | The route as separate steps. |
| `params` | list | `[]` | Argument to label map. See below. |
| `fidelity` | `exact`, `close`, `code_only` | `close` | How well the route matches the tool. |
| `difference` | text | `""` | For `close`: what differs. |
| `evidence` | object | unverified | Where the entry came from. |
| `summary` | text | `""` | Template for the one-line result. It can use `{arg}`, `{metrics.name}`, `{data.name}` and `{n_rows}`. |

A param map entry has `arg`, `label`, `ui_default` and `note`. Each entry must have `arg` and `label`.
`label` is the name of the field in the program. `ui_default` is the default that the program
shows. The `arg` can be a dotted
path. If the tool default differs from `ui_default`, the step shows a warning.

An evidence object has `source`, `test` and `note`.

| Fidelity | Meaning |
| --- | --- |
| `exact` | The manual route gives the same numbers. A test shows it. |
| `close` | The same method with a known difference. Write the difference. |
| `code_only` | The program has no manual route. Each step that uses the tool carries a label. |

| Evidence source | Meaning | Rank |
| --- | --- | --- |
| `program_definitions` | One definition in the program drives both the interface and the API. | 1 |
| `macro_recorder` | The program recorded the steps. | 2 |
| `demonstration` | The scientist did the task once and the agent recorded it. | 3 |
| `docs` | The manual or a tutorial. | 4 |
| `code` | Read from the program source. | 4 |
| `unverified` | No source, or no test yet. This is the default. | 5 |

Every tool has at least one map entry. The checker reports an error for a tool with none.

### `checks`

A check is a rule that finds an error common in the field.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | text | required | Identifier. Unique. |
| `description` | text | `""` | What the check finds. |
| `severity` | `info`, `warning`, `error` | `warning` | How serious a finding is. |
| `rule` | object | none | A rule that the harness evaluates. |
| `text` | text | `""` | An instruction for the referee model. |

A rule has `tool`, `arg`, `op`, `value` (optional) and `message`. The operators are `==`, `!=`,
`<`, `<=`, `>`, `>=`, `missing`, `present`. The rule applies to each call of the tool.

Each check needs one of three things: a `rule`, a `text`, or a function with the same id in the
module `checks`. The checker reports an error for a check with none of them.

### `tests`

A known-answer test runs tools on small data and compares the result with known
numbers.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `id` | text | required | Identifier. Unique. |
| `description` | text | `""` | What the test shows. |
| `calls` | list of calls | required | Tool calls, run in order. |
| `expect` | list of expectations | `[]` | What the result must be. |
| `data` | list of text | `[]` | Files in the adapter folder that the test needs. They must exist. |
| `manual_route_checked` | true or false | `false` | `true` if a person ran the manual route and got the same numbers. |
| `gui` | true or false | none | `true` if the test opens a program window or takes the focus. `ga adapter check --run-tests` skips it; `--gui` runs it. Each test of a `macro` or `screen` adapter must state it. |

A call has `tool`, `args` (default `{}`) and `save_as` (default empty). The tool can be a program tool
or a tool of the module.

An expectation has `path` and one or more of these comparisons:

| Field | Meaning |
| --- | --- |
| `equals` | The value is equal. Objects and lists are compared as JSON. |
| `approx` | The value is within a tolerance of this number. Tolerance is the larger of `abs` and `rel` times the absolute value of `approx`. |
| `rel` | Relative tolerance for `approx`. Default `1e-6`. |
| `abs` | Absolute tolerance for `approx`. Default `0`. |
| `min` | The value is at least this number. |
| `max` | The value is at most this number. |
| `contains` | A text value contains this text. For a list, one item contains it. |

The `path` is a dotted path into the result of the last call. The result has the shape that
"Tool results" describes. Examples: `ok`, `summary`, `metrics.n_peaks`, `data.rows[0].mz`,
`outputs[0].path`, `table.n_rows`.

To read an earlier call, start the path with `saved.<name>.`. The name comes from `save_as`.

`save_as` stores the full result of a call under a name. A later call can use it in an argument
with `{saved.<name>.<path>}`. The path is a dotted path into the saved result.

- If the argument value is only the placeholder, the value keeps its type. A number stays a
  number.
- If the placeholder is inside a longer text, it becomes text.
- `{adapter_dir}` works the same way.
- A name that no earlier call saved is an error. The checker finds it before the run.

A test fails if a call fails (`ok` is false). The exception is the last call, when an
expectation has the path `ok`. A test also fails if a comparison does not hold, or if a path has
no value.

Example:

```yaml
tests:
  - id: threshold-blobs
    description: The blob image has 64 objects at the Otsu threshold.
    data: [data/blobs.tif]
    calls:
      - { tool: open_image, args: { path: "{adapter_dir}/data/blobs.tif" }, save_as: img }
      - { tool: threshold, args: { image: "{saved.img.data.id}", method: otsu } }
    expect:
      - { path: metrics.threshold, approx: 120, abs: 1 }
      - { path: metrics.n_objects, equals: 64 }
      - { path: outputs[0].path, contains: ".png" }
```

### `data_rules`

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `cloud_visibility` | `all`, `summaries`, `none` | `all` | What a cloud model can see: all results, only summaries and metrics, or nothing. |
| `note` | text | `""` | Reason, for example a data use agreement. |

## Loading an adapter during a session

With no `--adapter`, a session starts with the generic tools and two harness tools:

- `list_adapters(filter?)` lists each adapter: name, program, field, the first sentence of the
  description, `file_types`, status, and whether the harness finds the program. The program check
  uses `locate` with no version command, and runs once for each adapter in a session.
- `use_adapter(name, reason)` loads one adapter: its tools, standards, skills, decisions, checks
  and hooks, the same as `--adapter`.

The choice of program is a decision with the key `adapter`. The scientist owns it by default, so
`use_adapter` opens a card: "The agent wants to use <program> through the <adapter> adapter:
<reason>." The other options are the adapters that share a file type with it. The scientist
accepts or picks another. If the scientist gives the decision to the agent, the load goes ahead
and the record shows an agent choice. In a headless run, the answers file can set it, such as
`"adapter": "biostats"`. `--adapter` still names the adapters before the start, with no card.

After a load, the record has an `adapter` entry with the name, the adapter version, the program
version, the reason and who chose it. Setup-stage decisions of the new adapter get their defaults,
or the values from the setup and answers files, in a new `setup` entry. New tools go to the end of
the tool list. A second load of the same adapter does nothing. In blind mode, the folder of the
adapter and the install folder of its program go on the allow list.

## Adapters in every session

The setting `defaultAdapters` names adapters that each session loads at the start. The default
is `["tables"]`: read CSV and Excel sheets, summarize, reshape, write xlsx and make plots. Its
five tools take about 2,000 tokens, and its standards take about 240 tokens.

- `ga`, `ga -p` and `ga mcp` load the default adapters next to the `--adapter` adapters. They
  open no card.
- The default adapters do not close the adapter choice. With no `--adapter`, `list_adapters` and
  `use_adapter` stay, and the agent can load a program adapter later.
- If the harness does not find the program of a default adapter, the session starts without it. The first
  message says why and gives the install hint.
- The session record lists them under `defaults` in the `session` entry.
- The benchmark does not use this setting. It loads only the adapters in each `bench.yaml`.

Change it with `ga config set defaultAdapters tables,biostats`. Type `none` for no adapter.

## Tool results

Each tool returns this shape. Each key except `ok` can be missing.

| Key | Type | Meaning |
| --- | --- | --- |
| `ok` | true or false | `false` if the step failed. |
| `error` | text | Why it failed. |
| `summary` | text | One line that a person can read. Include the key numbers. |
| `metrics` | text to number | Numbers that tests and claims can check. |
| `data` | any | Structured result. |
| `text` | text | Long text output. |
| `outputs` | list | Files: `{ path, kind, name }`. `kind` is `image`, `table` or `file`. |
| `table` | object | Preview: `{ columns, rows, n_rows, path }`. |
| `manualRoute` | text | The manual route for this call. It overrides the map. |
| `fidelity` | `exact`, `close`, `code_only`, `none` | Fidelity for this call. It overrides the map. |

How each kind makes a result:

- `mcp`: the harness reads `structuredContent`, else JSON text, else plain text. It reads the keys
  above from the JSON. It saves image content in the work folder.
- `cli` and `script`: `parse` picks the reader. `json` reads the output as the result.
  `keyvalue` reads lines of `name: value` or `name=value`. `csv` makes a table. `text` keeps
  the text.
- `python`: the function returns a value. The harness converts it, saves files and reads the keys.
- `http`: the harness reads a JSON response with the same rules. A binary response becomes a file.

## Connection kinds

Pick the kind from the table. One adapter has one kind. For a program that needs two, write
the second part as a worker and use `mcp` or `script`.

| Kind | Use when | Minimal example |
| --- | --- | --- |
| `mcp` | The program or a wrapper is an MCP server. | See below. |
| `cli` | The program runs from a command line. | See below. |
| `python` | A Python library has the functions. | See below. |
| `script` | R, Julia or MATLAB code does the work. | See below. |
| `http` | The program has a REST API. | See below. |
| `macro` | The program is a desktop program with a macro language. | See below. |
| `files` | The program only exports and imports files. | See below. |
| `screen` | The program has no API. | See below. |

`mcp`:

```yaml
connection:
  kind: mcp
  command: ["{node}", "{tsx}", "{adapter_dir}/server.ts"]
```

`cli`:

```yaml
connection: { kind: cli }
tools:
  - name: convert
    description: Convert a document to another format.
    params: { input: { type: string }, to: { type: string } }
    required: [input, to]
    outputs: { result: { kind: file, ext: out } }
    command: ["pandoc", "{input}", "--to", "{to}", "--output", "{output.result}"]
```

`python`:

```yaml
connection: { kind: python, interpreter: ["{adapter_dir}/.venv/bin/python"] }
tools:
  - name: normalize
    description: Normalize counts per cell.
    params: { adata: { type: object }, target_sum: { type: number } }
    required: [adata]
    function: tools:normalize
```

The function is `module:name`. The module is a Python file in the adapter folder. A returned
object that is not plain data becomes a handle, and a later call can pass the handle back.

`script`:

```yaml
connection: { kind: script, interpreter: ["Rscript"] }
tools:
  - name: fit_model
    description: Fit a negative binomial model.
    params: { counts: { type: string }, design: { type: string } }
    required: [counts, design]
    script: scripts/fit.R
    parse: json
```

The script gets one argument: the path of a JSON file with the arguments. It prints a JSON
result.

`http`:

```yaml
connection: { kind: http, base_url: "https://api.example.org/v2", network: true }
tools:
  - name: get_record
    description: Fetch one record.
    params: { id: { type: string } }
    required: [id]
    read_only: true
    request: { method: GET, path: "/records/{id}" }
```

`macro`:

```yaml
connection: { kind: macro, command: ["{program_path}", "--headless"], macro_ext: .ijm }
locate: { which: [ImageJ-linux64], paths: ["/Applications/Fiji.app/Contents/MacOS/ImageJ-macosx"] }
tools:
  - name: gaussian_blur
    description: Blur the open image.
    params: { sigma: { type: number } }
    required: [sigma]
    macro: 'run("Gaussian Blur...", "sigma={sigma}");'
```

`files`:

```yaml
connection: { kind: files, watch: ["~/Exports"] }
```

The built-in tools read the files that the scientist exports from the program.

`screen`:

```yaml
connection: { kind: screen }
```

The harness gives the model screen tools: screenshot, click and type. Declare the program steps
as tools with `read_only: false` and `approval: true`. Fidelity is `close` at best.

## Versioning and approval

| Status | Meaning |
| --- | --- |
| `draft` | The author is still working. The harness shows a label on every step. |
| `approved` | The scientist read each part and the known-answer tests pass. |
| `locked` | Approved, and the file is frozen. A change makes a new version. |

Rules:

1. An adapter is `draft` until the scientist approves it.
2. The scientist must approve the tool code, the decision defaults and the fidelity levels.
3. Approval sets `status`, `approved_by` and `approved_on`.
4. Approval adds the installed program version to `program.tested_versions`.
5. If the installed version is not in `tested_versions`, the checker warns. Run the tests
   again and add the version.
6. Change `adapter.version` whenever a tool, a default or a map entry changes.

The checker prints errors and warnings. An error stops use. A warning does not. The checker
also runs the adapter checklist rules. Each finding has a rule id in brackets, such as
`[arg-units]`, and says how to fix it. `docs/onboarding-guide.md` lists the rules with the reason
for each. The rules are in `src/onboarding/lint.ts`. The checker checks the tools of an MCP server only
with `--run-tests`, because the server must start to list them. The `text-style` rule checks
descriptions, decision help, STANDARDS.md and skills against ASD-STE100 Simplified Technical
English. It gives a warning, not an error.

| Check | Level |
| --- | --- |
| The manifest does not match the schema. | error |
| A tool has no map entry. | error |
| A map param names an argument that the tool does not have. | error |
| A decision link names a tool or an argument that does not exist. | error |
| A sensitivity tool does not exist. | error |
| A check has no rule, no text and no module function. | error |
| The module does not import. | error |
| A skill has no `name` or `description`. | error |
| A test uses a tool, a data file or a saved name that does not exist. | error |
| A known-answer test fails (with `--run-tests`). | error |
| There is no `STANDARDS.md`. | warning |
| There are no tests. | warning |
| A `close` entry has no `difference`. | warning |
| An `exact` entry has the evidence source `unverified`. | warning |
| The status is not `draft` and `tested_versions` is empty. | warning |
| The installed version is not in `tested_versions`. | warning |
| A checklist rule with level error fails: `field`, `file-types`, `install-hint`, `locate-identity`, `tool-description`, `arg-description` (required argument), `arg-schema`, `batch-flag`, `manual-route`, `approval-code`, `blinding-number`, `decision-type`, `decision-default`, `decision-help`, `sensitivity-compare`, `kat-present`, `kat-data-license`, `kat-gui`. | error |
| A checklist rule with level warning fails: `tool-description-length` (over 600 characters), `tool-description-plain`, `advice-limits`, `arg-description` (optional argument), `arg-units`, `array-min-items`, `summary-template`, `error-text`, `fail-without-error`, `kat-coverage`, `kat-exact`, `kat-failure-path`, `text-style`, a license that is not confirmed. | warning |

`ga adapter check <name> --drive [--model ollama:qwen3:8b] [--tool <name>]` is the drive test.
For each tool, it makes one plain request from the tool description and the input of a
known-answer test. Then it runs a short headless session with only this adapter. It reports whether
the model called the right tool, whether the arguments were valid, and whether the result and
the answer reached the known value. Each confusion names its record entry. The default model is
`ollama:qwen3:8b`.

The pull request workflow `.github/workflows/adapter-check.yml` (on the license branch, not yet on
main) runs `ga adapter check` on each changed adapter folder. The checklist rules run inside that
command, so the workflow needs no new step. The ImageJ job in `.github/workflows/test.yml` passes
`--gui`.
