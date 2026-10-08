# guided-analysis

An AI agent that analyzes data in existing science software, while the scientist owns the
method decisions and can repeat each step by hand.

**Status:** design stage. No harness code yet.

## Idea in short

- The **harness** runs the model-and-tool loop. It enforces the scientist's decisions at the
  tool layer, logs every step, and asks the scientist at each decision they own.
- An **adapter** connects one program to the harness. It holds the program's tools, the map
  from each tool to its manual route in the program's UI, the decisions, the domain standards,
  the review checks and the known-answer tests.
- The harness knows no domain. All domain knowledge is in the adapters.

## First use: SMILE MSI

SMILE MSI (MALDI mass-spectrometry imaging) is adapter number one. Its chat in
`smile_msi/agent/` is the stage 1 proof of concept. The general parts of that chat move here,
and SMILE MSI connects to the harness through its existing MCP server.

## Documents

- [docs/design.md](docs/design.md): the full design, with all intended features and the
  proposed software stack.
- [docs/plan-01-smile-msi-first-adapter.md](docs/plan-01-smile-msi-first-adapter.md): the first
  build plan.

## Development

```bash
uv venv && uv pip install -e '.[dev]'
.venv/bin/python -m pytest
```
