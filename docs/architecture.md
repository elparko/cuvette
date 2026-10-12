# Architecture and module contracts

2026-10-08. This file is the build contract. `src/core/types.ts` and
`src/adapters/manifest.ts` hold the shared types; this file holds the class and function
signatures. Each module has one owner. Use another module only through its contract.

`docs/design.md` gives the reasons. `docs/harness-survey.md` compares Claude Code and
OpenCode, which this design copies.

## Shape

A terminal agent, built like Claude Code and OpenCode, for science programs instead of code.

- **Language:** TypeScript on Node 22+. `tsx` runs the source directly (no build step), so
  adapter modules written in TypeScript load at run time. `bin/cuvette.js` is the entry.
- **Terminal UI:** Ink (React for the terminal), like Claude Code.
- **Core is a library with an event bus**, like OpenCode's server: the terminal UI, the headless
  mode, the MCP server mode and the later graph window are all clients of one `Session`.
- **One append-only JSON Lines log per session** is the analysis record and the conversation,
  like Claude Code's transcripts. The node graph is rebuilt from the log.
- **An adapter is a plugin folder**, like a Claude Code plugin: `adapter.yaml` (tools,
  decisions, tool-to-UI map, checks, known-answer tests), `STANDARDS.md` (always loaded, like
  CLAUDE.md), `skills/*.md` (procedures loaded on demand), an optional `adapter.ts` module (hooks,
  checks, extra tools), and optional server code.
- **Enforcement is a PreToolUse hook**, like Claude Code hooks and OpenCode's
  `tool.execute.before`. Built-in hooks: permissions, mode, decisions, data rules. Labs can add
  command hooks with the Claude Code JSON protocol.
- **Modes are like Claude Code permission modes** (Shift+Tab cycles them): `watch` (the agent
  runs the steps), `follow` (the scientist runs each step; the agent instructs and checks),
  `teach` (the scientist works; the agent compares with the decision record), `plan` (the agent
  plans, and runs only read-only tools).
- **Small local models:** deferred tools with a `find_tools` tool, and compaction near the
  context limit.

## Folders

```
bin/cuvette.js               entry: registers tsx, imports src/cli.ts
src/cli.ts                   cuvette (terminal UI), cuvette -p (headless), subcommands  [lead]
src/core/
  types.ts                   shared types                                             [lead]
  bus.ts                     Bus                                                      [lead]
  session.ts                 Session: the agent loop and the hook pipeline            [lead]
  prompt.ts                  system prompt assembly                                   [lead]
  compaction.ts              summary of old turns near the context limit              [lead]
  config.ts                  settings precedence and LAB.md                           [lead]
  modes.ts                   follow and teach logic                                   [lead]
  record.ts                  AnalysisRecord: JSONL log, blobs, nodes, stale marks             [A]
  trail.ts                   audit trail view and HTML/Markdown/JSONL/PDF export     [A]
  exports.ts                 protocol, script, notebook, flow                         [A]
  replay.ts                  run a flow again on new data                             [A]
  decisions.ts               DecisionRecord + its PreToolUse hook                     [D]
  questions.ts               QuestionQueue                                            [D]
  sensitivity.ts             runSensitivity                                           [D]
  permissions.ts             Permissions (allow/ask/deny rules)                       [D]
  hooks.ts                   HookRunner (built-in hooks + command hooks)              [D]
  claims.ts                  checkAnswer, annotate                                    [E]
  review.ts                  runChecks, referee, Findings                             [E]
  labmemory.ts               lab memory proposals                                     [E]
src/providers/               makeProvider: claude, ollama, openai, fake               [B]
src/adapters/
  manifest.ts                schema and loader                                        [lead]
  runtime.ts                 startAdapter -> AdapterRuntime                           [C]
  mcp.ts                     MCP client runtime                                       [C]
  locate.ts                  find the program and its version                         [C]
  kinds/{cli,python,script,http,files,screen}.ts   declarative runtimes               [C]
  kinds/common.ts            templates, schema checks, output parsing                 [C]
  kinds/macro.ts             macro-language runtime (ImageJ and others)               [G]
src/tools/
  core.ts                    find_tools, load_skill, ask_scientist, plan, note       [lead]
  generic.ts                 run_command, read_file, list_dir, write_file, screenshot [C]
  run_script.ts              sandboxed Python script that calls tools back            [C]
  task.ts                    subagents (referee, onboarding)                          [lead]
src/ui/                      view-independent commands, cards, messages, settings;    [F]
                             the terminal UI and the browser app both call them
src/tui/                     Ink app                                                  [F]
src/server/                  graph window (HTTP + SSE), ntfy push, and the browser    [F]
                             app: app.ts (startApp: server, token, sessions),
                             app-view.ts (one session's view and card state),
                             app-html.ts (server-side HTML of items, cards, tabs),
                             app-json.ts (JSON for the sessions, programs,
                             settings and doctor pages), app-page.ts (the old
                             page in one string; the server sends it at /?ui=old
                             and if ui-dist/ is missing)
src/ui-web/                  the browser app: React, Vite, Tailwind and Radix     [F]
                             (shadcn/ui pattern). npm run ui:build writes ui-dist/.
                             The server sends ui-dist/ at /. npm run ui:dev starts
                             Vite with a proxy to a server on port 4317.
src/mcp-server.ts            the harness as an MCP server                             [lead]
src/onboarding/              checker, known-answer runner, onboarding agent           [I]
src/bench/                   trap datasets, scenarios, six scores                     [J]
catalog/imagej/              ImageJ adapter                                           [G]
catalog/smile-msi/           SMILE MSI adapter                                        [H]
tests/                       <module>.test.ts, vitest
docs/adapter-spec.md docs/onboarding-guide.md                                         [I]
```

