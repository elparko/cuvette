# Release checklist: Cuvette 0.1.1

Status on 15 October 2026. Mark each box when done. Parker approves steps 7 to 10.

Facts at the start:

- The public `main` is at `d0f706b` and has the code of `3718053b`. The version in the changelog is 0.1.1.
- The npm package `@elparko/cuvette` is at 0.1.0. GitHub has one release, `v0.1.0`, with one file: `Cuvette-0.1.0-arm64.dmg`.
- The fixes of rounds 5 to 7 are on branch `round5-fixes` in the old checkout. They are not public.

## A. Code is ready

1. [ ] All round 7 fix branches are merged. `main` of the old checkout holds them.
2. [ ] Round 8 reads only the round 7 diff. It finds no must-fix item. A must-fix item is data loss, a wrong number, a security hole or a crash.
3. [ ] `npx tsc --noEmit` shows no errors in `src/` or `tests/`.
4. [ ] `npm run lint:text` shows 0 issues.
5. [ ] `npx vitest run` passes with 0 failed tests. Run it on a quiet machine, with no other test job.
6. [ ] The fixes are ported to the public `cuvette` repo. Use the same filter steps as the 12 October port. Push first to a check branch. Wait for the `tests` workflow on Linux. Then push `main`.

## B. Public files are clean

7. [ ] Search the public repo for private repository names and private paths. Parker reads each match.
8. [ ] The changelog has a 0.1.1 section with the real list of changes. It names the known issues: no Windows sandbox for `run_script`, the Linux sandbox cannot block a new file in the project root by pattern, and the wrappers that are not in the permission table.
9. [ ] No secrets, no lab data, no private paths in the new commits. Run `git diff v0.1.0..HEAD --stat` and read the file names.
10. [ ] The version in `package.json` and `desktop/package.json` is 0.1.1.

## C. Build

11. [ ] `npm pack --dry-run` shows the expected size. Before the data change it is 19.8 MB packed and 45.5 MB unpacked.
12. [ ] Install the packed file in a clean place: `npm i -g ./elparko-cuvette-0.1.1.tgz`. Run `cuvette doctor`, then `cuvette` and a sample analysis with a local model.
13. [ ] Build the app: `npm run desktop:build` from the checkout. Do not merge into `main` while it runs.
14. [ ] Open the built `Cuvette.app` on a Mac with no Node installed. Check: the app starts, the setup page shows, "Leave setup" works, a sample analysis runs, and quit with Ctrl+C or the window closes the session.
15. [ ] The `.dmg` is signed. Check that macOS opens it with no warning about an unknown developer. If the app is not notarized, say so in the release text.

## D. Publish (Parker approves each step)

16. [ ] Tag `v0.1.1` on the public `main`.
17. [ ] `npm publish` for `@elparko/cuvette`. Check: `npm view @elparko/cuvette version` shows 0.1.1.
18. [ ] Create the GitHub release `v0.1.1` with the changelog text and `Cuvette-0.1.1-arm64.dmg`.
19. [ ] Check the install on a clean machine, with only the steps on the website: `npm i -g @elparko/cuvette`, and `https://cuvette.ai/install.sh`.
20. [ ] Update the download link and the version number on cuvette.ai.

## E. After the release

21. [ ] Watch the GitHub issues and the `tests` workflow for one day.
22. [ ] Put the should-fix and note items of rounds 7 and 8 in a backlog file for 0.1.2.
23. [ ] Start the known-answer test for each adapter (62 adapters, about 10 reviewed).
24. [ ] Keep adapter sample data out of the package (task `pkgdata`). It is a separate change for 0.1.2, not for 0.1.1.

## If something fails

- A test fails only under load: run that file alone on a quiet machine before you change code.
- The `.dmg` build fails: do not publish npm alone. Publish both or neither, so the versions match.
- A must-fix item appears after the tag: publish 0.1.2. Do not move the tag.
