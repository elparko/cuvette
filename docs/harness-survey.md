# Harness Survey: OpenCode and Claude Code

2026-10-07

This survey records how two agent harnesses work. It lists what Cuvette takes from them and what it leaves.
The goals are in `docs/design.md`.

## Sources and limits

OpenCode:

- Source: `https://github.com/sst/opencode`, shallow clone, commit `663fbd7`.
- Scratch copy: `/private/tmp/claude-501/-Users-parker-Code-guided-analysis/5faf2bf8-b07c-4c9b-9a89-92c9f1d03ce5/scratchpad/opencode`.
- Paths below are relative to the repo root. `src/` means `packages/opencode/src/`.
- I read the code. I did not run it.
- The code is in a change. The `session.next.*` events and `packages/core/src/session/` show a second session model. This survey describes the model that the loop in `src/session/prompt.ts` uses.
- The code uses the Effect library for all services. The shapes below are plain types. The shapes do not show the Effect wrappers.

Claude Code:

- Closed source. I read the public docs pages at `https://code.claude.com/docs/en/<page>`. Each page also exists as `<page>.md`.
- Pages read: `how-claude-code-works`, `hooks`, `settings`, `permissions`, `permission-modes`, `memory`, `skills`, `sub-agents`, `mcp`, `plugins-reference`, `output-styles`, `headless`, `sessions`, `claude-directory`, `agent-sdk/agent-loop`, `agent-sdk/permissions`.
- The docs do not give the JSONL transcript line shape. Section 2.8 shows what I saw in one local transcript. That shape is not a public contract.
- The docs name an auto-compact window setting (`model-config`). I did not read its default value.
- The docs do not give the exact compaction prompt or token threshold.

## 1. OpenCode

### 1.1 Component table

| Component | What it does | Where it is |
| --- | --- | --- |
| Session loop | Runs model steps in a `while (true)` loop until the model stops calling tools | `src/session/prompt.ts` (`runLoop`, line 1081) |
| Stream processor | Turns model stream events into parts, runs the doom-loop check, picks `compact`, `stop` or `continue` | `src/session/processor.ts` |
| Message and part model | Two message roles. Twelve part types. Tool parts have four states | `packages/schema/src/v1/session.ts` |
| Tool definition | `Tool.define(id, init)` with a parameter schema and an `execute` function | `src/tool/tool.ts` |
| Tool registry | Collects built-in tools, tools from files, tools from plugins. Filters by model | `src/tool/registry.ts` |
| Tool resolver | Wraps each tool for the model SDK. Runs the before and after hooks. Adds MCP tools | `src/session/tools.ts` |
| Permission service | Rules with `allow`, `ask`, `deny`. Pending asks wait for a reply | `src/permission/index.ts` |
| Permission schema | Rule, request, reply types and the two events | `packages/schema/src/v1/permission.ts` |
| Permission config | The `permission` key in `opencode.json` | `packages/core/src/v1/config/permission.ts` |
| Agents | Built-in `build`, `plan`, `general`, `explore`, plus hidden `compaction`, `title`, `summary` | `src/agent/agent.ts` |
| Markdown agents | `agent/` and `agents/` folders hold `.md` files with frontmatter | `src/config/agent.ts` |
| Subagents | The `task` tool starts a child session | `src/tool/task.ts`, `src/agent/subagent-permissions.ts` |
| Plugins | A function that returns a hooks object | `packages/plugin/src/index.ts`, `src/plugin/index.ts` |
| Custom tools | Files in `tool/` or `tools/` folders, and the `tool` key of a plugin | `src/tool/registry.ts` |
| Skills | `SKILL.md` files. A `skill` tool loads the body on demand | `src/skill/index.ts`, `src/tool/skill.ts` |
| Commands | Named prompt templates with `$ARGUMENTS` and `$1` | `src/command/index.ts`, `src/config/command.ts` |
| MCP client | Stdio, streamable HTTP and SSE transports. OAuth. Timeouts | `src/mcp/index.ts` |
| Provider layer | AI SDK packages plus the models.dev catalog | `src/provider/provider.ts`, `packages/core/src/models-dev.ts` |
| Compaction | Summary by a hidden agent. Pruning of old tool output | `src/session/compaction.ts`, `src/session/overflow.ts` |
| Storage | SQLite file `opencode.db` in the XDG data folder | `packages/core/src/database/database.ts` |
| Old storage | JSON files `storage/session/{info,message,part}`. Read for migration | `src/storage/storage.ts` |
| Snapshots | A separate bare git folder tracks the work tree for undo | `src/snapshot/index.ts`, `src/session/revert.ts` |
| Server | HTTP API with route groups and one SSE stream | `src/server/routes/instance/httpapi/` |
| Event bus | A global emitter. Events carry an `evt_` id | `src/bus/global.ts`, `packages/schema/src/event.ts` |
| Clients | Terminal UI, web app, desktop app, SDK | `packages/tui`, `packages/app`, `packages/sdk/js` |
| Config | JSON or JSONC files merged from many places | `src/config/config.ts` |
| Instructions | Reads `AGENTS.md`, and `CLAUDE.md` as a fallback | `src/session/instruction.ts` (lines 61 to 66) |

### 1.2 The agent loop, step by step

1. A client calls `POST` on the prompt route. The handler calls `SessionPrompt.prompt` (`src/session/prompt.ts`, line 1053).
2. `prompt` creates the user message and its parts. It saves per-call tool switches as session permission rules. If `noReply` is true, it stops here.
3. `loop` calls `runLoop` inside `state.ensureRunning`. One session runs one loop at a time (`src/session/run-state.ts`).
4. At the top of each pass, the loop sets status `busy` and loads the messages. It skips the messages that a summary replaced.
5. The loop finds the last user message and the last assistant message.
6. The loop exits if the last assistant message finished with a reason other than `tool-calls` or `unknown`. It also needs no pending tool call and the right parent.
7. The loop increments `step`. On step one it starts a title job and a summary job in the background.
8. A pending `subtask` part runs next. A pending `compaction` part runs next. Each goes to its own handler and the loop continues.
9. The loop reads the token counts of the last finished assistant message. If `isOverflow` is true, it adds a `compaction` task and continues (line 1164).
10. The loop gets the agent. `agent.steps` sets the step limit. On the last step it adds a text message that tells the model to answer without tools (`MAX_STEPS_PROMPT`).
11. The loop writes a new assistant message and builds the processor handle.
12. `SessionTools.resolve` builds the tool set. The registry filters tools by model and by the agent permission rules. A rule `deny` on `*` for a tool hides it.
13. If the user asked for a JSON schema, the loop adds a `StructuredOutput` tool and sets `toolChoice` to `required`.
14. The plugin hook `experimental.chat.messages.transform` runs. The loop builds the system prompt from environment, instruction files, MCP instructions and the skill list.
15. `handle.process` streams the model call. The processor writes parts as events arrive and publishes `message.part.delta` events.
16. When the model emits a tool call, the AI SDK calls the wrapper that `tools.ts` built. The wrapper runs in this order:
    1. Plugin hook `tool.execute.before`.
    2. The tool `execute` function. The tool calls `ctx.ask(...)` itself when it needs a permission check.
    3. Plugin hook `tool.execute.after`.
    4. The result goes back to the SDK. The SDK sends it to the model on the next pass.
