# Guided Analysis Agent Design

2026-10-07 · Parker Smith

An AI agent analyzes data in any existing science program, while the scientist owns the method
decisions and can repeat each step by hand. SMILE MSI's chat (`smile_msi/agent/`) is the stage 1
proof of concept. The general harness is in this repo.

## Design rules

Five rules shape every feature below. A feature that breaks one of them must change.

1. **The harness enforces. The prompt only asks.** Each guidance rule is code at the tool layer:
   it fills, blocks or logs a tool call. A rule that exists only in the system prompt is a
   suggestion.
2. **Every step has a manual route, or a label that says it has none.** The scientist can repeat
   each step in the program by hand and get the same numbers.
3. **The harness knows no domain.** All domain knowledge is in an adapter: the tools, the
   decisions, the standards, the checks. The harness works with any program, any model and any
   front end.
4. **No result without a record.** Each number traces to a logged tool call, with its inputs,
   parameters, code hash and data hash.
5. **The human owns the decisions. The agent does the work.** A decision that can change the
   conclusion goes to the human, unless the human gave it to the agent.

## How the parts fit

```
+---------------------------------------------------------------+
| Front ends: web app | phone | other agents (MCP) | in-program |
+---------------------------------------------------------------+
                               |
+---------------------------------------------------------------+
| Harness (knows no domain)                                     |
|   agent loop         decision checks      approval gates      |
|   sensitivity checks question queue       review              |
+---------------------------------------------------------------+
        |                      |                        |
+----------------+             |              +-------------------+
| Models         |             |              | Analysis record   |
| cloud SDKs,    |             |              | graph with hashes,|
| local servers  |             |              | append-only log   |
+----------------+             |              +-------------------+
                               |  MCP
+---------------------------------------------------------------+
| Adapters, one for each program                                |
|   SMILE MSI (MCP server) | Python library | desktop, no API   |
+---------------------------------------------------------------+
```

The front ends talk only to the harness. The harness calls the models and the adapters, and
writes every step to the record. Domain knowledge is only in the adapters. Each adapter holds
tools, the tool-to-UI map, decisions, standards, review checks and known-answer tests.

## Connecting any software

The harness talks to every program through one interface: an adapter that exposes tools over the
Model Context Protocol (MCP). Each kind of program needs a different adapter, but the harness
sees the same thing each time. The rows go from the easiest kind of program to the hardest.

| Program kind | Example | How the agent calls it | How the harness reads state | Source of the manual route | Best fidelity |
| --- | --- | --- | --- | --- | --- |
| Has an MCP server | SMILE MSI | MCP tool calls | A state tool on the server | The program's own step definitions | Exact |
| Python library | scanpy, scikit-image | Wrapper functions in a worker process | Objects in the worker | The library's docs and tutorials | Exact (code is the manual route) |
| R, MATLAB or Julia | DESeq2, a MATLAB toolbox | Rscript, the MATLAB Engine API or juliacall, in a worker | Saved objects and files | Vignettes and help pages | Exact |
| Command-line program | An aligner, a stats CLI | A subprocess with checked arguments | Output files and exit codes | `--help`, man pages | Exact (the command is the manual route) |
| Web service or REST API | A database, a cloud analysis service | HTTP calls from the adapter | API responses | The API reference and the web UI | Exact or close |
| Desktop program with a scripting bridge | ImageJ/Fiji, QuPath, Excel | The macro language or the scripting API | The bridge's state calls | The macro recorder, the menus | Exact or close |
| Desktop program with no API | Vendor software for an instrument | Screen control: screenshots, clicks, typing | Screenshots read by the model | A recorded demonstration | Close |
| Files only | Any program that exports tables or images | Read and write files | The files | The export steps the scientist describes | Close |

One program can use more than one row. For example, an adapter can call a Python library and
read state from files that the desktop program writes.

## Onboarding a new program

Onboarding makes an adapter for a program that the harness has not seen before. The agent does
the work, and the scientist approves each part. An adapter contains six parts:

- **Tools**: the functions that the agent calls, each with a typed schema.
- **Tool-to-UI map**: the manual route for each tool (see the next section).
- **Decision schema**: the choices that can change a result, with their defaults and their links
  to tool arguments.
