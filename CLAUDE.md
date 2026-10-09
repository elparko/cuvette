# Text rules for this repository

All text in this repository uses ASD-STE100 Simplified Technical English (STE).
This includes the README, docs, code comments, commit messages, UI strings, prompts,
adapter descriptions, decision help, STANDARDS.md and skills.
Code identifiers are exempt. Dated records (docs/handoff-*, docs/status-*, docs/release-*,
files with a date in the name) stay as they were written.

## Sentences

- Write one instruction in each sentence. An instruction has 20 words or fewer.
- A description has 25 words or fewer.
- Write one topic in each paragraph, with six sentences or fewer.
- Use a numbered list for a procedure with more than one step.
- Put a safety or data-loss warning on its own line, before the step.

## Grammar

- Use the active voice: "The script deletes the file", not "The file is deleted".
- Use the imperative for an instruction: "Run the tests."
- Use the present tense for a description.
- Use "must" for a requirement. Do not use "should", "shall", "may" or "might".
- Use "can" for an ability and "if" for a condition.
- Use "that" to start a relative clause.
- Expand each acronym the first time you use it.

## Words

- Use one word for one thing. Do not change it for variety.
- Use the approved word: use (not utilize), start (not initiate), stop (not terminate),
  do (not perform), make sure (not ensure), show (not display or indicate),
  remove (not eliminate), about (not approximately), before (not prior to),
  after (not subsequent to), if (not in the event of), to (not in order to).
- Do not write "e.g.", "i.e.", "etc.", "and/or", "as well as" or "in terms of".
- No marketing filler: leverage, seamless, robust, holistic, powerful, comprehensive,
  cutting-edge, production-ready, first-class, best-in-class, ecosystem, unlock.
- No invented codenames. Name a thing by what it does.
- Keep technical terms as they are: troponin, mutex, HTTP 401, ppm.

## Check

- Run `npm run lint:text` for the README, docs and UI strings.
  Add `-- --verbose` to see each issue.
- `ga adapter check <name>` shows `[text-style]` warnings for adapter text.
- The rules are in `src/core/ste.ts`. The checker cannot see a missing article.