17. After three identical tool calls in a row, the processor asks the permission `doom_loop` (`src/session/processor.ts`, line 29 and 356).
18. A rejected permission marks the tool part as `error`. The processor then sets `blocked`. The loop stops unless the config sets `experimental.continue_loop_on_deny`.
19. The processor returns `compact`, `stop` or `continue`. `compact` adds a compaction task. `continue` starts the next pass.
20. After the loop exits, a background job prunes old tool output. The function returns the last assistant message.

Where checks run:

- Permission checks run inside each tool, through `ctx.ask`. The loop does not check permissions for the built-in tools.
- The MCP wrapper asks with permission name equal to the tool key and pattern `*` (`src/session/tools.ts`, around line 405).
- The `permission.ask` plugin hook exists in the hook type. I did not find where the code calls it.

Interrupts:

- A cancel call goes to `SessionRunState.cancel`. It interrupts the running fiber (`src/session/run-state.ts`).
- The loop catches the interrupt. It sets an `AbortedError` on the assistant message and a completed time (`prompt.ts`, line 1203).
- The processor cleanup marks every open tool part as `error` with the text `Tool execution aborted` and `metadata.interrupted: true` (`processor.ts`, around line 600).
- The abort signal reaches each tool as `ctx.abort`.

Compaction triggers:

- Before a pass: `isOverflow` is true (`src/session/overflow.ts`).
- During a pass: the provider returns a context-overflow error. The processor sets `needsCompaction` and stops the stream.
- By hand: the summarize route.

### 1.3 Data shapes worth copying

#### Tool definition

From `src/tool/tool.ts`. This listing leaves out the Effect wrapper.

```ts
interface Def<Parameters, Metadata> {
  id: string
  description: string
  parameters: Parameters            // a schema
  jsonSchema?: JSONSchema7
  execute(args, ctx: Context): Promise<{
    title: string
    metadata: Metadata
    output: string                  // text that goes to the model
    attachments?: FilePart[]
  }>
  formatValidationError?(error): string
}

type Context = {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal
  callID?: string
  extra?: Record<string, unknown>
  messages: MessageWithParts[]
  metadata(input: { title?: string; metadata?: object }): void   // live progress
  ask(input: { permission: string; patterns: string[]; always: string[]; metadata: object }): void
}
```

Facts about the wrapper in the same file:

- It decodes the arguments. A failure raises `InvalidArgumentsError`. Its message tells the model to rewrite the input.
- It truncates the output through `Truncate.output`. It stores the full text in a file and sets `metadata.outputPath`.

#### Plugin tool shape

From `packages/plugin/src/tool.ts`. This is the public shape for custom tools.

```ts
tool({
  description: string,
  args: { name: tool.schema.string().describe("...") },   // zod
  execute(args, ctx: { sessionID, messageID, agent, directory, worktree, abort, metadata, ask })
    : Promise<string | { title?, output, metadata?, attachments? }>
})
```

#### Message and part model

From `packages/schema/src/v1/session.ts`.

```ts
type Message =
  | { role: "user", id, sessionID, time: { created }, agent: string,
      model: { providerID, modelID, variant? }, format?: text | json_schema,
      system?: string, tools?: Record<string, boolean>, summary?: {...} }
  | { role: "assistant", id, sessionID, parentID, agent, mode, modelID, providerID,
      time: { created, completed? }, finish?: string, error?, summary?: boolean,
      cost, tokens: { total?, input, output, reasoning, cache: { read, write } },
      path: { cwd, root }, structured?: any }

type Part = // every part has id, sessionID, messageID
  | { type: "text", text, synthetic?, ignored?, time? }
  | { type: "reasoning", text, time }
  | { type: "file", mime, url, filename?, source? }
  | { type: "tool", callID, tool, state: ToolState, metadata? }
  | { type: "step-start", snapshot? }
  | { type: "step-finish", reason, snapshot?, cost, tokens }
  | { type: "snapshot", snapshot }
  | { type: "patch", hash, files }
  | { type: "agent", name }
  | { type: "subtask", prompt, description, agent, model?, command? }
  | { type: "retry", attempt, error, time }
  | { type: "compaction", auto, overflow?, tail_start_id? }

type ToolState =
  | { status: "pending", input, raw }
  | { status: "running", input, title?, metadata?, time: { start } }
  | { status: "completed", input, output, title, metadata,
      time: { start, end, compacted? }, attachments? }
  | { status: "error", input, error, metadata?, time: { start, end } }
```

Notes:

- `time.compacted` on a completed tool part marks pruned output.
- A tool part keeps the model input and the output together. A reader can rebuild each step from the parts.
- Ids start with `msg`, `prt`, `per`, `evt_` and sort by time (`packages/schema/src/identifier.ts`).

#### Permission config and rules

From `packages/core/src/v1/config/permission.ts` and `packages/schema/src/v1/permission.ts`.

```jsonc
// opencode.json
{
  "permission": {
    "*": "allow",                       // a string sets the rule for one permission
    "bash": { "*": "ask", "git status*": "allow", "rm *": "deny" },   // an object maps patterns
    "edit": { "*": "deny", ".opencode/plans/*.md": "allow" },
    "read": { "*": "allow", "*.env": "ask" },
    "task": { "general": "deny" },
    "skill": "ask",
    "doom_loop": "ask"
  }
}
```