- **Domain standards**: the text that tells the model how results in this field must be reported.
- **Review checks**: the rules that find errors common in this field, such as pseudoreplication.
- **Known-answer tests**: small datasets with expected outputs.

The steps:

1. **Find the program.** The scientist names it. The agent finds the install, the version, the
   docs and any API, macro language or command-line interface.
2. **Pick the connection kind.** The agent picks a row from the table above, or more than one row.
3. **Collect the evidence.** The agent reads the docs and the tutorials, and runs `--help`. If the
   program has a macro recorder, the scientist does one task by hand while it records.
4. **Propose the adapter.** The agent writes the tools, the map, the decision schema, the
   standards and the checks.
5. **Run the known-answer tests.** The agent runs each tool on the tutorial data and compares the
   result with the published output. It also runs the manual route, when it can, and compares the
   two.
6. **Get approval.** The scientist reads each part. The tool code, the decision defaults and the
   fidelity levels need explicit approval.
7. **Lock the version.** The adapter records the program version that it was tested on. A new
   version starts the tests again.

A program with no adapter still works: the agent uses the generic tools (run a command, read a
file, take a screenshot). Every step then has the label "no manual route" until onboarding is
done.

Adapters can be shared. A lab can publish an approved adapter, and another lab can use it after
its own tests pass.

## The tool-to-UI map

The map links each tool to the steps that a person does in the program to get the same result.
With this map, the agent writes each step in the program's own terms, so you can follow it and
repeat it by hand. For example:

> **Step 3.** Analyze ▸ Discriminating features. Group A = endo. Group B = epi. Tolerance 5 ppm.
> Minimum AUC 0.7. Result: 14 features, table `step3.csv`.

Each map entry holds:

- **Manual route**: the menu path, the dialog, the order of the fields, and the button that runs
  it. For a library or a command-line program, the route is the code line or the command.
- **Parameter map**: each tool argument, linked to the label of its UI field and to the UI
  default. If the tool default is different from the UI default, the step shows a warning,
  because a person who keeps the UI default gets a different result.
- **Fidelity level**: one of three values.
    - *Exact*: the manual route gives the same numbers. A test shows this.
    - *Close*: the same method with a known difference, such as a different random seed. The
      difference is written in the entry.
    - *Code only*: there is no manual route. Each step that uses this tool has a label.
- **Evidence**: where the entry came from (step definitions, macro recorder, demonstration or
  docs) and the test that checked it.

Sources for the map, from the most reliable to the least reliable:

1. The program's own definitions, if one definition drives both the GUI and the API. SMILE MSI's
   `StepDef` does this.
2. A macro recorder.
3. A demonstration by the scientist, recorded once.
4. The manual. An entry from the manual stays unverified until a test checks it.

The agent uses mapped tools by default. It uses free code only when no mapped tool fits, and only
with approval. A loop becomes a repeated step: "Repeat step 3 for samples 1 to 12." A hand-drawn
shape, such as a region of interest, is saved in the record, so a repeat by hand can load the
same shape.

## Decisions the human owns

A decision is any choice that can change the result: the normalization, a tolerance, the unit of
replication, a threshold, an exclusion, the comparison itself. The harness keeps every decision in
a decision record and enforces it at the tool layer.

Each decision has an owner:

| Owner | What the agent does | Example |
| --- | --- | --- |
| Human | Stops and asks, with evidence. It cannot continue on that branch until the human answers. | Which regions are the treatment group |
| Agent | Chooses, and records the reason. | The number of bins for a plot |
| Fixed | Uses the value from the lab profile. It cannot change the value. | The mass tolerance for this instrument |

How the harness enforces the record:

- **Before the first result.** The setup asks for the question, the unit of replication, the
  significance and effect-size thresholds, and the method settings. It logs these as the first
  record of the session.
- **On each tool call.** If the model leaves out an argument that the record covers, the harness
  fills it in. If the model sets a different value, the harness logs a deviation and shows it in
  the chat.
- **On a change.** The human can change a decision during the session. The harness logs the old
  value, the new value and the time, and marks the results that used the old value.
- **From profiles.** A lab can save a set of decisions as a named, versioned profile. The desktop
  program and the agent can load the same profile.

SMILE MSI does this now in `smile_msi/agent/setup.py`. The general version takes the decision
schema from the adapter, not from code in the harness.

