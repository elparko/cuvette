# Architecture and module contracts

2026-10-08. This file is the build contract. Each module has one owner. A module uses another
module only through the interface in this file. If you need a change to an interface, write it
in your report. Do not edit a module that you do not own.

`docs/design.md` gives the reasons. This file gives the names, the signatures and the data
shapes.

## Package layout

```
src/guided_analysis/
  manifest.py            adapter.toml models (Pydantic). Done.
  paths.py               GA_HOME, session folders. Done.
  jsonpath.py            dotted-path get for results ("a.b[0].c")
  record/
    store.py             Record: SQLite (WAL) + JSON Lines log + blob store + node graph
    trail.py             audit trail view: lines, three levels, HTML/Markdown/JSONL/PDF export
    exports.py           protocol, script, notebook, flow
    replay.py            run a saved graph again on new data, report differences
  providers/
    base.py              Provider protocol, Step, ToolCall, ToolOutput
    anthropic.py         Claude through the anthropic SDK (async)
    openai_compat.py     Ollama, LM Studio, llama.cpp, vLLM (httpx, async)
    fake.py              scripted provider for tests and the benchmark
    __init__.py          make_provider(spec)
  connect/
    mcp_client.py        AdapterConnection: start an adapter process, list and call tools
    locate.py            find the program install and version from manifest.locate
  kinds/
    serve.py             `python -m guided_analysis.kinds.serve <adapter_dir>`: one MCP
                         server that turns declarative [[tools]] into MCP tools
    cli.py python.py script.py http.py macro.py files.py screen.py   one runtime per kind
    generic.py           the tools for a program with no adapter
  harness/
    tools.py             ToolSpec, Registry, render()
    session.py           Session: the agent loop and the enforcement pipeline
    prompts.py           system prompt assembly (harness rules + adapter standards)
    decisions.py         DecisionRecord: setup, fill, deviation, change, owners, profiles
    questions.py         QuestionQueue: question cards, waits, timeouts
    sensitivity.py       run the options of a decision before the human chooses
    approvals.py         approval gate policy and requests
    sandbox.py           run model-written code in a restricted worker process
    claims.py            link numbers in an answer to logged results
    review.py            rule-check runner, generic checks, the referee
    labmemory.py         proposals that change an adapter, with versions
    modes.py             Watch, Follow, Teach back
  catalog/
    imagej/              ImageJ adapter: adapter.toml, server.py, checks.py, data/
    smile_msi/           SMILE MSI adapter: adapter.toml, checks.py
  onboarding/
    agent.py             the onboarding agent: tools and prompt
    checker.py           validate an adapter folder (schema, map, links, checks, tests)
    kat.py               run known-answer tests
  server/
    app.py               FastAPI + WebSocket
    static/              web front end (no build step), PWA files
    notify.py            ntfy push
  mcp_server.py          the harness as an MCP server for other agents
  bench/                 trap datasets, scenarios, the six scores, guidance on and off
  cli.py                 `ga` command
tests/                   one test file for each source module
docs/
  design.md architecture.md adapter-spec.md onboarding-guide.md
```

## Shared rules for every module

- Python 3.12. Async code uses `asyncio`. No threads unless a blocking library needs one; then
  use `asyncio.to_thread`.
- Must work on Windows, macOS and Linux. Use `pathlib`. Never use `shell=True`.
- Tests go in `tests/test_<module>.py`. `asyncio_mode = "auto"`. Tests must not need the
  network, an API key, Java or Ollama, unless you mark them with `@pytest.mark.live` (skipped
  by default; run with `-m live`).
- Run tests with `.venv/bin/python -m pytest`. Install nothing new without a note in your
  report; the venv already has pydantic, mcp 2.3, anthropic 1.12, httpx, fastapi, uvicorn,
  nbformat, numpy, pillow, pytest, pytest-asyncio.
- Code style: no docstrings, few comments, minimal error handling (only at real boundaries:
  subprocess, HTTP, model APIs, adapter processes).
- Text style for docs, comments and UI strings: Simplified Technical English. Short sentences.
  Active voice. No invented codenames. No marketing words.

## Storage paths (`paths.py`, done)