```ts
type Rule = { permission: string, pattern: string, action: "allow" | "deny" | "ask" }
type Request = { id, sessionID, permission, patterns: string[], metadata, always: string[],
                 tool?: { messageID, callID } }
type Reply = "once" | "always" | "reject"      // reject may carry a message
```

How the rules work (`src/permission/index.ts`):

- `evaluate` flattens the rule sets in order and takes the last rule that matches. The default is `ask`.
- Config order is the precedence. A later rule wins, whatever its action.
- `ask` checks each pattern. One `deny` raises `DeniedError` at once. One `ask` creates a pending request and publishes `permission.asked`.
- The reply `always` adds the request `always` patterns as `allow` rules. They last for the process, not on disk.
- A `reject` with a message raises `CorrectedError`. The message goes to the model as feedback.
- A plain `reject` also rejects all other pending requests of the same session.
- Defaults for the `build` agent: allow all, `doom_loop` ask, `external_directory` ask, `*.env` read ask, `question` allow (the `defaults` block in `src/agent/agent.ts`).

The shell tool splits a command and builds one pattern per subcommand. It uses a table of command prefix lengths in `src/permission/arity.ts`. So `git checkout main` becomes `git checkout`.

#### Agent config

From `packages/core/src/v1/config/agent.ts` and `src/config/agent.ts`. A markdown agent file looks like this:

```markdown
---
description: Reviews a result against the decision record
mode: subagent            # subagent | primary | all
model: provider/model
temperature: 0.1
steps: 20                 # step limit
permission:
  edit: deny
  bash: { "*": "ask" }
hidden: false
---
The file body is the system prompt.
```

#### Plugin hook signatures

From `packages/plugin/src/index.ts`. A plugin is `(input, options?) => Promise<Hooks>`. The input holds `client`, `project`, `directory`, `worktree`, `serverUrl`, `$`.

```ts
interface Hooks {
  event?: (i: { event }) => Promise<void>
  config?: (cfg) => Promise<void>
  tool?: Record<string, ToolDefinition>
  auth?: AuthHook
  provider?: ProviderHook
  "chat.message"?:   (i: { sessionID, agent?, model?, messageID?, variant? }, o: { message, parts }) => Promise<void>
  "chat.params"?:    (i, o: { temperature, topP, topK, maxOutputTokens, options }) => Promise<void>
  "chat.headers"?:   (i, o: { headers }) => Promise<void>
  "permission.ask"?: (i: Permission, o: { status: "ask" | "deny" | "allow" }) => Promise<void>
  "command.execute.before"?: (i: { command, sessionID, arguments }, o: { parts }) => Promise<void>
  "tool.execute.before"?: (i: { tool, sessionID, callID }, o: { args }) => Promise<void>
  "tool.execute.after"?:  (i: { tool, sessionID, callID, args }, o: { title, output, metadata }) => Promise<void>
  "tool.definition"?: (i: { toolID }, o: { description, parameters }) => Promise<void>
  "shell.env"?: (i: { cwd, sessionID?, callID? }, o: { env }) => Promise<void>
  "experimental.chat.messages.transform"?: (i: {}, o: { messages }) => Promise<void>
  "experimental.chat.system.transform"?:   (i: { sessionID?, model }, o: { system: string[] }) => Promise<void>
  "experimental.session.compacting"?:      (i: { sessionID }, o: { context: string[]; prompt?: string }) => Promise<void>
  "experimental.compaction.autocontinue"?: (i, o: { enabled: boolean }) => Promise<void>
  "experimental.text.complete"?: (i: { sessionID, messageID, partID }, o: { text }) => Promise<void>
  dispose?: () => Promise<void>
}
```

Facts about hooks:

- A hook gets an `(input, output)` pair. It changes `output` in place. It returns nothing.
- `Plugin.trigger` calls each plugin in load order, one at a time, and awaits each (`src/plugin/index.ts`, line 284).
- The `tool.execute.before` hook has no decision field. The wrapper passes `{ args }` as the output object, then calls `execute` with the original `args` object (`src/session/tools.ts`). An in-place change to `output.args` fields reaches the tool. A new `output.args` object does not.
- The only block path I found in the code is a throw. I did not run it to see how the loop shows the error.
- The `permission.ask` hook has the only allow, ask, deny output (`status`). The hook type exists. I did not find a call site.

#### Event names

The events in `packages/schema/src/**` that clients see on the SSE stream:

- Session: `session.created`, `session.updated`, `session.deleted`, `session.idle`, `session.status`, `session.error`, `session.diff`, `session.compacted`.
- Message: `message.updated`, `message.removed`, `message.part.updated`, `message.part.delta`, `message.part.removed`.
- Permission and question: `permission.asked`, `permission.replied`, `question.asked`, `question.replied`, `question.rejected`.
- Other: `todo.updated`, `mcp.tools.changed`, `command.executed`, `file.edited`, `lsp.updated`, `vcs.branch.updated`, `pty.*`, `workspace.*`, `server.connected`, `server.heartbeat`.
- Terminal control: `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`, `tui.session.select`.
- Second session model: `session.next.*` (prompted, step started and ended, tool called, tool success, tool failed, text delta, and others).

Event envelope (`packages/schema/src/event.ts`): `{ id: "evt_...", type, data, durable?: { aggregateID, seq, version }, location?, metadata? }`.

### 1.4 Other parts

Agents and modes:

- `build` is the default primary agent. `plan` denies all edit tools except plan files.
- `general` and `explore` are subagents. `explore` denies everything except read tools and `bash`.
- `compaction`, `title`, `summary` are agents that the UI hides. They have `"*": "deny"` and a fixed prompt.
- User config `agent.<name>` merges over the built-ins, or creates a new agent.
- The `task` tool lists the allowed subagents in its own description (`src/tool/registry.ts`, `describeTask`).
- A subagent session gets the parent `deny` rules and `external_directory` rules (`src/agent/subagent-permissions.ts`).
- A subagent cannot start another subagent unless `subagent_depth` is above one. The default is one.

Skills:

- The loader scans `.claude/skills`, `.agents/skills` and `{skill,skills}/**/SKILL.md` (`src/skill/index.ts`, line 23 to 26).
- Frontmatter needs `name`. `description` is optional.
- The system prompt lists the skills. The `skill` tool returns the body in a `<skill_content>` block and lists up to ten sibling files.
- Pruning never erases `skill` tool output (`src/session/compaction.ts`, line 31).

