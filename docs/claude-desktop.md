# Use Cuvette in Claude Desktop

The command `cuvette mcp` runs the harness as a Model Context Protocol (MCP) server on stdio.
Claude Desktop starts it and calls the tools of the adapter.
The harness keeps the decision record, the question queue, and the audit trail.

## Prerequisites

- Node 22 or later. Claude Desktop must find the `node` command.
- The packages: run `npm install` in the repository folder, for example `/path/to/cuvette`.
- The program of the adapter. For `imagej`, ImageJ or Fiji must be on this computer.

## Set up

1. Open the Claude Desktop settings. Open Developer, then Edit Config.
2. Open the file `claude_desktop_config.json`. On macOS the path is
   `~/Library/Application Support/Claude/claude_desktop_config.json`.
3. Add this entry:

```json
{
  "mcpServers": {
    "cuvette": {
      "command": "node",
      "args": ["/path/to/cuvette/bin/cuvette.js", "mcp", "--adapter", "imagej"]
    }
  }
}
```

4. Save the file.
5. Quit Claude Desktop fully. Start it again.
6. Open a new chat. The tools of `cuvette` appear in the tools menu.

To use more than one adapter, repeat the option: `"--adapter", "imagej", "--adapter", "smile-msi"`.
To use an adapter from a folder, give the folder path.
With no `--adapter`, the server has `list_adapters` and `use_adapter`. The first `use_adapter`
call returns BLOCKED and opens a question about the program. Answer it with `cuvette_answer` after
the scientist chooses, then call `use_adapter` again. The server then adds the adapter tools to
the tool list and sends a tool list change notice.

## Tools

| Tool | Use |
| --- | --- |
| Adapter tools, for example `open_image` and `threshold_and_count` | Run a step in the program. |
| `cuvette_setup` | Show the decision fields. Lock the setup with values. |
| `cuvette_questions` | List the open questions for the scientist. |
| `cuvette_answer` | Record the answer of the scientist to a question. |
| `cuvette_trail` | Show the audit trail. Level 1 is one line for each step. |
| `cuvette_export` | Write the trail, the protocol, a script, a notebook, a flow, an electronic lab notebook (ELN) file or an xlsx file. Returns the file path. |
| `cuvette_eln_push` | Refuses to send data to eLabFTW. The scientist runs `cuvette eln push <session>` and approves the data. |

The server also exposes `calculate` and `read_file`. Without `--adapter`, it also exposes `list_adapters` and `use_adapter`.

## Use

1. Tell Claude the question of the analysis and the values for the setup.
2. Claude calls `cuvette_setup` with those values.
3. Claude calls the adapter tools.
4. If a step needs a decision that belongs to the scientist, the tool returns `BLOCKED`.
   The harness adds a question to the queue.
5. Claude asks you the question in the chat. You answer.
6. Claude calls `cuvette_answer` with your answer. Claude must not choose the answer.
7. Claude calls the tool again. The step runs.
8. Ask Claude for `cuvette_trail` to see each step. Ask for `cuvette_export` with the format `protocol` to get a file.

## Limits

- The MCP client cannot approve a permission request. The harness denies it. Run that step in the `cuvette` terminal.
- Follow mode is not available. The harness skips manual instructions.
- The server writes only protocol messages to stdout. Errors go to stderr.
- Each session has a folder `cuvette/<date>-<title>/` in the project folder. The record is in `.record/log.jsonl`.
- If the project folder is not writable, the session folder is in `~/.cuvette/projects/`.
  Add `"env": {"CUVETTE_HOME": "<folder>"}` to the entry to change `~/.cuvette`.

## Problems

- The tools do not appear: check that the path in `args` is correct and that `node` runs from a terminal.
- Run this command in a terminal to see startup errors:
  `node /path/to/cuvette/bin/cuvette.js mcp --adapter imagej`.
  The command waits for input. Press Control-C to stop it.
- Claude Desktop writes a log for each server in `~/Library/Logs/Claude/mcp-server-cuvette.log`.
