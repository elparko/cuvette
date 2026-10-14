These folders hold sessions, session indexes and method files that older builds of Cuvette wrote.
The tests in tests/old-data.test.ts open them with the current code.

How the files were made:
1. A script checked out the source of one older commit.
2. The script ran a session with the mock provider and the lab adapter of tests/fixtures/lab.
3. The script copied only the record, the index, the method files and the data file.
4. The script replaced the temporary folder with @@ROOT@@ and the lab adapter folder with @@LAB@@.
The test replaces both marks with real paths when it copies a fixture.

The folders:
- v1-first-build: the first build. Sessions are in home/sessions/<id>/log.jsonl.
- v2-home-sessions: the same layout, with the results sheet.
- v3-project-folder: the session folder in the project, with .record/meta.json and the sessions index.
- v4-package-lock: adds the environment and the out-of-date entries.
- v5-rewind-branch-method: adds rewind, branch and method entries, and a saved method.
- v6-cuvette-rename: the build after the rename from guided-analysis to Cuvette.
- v7-agent-loop: the build before the second round of agent loop fixes.
- v5-open-question and v7-open-question: a session that the app closed while a question card was open.

Builds before v6 pass the old GA_ names to child programs. The lab adapter of the current repository reads the CUVETTE_ names. So the blur step fails in v1 to v5.
The data is made up. No file holds private data.