MCP:

- Transports: stdio for `local`, streamable HTTP then SSE for `remote` (`src/mcp/index.ts`, line 212 to 360).
- Each server has a connect timeout. Remote servers support OAuth.
- The client listens for `ToolListChanged` and publishes `mcp.tools.changed`.
- MCP resources show as three extra tools: list, list templates, read. The loop adds them only if a server has the resources capability.

Providers:

- The layer uses AI SDK provider packages. `src/provider/provider.ts` (line 149 to 172) maps package names to factories.
- The catalog comes from models.dev. A custom provider uses `@ai-sdk/openai-compatible`.
- `ProviderTransform.schema` changes a tool schema per model. The registry swaps `edit` and `write` for `apply_patch` on GPT models.
- A plugin hook `experimental.provider.small_model` picks the model for titles and summaries.

Compaction details (`src/session/compaction.ts`, `src/session/overflow.ts`):

- Usable context = `limit.input - reserved`, or `context - maxOutput` when `limit.input` is unset. `reserved` defaults to the smaller of 20,000 and the max output.
- Config keys: `compaction.auto`, `compaction.prune`, `compaction.reserved`, `compaction.tail_turns`, `compaction.preserve_recent_tokens`.
- The recent tail stays verbatim. Its size is 25 percent of usable context, limited to 2,000 through 15,000 tokens.
- The older part goes to the hidden `compaction` agent. The hook `experimental.session.compacting` can add context or replace the prompt.
- OpenCode cuts tool output in the summary input to 2,000 characters.
- Pruning: walk back from the newest tool parts. Keep 40,000 tokens of output. Mark older completed outputs as compacted. Only prune if it frees more than 20,000 tokens.

Storage and snapshots:

- The database file is `opencode.db` in `Global.Path.data`. The path comes from `xdg-basedir`.
- Events have a `durable` field with an aggregate id and a sequence number. This gives an ordered log per session.
- A snapshot is a tree hash from a separate git folder under `data/snapshot/<project>/<hash>`. `track()` runs at step start. `patch(hash)` lists the files that changed.
- `revert` restores files from the patches after a chosen message (`src/session/revert.ts`).

Server and clients:

- The server defines route groups in `src/server/routes/instance/httpapi/groups/`: `session`, `permission`, `question`, `mcp`, `provider`, `config`, `file`, `event`, `tui`, `pty`, `workspace` and others.
- Session routes include `list`, `get`, `messages`, `create`, `fork`, `abort`, `prompt`, `promptAsync`, `command`, `shell`, `summarize`, `revert`, `unrevert`, `permissionRespond`.
- `promptAsync` returns at once. The client then follows the SSE stream.
- The SSE handler sends `server.connected` first and `server.heartbeat` every ten seconds (`handlers/global.ts`, line 35 to 49).
- The TUI is a client. The SDK in `packages/sdk/js` and `packages/sdk/openapi.json` expose the API.
- `tui.*` events let the server control the TUI. A plugin can append text to the prompt or show a toast.

Config:

- File names: `opencode.jsonc`, `opencode.json`, `config.json` (`src/config/config.ts`, line 141 and 273).
- Sources include global config, a well-known URL, `OPENCODE_CONFIG`, `.opencode` folders, `OPENCODE_CONFIG_CONTENT`, and a managed folder.
- Managed config loads last and overrides all. A comment at line 538 says macOS managed preferences override everything.
- I did not read the exact order of the project-level files.

Commands:

- `Command.Info` has `name`, `description`, `agent`, `model`, `source` (`command`, `mcp`, `skill`), `template`, `subtask`, `hints`.
- A template can use `$ARGUMENTS`, `$1`, `@file` and `` !`shell` `` (`src/config/markdown.ts`, line 6 and 7).
- Built-in commands: `init`, `review` (`src/command/template/`).

## 2. Claude Code

### 2.1 Component table

| Component | What it does | Doc |
| --- | --- | --- |
| Agent loop | Gather context, act, check. Repeats until a reply has no tool calls | `https://code.claude.com/docs/en/how-claude-code-works`, `https://code.claude.com/docs/en/agent-sdk/agent-loop` |
| Hooks | Run a handler at a lifecycle event. Can block, change input, add context | `https://code.claude.com/docs/en/hooks` |
| Permission rules | `allow`, `ask`, `deny` lists with patterns | `https://code.claude.com/docs/en/permissions` |
| Permission modes | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | `https://code.claude.com/docs/en/permission-modes` |
| Settings | JSON files at five levels | `https://code.claude.com/docs/en/settings` |
| Memory | `CLAUDE.md` files, `.claude/rules/`, auto memory | `https://code.claude.com/docs/en/memory` |
| Skills | Folder with `SKILL.md`. Description in context, body on demand | `https://code.claude.com/docs/en/skills` |
| Subagents | Markdown files with frontmatter. Own context window | `https://code.claude.com/docs/en/sub-agents` |
| Commands | Skills and command files give the `/name` commands | `https://code.claude.com/docs/en/skills` (command files are skills) |
| MCP | Stdio, HTTP, SSE, WebSocket servers. Tool search defers tool definitions | `https://code.claude.com/docs/en/mcp` |
| Plugins | A folder that bundles skills, agents, hooks, MCP servers | `https://code.claude.com/docs/en/plugins-reference` |
| Headless mode | `claude -p` with `text`, `json`, `stream-json` output | `https://code.claude.com/docs/en/headless` |
| Agent SDK | The same loop as a library for Python and TypeScript | `https://code.claude.com/docs/en/agent-sdk/agent-loop` |
| Sessions | JSONL transcript per session. Resume and fork | `https://code.claude.com/docs/en/sessions`, `https://code.claude.com/docs/en/claude-directory` |
| Checkpoints | File snapshots before edits. Rewind with Esc twice | `https://code.claude.com/docs/en/how-claude-code-works` (checkpoints section) |
| Compaction | Clears old tool output, then summarizes | `https://code.claude.com/docs/en/how-claude-code-works` (context section) |

### 2.2 The agent loop, step by step

Source: `https://code.claude.com/docs/en/agent-sdk/agent-loop` and `https://code.claude.com/docs/en/agent-sdk/permissions`.