## Rules for every module

- TypeScript, ES modules, `import ... from "./x.ts"` with the `.ts` extension. Node built-ins as
  `node:fs` and so on. Use only the installed packages: `@anthropic-ai/sdk`,
  `@modelcontextprotocol/sdk`, `zod` (v4), `yaml`, `ink`, `react`, `ink-text-input`. The browser
  app in `src/ui-web/` also uses `react-dom`, `radix-ui`, `tailwindcss`, `lucide-react` and
  `sonner`. Ask the lead before you add one.
- Windows, macOS and Linux. `node:path`. `spawn` with an argument array, never a shell string.
- Tests: `tests/<module>.test.ts`, vitest. Tests must not need the network, an API key, Java or
  Ollama, unless they check `process.env.CUVETTE_LIVE` (`test.skipIf(!process.env.CUVETTE_LIVE)`).
  Run `npx vitest run tests/<file>` and `npx tsc --noEmit`.
- Style: no doc comments, few comments, error handling only at process, file and network
  boundaries. Small functions. No classes where a function does.
- Text in docs, comments and UI: Simplified Technical English. Short sentences. Active voice.
  No marketing words. No invented codenames.
- `CUVETTE_HOME` (default `~/.cuvette`) holds `sessions/`, `adapters/`, `profiles/`,
  `labmemory/`, `questions.json`, `settings.json`, `LAB.md`. Tests set `CUVETTE_HOME` to a temp folder.

## Session folder

A session folder is `<project>/cuvette/<date>-<title>/`. The adapters write results and exports in this folder.
The record is in `.record/`: `log.jsonl`, `blobs/<sha256><ext>` and `meta.json`.
If the project folder is not writable, the session folder is in `CUVETTE_HOME/projects/<project>/`.
A session from an older version is in `CUVETTE_HOME/sessions/<id>/` with `log.jsonl`, `blobs/`, `work/` and `exports/`.
A session id is `YYYYMMDD-HHMMSS-<4 hex>`.

## AnalysisRecord (`core/record.ts`)

```ts
class AnalysisRecord {
  constructor(sessionDir: string, sessionId: string)   // reads an existing log.jsonl (resume); sessionDir is .record/ in the session folder
  readonly dir: string; readonly workDir: string
  onAppend?: (e: Entry) => void
  append(kind: EntryKind, data: Record<string, unknown>, opts?: { refs?: number[]; node?: string }): Entry
  entries(kinds?: EntryKind[]): Entry[]
  entry(id: number): Entry | undefined
  correct(id: number, data: Record<string, unknown>): Entry
  putBlob(src: string | Buffer, ext?: string): string            // sha256 hex
  blobPath(sha: string): string | undefined
  addNode(n: NodeIn): Node                                       // appends a "node" entry
  nodes(): Node[]; node(id: string): Node | undefined
  edges(): [string, string][]                                    // [parent, child]
  descendants(id: string): string[]
  markStale(decisionKey: string, reason: string): string[]       // appends a "stale" entry
  stale(): Set<string>
  numbers(): { node: string; path: string; value: number }[]
  messages(): Message[]                                          // for resume, see below
}
```

