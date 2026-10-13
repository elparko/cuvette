# Plan 01: the harness core, with SMILE MSI as the first adapter

Status: not started (2026-10-07).

## Goal

Run the SMILE MSI demo-slide analysis through this harness.
Use the same tool calls and the same numbers as the stage 1 chat in `smile_msi/agent/`. The harness must contain no MSI logic.

## Starting point

The stage 1 chat in elparko/SMILE-MSI, `smile_msi/agent/` (about 3,400 lines):

| Module | Domain-free? | Plan |
| --- | --- | --- |
| `core.py` (loop, interrupts) | Yes, except the system prompt and in-process tool calls | Port; move the standards text to the adapter |
| `providers.py` (Claude, OpenAI-compatible) | Yes | Port as is |
| `log.py` (append-only log, Markdown export) | Yes | Port |
| `custom.py` (approved user tools, flows) | Mostly; runs code through `smile_msi.scripting` | Port; the code runner becomes an adapter call |
| `tools.py` (schemas, result rendering) | Mostly; reads `mcpserver.TOOLS` in-process | Port; tools come from the MCP client |
| `server.py`, `static/chat.html` (web chat) | Yes | Port in phase 5 |
| `setup.py` (decisions, enforcement) | No: `TOOL_ARGS` and profiles are MSI-specific | Split: generic enforcement here, the schema in the adapter |
| `review.py` (rule checks, referee) | No: the rules are MSI-specific | Split: generic runner here, the rules in the adapter |
| `mcp_bridge.py` | Yes | Port with `custom.py` |

## Main change: tools over MCP, not in-process

Stage 1 calls `smile_msi.mcpserver` functions in the same process. The harness starts the
adapter as a separate process (`python -m smile_msi.mcpserver`, stdio) and calls its tools over
MCP. Three things change because of this:

- **Images.** Tool results point to PNG paths on disk. The harness must read them from the
  adapter's output folder, or the adapter must return them as MCP image content.
- **Interrupts.** Stage 1 stops a running tool with a thread interrupt. Over MCP, the harness
  must send a cancellation, and stop the adapter process if the tool does not stop.
- **Free code.** `run_script` runs inside the adapter process, so the approval gate must be in
  the harness, before the call.

## Phases

1. **Harness core.** Port the loop, the providers, the log and the result rendering. Add an MCP
   client that starts an adapter process, lists its tools and calls them. Test it with a small
   fake adapter in `tests/`.
2. **Adapter manifest, version 0.** A TOML file plus a Python package. It has these fields:
   program name and version, launch command, standards text.
   Decision schema (fields, defaults, owner, links to tool arguments).
   Review checks (Python entry points). The tool-to-UI map.
   Validate it with Pydantic.
3. **SMILE MSI adapter.** Build the manifest from the stage 1 parts:
    - standards text from `core.SYSTEM_PROMPT`;
    - decision schema from `setup.STUDY_FIELDS`, `setup.TOOL_ARGS` and the Analysis Profiles;
    - review checks from `review.py`;
    - the tool-to-UI map from `registry.StepDef`. `StepDef` has no menu path yet, so add one.
4. **Decision enforcement.** Generic fill, deviation log and change log, driven only by the
   manifest.
5. **Web chat.** Port `server.py` and `chat.html`. The setup card reads the decision schema
   from the adapter.
6. **Parity check.** Run the same scripted session on the demo slide in stage 1 and in the
   harness. Compare the tool calls, the arguments after enforcement, and the numbers.

## Open decisions

- **Where the SMILE MSI adapter lives.** Recommendation: in the SMILE MSI repo, because it
  reads SMILE MSI's own definitions (`StepDef`, profiles). The harness finds it through a Python
  entry point group, `guided_analysis.adapters`.
- **What happens to stage 1 after parity.** Option A: `smile_msi/agent/` stays as it is.
  Option B: SMILE MSI depends on this package and deletes its copy.