1. Session start. `Setup` and `SessionStart` hooks run. The stream yields a `system` message with subtype `init`.
2. The user prompt arrives. The `UserPromptSubmit` hook runs. It can add context or reject the prompt.
3. Claude gets the prompt, the system prompt, the tool definitions and the history. `CLAUDE.md` content is in context.
4. Claude replies with text, tool calls, or both. The stream yields one `assistant` message for each content block.
5. For each tool call, the harness checks permissions in this fixed order:
    1. `PreToolUse` hooks.
    2. Deny rules.
    3. Ask rules.
    4. The permission mode.
    5. Allow rules.
    6. The `canUseTool` callback, or the user prompt.
6. A hook `allow` does not skip the deny rules and ask rules. A hook exit code two stops the call before the rules (`https://code.claude.com/docs/en/permissions`, "Extend permissions with hooks").
7. The tool runs. `PostToolUse` hooks run on success. `PostToolUseFailure` hooks run on failure.
8. The tool result goes back as a `user` message with a `tool_result` block. Read-only tools can run in parallel. Custom tools run one at a time unless they set `readOnlyHint`.
9. After a batch of parallel calls, `PostToolBatch` hooks run.
10. Steps four to nine repeat. Each pass is one turn.
11. A reply with no tool calls ends the turn. `Stop` hooks run. A `Stop` hook can block and give a reason, so Claude continues. After eight blocks in a row, Claude Code ends the turn.
12. The stream yields a `result` message with the final text, cost, usage and session id.

Limits and interrupts:

- `maxTurns` counts tool-use turns. `maxBudgetUsd` caps spend. The result `subtype` tells which limit stopped the run.
- Esc in the terminal stops the running tool call. Claude waits for the next instruction. Queued messages go next (`how-claude-code-works`).
- In headless mode, SIGINT ends the turn. SIGTERM exits with code 143 and records no result for the open turn (`headless`, "Stop a run with SIGTERM").
- The SDK has an `interrupt()` call.

Compaction (`how-claude-code-works`, "When context fills up"; `agent-sdk/agent-loop`, "Automatic compaction"):

- Claude Code first clears older tool output. It then summarizes the conversation.
- The stream yields a `system` message with subtype `compact_boundary`.
- `PreCompact` can block (exit code two). `PostCompact` gets the `compact_summary`.
- Claude Code reads `CLAUDE.md` again on every request. It survives compaction. Text in a "Compact Instructions" section guides the summary.
- Claude Code attaches invoked skills again after the summary: 5,000 tokens for each skill, 25,000 tokens in total (`skills`, "Skill content lifecycle").
- If one output refills the context at once, Claude Code stops after a few tries and shows an error.

### 2.3 Hook data shapes

Source: `https://code.claude.com/docs/en/hooks`.

Event list (the docs table):

- Session: `Setup`, `SessionStart`, `SessionEnd`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `DirectoryAdded`.
- Turn: `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `StopFailure`, `MessageDisplay`, `Notification`.
- Tool: `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`.
- Agents: `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`.
- Context and model: `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`.
- Other: `WorktreeCreate`, `WorktreeRemove`, `Elicitation`, `ElicitationResult`.

Hook configuration, three levels: event, matcher group, handlers.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "if": "Bash(rm *)",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh", "timeout": 30 }
        ]
      }
    ]
  }
}
```

Handler types: `command`, `http`, `mcp_tool`, `prompt`, `agent`. All matching handlers run in parallel.

Matcher rules:

- `*`, empty or missing: match all.
- Only letters, digits, `_`, `-`, spaces, `,` and `|`: exact names, separated by `|` or `,`.
- Any other character: a JavaScript regular expression, not anchored. Example: `mcp__memory__.*`.
- The `if` field takes one permission rule such as `Edit(*.ts)`. It works on tool events only.

Where hooks live: user settings, project settings, local settings, managed settings, a plugin `hooks/hooks.json`, skill frontmatter, subagent frontmatter. Hooks from different files merge. They do not replace each other.

Input on stdin (command) or in the POST body (http). For `PreToolUse`:

```json
{
  "session_id": "abc123",
  "prompt_id": "550e8400-e29b-41d4-a716-446655440000",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test", "description": "Run test suite", "timeout": 120000 },
  "tool_use_id": "toolu_01ABC123...",
  "agent_id": "only inside a subagent",
  "agent_type": "only inside a subagent"
}
```

For an MCP tool, the input also holds `mcp_server: { name, source }`. File paths in file tools are always absolute.

Output:

- Exit code 0: success. The harness reads JSON from stdout.
- Exit code 2: block. The stderr text is the reason. JSON cannot override it.
- Other codes: a non-blocking error.
- Do not mix exit code 2 with JSON for control. Use one method per hook.

`PreToolUse` JSON output:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Shown to Claude on deny. Shown to the user on ask.",
    "updatedInput": { "field_to_modify": "new value" },
    "additionalContext": "Text added to Claude's context with the tool result."
  }
}
```

Facts:

- `permissionDecision` is `allow`, `deny`, `ask` or `defer`.
- With several hooks, the order of strength is `deny`, then `defer`, then `ask`, then `allow`.
- `updatedInput` replaces the whole input object. Unchanged fields must be in it.
- Permission rules run against the changed input.
- `defer` works only in `claude -p`. The process exits with `stop_reason: "tool_deferred"` and a `deferred_tool_use` object. The caller resumes the session later. This is a pause and resume path for a human decision.
- Strings in `additionalContext`, `systemMessage` and plain stdout have a limit of 10,000 characters. The harness saves longer text to a file.
- Universal fields: `continue` (false stops all work), `stopReason`, `systemMessage`.

Other decision shapes:

- `PostToolUse`: `{ "decision": "block", "reason": "..." }`, `additionalContext`, `updatedToolOutput`. The tool has already run. The change affects only what Claude sees.
- `Stop` and `SubagentStop`: `{ "decision": "block", "reason": "..." }` makes Claude continue. The input holds `stop_hook_active`.
- `UserPromptSubmit`: can add context or reject the prompt.
- `PreCompact`: exit code 2 or `"decision": "block"` stops compaction.

### 2.4 Settings, permissions, modes

Settings precedence (`https://code.claude.com/docs/en/settings`, "Settings precedence"), highest first:

1. Managed settings (organization policy).
2. Command line `--settings`.
3. `.claude/settings.local.json` (project, personal).
4. `.claude/settings.json` (project, shared).
5. `~/.claude/settings.json` (user).

Facts:

- A deny rule at any level beats an allow rule at any level (`permissions`, "Settings precedence").
- Rule order inside the permission system is deny, then ask, then allow. The first match decides. Rule specificity does not matter.
- A bare tool name in a deny rule removes the tool from the model context. A scoped rule such as `Bash(rm *)` keeps the tool and blocks the call.
- The harness enforces permission rules, not the model. The docs state this in a note.

Permission rules in settings:

```json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": ["Bash(npm run test *)"],
    "ask":   ["Bash(git push *)"],
    "deny":  ["Read(./.env)", "Bash(rm *)"]
  }
}
```

Permission modes (`https://code.claude.com/docs/en/permission-modes`):

| Mode | What runs without a prompt |
| --- | --- |
| `default` (named Manual) | Reads only |
| `acceptEdits` | Reads, file edits, common file commands |
| `plan` | Reads. No source edits |
| `auto` | Everything, after a background classifier checks each action |
| `dontAsk` | Reads and pre-approved tools. All else is denied |
| `bypassPermissions` | Everything, except actions that no mode approves |

Facts:

- Deny rules apply in every mode, including `bypassPermissions`.
- Ask rules and tools that need the user (`AskUserQuestion`) still prompt in `bypassPermissions`.
- A subagent can set its own `permissionMode`. A plugin subagent cannot.
- The mode switches with Shift+Tab, `--permission-mode`, or `defaultMode`.
- `--permission-prompts none` denies every call that would prompt. This is for runs with no human.

### 2.5 Memory, skills, subagents, plugins, output styles

Memory (`https://code.claude.com/docs/en/memory`):

- The harness loads `CLAUDE.md` and `CLAUDE.local.md` from the working folder and each parent folder. It joins them. The file nearest the working folder comes last.
- Files in subfolders load on demand when a tool reads a file there.
- Claude Code removes block-level HTML comments before the text enters context.
- `.claude/rules/*.md` files can limit rules to paths.
- Claude Code reads `AGENTS.md` as project instructions when no `CLAUDE.md` is present.
- Auto memory: the first 200 lines or 25 KB of `MEMORY.md` load at session start.

Skill frontmatter (`https://code.claude.com/docs/en/skills`, "Frontmatter reference"). All fields are optional. `description` is the most useful.

```yaml
---
name: my-skill
description: What it does and when to use it. Key use case first.
when_to_use: Extra trigger phrases.
disable-model-invocation: false   # true = only the user runs it with /name
user-invocable: true              # false = hidden from the / menu
allowed-tools: Read Grep          # approved without a prompt for this turn only
disallowed-tools: AskUserQuestion # removed while the skill is active
model: inherit
effort: high
context: fork                     # run in a subagent
agent: Explore                    # subagent type for context: fork
paths: ["src/**/*.py"]            # load only when files match
hooks: { ... }                    # registered while the skill is active
arguments: [issue]                # named positional arguments
---
Instructions in Markdown. Supporting files sit beside this file.
```

Facts:

- The model sees the name and description of each skill at session start. Claude Code cuts the listing text at 1,536 characters for each skill.
- The body enters context when the skill runs. It stays there. Claude Code does not read it again.
- Supporting files (`reference.md`, `scripts/`) load only if the skill body points to them.
- The listing budget is one percent of the context window. Over the budget, Claude Code drops some descriptions.
- Same name in several places: enterprise, then personal, then project. Plugin skills use the name `plugin-name:skill-name`.

Subagent frontmatter (`https://code.claude.com/docs/en/sub-agents`, "Frontmatter reference"). `name` and `description` are mandatory fields.

```yaml
---
name: referee
description: When to hand work to this agent.
tools: Read, Grep, Glob          # allow list. Omit to inherit all.
disallowedTools: Write, Edit
model: sonnet                    # or inherit
permissionMode: dontAsk
maxTurns: 20
skills: [reporting-standard]     # full skill text is injected at start
mcpServers: [some-server]
hooks: { ... }
memory: project                  # user | project | local
omitClaudeMd: true
isolation: worktree
background: false
---
The body is the system prompt.
```

Facts:

- A subagent starts with a fresh context. It gets its own prompt, the task message from the parent, the `CLAUDE.md` files (unless `omitClaudeMd`), and preloaded skills.
- It does not get the conversation history. Only the final summary returns to the parent.
- Tool hooks from settings and plugins also run inside subagents. The hook input has `agent_id` and `agent_type`.
- Priority: managed, then `--agents` flag, then project, then user, then plugin.
- A plugin subagent ignores `hooks`, `mcpServers` and `permissionMode`.

Plugin layout (`https://code.claude.com/docs/en/plugins-reference`, "Standard layout"):

```text
my-plugin/
├── .claude-plugin/
│   └── plugin.json        # only "name" is required
├── skills/<name>/SKILL.md
├── commands/*.md
├── agents/*.md
├── hooks/hooks.json
├── .mcp.json
├── .lsp.json
├── output-styles/*.md
├── monitors/monitors.json
├── bin/                   # on PATH while the plugin is on
├── scripts/
└── settings.json          # only "agent" and "subagentStatusLine" take effect
```

Facts:

- `plugin.json` fields: `name`, `displayName`, `version`, `description`, `author`, `license`, `dependencies`, `userConfig`, `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `outputStyles`.
- `userConfig` makes the harness ask the user for values when the plugin turns on.
- Components use the plugin name as a namespace. An MCP tool name is `mcp__plugin_<plugin>_<server>__<tool>`.
- A `CLAUDE.md` at the plugin root does not load. Put instructions in a skill.
- `claude plugin validate` checks a plugin folder.

MCP (`https://code.claude.com/docs/en/mcp`):

- Config in `.mcp.json`. Entry types: stdio (default), `http`, `sse`, `ws`. An entry with `url` and no `type` is an error.
- MCP tool names are `mcp__<server>__<tool>`. Permission rules and hook matchers use this name.
- Tool search is on by default. At start only tool names and server instructions load. The model fetches a definition when it needs one. The setting `ENABLE_TOOL_SEARCH=auto:N` loads all definitions up front while they use less than N percent of the context.
- Tool search needs a model that supports `tool_reference` blocks. Claude Code turns it off when the base URL is not a first-party host. A local model server does not get tool search from Claude Code.
- Claude Code cuts each tool description and each server instructions text at 2,048 characters.