Entry ids start at 1. Each append writes one line and flushes it (`appendFileSync`). Node ids
are `n1`, `n2`, .... `messages()` returns the `message` entries in order; after the last
`compaction` entry it returns `[{role: "user", parts: [summary text]}]` plus the messages after
it.

### Entry kinds and their writers

| Kind | Writer | Data |
| --- | --- | --- |
| session | session | adapters [{name, version, programVersion}], model, mode, cwd |
| setup | decisions | values, profile {name, version, hash}, how, defaultsAccepted |
| user | session | text |
| message | session | message (a `Message`) |
| assistant | session | text, final, annotated |
| tool_call | session | callId, tool, adapter, args |
| tool_result | session | callId, tool, adapter, ok, error, summary, text, images [sha], files [sha], durationS, effectiveArgs, manualRoute, fidelity |
| node | record | the `Node` |
| stale | record | key, reason, nodes |
| decision | decisions | key, old, new, by, reason, staleNodes |
| owner_change | decisions | key, old, new, by |
| deviation | session | callId, tool, deviations |
| blocked | session | callId, tool, reason, qid |
| permission | session | rid, tool, decision (allowed, denied), by, note, sha256; reason "bypass permissions" if the harness allowed it in bypass |
| permission_mode | session | old, new (ask, bypass), how |
| question / answer | questions | the `Question` / qid, value, note, by |
| sensitivity | sensitivity | the `SensitivityResult` |
| finding / finding_resolution | review | the `Finding` / fid, action, reason |
| claim_check | claims | answerEntry, claims, unsourced |
| mode | session | old, new |
| follow_step | modes | step, tool, instruction, expected, observed, match, differences |
| lab_memory | labmemory | pid, adapter, changeKind, payload, status |
| note, notice, error | session | text or message |
| usage | session | inputTokens, outputTokens, cacheRead, model |
| compaction | compaction | summary, upTo |
| correction | record | refs = [corrected id] |

## Trail and exports (`core/trail.ts`, `core/exports.ts`)

```ts
type TrailIcon = "setup" | "step" | "decision" | "question" | "deviation" | "finding" | "note"
interface TrailLine { n: number; entry: number; icon: TrailIcon; line: string; stale: boolean;
  details?: Record<string, unknown>; technical?: Record<string, unknown> }
function trail(record: AnalysisRecord, level?: 1 | 2 | 3, adapters?: LoadedAdapter[]): TrailLine[]
function exportHtml(record, adapters, path): string     // one file, <details> per line, images inlined
function exportMarkdown(record, adapters, path): string
function exportJsonl(record, path): string
function exportPdf(record, adapters, path): string     // pandoc if a PDF engine works, else throws
function exportProtocol(record, adapters, path): string
function exportScript(record, adapters, path): string  // a .ts file that calls the Cuvette ToolRunner
function exportNotebook(record, adapters, path): string // .ipynb, Python cells that call `cuvette run-step`
function exportFlow(record, adapters, path): string    // JSON with input placeholders
```

## Providers (`src/providers/`)

```ts
function makeProvider(spec: string, opts?: { effort?: string; numCtx?: number; think?: boolean }): Promise<Provider>
// "claude" -> claude-opus-5-5; "claude:<model id>"; "ollama:<model>"; "openai:<base url>|<model>"; "fake:<script.json>"
function listModels(): Promise<{ spec: string; label: string; local: boolean; tools: boolean; contextWindow: number }[]>
```

Providers are stateless: the session holds the `Message[]` history and passes it to each
`step()`. A provider may store its native content in `Message.raw` and must echo it unchanged
when the next request goes to the same provider and model.

## Adapter runtime (`src/adapters/runtime.ts`)