## Ways to work

The same map and the same record support three modes. The scientist can change the mode at any
step.

| Mode | Who does the steps | What the agent does | Use it for |
| --- | --- | --- | --- |
| Watch | The agent | Runs each step and shows the manual route next to the result | Fast analysis that you check |
| Follow | The scientist | Gives the next step in the program's terms, reads the program state, and confirms that you got the same result. If you did not, it names the field that is different. | Learning a program, and analyses you will present |
| Teach back | The scientist | Watches the program state, compares your steps with the decision record, and flags differences | Checking your own work, and training lab members |

The Follow and Teach back modes need the harness to read the program state. With an MCP server or
an API this is simple. With a desktop program that has no API, screenshots are the only way.

**Autonomy setting.** The owner field in the decision record sets how much the agent does alone.
A new lab can start with most decisions owned by the human. When the record shows that the
agent's choices for one decision type pass review, the lab can give that type to the agent. The
harness logs each change of owner.

## The analysis record

The record is a graph, not a transcript. The chat is one view of the graph.

- **Nodes.** Each result is a node. A node stores the tool, the adapter version, the program
  version, the arguments, the decisions that applied, the code hash, the hashes of the input
  data, and the output files.
- **Edges.** An edge links a result to the results it used. If a decision changes, the harness
  marks every node downstream of it as out of date.
- **Append-only log.** The harness never edits or deletes an entry. A correction is a new entry
  that points to the old one.

**Claims linked to results.** Each number and each finding in the agent's answer links to a node.
Each claim has a label: *measured* (a tool output), *inferred* (the agent's reasoning from
measured results) or *literature* (with a citation). The harness compares each number in the
answer with the logged outputs. A number with no source gets a flag before the answer reaches the
scientist.

**Replay.** The scientist can run the graph again on new data. The harness uses the same adapter
version, the same decisions and the same seeds, and reports any output that is different.

**Exports:**

- A **protocol**: the manual routes in order. A lab member can repeat the analysis by hand from
  it. It is also the base for a methods section.
- A **script or notebook**: the tool calls as code that runs without the agent.
- A **flow**: the graph with placeholders, which runs on another dataset.
- The **full log**, as Markdown and as machine-readable JSON Lines.

## Sensitivity checks at decision points

When a decision that the human owns is open, the agent runs the main options before it asks. The
human then chooses with the consequences in view. For example:

> With TIC normalization, 12 features pass q < 0.05 and AUC > 0.7. With RMS normalization, 4
> pass. 3 features pass with both.

Rules for the checks:

- The adapter lists the options to compare for each decision, and a cost limit. The agent does
  not run every combination.
- The check result is a node in the record, so a reviewer can see that the choice was made with
  the evidence.
- The final answer states which conclusions hold for every option and which conclusions depend
  on one choice.

## Questions that wait for you

The agent works until it reaches a decision that you own. Then it sends you the question with its
evidence, and it continues with the parts that do not depend on the answer.

- **The question card.** The card shows the decision, the options, the sensitivity check, and the
  agent's recommendation with its reason. You can answer in one tap.
- **Where it arrives.** A push notification to your phone, a message in the chat, or a message in
  a team channel.
- **Long sessions.** A session can last hours or days. The harness saves its state after each
  step, so it can stop and continue after a restart.
- **Several sessions.** One scientist can have several analyses waiting at once. A single list
  shows all open questions, oldest first.
- **A timeout.** Each question can have a default and a time limit. If you do not answer, the
  agent stops that branch. It uses the default only if you set the question to do so.

## Review and lab memory

**Review.** Two reviewers read each analysis before the final answer, and again when the
scientist asks.

- **Rule checks** come from the adapter. Examples: p-values from pixels presented as biological
  replication, a failed tool result that the agent ignored, an identification stated with more
  certainty than the evidence allows, a p-value with no effect size, a deviation from the
  decision record.
- **An independent referee** is a second model. It reads only the log and the claims, not the
  agent's reasoning, and writes a report with citations to log entries. It can be a different
  model from the agent.
- Each finding links to the node it is about. The scientist can accept it, reject it with a
  reason, or ask the agent to fix it.

**Lab memory.** A correction from the scientist can become a permanent part of the adapter:

- a new default in the decision record;
- a new review check;
- a line in the domain standards;
- a new known-answer test.

The agent proposes the change and the scientist approves it. Each change has a version, so the
lab can see when a rule started and why.

## Safety and isolation

Approval is a review step. It is not a sandbox. The harness needs both.

- **One process for each adapter.** A crash in one program does not stop the harness or another
  adapter.
- **Sandboxed code.** Model-written code runs in a sandbox with access only to the session's data
  folder and output folder. Network access is off unless the adapter needs it.
- **Read-only source data.** The adapter mounts or opens the raw data read-only. The agent writes
  only to the session folder.
- **Approval gates.** New tools, edits to tools, and free code need the scientist's approval. The
  approval request shows the code and what it can touch.
- **Interrupts.** The Stop button stops the current tool. A runaway script stops at its next
  instruction, and a long numerical call stops when it returns.
- **Local by default.** The web interface accepts requests only from the same computer, with a
  token for each launch. API keys stay in memory and are never written to the log.
- **Data rules.** With a local model, no data leaves the computer. With a cloud model, the setup
  states which data the model can see (for example, summary tables but not raw spectra). This
  matters for patient data.

## Models and front ends

**Models.** The harness works with any model that can call tools.

- Cloud models through their official SDKs, starting with Claude.
- Local models through any OpenAI-compatible server (Ollama, LM Studio, llama.cpp, vLLM). With a
  local model, no data leaves the computer.
- Different roles can use different models: one for the agent, one for the referee, one small
  model for routine steps.
- The record stores the model name and version for each step. The guidance checks do not depend
  on the model, because they run in the harness.

**Front ends.** The harness is a service with an API. Each front end is a client of that API.

- **Web app**: chat, analysis graph, decision record, question cards and review, on the same
  computer or over a private network.
- **Phone**: question cards and notifications. Answer and read, with no full analysis on the
  small screen.
- **Other agents**: the harness is also an MCP server, so Claude Desktop, Claude Code or an IDE
  can use its adapters and its record.
- **Inside the program**: a panel in the program itself, where the program allows plugins. SMILE
  MSI can show the agent in its own window.

## Proposed software stack

Python is the core language, because most science libraries are in Python and SMILE MSI is in
Python. Windows is a primary platform, so each choice must work on Windows, macOS and Linux.

| Layer | Choice | Why | Alternative |
| --- | --- | --- | --- |
| Language | Python 3.12+ | Science libraries, the existing SMILE MSI code | TypeScript for the whole stack (weaker science libraries) |
| Environments | `uv`, one locked environment for each adapter | Fast, works on Windows, keeps conflicting dependencies apart | `pixi`, for adapters that need conda packages such as R |
| Tool protocol | MCP, official `mcp` Python SDK 2.x | Standard; Claude Desktop, IDEs, ToolUniverse and Paper2Agent use it | A plain Python function registry |
| Adapter transport | MCP over stdio for local adapters, Streamable HTTP for remote ones | One process for each adapter; remote adapters on a lab server | — |
| Model access | `anthropic` SDK, plus an OpenAI-compatible client for local models | Already built in `providers.py` | LiteLLM (one API for many providers, one more dependency) |
| Agent loop | Own loop, ported from `core.py` | The enforcement layer must sit between the model and every tool call | Claude Agent SDK with pre-tool hooks; PydanticAI |
| Schemas | Pydantic v2 | Validates manifests, decisions and tool arguments; exports JSON Schema for MCP | Dataclasses plus `jsonschema` |
| Adapter manifest | A TOML file plus a Python package, in git | Readable, versioned, easy to review | YAML |
| Record and state | SQLite in WAL mode, plus a JSON Lines log | One file, no server, survives restarts | PostgreSQL, for a shared lab server |
| Output files | A folder where each file is named by its SHA-256 hash | Gives the hashes for the record; stores each file once | Object storage (S3), for a shared lab server |
| Code sandbox | A worker process limited to the session folders, with no network; a container when one is available | Containers are not always available on Windows lab computers | Windows Sandbox or WSL2; a cloud sandbox (E2B, Modal) |
| Other languages | `rpy2` or `Rscript`, MATLAB Engine API, `juliacall`, `pyimagej` | Official or common bridges | A subprocess for each script |
| Desktop control | `pywinauto` (Windows UI Automation), macOS Accessibility through `pyobjc`, `mss` for screenshots; model screen control as the last option | Reads controls by name, which is more reliable than pixel clicks | Screen control only |
| Server | FastAPI with WebSocket | Async, typed, streams events to the front ends | The standard-library server in the stage 1 chat |
| Web front end | TypeScript, React, React Flow for the graph view | The graph view and question cards need more than one HTML file | Svelte; HTMX for less JavaScript |
| Phone | Installable web app (PWA) with Web Push; `ntfy` as a simple option | No app store; data stays on your network | A native app later |
| Remote access | Tailscale | Private network to the lab computer, with no open ports | A VPN that the institution runs |
| Exports | `nbformat` for notebooks; Markdown to PDF with `pandoc` | Standard formats | WeasyPrint for PDF |
| Tests | `pytest` with known-answer datasets; Playwright for the web app | Same tools as SMILE MSI | — |