Output styles (`https://code.claude.com/docs/en/output-styles`): a markdown file with frontmatter (`name`, `description`, `keep-coding-instructions`) and a body. The body changes the system prompt. A non-fork subagent does not use the output style.

### 2.6 Headless mode and Agent SDK

Source: `https://code.claude.com/docs/en/headless`.

- `claude -p "prompt"` runs once and exits. Exit code is zero on success.
- `--output-format text|json|stream-json`. `json` returns `result`, session id and metadata.
- `--json-schema '<schema>'` with `json` puts the checked output in `structured_output`.
- `stream-json` with `--verbose --include-partial-messages` gives one JSON object for each line. The last line is a `result` message.
- `parent_tool_use_id` on a message links it to a subagent run. Main-thread messages have `null`.
- `--allowedTools` approves tools. `--permission-mode` sets the mode. `--permission-prompts none` denies prompts.
- With `stream-json`, denials show as `permission_denied` system messages. The `result` message lists `permission_denials`.
- `--continue` and `--resume <id>` continue a session.
- The Agent SDK runs the same loop in code. It yields `SystemMessage`, `AssistantMessage`, `UserMessage`, `StreamEvent`, `ResultMessage`. It takes hooks as callbacks and a `canUseTool` callback.

### 2.7 Sessions and checkpoints

- Transcripts are JSONL files at `~/.claude/projects/<project>/<session-id>.jsonl`. `<project>` is the working folder path with non-alphanumeric characters replaced by `-` (`sessions`).
- The file holds every message, tool call and tool result (`claude-directory`).
- Resume reopens the same session id. Fork copies history to a new id.
- On resume, Claude Code marks a tool that was running when the process died as cut off. It does not run again (`sessions`).
- Claude Code writes secrets that a tool prints to the transcript in plain text (`claude-directory`).
- Checkpoints snapshot file contents before an edit. They do not cover remote systems.

### 2.8 JSONL transcript line shape (observed, not documented)

I read the key names of one local transcript. I did not read message text. The public docs do not promise this shape. It can change.

Line types seen: `user`, `assistant`, `attachment`, `file-history-snapshot`, `permission-mode`, `mode`, `last-prompt`, `bridge-session`.

```jsonc
// type: "user" (prompt)
{ "parentUuid": "...", "isSidechain": false, "promptId": "...", "type": "user",
  "message": { "role": "user", "content": "text" },
  "uuid": "...", "timestamp": "...", "permissionMode": "...",
  "cwd": "...", "sessionId": "...", "version": "...", "gitBranch": "..." }

// type: "assistant" (one content block for each line)
{ "parentUuid": "...", "isSidechain": false, "type": "assistant", "uuid": "...",
  "message": { "id": "msg_...", "role": "assistant", "model": "...",
               "content": [{ "type": "tool_use", "id": "toolu_...", "name": "Bash", "input": {} }],
               "stop_reason": "tool_use", "usage": { "input_tokens": 0, "output_tokens": 0 } } }

// type: "user" (tool result)
{ "parentUuid": "...", "type": "user",
  "message": { "role": "user", "content": [{ "type": "tool_result", "tool_use_id": "toolu_...", "content": "...", "is_error": false }] },
  "toolUseResult": { "stdout": "", "stderr": "", "interrupted": false },
  "sourceToolAssistantUUID": "..." }

// type: "attachment" (hook output)
{ "type": "attachment", "attachment": { "hookName": "...", "hookEvent": "...", "exitCode": 0, "durationMs": 0 } }
```

Useful ideas:

- Each line links to its parent with `parentUuid`. The file is a tree, so a fork or a rewind adds a branch.
- Hook runs are lines in the same log, with exit code and duration.
- The tool result line links back to the assistant line that asked for it.

## 3. What Cuvette takes

### 3.1 Mapping table