```ts
interface AdapterRuntime {
  adapter: LoadedAdapter
  programVersion: string
  instructions: string
  running: boolean
  tools(): Promise<Tool[]>    // execute() calls the program; source "adapter"
  cancel(): Promise<void>
  close(): Promise<void>
}
function startAdapter(adapter: LoadedAdapter, dirs: { workDir: string; sessionDir: string }): Promise<AdapterRuntime>
```

Placeholders in `connection.command`, `env`, `cwd`, `interpreter` and tool templates:
`{node}` (process.execPath), `{tsx}` (path to the tsx cli), `{adapter_dir}`, `{work_dir}`,
`{session_dir}`, `{program_path}` (from `locate.ts`), `{env:NAME}`. The child gets
`CUVETTE_WORK_DIR`, `CUVETTE_SESSION_DIR`, `CUVETTE_ADAPTER_DIR`, `CUVETTE_PROGRAM_PATH`. Adapter tools return the
`ToolOutput` shape. An MCP tool result is read as: `structuredContent`, else JSON text, else
plain text; `ok`, `summary`, `metrics`, `outputs`, `table`, `manualRoute`, `fidelity` are read
from the JSON when present; image content is saved in `workDir`.

## Decisions, questions, sensitivity, permissions, hooks (`src/core/`, owner D)

```ts
interface DecisionField { key; label; kind; choices; lo; hi; help; group; essential; owner; stage; adapters: string[]; value; set: boolean; default }
class DecisionRecord {
  constructor(adapters: LoadedAdapter[], record: AnalysisRecord)   // restores state from setup/decision entries
  fields(): DecisionField[]
  applySetup(values: Record<string, unknown>, opts?: { profile?: string; how?: string }): void
  value(key: string): unknown; isSet(key: string): boolean; owner(key: string): Owner
  values(): Record<string, unknown>
  change(key: string, value: unknown, opts?: { by?: "human" | "agent" | "profile"; reason?: string }): string[]
  setOwner(key: string, owner: Owner, by?: string): void
  enforce(adapter: string, tool: string, args: Args): Enforcement
  brief(): string
  saveProfile(name: string): { name: string; version: number }
  static listProfiles(): { name: string; version: number }[]
}
class QuestionQueue {
  constructor(record: AnalysisRecord, opts?: { notify?: (q: Question) => Promise<void> })
  ask(spec: Omit<Question, "qid" | "session" | "status" | "created">): Promise<Question>
  answer(qid: string, value: unknown, note?: string, by?: string): Question
  get(qid: string): Question | undefined
  open(): Question[]
  expire(now?: number): Question[]
  wait(qid: string, timeoutMs?: number): Promise<Question>
}
function allOpenQuestions(): Question[]       // every session, oldest first, from CUVETTE_HOME/questions.json
function runSensitivity(decision: Decision, tool: string, baseArgs: Args, linkedArg: string,
  call: (tool: string, args: Args, meta: { sensitivityOf: string }) => Promise<{ output: ToolOutput; node?: string }>,
  record: AnalysisRecord): Promise<SensitivityResult>
class Permissions {
  constructor(rules: Record<string, "allow" | "ask" | "deny">)   // keys: tool name or glob, "run_command:<argv glob>"
  check(tool: Tool, args: Args): "allow" | "ask" | "deny"
}
class HookRunner {
  constructor(hooks: Hook[], commandHooks?: Record<HookEvent, { matcher?: string; command: string[] }[]>, cwd?: string)
  pre(input: PreToolUseInput): Promise<PreToolUseResult>       // merges in order; first deny/block/ask wins
  post(input: PostToolUseInput): Promise<PostToolUseResult>
  preAnswer(input: PreAnswerInput): Promise<PreAnswerResult>
  event(name: HookEvent, input: Record<string, unknown>): Promise<void>
}
```

Command hooks follow Claude Code: the command gets the input JSON on stdin; exit 0 with JSON on
stdout is the result; exit 2 is a deny (PreToolUse) with stderr as the reason; other exit codes
are logged and ignored.

Decision rules: a `setup` stage decision gets a value in `applySetup` (the default if the
scientist gives none; the setup entry lists `defaultsAccepted`). A `when_needed` decision owned
by `human` has no value until the scientist answers; `enforce` lists it in `waiting` for each
call that it links to. Owner `fixed`: a different value is overwritten (`overwritten: true`).
Owner `agent`: the agent's first value is recorded as a `decision` by `agent`. A link `arg` can
be a dotted path into nested objects (`params.tol_ppm`). The harness adds one built-in
decision: `question` (text, human, setup, "What question are you asking?").