The main choice to make early is the agent loop. A framework saves work, but the decision checks
must see and change every tool call before it runs. The stage 1 loop already does this, so a port
is the lower-risk path.

## Measuring it

Current benchmarks, such as BixBench, score only the final answer of an agent that works alone.
This harness needs tests that also score the guidance.

Each test is a dataset with a known answer and planted traps:

- pseudoreplication (one region for each group, many pixels);
- a confounder (the group difference matches a batch or a slide side);
- an artefact of normalization;
- a signal from the matrix or the background, not the tissue;
- an isotope or adduct of another feature.

Each run gets six scores:

| Score | Question |
| --- | --- |
| Answer | Did the agent find the planted effect? |
| Traps | Did it fall into a trap, or flag it? |
| Decisions | Did it respect every decision in the record? |
| Asking | Did it ask at each decision that the human owns, and not at other points? |
| Claims | Does each number in the answer link to a tool result? |
| Manual route | Can a person repeat the analysis from the protocol and get the same numbers? |

Run each test with the guidance on and with the guidance off. The difference between the two is
the value of the harness. SMILE MSI's synthetic demo slide already has planted effects, so it is
the first test set.

## Open questions

- **Who is the first user?** Wet-lab scientists who do not write code need the guidance and the
  manual routes most. Computational scientists need replay and claim links most.
- **What does the user see first?** A chat with the graph at the side, or the graph with the chat
  at the side.
- **Which second program?** It must be very different from SMILE MSI to show that the split
  works. Candidates: scanpy, a command-line program, Fiji.
- **Typed tools or free code?** One option: free code calls the adapter's API, and the decision
  checks sit inside that API.
- **Shared adapters.** Who approves an adapter that another lab will use, and how does the second
  lab trust it?
- **Patient data.** Which data can go to a cloud model, and how does the setup enforce that rule?

## Prior work and sources

| Work | What it does | What this design takes from it |
| --- | --- | --- |
| [Paper2Agent](https://arxiv.org/pdf/2509.06917) (Stanford) | Turns a paper's code into an MCP server, and checks each tool against the paper's outputs. 74 of 100 papers; 593 of 599 tools passed. | Onboarding steps and known-answer tests |
| [ToolUniverse](https://zitniklab.hms.harvard.edu/ToolUniverse/api/tooluniverse.smcp.html) (Harvard) | More than 600 scientific tools behind one MCP layer | MCP as the tool protocol |
| [BixBench](https://arxiv.org/pdf/2503.00096) (FutureHouse) | Benchmark of real bioinformatics analyses; [2026 results](https://phylo.bio/blog/evaluating-ai-agents-in-biology) are about 40% to 52% | A base for the guidance scores |
| [Magentic-UI](https://arxiv.org/html/2507.18374v1) | Co-planning and approval steps for web agents | Approval gates and plan review |
| [TinyScientist](https://arxiv.org/pdf/2510.06579) | Research agents with human control at several stages | Human checkpoints |
| [HiLSVA](https://arxiv.org/pdf/2606.26614) | Human-in-the-loop agent for scientific visualization | Related work to read in full |
| [Agents in scientific teams](https://arxiv.org/pdf/2608.14667) | Position paper: study agents as human-agent systems | Support for scoring the guidance |

The figures come from the papers' abstracts and from search results. Before you cite them, read
the full papers.