| Principle | Source | Our science use |
| --- | --- | --- |
| Hook before the tool runs, with `allow`, `deny`, `ask`, `defer` and `updatedInput` | Claude Code `PreToolUse` | The decision check. The hook reads the decision record. If the scientist owns a decision and no answer exists, it returns `deny` with the question text. If the record covers a missing argument, it returns `updatedInput` that fills it. If the model sets a different value, it logs a deviation |
| `deny > defer > ask > allow` when hooks disagree | Claude Code | A rule from a lab profile or a fixed decision can never be undone by a later hook |
| Deny rules beat allow rules at every level | Claude Code `permissions` | A fixed lab value (for example, mass tolerance) cannot be changed by a project file or by the model |
| Check inside the harness, not in the model | Both | Design rule one. The prompt only asks. The hook enforces |
| `defer` and resume | Claude Code | A question to the scientist can wait hours or days. The session saves state, exits, and resumes when the answer arrives |
| `additionalContext` on a tool result | Claude Code | The harness adds the manual route and the default warning to each tool result |
| `PostToolUse` hook | Both | The recorder. It writes the call, inputs, code hash and data hash to the log. It also runs the number check on results |
| `Stop` hook that can block | Claude Code | Before the final answer, run the claims check. Block the answer if a number has no source |
| Permission modes | Claude Code | Three ways to work. Watch: the agent runs each step. Follow: the scientist runs each step, the agent gives the step and reads state. Teach back: the scientist runs and the agent checks. Each way is a rule set that allows or denies the tools that act on the program |
| `plan` mode (read-only) | Both | Follow and teach back modes. Only read and state tools stay allowed |
| `dontAsk` and `--permission-prompts none` | Claude Code | The benchmark runner. No human, so every ask becomes a recorded denial or a default |
| Skills with description-first loading | Claude Code, OpenCode | Adapter standards and procedures. The model sees a one-line description. The body loads when the step needs it. Needed for a 32k context |
| Skill `allowed-tools` for one turn | Claude Code | A procedure approves its own tools for one step. The grant ends at the next message |
| Plugin folder with manifest | Claude Code | An adapter is a plugin folder. It holds the MCP server, skills, hooks, decision schema, review checks and known-answer tests. `plugin.json` gives name, version and tested program version |
| Plugin validation command | Claude Code | The adapter checker in design.md. It validates schema, map and tests before first use |
| Plugin subagent cannot set `hooks`, `mcpServers`, `permissionMode` | Claude Code | An adapter cannot give its own agent more rights than the harness grants. The harness owns the permission rules |
| Subagent with fresh context and a limited tool list | Both | The independent referee. It gets the log and the claims. It does not get the agent reasoning. Tools: read only. Model can differ |
| Subagent for onboarding | Both | The onboarding agent writes adapter files. It has write access to the adapter folder only |
| Client and server with SSE | OpenCode | Terminal now. The terminal is a client of the harness server. A graph window later uses the same events |
| `promptAsync` plus event stream | OpenCode | The client sends a prompt and follows events. It can disconnect and reconnect |
| `permission.asked` and `permission.replied` events, with a request id | OpenCode | The question queue. A phone or a terminal can answer the same request |
| `reject` with a message | OpenCode | A scientist answer such as "use group B" returns to the model as feedback |
| Durable events with a per-session sequence | OpenCode | The append-only record. Replay and the audit trail read the same log |
| Message part model with tool states `pending`, `running`, `completed`, `error` | OpenCode | The record node. A part keeps input, output, timing and a `compacted` mark |
| `time.compacted` pruning of old tool output | OpenCode | Context control for a 32k model. Old tables leave the context. The record keeps them |
| Prune only above a threshold and protect skill output | OpenCode | Same. Keep procedure text in context |
| Compaction with a hidden agent and a plugin hook for the prompt | OpenCode | The summary must keep decisions, open questions and node ids. The adapter adds this through the hook |
| Compaction keeps the recent tail within a token budget | OpenCode | Set the budget from the model context size |
| `CLAUDE.md` is read again each request | Claude Code | The decision record and lab profile go into each request as a short block, not into the chat history. They survive compaction |
| Deferred tool definitions (tool search) | Claude Code | The model sees tool names only. It asks for a schema when needed. We build this ourselves. Claude Code turns it off for local model servers |
| Tool output truncation with a file path | OpenCode | A large table goes to a file. The model gets a head and a path. Keeps 32k contexts small |
| `StructuredOutput` tool with required tool choice | OpenCode | The benchmark runner and the claims format |
| Headless `-p` with `stream-json`, `result`, `permission_denials`, exit codes | Claude Code | The benchmark runner. It runs a dataset with guidance on and off. It reads the result, denials and costs |
| `maxTurns` and `maxBudgetUsd` | Claude Code | Cost limits for sensitivity checks and for local models |
| Provider layer on AI SDK, models.dev catalog, OpenAI-compatible provider | OpenCode | Model choice belongs to the user. Local servers use the OpenAI-compatible path |
| Three-transport MCP client with timeouts | OpenCode | The adapter connection. Stdio for local adapters |
| Config in layers with a managed top | Both | The lab profile is the managed layer. User and session settings sit below it. A lower layer cannot remove a fixed decision |
| Doom-loop check (three identical calls) | OpenCode | Stop a model that repeats a failing tool call. Ask the scientist |
| Interrupt marks open tool parts as error with `interrupted: true` | OpenCode | The Stop button. The record shows the cut step |

### 3.2 Choices the survey supports

1. Use the Claude Code hook contract as our own: JSON in, JSON out, exit code two blocks. It lets us write hooks in any language and test them as plain programs.
2. Use Claude Code rule precedence: deny, then ask, then allow. OpenCode uses last match wins. That lets a later allow undo an earlier deny. Our fixed decisions need the first.
3. Run the check in the harness, before the tool. OpenCode puts the ask inside each tool. A new adapter tool would then need to call `ask` itself. A tool cannot skip a central check.
4. Take the OpenCode part model for the record. It stores the model input and the output of each call in one object with a state.
5. Take the OpenCode server shape: HTTP routes, one SSE stream, `promptAsync`, a permission reply route. Add a question reply route.
6. Build deferred tool loading and skill listing ourselves. Do not depend on a model feature that local servers lack.

### 3.3 What not to copy

| Part | Where | Why we leave it |
| --- | --- | --- |
| File edit and write tools, `apply_patch`, edit diffs | OpenCode `src/tool/edit.ts`, `apply_patch.ts`; Claude Code `Edit`, `Write` | The agent changes data in a science program, not source code. A scientist reads a table and a figure, not a diff. The agent writes only in the session folder |
| Git snapshots and `revert` of the work tree | OpenCode `src/snapshot/`; Claude Code checkpoints | Raw data is read-only. A result is a node in the record. Undo means mark a node out of date and run again. Git tracking of a data folder is slow and wrong for large images and spectra |
| Language server tools | OpenCode `src/lsp/`; Claude Code code intelligence plugins | No code to check |
| `bash` as the main tool with command-prefix patterns | OpenCode `arity.ts`; Claude Code `Bash(...)` rules | Adapter tools replace shell use. Free code runs in the sandbox and goes through the adapter API. Keep the shell tool for command-line adapters only, with checked arguments |
| Auto mode with a classifier | Claude Code | A second model that decides if an action is safe. Our rule is that the scientist owns decisions. Rules in code decide, not a model |
| `bypassPermissions` | Claude Code | A mode that skips checks breaks design rule one |
| Allow-always rules in memory | OpenCode `reply: always` | A decision approval must be logged and versioned. Do not hide it in process state |
| Todo tool, plan files, plan mode as a coding plan | Both | The decision record and the question queue do this job |
| Effect library for all services | OpenCode | A heavy base for a small team. Plain async code with typed events is enough |
| Transcript as the only record | Both | Design rule four needs hashes and a node graph. The chat log alone is not enough |
| Bare `AGENTS.md` and `CLAUDE.md` auto-load as the way to carry rules | Both | A rule in a text file is a request. The hook enforces |

## 4. Open items

- The `permission.ask` plugin hook in OpenCode can be a better pattern than `tool.execute.before` for decisions. I did not find its call site, so I cannot confirm it runs.
- I did not run either harness. Every claim about OpenCode comes from reading the source at commit `663fbd7`. Every claim about Claude Code comes from the docs pages named above.
- The default auto-compact threshold of Claude Code is not in the pages I read.
- `docs/design.md` proposes Python for the core. This survey assumes TypeScript on Node 24, as the task states. The two plans need one decision.
- The hook contract needs a rule for two hooks that return different `updatedInput` values. The Claude Code docs I read do not say which one wins.