## Folder trust (`src/core/trust.ts`)

WARNING: Project files in `.ga/` or `.cuvette/` can run programs. A change here can open a security gap.

```ts
function scanFolder(folder: string): FolderScan   // files with SHA-256, keys, hook lines, adapters, bypass
function trustStatus(folder: string): { state: "none" | "trusted" | "once" | "new" | "changed"; scan; changes: string[] }
function folderTrusted(folder: string): boolean   // "trusted" or "once"
function trustFolder(folder: string): TrustEntry  // saves trusted_folders in CUVETTE_HOME/settings.json
function untrustFolder(folder: string): boolean
function trustOnce(folder: string): void          // in this process; Session.close ends it
function checkoutModelOptions(checkout: string): Record<string, unknown>   // think, numCtx, effort
```

Rules:

- The project files are `settings.json`, `settings.local.json` and `adapters/` in `.ga/` and `.cuvette/` of the project folder. The harness does not read them in a parent folder.
- `loadSettings` (`config.ts`), `layers` (`settings.ts`) and `adapterDirs` (`manifest.ts`) use the project files only if `folderTrusted` is true. Without trust, only `SAFE_KEYS` apply: display settings with no effect on code.
- `findAdapter` does not load a path in a project adapter folder without trust. It loads the adapter with the same name from the user or catalog folder.
- A folder is trusted if its entry in `trusted_folders` has the same hash as the files now. A new or changed file, key, hook or adapter sets the state to `changed`.
- A folder with only `SAFE_KEYS` has the state `none`. It needs no card.
- `Session.init` checks the trust before the `SessionStart` hooks. An interactive session asks a question with the title `Trust this folder?` and no decision key. Other sessions write one `notice` entry, and `session.trustNotice` holds the text.
- `Session.answer` sends an answer to that question to `setTrust`. `setTrust` writes a `trust` entry. On trust, `applyProjectFiles` loads the settings again, sets the permission rules and command hooks, turns on bypass if a file sets it, and runs the `SessionStart` hooks of the folder. Model, mode and default adapter settings apply in the next session.
- `SessionOptions.trustFolder` (`--trust-folder`) trusts the folder once for that session.
- `runPapers` trusts its own checkout once and passes `checkoutModelOptions` of the checkout to each run as session settings. The session folder of a blind run is a work folder with no project files.

## Claims, review, lab memory (`src/core/`, owner E)

```ts
function checkAnswer(text: string, record: AnalysisRecord): Claim[]      // appends claim_check
function annotate(text: string, claims: Claim[]): string
class Findings {
  constructor(record: AnalysisRecord)
  add(f: FindingIn, source: Finding["source"]): Finding
  resolve(fid: string, action: "accept" | "reject" | "fix", reason?: string): void
  list(status?: Finding["status"]): Finding[]
}
function runChecks(ctx: { record: AnalysisRecord; decisions: DecisionRecord; adapters: LoadedAdapter[]; answer: string; claims: Claim[] }): Promise<FindingIn[]>
function referee(provider: Provider, ctx: same as above): Promise<FindingIn[]>
function propose(adapter: string, changeKind: "default" | "check" | "standard" | "test", payload: Record<string, unknown>, reason: string, record?: AnalysisRecord): LabChange
function approve(pid: string, by: string): LabChange
function reject(pid: string, by: string, reason: string): LabChange
function pending(adapter?: string): LabChange[]
function applyOverlay(adapter: LoadedAdapter): LoadedAdapter
```

## Session (`src/core/session.ts`, lead)

