# Cuvette adapter registry: template

This folder is the template for the registry repository `elparko/cuvette-adapters`. The
repository was made on 9 October 2026. It is private until the Cuvette repository becomes public.
If you change a file here, copy it to the registry repository too.
The layout and the index format are in `docs/adapter-registry.md` in the Cuvette repository.

## What the template holds

| File | Use |
| --- | --- |
| `.github/workflows/review.yml` | Runs on each pull request that changes `adapters/`. Runs the lint, runs the known-answer tests that need no window, and asks Claude for a review. |
| `.github/workflows/build-index.yml` | Runs after a merge to `main`. Builds and commits `index.json`. |
| `.github/review-prompt.md` | The review checklist for Claude. `cuvette adapter audit` uses the same file. |
| `.github/CODEOWNERS` | Makes a maintainer approve each change. |
| `.github/PULL_REQUEST_TEMPLATE.md` | The checklist for the author of an adapter. |

## Set up the registry repository

1. Create the repository `cuvette-adapters` on GitHub. Make it public.
2. Copy the contents of this folder to the root of the new repository.
3. Make the folder `adapters/` and add one folder for each adapter. The folder name must be the adapter name.
4. In `.github/workflows/review.yml` and `build-index.yml`, set `CUVETTE_REPO` and `CUVETTE_REF` to the Cuvette repository and to a release tag or a commit. Do not leave `main` in use after the first release.
5. Add the repository secret `ANTHROPIC_API_KEY`. The review job uses it. The checks job does not.
6. Create the labels `safe-to-review`, `claude-pass`, `claude-needs-changes` and `claude-reject`.
7. In Settings, Branches, add a rule for `main`:
   1. Require a pull request before merge.
   2. Require review from Code Owners.
   3. Require the status check `checks`.
   4. Do not allow force push.
8. In Settings, Actions, General, set "Fork pull request workflows" to "Require approval for all outside collaborators".
9. Commit an empty `index.json` with `{"registry": "", "generated": "", "adapters": []}`. The first merge to `main` replaces it.
10. Run `cuvette adapter list --registry` to test the address. The default address is `https://raw.githubusercontent.com/elparko/cuvette-adapters/main/index.json`. Set the setting `adapter_registry` to use another address.

Status on 9 October 2026: steps 1 (private), 2, 3, 6 and 9 are done. These steps are open:
- Step 1: make the repository public. Do this when the Cuvette repository becomes public.
  The workflows check out `elparko/cuvette`, and they fail while it is private.
- Step 4: `CUVETTE_REF` is `main`. Set it to the first release tag.
- Step 5: the owner adds the secret `ANTHROPIC_API_KEY`.
- Steps 7 and 8: GitHub allows them only for a public repository on the free plan.

## How a pull request is handled

1. An author opens a pull request that adds or changes `adapters/<name>/`.
2. The job `checks` runs without secrets. It runs `cuvette adapter check` on each changed adapter. It adds `--run-tests` only for an adapter that needs no external program.
3. The job `claude-review` runs for a maintainer, or after a maintainer adds the label `safe-to-review`. It reads the files as data and runs no code from the pull request. Claude has the tools Read, Glob, Grep and `gh pr comment`.
4. Claude posts one comment. The first line is `VERDICT: pass`, `VERDICT: needs-changes` or `VERDICT: reject`. Each reason names a file and a line.
5. The job sets the label `claude-<verdict>`. The job fails for `reject`.
6. A maintainer reads the code, reads the review, and decides. Claude does not merge anything.

## Limits

- The review is advice. Claude can make a mistake. A maintainer must read all shipped code.
- The job `checks` runs the known-answer tests of an adapter that needs no external program. That code comes from the pull request. The job has a read-only token and no secrets.
- The index records `trust: checked` only for an adapter that passes the lint and all tests that ran. Users see the label Checked for it. A Checked adapter is not a Reviewed adapter. The Reviewed label is only for the catalog in the Cuvette repository.
- Claude reads at most about 300 000 characters of an adapter. A large adapter needs a human to read the rest.