- `ga_home()`: `$GA_HOME` or `~/.guided-analysis`.
- `sessions_dir()`: `ga_home()/sessions`. One folder for each session:
  `record.sqlite`, `log.jsonl`, `blobs/`, `work/` (the adapters' output folder),
  `exports/`, `state.json`.
- `profiles_dir()`, `labmemory_dir()`, `adapters_dir()` (user adapters), `questions_db()`.

## Record (`record/store.py`)

```python
class Record:
    def __init__(self, session_dir: Path, session_id: str)
    def append(self, kind: str, *, refs: list[int] = (), node: str | None = None, **data) -> dict
    def entries(self, kinds: Iterable[str] | None = None, since: int = 0) -> list[dict]
    def entry(self, entry_id: int) -> dict | None
    def correct(self, entry_id: int, **data) -> dict          # kind "correction", refs=[entry_id]
    def put_blob(self, src: Path | bytes, ext: str = "") -> str   # returns sha256; file at blobs/<sha><ext>
    def blob_path(self, sha: str) -> Path | None
    def add_node(self, node: NodeIn) -> str                  # returns node id "n1", "n2", ...
    def node(self, node_id: str) -> dict | None
    def nodes(self) -> list[dict]
    def edges(self) -> list[tuple[str, str]]                 # (parent, child)
    def descendants(self, node_id: str) -> list[str]
    def mark_stale(self, decision_key: str, reason: str) -> list[str]   # nodes that used the key + descendants
    def stale(self) -> set[str]
    def numbers(self) -> list[dict]                          # every numeric value in node outputs:
                                                             # {"node": id, "path": "metrics.count", "value": 14.0}
    def close(self)
```

An entry is `{"id": int, "ts": "2026-10-08T03:12:44.120Z", "kind": str, "session": str,
"refs": [int], "node": str | None, "data": {...}}`. `id` starts at 1 and goes up by one. The
record never edits or deletes an entry. Each append also writes one line to `log.jsonl`.

`NodeIn` (a dataclass in `record/store.py`):

```python
@dataclass
class NodeIn:
    entry_id: int                 # the tool_result entry
    adapter: str
    adapter_version: str
    program_version: str
    tool: str
    args: dict                    # effective args, after enforcement
    decisions: dict               # {decision_key: value} that applied to this call
    code_hash: str                # sha256 of the tool code or the adapter version string
    input_hashes: list[str]       # sha256 of input files that the args name
    outputs: list[dict]           # [{"sha": str, "path": str, "kind": "image|table|file", "name": str}]
    result: dict | None           # the parsed result (JSON) for numbers and claims
    parents: list[str]            # node ids whose outputs this call used
    summary: str                  # one plain-language line
    model: str
    manual_route: str             # rendered manual route, or "" if none
    fidelity: str                 # exact | close | code_only | none
    sensitivity_of: str = ""      # decision key, if this node is a sensitivity run
```

The parents come from the session: a node is a child of each earlier node whose output path or
output sha appears in its args.

### Entry kinds

These are the only entry kinds. Each module writes only its own kinds.

| Kind | Writer | Data |
| --- | --- | --- |
| `session` | session | adapters [{name, version, program_version}], model, mode, settings |
| `setup` | decisions | values {key: value}, profile {name, version, hash}, how, changed_from_profile |
| `user` | session | text |
| `assistant` | session | text, final (bool) |
| `thinking` | session | text |
| `tool_call` | session | call_id, tool, adapter, args |
| `tool_result` | session | call_id, tool, adapter, ok, error, summary, text, images [sha], files [sha], duration_s, effective_args, manual_route, fidelity |
| `decision` | decisions | key, old, new, by (human, agent, profile), reason, stale_nodes |
| `owner_change` | decisions | key, old, new, by |
| `deviation` | session | call_id, tool, deviations [{arg, key, setup, used}] |
| `question` | questions | qid, decision_key, title, text, options, recommendation, evidence, default, timeout_s |
| `answer` | questions | qid, value, note, by (human, timeout-default) |
| `sensitivity` | sensitivity | decision_key, options [{value, metrics, summary, node}], holds, depends |
| `approval_request` | approvals | rid, tool, title, code, sha256, touches |
| `approval` | approvals | rid, decision (approved, rejected), note |
| `blocked` | session | call_id, tool, reason, qid |
| `review_finding` | review | fid, check, source (rule, referee), severity, message, nodes, entries |
| `finding_resolution` | review | fid, action (accept, reject, fix), reason |
| `claim_check` | claims | answer_entry, claims [{text, value, label, node}], unsourced |
| `mode` | modes | old, new |
| `follow_step` | modes | step, instruction, expected, observed, match, differences |
| `lab_memory` | labmemory | pid, adapter, change_kind, payload, status |
| `note` | session | text, by |
| `notice` | session | text |
| `error` | session | message |
| `usage` | session | input_tokens, output_tokens, cache_read, model |
| `correction` | record | (any), refs = [corrected entry] |

The event stream to front ends is the entry stream plus transient events that are not stored:
`{"kind": "status", "state": "thinking|running|idle", "tool": str}` and
`{"kind": "delta", "text": str}`.

## Trail (`record/trail.py`)

```python
def trail(record: Record, level: int = 1) -> list[dict]
# level 1: [{"n": 3, "entry": id, "icon": "step", "line": "Found 14 features ...", "stale": bool}]
# level 2 adds "details": {"manual_route", "settings", "decisions", "outputs", "table", "images"}
# level 3 adds "technical": {"tool", "args", "hashes", "versions", "duration_s", "model"}
def export_html(record, path: Path) -> Path      # one self-contained file, expand and collapse, images inlined
def export_markdown(record, path: Path) -> Path
def export_jsonl(record, path: Path) -> Path
def export_pdf(record, path: Path) -> Path       # levels 1 and 2; pandoc if present, else raise
```

Icons (seven): `setup`, `step`, `decision`, `question`, `deviation`, `finding`, `note`. The
line for a step comes from the map entry `summary` template, then the tool result `summary`,
then the tool title.

## Providers (`providers/`)

```python
@dataclass
class ToolCall:   id: str; name: str; args: dict | Any; parse_error: str = ""
@dataclass
class ToolOutput: call_id: str; text: str; images: list[Path] = (); is_error: bool = False
@dataclass
class Step:       text: str; thinking: str; calls: list[ToolCall]; usage: dict; note: str = ""; stop_reason: str = ""

class Provider(Protocol):
    name: str            # "claude", "openai-compat", "fake"
    model: str
    context_window: int
    def start(self, system: str, tools: list[dict]) -> None    # tools: [{"name","description","input_schema"}]
    def set_tools(self, tools: list[dict]) -> None
    def add_user(self, text: str, images: list[Path] = ()) -> None
    async def step(self) -> Step
    def add_tool_outputs(self, outputs: list[ToolOutput]) -> None
    async def complete(self, system: str, text: str) -> str    # one call, no tools (the referee)
    def settings(self) -> dict
    def snapshot(self) -> dict          # JSON-able history, for resume
    def restore(self, snap: dict) -> None

def make_provider(spec: str, **opts) -> Provider
# "claude"                      -> AnthropicProvider(model="claude-opus-5-5")
# "claude:claude-sonnet-5-5"    -> that model
# "ollama:qwen3:8b"             -> OpenAICompatProvider(base_url="http://localhost:11434/v1", model="qwen3:8b")
# "openai:<base_url>|<model>"   -> any OpenAI-compatible server
# "fake:<path to script.json>"  -> FakeProvider
```

`step()` raises `ProviderError` with a plain message on an HTTP or API failure.

## Adapter connection (`connect/mcp_client.py`)

```python
@dataclass
class RemoteTool:  name: str; title: str; description: str; input_schema: dict; read_only: bool
@dataclass
class CallResult:
    ok: bool; text: str; data: Any; images: list[Path]; files: list[Path]; error: str = ""

class AdapterConnection:
    def __init__(self, adapter: LoadedAdapter, work_dir: Path, session_dir: Path)
    async def start(self) -> None
    async def list_tools(self) -> list[RemoteTool]
    async def call(self, name: str, args: dict, timeout: float | None = None) -> CallResult
    async def cancel(self) -> None        # cancel the running call; kill the process after a grace period
    async def close(self) -> None
    program_version: str; server_name: str; instructions: str; running: bool
```

`start()` expands these placeholders in `connection.command`, `connection.env` and
`connection.cwd`: `{python}` (the harness interpreter), `{adapter_dir}`, `{work_dir}`,
`{session_dir}`, `{program_path}` (from `connect/locate.py`), and `{env:NAME}`. It also sets
the environment variables `GA_WORK_DIR`, `GA_SESSION_DIR` and `GA_ADAPTER_DIR`. For a
declarative kind (not `mcp`) with no `command`, the command is
`[{python}, -m, guided_analysis.kinds.serve, {adapter_dir}]`.

`call()` turns MCP content into a `CallResult`: `structuredContent` or JSON text becomes
`data`; image content is written to `work_dir` and listed in `images`; absolute file paths in
`data` that exist are listed in `files` (images by extension in `images`). A result with
`isError`, or with `data["ok"] is False`, has `ok=False`.

## The result shape for adapters that we write

Each tool in an adapter that we write returns one JSON object:

```json
{"ok": true,
 "summary": "Counted 64 particles. Mean area 351 px.",
 "metrics": {"count": 64, "mean_area": 351.2},
 "outputs": [{"path": "/abs/work/mask.tif", "kind": "image", "name": "mask"}],
 "table": {"columns": [...], "rows": [[...]], "n_rows": 64, "path": "/abs/work/results.csv"},
 "manual_route": "Analyze > Analyze Particles... size=0-Infinity show=Masks",
 "state": {}}
```

Only `ok` is required. On failure: `{"ok": false, "error": "plain message"}`. `metrics` holds
the numbers that the known-answer tests, the sensitivity checks and the claim checker read.
External adapters (SMILE MSI) can return any JSON; the harness reads it in a generic way.

## Tools and registry (`harness/tools.py`)

Port of stage 1 `tools.py`:

```python
@dataclass
class ToolSpec:
    name: str; description: str; schema: dict
    fn: Callable[[dict], Awaitable[Any]]      # async; takes the effective args dict
    title: str = ""; read_only: bool = False; approval: bool = False
    source: str = "adapter"                   # adapter | harness | generic | custom | flow
    adapter: str = ""; remote_name: str = ""; meta: dict = field(default_factory=dict)
    def api_def(self) -> dict

class Registry: add, remove, get, __contains__, __iter__, names(), api_defs(), search(query, k) -> list[ToolSpec]
def render(result, *, max_chars: int, share_roots: list[Path]) -> Rendered   # text, images, files
```

## Decisions (`harness/decisions.py`)

```python
@dataclass
class Enforcement:
    args: dict                     # effective args
    applied: dict                  # {decision_key: value} that this call used
    deviations: list[dict]         # [{"arg", "key", "setup", "used"}]
    waiting: list[str]             # human-owned keys that this call needs and that have no value

class DecisionRecord:
    def __init__(self, adapters: list[LoadedAdapter], record: Record)
    def fields(self) -> list[dict]       # the setup card: each decision as a dict + "adapter", "value", "set"
    def apply_setup(self, values: dict, profile: str = "", how: str = "confirmed by the scientist") -> dict
    def value(self, key: str) -> Any
    def is_set(self, key: str) -> bool
    def owner(self, key: str) -> str
    def change(self, key: str, value, *, by: str = "human", reason: str = "") -> list[str]   # stale node ids
    def set_owner(self, key: str, owner: str, *, by: str = "human") -> None
    def enforce(self, adapter: str, tool: str, args: dict) -> Enforcement
    def brief(self) -> str               # what the model reads about the locked setup
    def snapshot(self) -> dict; def restore(self, snap: dict) -> None
    # profiles: GA_HOME/profiles/<name>/v<N>.json
    def save_profile(self, name: str) -> dict          # {"name", "version"}
    @staticmethod
    def list_profiles() -> list[dict]
```

Rules: a decision with `stage = "setup"` gets its value in `apply_setup` (the default if the
human gives none, and the record says "default accepted"). A `stage = "when_needed"` decision
with owner `human` has no value until the human answers; `enforce` lists it in `waiting` for
each call whose tool and arg it links to. Owner `fixed`: the value comes from the profile; a
call with a different value is not a deviation, it is overwritten, and the record says so.
Owner `agent`: the agent's value is used and logged as `decision` with `by = "agent"`.

The harness adds one built-in decision: `question` (text, owner human, stage setup, label "What
question are you asking?"). An adapter can define a decision with the same key to replace it.

## Questions (`harness/questions.py`)

```python
@dataclass
class Question:
    qid: str; session: str; decision_key: str; title: str; text: str
    options: list[dict]            # [{"value", "label"}]
    recommendation: dict | None    # {"value", "reason"}
    evidence: str                  # plain text, for example the sensitivity table
    default: Any = None; timeout_s: float | None = None; use_default_on_timeout: bool = False
    status: str = "open"           # open | answered | timed_out | defaulted
    answer: Any = None; created: str = ""; answered: str = ""

class QuestionQueue:
    def __init__(self, record: Record, notifier: Callable[[Question], Awaitable[None]] | None = None)
    async def ask(self, **fields) -> Question       # logs "question", calls notifier
    def answer(self, qid: str, value, note: str = "", by: str = "human") -> Question   # logs "answer"
    def get(self, qid) -> Question | None
    def open(self) -> list[Question]                # oldest first
    def expire(self, now: float | None = None) -> list[Question]
    async def wait(self, qid: str, timeout: float | None = None) -> Question

def all_open_questions() -> list[dict]     # across every session, from GA_HOME/questions.sqlite, oldest first
```

## Sensitivity (`harness/sensitivity.py`)

```python
@dataclass
class OptionResult: value: Any; ok: bool; metrics: dict; summary: str; node: str
@dataclass
class SensitivityResult:
    decision_key: str; options: list[OptionResult]; table: str
    holds: list[str]; depends: list[str]           # plain-language statements

async def run_sensitivity(decision: Decision, base_args: dict, *,
                          call: Callable[[str, dict, dict], Awaitable[tuple[CallResult, str]]],
                          record: Record) -> SensitivityResult
```

`call(tool, args, {"sensitivity_of": key})` runs one option through the session (so it is a
node) and returns the result and the node id. The function runs at most `max_runs` options.
`metrics` comes from `jsonpath` reads of the `compare` paths. It logs one `sensitivity` entry.

## Approvals (`harness/approvals.py`)

```python
class ApprovalGate:
    def __init__(self, record: Record, approver: Callable[[dict], Awaitable[tuple[bool, str]]] | None)
    def needs(self, spec: ToolSpec, args: dict) -> bool
    async def request(self, spec: ToolSpec, args: dict, *, touches: str) -> tuple[bool, str]
```

Always needs approval: `run_code`, `create_tool`, `edit_tool`, `delete_tool`, and an adapter
tool with `meta["approval"]`. With no approver, the answer is "rejected: no approver connected".

## Sandbox (`harness/sandbox.py`)

```python
@dataclass
class CodeResult: ok: bool; stdout: str; stderr: str; outputs: list[Path]; error: str; tool_calls: list[dict]

async def run_code(code: str, *, session_dir: Path, work_dir: Path, readonly: list[Path],
                   network: bool = False, timeout_s: float = 300,
                   tool_handler: Callable[[str, dict], Awaitable[dict]] | None = None) -> CodeResult
def describe_limits(network: bool) -> str      # for the approval card: what the code can touch
```

The code runs in a separate Python process. Inside, `from ga_api import call` sends a tool call
back to the harness (JSON over a pipe), and `tool_handler` runs it through the full enforcement
pipeline. On macOS, use `sandbox-exec` with a profile that denies network and denies writes
outside `work_dir`. On Linux, use `unshare -n` when it works. On Windows, or when neither works,
run without the OS limit and say so in `describe_limits`.

## Claims (`harness/claims.py`)

```python
@dataclass
class Claim: text: str; value: float | None; label: str; node: str | None   # measured | inferred | literature | unsourced
def check_answer(text: str, record: Record) -> list[Claim]    # logs "claim_check"
def annotate(text: str, claims: list[Claim]) -> str          # the answer with flags for unsourced numbers
```

## Review (`harness/review.py`)

```python
@dataclass
class Finding: fid: str; check: str; source: str; severity: str; message: str; nodes: list[str]; entries: list[int]
@dataclass
class ReviewContext:
    record: Record; decisions: DecisionRecord; adapters: list[LoadedAdapter]; answer: str; claims: list[Claim]

def run_checks(ctx: ReviewContext) -> list[Finding]     # generic checks + every adapter check entry point
async def referee(provider: Provider, ctx: ReviewContext) -> list[Finding]
def resolve(record: Record, fid: str, action: str, reason: str = "") -> None
```

An adapter check is `def check(ctx: ReviewContext) -> list[dict]` with dicts `{"message",
"nodes", "entries", "severity"}`. Generic checks: a failed tool result that a later answer uses,
a deviation that the answer does not mention, a p-value with no effect size, an unsourced
number, a stale node that the answer uses.

## Lab memory (`harness/labmemory.py`)

```python
def propose(adapter: str, change_kind: str, payload: dict, reason: str, record: Record | None) -> dict
def approve(pid: str, by: str) -> dict
def reject(pid: str, by: str, reason: str) -> dict
def pending(adapter: str | None = None) -> list[dict]
def apply_overlay(adapter: LoadedAdapter) -> LoadedAdapter    # approved changes, newest version wins
```

`change_kind`: `default` ({key, value}), `check` ({id, description, rule: {tool, arg, op, value}
or text}), `standard` ({text}), `test` (a KnownAnswerTest dict). Storage:
`GA_HOME/labmemory/<adapter>/changes.jsonl`, append only, with versions.

## Modes (`harness/modes.py`)

```python
class ModeController:
    def __init__(self, session)              # uses session.record, session.connection(adapter), map
    mode: str                                # watch | follow | teach_back
    def set(self, mode: str) -> None         # logs "mode"
    def instruction(self, adapter: str, tool: str, args: dict) -> str   # manual route with values
    async def verify(self, adapter: str, expected: dict) -> dict        # reads the state tool; match, differences
    async def teach_back(self, adapter: str) -> list[dict]              # compare program state with decisions
```

In Follow mode the session does not run a mutating adapter tool. It shows the instruction,
waits for the scientist to say "done", reads the state tool, and compares it with a shadow run
in a scratch folder when the adapter supports one.

## Session (`harness/session.py`)

```python
@dataclass
class SessionSettings:
    max_steps: int = 40; approve_scripts: bool = True; auto_resume: bool = True
    tool_exposure: str = "auto"      # all | search | auto (search when the model is small)
    max_result_chars: int = 20000; review_on_answer: bool = True; guidance: bool = True
    network_for_code: bool = False

class Session:
    id: str; dir: Path; record: Record; decisions: DecisionRecord; questions: QuestionQueue
    modes: ModeController; busy: bool
    @classmethod
    async def create(cls, *, adapters: list[str | LoadedAdapter], model: str,
                     referee_model: str | None = None, mode: str = "watch",
                     settings: SessionSettings | None = None,
                     emit: Callable[[dict], None] | None = None,
                     approver: Callable[[dict], Awaitable[tuple[bool, str]]] | None = None,
                     session_id: str | None = None) -> "Session"
    @classmethod
    async def resume(cls, session_id: str, **kw) -> "Session"
    def setup_form(self) -> dict
    async def apply_setup(self, values: dict, profile: str = "") -> dict
    async def send(self, text: str) -> str          # one turn; returns the final answer text
    async def stop(self) -> None
    async def answer(self, qid: str, value, note: str = "") -> None
    async def change_decision(self, key: str, value, reason: str = "") -> list[str]
    async def set_mode(self, mode: str) -> None
    async def review(self) -> list[Finding]
    def trail(self, level: int = 1) -> list[dict]
    def graph(self) -> dict                          # {"nodes": [...], "edges": [...], "stale": [...]}
    def export(self, fmt: str) -> Path               # html | md | jsonl | pdf | protocol | script | notebook | flow
    async def close(self) -> None
```

The enforcement pipeline for each tool call, in this order:

1. Parse and check the arguments against the schema.
2. Mode: in Follow mode, a mutating adapter tool becomes an instruction to the scientist.
3. Approval gate.
4. Decisions: fill, overwrite fixed values, log deviations, find waiting decisions.
5. A waiting decision blocks the call: run the sensitivity check (if the decision has one), ask
   the question, log `blocked`, and return a tool error that tells the model to continue with
   work that does not depend on the answer.
6. Call the tool. 7. Hash inputs and outputs, add the node, log `tool_result`.
8. Render the result for the model.

When the model ends a turn with an answer: claims check, then rule review (and the referee if
one is set), then the `assistant` entry with `final = true`.

## Kinds (`kinds/`)

`python -m guided_analysis.kinds.serve <adapter_dir>` loads the manifest and serves each
`[[tools]]` entry as an MCP tool over stdio. The runtime for `connection.kind`:

| Kind | Tool field | What a call does | Manual route |
| --- | --- | --- | --- |
| cli | `command` | subprocess with `{param}` templates, one list item each; no shell | the command line |
| python | `function` (`module:attr`) | runs in a worker with `connection.interpreter` | the Python call |
| script | `script` | runs `connection.interpreter` + script file + a JSON params file | the command line |
| http | `request` | httpx request with templates in url, params, json | the request line |
| macro | `macro` | writes the macro text with values to a file; runs `connection.interpreter` with `{macro_file}` | the macro text |
| files | none | built-in tools: list, read table, read image info, watch for new files | "open the file" |
| screen | none | built-in tools: screenshot, click, type, key (macOS and Windows) | the recorded action |

Outputs: each `outputs` key becomes a path in `work_dir` that the template can use as
`{output.<key>}`. `parse` sets how stdout becomes `data`.

`kinds/generic.py` is an MCP server with the tools for a program that has no adapter:
`run_command` (approval), `read_file`, `list_dir`, `write_file` (work_dir only), `screenshot`.
Each result from it has `fidelity = "none"`, and the trail line says "no manual route".

## Onboarding (`onboarding/`)

- `checker.check(adapter_dir) -> Report` with `errors`, `warnings`, and a pass flag. It checks
  the schema, that each tool has a map entry (or code_only), that each decision link names a
  real tool and arg, that each check entry point imports, and that `tests` exist. With
  `run_tests=True` it starts the adapter and runs the known-answer tests through `kat.py`.
- `kat.run_tests(adapter, connection) -> list[TestOutcome]`.
- `agent.onboard(program, *, model, out_dir, docs=[], kind=None)`: an agent session with the
  onboarding tools and `docs/onboarding-guide.md` as its prompt. It writes a draft adapter to
  `GA_HOME/adapters/<name>/`.
- `ga adapter approve <name>`: shows each part, records the approver and the date, sets
  `status = "approved"`, and locks the tested program version.

## Server (`server/`)

HTTP on `127.0.0.1` by default. Each launch makes a random token. Each request must carry the
token (query `?token=` once, then a cookie). Endpoints:

- `GET /` the app. `GET /api/adapters`, `GET /api/models`, `GET /api/profiles`.
- `POST /api/sessions` {adapters, model, referee_model, mode, settings} -> {id}.
- `GET /api/sessions`, `GET /api/sessions/{id}`, `GET /api/sessions/{id}/setup-form`,
  `POST /api/sessions/{id}/setup`.
- `WS /api/sessions/{id}/ws`: server sends events; client sends `{"type": "send", "text"}`,
  `stop`, `answer {qid, value, note}`, `approve {rid, ok, note}`, `decision {key, value,
  reason}`, `mode {mode}`, `review`.
- `GET /api/sessions/{id}/trail?level=`, `/graph`, `/export/{fmt}`, `/blob/{sha}`.
- `GET /api/questions`: open questions in every session, oldest first.

## The `ga` command (`cli.py`)

```
ga chat --adapter imagej --model ollama:qwen3:8b [--referee claude] [--mode watch]
ga serve [--host 127.0.0.1] [--port 8765]
ga mcp                       # the harness as an MCP server on stdio
ga adapters                  # list the catalog and user adapters
ga adapter check <dir|name> [--run-tests]
ga adapter approve <name>
ga onboard <program> --model claude [--docs URL ...] [--kind cli]
ga export <session> --format html|md|jsonl|pdf|protocol|script|notebook|flow
ga replay <session> --input old=new ...
ga bench <scenario|all> --model ... [--guidance on|off|both]
ga questions
```

## Notes added during the build

- `MapEntry.match`: a map entry can apply only when the call args match, for example
  `match = {step_id = "discriminating"}` for SMILE MSI `run_analysis`. Use
  `manifest.map_entry(tool, args)`; it picks the most specific entry.
- `DecisionLink.arg` can be a dotted path into a nested dict argument, for example
  `params.tol_ppm`.
- `Connection.history_tool`: an adapter tool that returns the actions the scientist did in the
  program since the last call (for Teach back).