```ts
type ExportFormat = "html" | "md" | "jsonl" | "pdf" | "protocol" | "script" | "notebook" | "flow"
interface SessionOptions { adapters: string[]; model: string; referee?: string; mode?: Mode;
  cwd?: string; id?: string; settings?: Partial<Settings> }
class Session {
  static create(opts: SessionOptions): Promise<Session>
  static resume(id: string, opts?: Partial<SessionOptions>): Promise<Session>
  id: string; dir: string; workDir: string; mode: Mode; busy: boolean
  model: ModelInfo; adapterInfo: { name: string; title: string; version: string; programVersion: string }[]
  bus: Bus; record: AnalysisRecord; decisions: DecisionRecord; questions: QuestionQueue; findings: Findings
  send(text: string): Promise<string>
  interrupt(): void
  respondPermission(rid: string, ok: boolean, note?: string): void
  answer(qid: string, value: unknown, note?: string): Promise<void>
  setDecision(key: string, value: unknown, reason?: string): string[]
  setOwner(key: string, owner: Owner): void
  setMode(mode: Mode): void
  followDone(step: number, note?: string): Promise<void>
  review(): Promise<Finding[]>
  compact(): Promise<void>
  exportAs(fmt: ExportFormat): Promise<string>
  close(): Promise<void>
}
```

### The loop

1. `send(text)`: `UserPromptSubmit` hooks; append `user` and `message`; add notes (setup brief,
   answers and decision changes since the last turn) to the user message.
2. Each step: context management, then `provider.step()`. The estimate counts the system
   prompt, the tool schemas and the history. Above 50% of the context window, old tool output
   that is longer than 1,500 characters gets its first 400 characters and a short note. This
   change is in the live history only. Above 70%, one call summarizes the older messages
   under fixed headings and updates the previous summary. The latest request and the recent
   steps stay as they are, also inside one long turn. The recent steps are at least the last
   two model replies, up to 30% of the window. After the step: append `message` and
   `usage`, and stream deltas to the bus.
3. Each tool call, in order: schema check; `PreToolUse` (permissions, mode, decisions, data
   rules, adapter hooks, command hooks); `ask` waits on `respondPermission`; `block` runs the
   sensitivity check, asks the question, logs `blocked`, and returns an error result that tells
   the model to continue with work that does not depend on the answer; `instruct` (Follow mode)
   shows the manual route and waits for `followDone`; then `execute`; hash outputs; add the
   node; `PostToolUse`; append `tool_result`.
4. No tool calls: `PreAnswer` hooks (claims, rule review, referee); append `assistant` with
   `final: true`; `Stop` hooks.
5. `interrupt()` aborts the model call and the running tool; every open call gets an error
   result, so the history stays valid.

## Terminal UI (`src/tui/`, owner F)

Built like Claude Code: a scrolling transcript, an input box at the bottom, a status line, and
modal cards. Esc interrupts. Shift+Tab cycles the mode. Slash commands: `/setup`, `/decisions`,
`/owner`, `/mode`, `/questions`, `/answer`, `/trail [1|2|3]`, `/graph`, `/review`, `/findings`,
`/export <fmt>`, `/model`, `/adapters`, `/skills`, `/lab`, `/compact`, `/resume`, `/help`,
`/quit`. Cards: setup form, permission request, question with options and sensitivity table,
Follow-mode instruction.

## Command line (`src/cli.ts`, lead)

```
cuvette [--adapter imagej] [--model ollama:qwen3:8b] [--referee claude] [--mode watch] [--resume <id>]
cuvette -p "<prompt>" --adapter imagej --model ... [--answers answers.json] [--setup setup.json] [--output text|json|stream-json]
cuvette adapters | cuvette adapter check <dir|name> [--run-tests] | cuvette adapter approve <name>
cuvette onboard <program> --model ... [--docs <url> ...] [--kind cli]
cuvette export <session> --format <fmt>
cuvette replay <session> --input <old>=<new> ...
cuvette questions
cuvette bench [scenario|all] --model ... [--guidance on|off|both]
cuvette mcp
```

## Changes made during the build (2026-10-08)

