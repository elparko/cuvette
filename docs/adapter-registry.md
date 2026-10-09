# Adapter registry and adapters from others

This page tells how to install an adapter that someone else wrote, what the trust labels mean, and how the registry repository is laid out.

## Install an adapter

```
cuvette adapter add <name | git address | folder | .zip> [--run-tests]
cuvette adapter update [name]
cuvette adapter remove <name>
cuvette adapter list --installed
cuvette adapter list --registry
cuvette adapter audit <folder | name>
cuvette adapter allow-code <name>
```

The Programs page of the app has the same functions. The button "Add an adapter" takes a git address, a folder, a zip file or a registry name. In the terminal, press `a` in the `/programs` panel.

Cuvette installs an adapter in the user adapter folder (`adapters/` in the Cuvette home folder). The search order does not change: project, user, catalog. An installed adapter with the name of a catalog adapter takes its place. The card says so.

| Source | Pinned to | Trust label |
| --- | --- | --- |
| Git address | The commit that the clone gives. Add `#ref` to choose a branch, a tag or a commit. Add `#ref:folder` for one adapter in a repository that holds several. | Unlisted |
| Local folder | The files at the time of the install. | Unlisted |
| Zip file | The files at the time of the install. | Unlisted |
| Registry name | A version. Add `@version` to choose one. | Checked |

Cuvette writes the source, the version, the commit and a SHA-256 of the installed files in `installed-adapters.json` in the Cuvette home folder. The SHA-256 covers the path and the content of every file. `cuvette adapter list --installed` marks an adapter whose files changed after the install.

Cuvette does not install a symbolic link. The staging folder is on the T7 drive in `tools/adapter-staging` if that drive is present. Otherwise it is in the Cuvette home folder.

## The check and the card

Before each install or update, Cuvette runs `cuvette adapter check --static`. This check imports no code and starts no program. Then it shows a card and asks `[y/N]`. Bypass permissions does not skip the question.

The card shows:

1. The adapter name, the version and the source.
2. The trust label and, for Unlisted, a warning.
3. The program that the adapter needs on this computer.
4. The commands that Cuvette starts.
5. The code that the adapter ships (Python, R, macros, `adapter.ts`, `server.ts`, scripts) and that runs on this computer.
6. The tools that run code that the agent writes.
7. Network use: yes if the manifest allows it, possible if the code mentions network calls.
8. The decisions that the adapter adds.
9. The license, from the `LICENSE` file.
10. The citations.
11. The check result: errors and warnings. Cuvette does not install an adapter that has an error.
12. The known-answer tests. They do not run unless you add `--run-tests`. They do not run for an adapter that ships code.

An update also shows the files added, removed and changed, the new tools and the new permissions (network, code, commands, programs and decisions).

## Trust labels

| Label | Meaning | Where it shows |
| --- | --- | --- |
| Reviewed | The adapter is in the built-in catalog. The owner read every file. | `cuvette adapters`, the Programs page, `list_adapters`, the program choice, the record |
| Checked | The adapter came from the registry. The registry index says that it passed the lint and the tests. A person approved it. | The same places |
| Unlisted | A git address, a local folder or a zip file. Nobody reviewed or checked it. The label comes with a warning. | The same places |

An installed adapter loses the label Checked if its files change after the install.

An Unlisted adapter that ships code needs one more confirmation the first time it runs. A session asks the question "Run the code of NAME?". In a run without a window, use `cuvette adapter allow-code NAME`, or the action "Allow its code to run" on the Programs page. The confirmation ends when the files change.

## The Claude review

`cuvette adapter audit <folder | name>` runs the check and asks Claude to review the code and the text. The command asks first, because the review sends the files to the Anthropic API and costs tokens. It shows the estimate before and the cost after. `cuvette adapter add` offers the same review for an Unlisted source. The verdict (`pass`, `needs-changes` or `reject`) and the reasons show on the card before the install.

The review is advice. It does not replace reading the code.

The review prompt is `registry-template/.github/review-prompt.md`. The command and the registry workflow use the same file.

## Registry layout

The registry is a git repository. The default address of its index is `https://raw.githubusercontent.com/elparko/cuvette-adapters/main/index.json`. The setting `adapter_registry` changes it. It can be a web address, a `file://` address or a file path. If the address is not reachable, Cuvette says so in one line.

```
cuvette-adapters/
  adapters/<name>/        one folder for each adapter
    adapter.yaml
    STANDARDS.md
    LICENSE
    skills/  data/  ...
  index.json              built by scripts/build-registry-index.mjs
  .github/
    CODEOWNERS
    PULL_REQUEST_TEMPLATE.md
    review-prompt.md
    workflows/review.yml
    workflows/build-index.yml
```

`index.json` holds `registry`, `generated` and `adapters`. Each entry has these fields:

| Field | Meaning |
| --- | --- |
| `name`, `version`, `description` | From `adapter.yaml`. |
| `program`, `field`, `file_types`, `author` | From `adapter.yaml`. |
| `license` | The license that the `LICENSE` file names. |
| `trust` | `checked`. The builder leaves out an adapter that fails. |
| `lint` | `ok`, `errors`, `warnings`. |
| `tests` | `ran`, `passed`, `failed`. |
| `needs` | `network`, `code` (true if the adapter ships code) and `programs`. |
| `citations` | The text of each citation. |
| `path`, `git`, `commit` | Where `cuvette adapter add` gets the files. |
| `sha256` | The SHA-256 of the folder. Cuvette compares it with the downloaded files and stops on a difference. |

Build the index:

```
node scripts/build-registry-index.mjs adapters --out index.json --repo-root . --git <repository address> --commit <sha> [--run-tests]
```

`registry-template/` holds the workflows, CODEOWNERS, the pull request template and a README for the setup of the registry repository.

## Review of a pull request

A pull request that adds or changes `adapters/<name>/` starts two jobs.

1. `checks` runs without secrets. It runs the lint. It runs the known-answer tests that need no window and no external program.
2. `claude-review` runs for a maintainer, or after a maintainer adds the label `safe-to-review`. It reads the files as data and runs no code. Claude checks the adapter against the checklist and reads all shipped code for unsafe behavior. It checks the licenses and the citations, and it posts a comment with the verdict.

A maintainer still approves the merge.
