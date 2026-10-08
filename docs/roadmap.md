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

**First step.** Extend the graph window (`src/server/window.ts`) with a chat box and the setup form, then add `ga app`.

## Other planned items

- Training data export and a task generator from the known-answer tests, for a fine-tuned local model.
- A SMILE MSI paper benchmark on a public dataset (the Cardinal pig206 section or a public METASPACE imzML set).
- ImageJ versions of the Fiji Blobs and BBBC005 benchmark papers.
- A real eLabFTW test against your lab's server.
