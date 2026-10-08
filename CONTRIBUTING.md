# Contributing to Cuvette

Cuvette is a terminal agent that runs science programs through adapters. An adapter is a folder
that tells Cuvette how to run one program. This file tells you how to report a problem, change
the core, and build an adapter.

The rename from guided-analysis to Cuvette is in progress. Until it is done, use `ga` for `cuvette`, `~/.guided-analysis` for `~/.cuvette`, and `.ga/adapters` for `.cuvette/adapters`.

## Contents

- [Licenses and the CLA](#licenses-and-the-cla)
- [Two trust levels for adapters](#two-trust-levels-for-adapters)
- [Report a problem](#report-a-problem)
- [Propose a change to the core](#propose-a-change-to-the-core)
- [Build an adapter](#build-an-adapter)
- [Use an adapter privately](#use-an-adapter-privately)
- [Submit an adapter to the catalog](#submit-an-adapter-to-the-catalog)

## Licenses and the CLA

- **Core.** The core is under the GNU Affero General Public License, version 3 only
  (AGPL-3.0-only). See [LICENSE](LICENSE). The core is everything in this repository outside an
  adapter folder that names its own license.
- **Contributor License Agreement (CLA).** You must accept [CLA.md](CLA.md) before the project
  can merge your first pull request. The CLA lets the owner license the core under other terms
  later. A bot asks you to accept it on your pull request. Accept it once. It covers all your
  later pull requests.
- **Adapters.** You can choose any license that the Open Source Initiative (OSI) approves for
  your own adapter folder. Put the license text in a `LICENSE` file in the adapter folder.
  Name the license in the pull request.
- **Default for the catalog.** An adapter in `catalog/` that names no license is under
  AGPL-3.0-only.
- **Planned `license` field.** A `license` field in `adapter.yaml` is planned. Do not add it
  yet. The current schema is strict, and the checker rejects an unknown field.

## Two trust levels for adapters

| Level | Where it is | Who checks it |
| --- | --- | --- |
| Reviewed | `catalog/` in this repository | The owner reads every file before the merge. |
| Community | Your user folder or your project folder | Nobody. You install it, and you check it. |

Every adapter runs programs on your computer with your user permissions. Some adapters also
contain their own code: `adapter.ts`, `server.ts`, a Python module, or a script. Cuvette runs
that code on your computer.

Rules:

1. The owner must review all code in an adapter before it enters `catalog/`.
2. Read all code in a community adapter before you use it.
3. Do not use a community adapter from a person that you do not trust.

## Report a problem

Do not report a security problem in a public issue. See [SECURITY.md](SECURITY.md).

1. Search the open issues. If the problem is already there, add your facts to that issue.
2. Open a new issue with the "Bug report" template.
3. Give the Cuvette version or the commit, your operating system, and your Node.js version.
4. Give the adapter name and the version of the program that it runs.
5. Give the steps that cause the problem, the result you expected, and the result you got.
6. Add the part of the session log that shows the problem. The log is
   `~/.cuvette/sessions/<id>/log.jsonl`.

The session log can contain your data, file paths and results. Remove private data before you
paste it.

To ask a question, use GitHub Discussions, not an issue. To ask for a new adapter, use the
"Adapter request" issue template.

## Propose a change to the core

For a large change, open an issue first. Describe the problem and your plan. Wait for an answer
from the owner before you write the code.

1. Fork the repository and make a branch.
2. Install Node.js 22 or later.
3. Run `npm ci`.
4. Make the change. Follow the rules in
   [docs/architecture.md](docs/architecture.md#rules-for-every-module).
5. Add or change tests in `tests/<module>.test.ts`. A test must not need the network, an API
   key, Java or Ollama, unless it checks `GA_LIVE`.
6. Run `npx tsc --noEmit`. It must show no errors.
7. Run `npx vitest run`. All tests must pass.
8. Open a pull request. Fill in the template.
9. Accept the CLA when the bot asks.

Write all text in docs, comments and the user interface in Simplified Technical English. Use
short sentences and the active voice. Do not use marketing words or invented codenames.

## Build an adapter

[docs/adapter-spec.md](docs/adapter-spec.md) is the full specification. The schema in
`src/adapters/manifest.ts` is the source of truth. The examples in `examples/adapters/` show
three small adapters.

An adapter folder looks like this:

```
my-program/
  adapter.yaml     required. Tools, decisions, the tool-to-UI map, checks, tests.
  STANDARDS.md     how results in the field must be reported.
  skills/*.md      procedures for the model.
  data/            small public test data.
  adapter.ts       optional code: checks, hooks, extra tools.
  server.ts        optional code: an MCP server or a worker.
  LICENSE          optional. Your license. If absent, see "Licenses and the CLA".
```

### Steps

1. Install the program on your computer.
2. Start the onboarding agent:

   ```bash
   cuvette onboard <program> --model claude
   ```

   Add `--docs <url>` for each documentation page. Add `--kind cli` (or another connection
   kind) if you know it.
3. Answer the agent at each step. The agent follows
   [docs/onboarding-guide.md](docs/onboarding-guide.md). It writes the draft adapter in
   `~/.cuvette/drafts/<name>/`.
4. Read each file that the agent wrote. Correct each error. The decisions, the defaults and the
   fidelity levels are your responsibility.
5. Run the checker on the draft folder:

   ```bash
   cuvette adapter check ~/.cuvette/drafts/<name> --run-tests
   ```

6. Correct each error. Correct each warning, or write down why you keep it.
7. Run the checker again until it prints "The adapter passes."

You can also write the adapter by hand from the spec. Run the same checker on it.

### Rules for a good adapter

- Give each tool one job. Name it `verb_noun`.
- Make a decision for each choice that can change a conclusion. Set `owner: human`.
- Take each default from the program's documentation. Do not invent a default.
- Write one map entry for each tool. Mark an entry `exact` only if a test shows the same numbers
  by both routes.
- Add at least one known-answer test. The expected number must come from a published source,
  such as the program's tutorial or its test suite. A number from your own run proves only that
  the tool is stable. If you use one, say so in the test `description`.
- Use public test data. Keep each file under 1 MB when you can. The data license must let other
  people copy the file.
- Do not put a secret in `adapter.yaml`. Use `{env:NAME}`.
- Leave `status: draft`. Do not fill in `approved_by` or `approved_on` yourself.

## Use an adapter privately

You do not have to submit an adapter. You do not need the CLA to use an adapter yourself.

Cuvette looks for adapters in three places, in this order:

| Order | Folder | Use |
| --- | --- | --- |
| 1 | `<project>/.cuvette/adapters/<name>/` | One project. |
| 2 | `~/.cuvette/adapters/<name>/` | All your projects. |
| 3 | `catalog/<name>/` | The reviewed adapters in Cuvette. |

The first folder with that name wins. A private adapter with the same name as a catalog adapter
replaces the catalog adapter.

1. Copy the adapter folder into one of the first two folders. The folder name must be the
   adapter name.
2. Run `cuvette adapters`. Make sure that the list shows your adapter and its folder.
3. Run `cuvette adapter check <name> --run-tests`.
4. Run `cuvette adapter approve <name> --by "<your name>"` after you read every file.
5. Start a session with `cuvette --adapter <name>`.

## Submit an adapter to the catalog

1. Fork the repository and make a branch.
2. Copy your adapter folder to `catalog/<name>/`. The folder name must be the adapter name.
3. Run `npm ci`.
4. Run `cuvette adapter check catalog/<name> --run-tests`. It must print "The adapter passes."
5. Open a pull request. Choose the adapter template: add `?template=adapter.md` to the address
   of the new pull request page.
6. Fill in every item of the checklist.
7. Paste the full output of the checker from step 4 into the pull request.
8. Accept the CLA when the bot asks.

The pull request checks run `cuvette adapter check` on each changed adapter folder. The runner
has no science programs. It runs the known-answer tests only for an adapter that needs no
external program. For all other adapters, it checks the manifest only. Your checker output from
step 7 shows that the tests pass.

The owner reads every file in the pull request. If the adapter contains code, the owner reads
all of it before the merge. The owner can ask for changes.

A catalog adapter keeps `status: draft` after the merge. Each user approves it on their own
computer with `cuvette adapter approve <name>` after they read it.