- **Permission order.** Rules are checked deny, then ask, then allow; the first match decides
  (Claude Code's order). A hook decision `defer` means `block`.
- **Bypass permissions.** `--bypass-permissions`, `/permissions bypass` or
  `"permissions": "bypass"` in a settings file. In bypass, `requestPermission` allows the call
  and logs it with the reason `bypass permissions`. The blind check, the plan and teach mode
  check, the decision hook and `deny` rules run before it, so they do not change. The eLabFTW
  push gives an outward text to `requestPermission`, so it still asks.
- **Hook order.** The decision hook runs before the mode hook, so Follow mode shows filled
  values. Plan and teach mode deny a non-read-only tool before any hook runs.
- **After an answer.** A call that was blocked runs again with the linked arguments set from the
  decision record, not with the value that the model proposed.
- **Small models.** Up to 16 adapter tools are visible, chosen by relevance to the request, when
  an adapter has more than 24 tools. Skills are listed as procedures, not tools. Null optional
  arguments are removed. A bare handle string such as `"h1"` is read as `{"handle": "h1"}`. An
  empty reply gets up to two retries; when the model produced tokens, the retry says that the
  call named a tool that does not exist (Ollama drops such calls without an error).
- **Paths.** Relative path arguments that exist under the session's working directory become
  absolute before the hooks run, so the record holds absolute paths.
- **Review.** New domain-free checks: `decision_misreported` (the answer names a choice that is
  not the recorded value), `number_from_comparison` (a number from a sensitivity run of another
  option), and `unsourced_numbers` is now an error. Error findings send the answer back to the
  agent once before the scientist sees it.
- **Trail.** The runs of a sensitivity check are one line ("Compared 3 options for ...").
- **Provider options.** `makeProvider(spec, {effort, numCtx, think, apiKey, client})`.
- **Session additions.** `pipeline(tool, args, callId, signal)` is public (the MCP server mode
  uses it); `respondPermission(rid, ok, note, always)`; `followDone(step, note, agentDoes)`;
  `expireQuestions()` runs every 30 s; the `task` tool runs a read-only helper agent.
- **Answers.** `src/core/answers.ts` `fitAnswer(question, wanted)` turns an answer that is not
  one of the options into a valid one (headless mode and the benchmark).
- **Scientist-owned values win.** When the model gives a value that differs from a decision
  owned by the scientist (or fixed), the harness uses the recorded value, logs the deviation
  with `overwritten: true`, and tells the model to ask the scientist if it needs a change. An
  agent-owned decision changes when the agent gives a new value (logged as a `decision` by the
  agent). In headless mode `ask_scientist` always waits, because the answer comes at once.

## Browser app (`src/server/app.ts`, 2026-10-08)

`cuvette app [folder] [--resume <id|folder>] [--no-open]` starts `startApp(opts)`: an HTTP server on
127.0.0.1 with a random port and a random token. Every request needs the token (`?t=` or the
`x-token` header), the Host header must be 127.0.0.1 or localhost with the port, a POST with an
Origin header must come from the same origin, and the server sends no CORS headers. The page
uses relative URLs only. `startApp` returns `{ url, port, token, close() }`, so a desktop wrapper
can start and stop it without the command line.

- **Same layer as the terminal.** `src/ui/` holds the commands, the card logic (the proposed
  analysis is a reducer, `planReduce`), the message routing during a turn and the settings
  editor. `WebView` (`app-view.ts`) maps the bus events with the same `Mapper` and `Collapser`
  as the terminal and runs every slash command through the same `commands` list.
  `tests/parity.test.ts` checks that both views have every command and every card type.
- **Cards are rendered on the server** (`app-html.ts`, `WEB_CARDS`, one renderer for each card
  type). The page posts `{id, act, value, fields}` to `/api/act`.
- **Desktop bridge.** The page calls `window.cuvetteDesktop` when a wrapper provides it:
  `chooseFolder(start)`, `reveal(path)`, `notify(title, body)`, `saveFile(url, name)`. In a
  browser the fallbacks are the in-page folder field, `/api/reveal`, the Notification API and a
  download link.
- **One session, two views.** In the terminal, `/app` starts the app on the running session.
  `cuvette app --resume <id>` on a session that a terminal holds sends SIGUSR2 to that process,
  which starts the app on its session and writes the URL to `.record/open.json`. A session that
  the app holds refuses `cuvette --resume` and prints the app URL. `open.json` (pid, app URL, mode
  0600) is removed when the session closes.
- **Session titles.** After a turn that changes the analysis, the session makes one short
  model call (Claude Haiku for Claude models, the session model otherwise) for a title and a
  one-sentence description. The record gets a `title` entry and the home index gets `name` and
  `description`. `cuvette sessions`, the terminal picker and the app's Sessions page show them.
- **Tests and windows.** `openWithOs`, the reveal action and the pilot image viewer do nothing
  under vitest or with `CUVETTE_NO_OPEN=1` (`--no-open` sets it).
