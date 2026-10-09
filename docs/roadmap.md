# Roadmap

This file lists planned work that is not built yet. Each item says what it is for and the first step.

## An approachable UI for scientists who do not use a terminal

**Problem.** The main interface is a terminal app. Many scientists do not work in a terminal. The graph window and the SMILE MSI panel help, but a session still starts in a terminal.

**Plan.** A browser app that is the whole session, not only a viewer.
- `ga app` starts a local server and opens the browser. Later, a desktop wrapper (Tauri) starts it with a double-click.
- Start page: pick a program, pick a folder or file, type the question. No commands to learn.
- One screen: the conversation on the left; the analysis graph, the current step's images and the decision cards on the right.
- Setup as a form, with the help text for each decision and the "agent decides" choices marked.
- Questions, approvals and Follow steps as cards with buttons, the same cards as in the terminal.
- Results as a clean report: answer, figures, settings used, manual route for each step, review findings. One click to export (HTML, PDF, `.eln`) or push to eLabFTW.
- Model and API key settings in a settings page, with the spend shown.
- The terminal UI and the browser app use the same session and the same event bus, so a session can move between them.

**Status (2026-10-08).** `ga app` is built: the conversation, the cards, the Analysis, Results, Decisions and Record tabs, Settings, Sessions with titles, the first-start setup page and the sample analysis. See "Browser app" in `docs/architecture.md`. Next: the desktop wrapper, a facelift for the Settings page, and a live view of one session from two processes (now the second view runs in the same process).

## A flow canvas: analyses as connected nodes, built from prompts

**Problem.** A long analysis is hard to see and to reuse as a list of steps. Automation tools such as n8n, Node-RED, KNIME and Galaxy show a workflow as boxes with connections, but each box must be built by hand, and none of them stops for a scientific decision in the middle.

**Plan.** A canvas in the app (and the desktop app) that shows an analysis as connected nodes.
- You describe a step in plain words. The agent turns it into a node: the program, the tool, the settings and the inputs, with the manual route. You can also describe a whole flow ("segment the cells, count red-positive cells per field, compare the groups") and the agent proposes the nodes and the connections.
- Human nodes are part of the flow: a question node (a decision card), a demonstration node (run on one sample and wait for approval), a review node (look at the QC images), and a hand-entry node (type in a value or a hand count). The flow stops at each one and continues after your answer.
- Each node shows its status (waiting, running, done, out of date), its key numbers and a thumbnail of its output. A click opens its record: the settings, who chose each one, the inputs with their hashes, and the outputs.
- Change a node's setting and only the nodes after it become out of date. Run them again from the canvas.
- Branch from any node to try another method, and compare the branches side by side.
- Save a flow as a method, share it as one file, and run it on new data with its human nodes still in place.

**What exists.** The session record is already a graph of steps with inputs, outputs and decisions. The graph window draws it. `/branch`, `/compare`, `/rerun`, saved methods, the pilot gate and `ga replay` give most of the run logic. The canvas adds editing and the human nodes as first-class parts of a flow.

**First step.** Turn the graph window into an editable canvas for one session: show human steps (questions, the demonstration) as nodes, let the scientist change a node's settings and rerun from there, and save the result as a method.

## Other planned items

- Training data export and a task generator from the known-answer tests, for a fine-tuned local model.
- A SMILE MSI paper benchmark on a public dataset (the Cardinal pig206 section or a public METASPACE imzML set).
- ImageJ versions of the Fiji Blobs and BBBC005 benchmark papers.
- A real eLabFTW test against your lab's server.
