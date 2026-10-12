# Proposals of 11 October 2026: nine changes in three areas

Each change has a problem, a plan, a first step and a check that it works.
The list does not repeat the items in `docs/feature-survey-2026-10-09.md` or `docs/roadmap.md`.
The list also does not include the API key helper that Parker named. That change comes first and is separate.

What exists today, from the code:

- The first-start text gives one link for a Claude key (`src/core/firststart.ts:11`).
- `CUVETTE_BUDGET_USD` stops a session at a spend limit (`src/cli.ts:102`). No screen shows the estimate before a run.
- The Claude provider turns a rate limit and a server error into an error message. It does not wait and try again (`src/providers/claude.ts:24`).
- The review checks for p values and a correction (`src/core/review.ts:288`). No count of all tests in a session exists.

## 1. User experience and ease of use

### 1.1 Suggest the program from the files

**Problem.** The start page asks the scientist to pick a program. A new user often does not know the name. They know the files: `.czi`, `.fcs`, `.imzML`, `.csv`.

**Plan.**
1. When the scientist picks a folder or drops a file, read the file extensions and the first bytes of each file.
2. Match them to the file types in each adapter manifest.
3. Show the best match as a card: "These look like flow cytometry files. Use FlowKit?" with the other matches below it.
4. If no adapter matches, say so and offer the generic table route.

**First step.** Add a `file_types` field to the adapter manifest. Fill it for five adapters. Add one function that scores a folder.

**Check.** A test with a folder of each of the five file types. The right adapter must be first.

### 1.2 Cost estimate on the plan card, with a limit that the scientist sets

**Problem.** The scientist approves a plan without a price. The only spend limit is an environment variable. A scientist who does not use a terminal cannot set it.

**Plan.**
1. Estimate the cost from the plan: the number of steps, the size of the data summary and the model price in `src/core/spend.ts`.
2. Show a range on the plan card: "About $0.40 to $1.20 with Sonnet."
3. Add a spend limit to the Settings page and to `/settings`. Show the spend of the session in the status line.
4. At 80% of the limit, ask a question card: continue, switch to a cheaper model, or stop.

**First step.** Use the 159 runs of the 9 October benchmark. Fit cost against plan steps for each model. Test the estimate on the held-out papers.

**Check.** The actual cost must fall in the range for at least 90% of the held-out runs.

### 1.3 Wait, retry and resume after a network failure

**Problem.** Three benchmark runs stopped with "Cannot reach the Claude API". A scientist on a hospital or campus network sees the same stop in the middle of a long run. The provider does not retry. The scientist must start the turn again.

**Plan.**
1. Retry a rate limit, a server error and a network error three times, with a wait that grows each time. Show "Waiting to retry (2 of 3)" in the session.
2. After the last retry, save the state and show a card: "Resume", "Switch to the local model" or "Stop".
3. On resume, continue from the last finished step in the record. Do not repeat a finished step.

**First step.** Add retry with a wait to `src/providers/claude.ts`. Test it with the fake provider that fails twice.

**Check.** A test that cuts the network in the middle of a step and resumes with no repeated tool call in the record.

## 2. Scientific accuracy and helpfulness

### 2.1 Count every test in the session and correct the family

**Problem.** The scientist asks a question, then asks three follow-up questions. Each question runs a test. The final answer reports one p value as if it were the only test. The review finds a missing correction only for a table of many p values.

**Plan.**
1. Count each hypothesis test that a tool call runs. The record already holds each call and its p value.
2. Group the tests into a family. A new question on the same data joins the family of the first question.
3. Show a "Tests in this session" table: the test, the raw p value and the corrected p value.
4. If the answer reports a raw p value from a family of more than one test, the review adds a finding. The scientist chooses the correction, or says the extra tests were not part of the analysis.

**First step.** Read the p values from `ctx.record.numbers()` (`src/core/review.ts:292`). Count them. Add the table to the Results tab.

**Check.** A known-answer test: three tests on one data set, with the Holm-corrected values worked out by hand.

### 2.2 Effect size, confidence interval and power in every result

**Problem.** A p value alone does not tell a scientist if the effect matters. A small sample with a p value of 0.04 and an interval from 0.1 to 4 hours of sleep is a weak result. The answer must say so.

**Plan.**
1. For each test result, require the effect size and the 95% confidence interval in the answer. The claim check already ties each number to the record.
2. Compute the achieved power for the observed effect and the smallest effect that the sample can find at 80% power. The `pwr` adapter already does this.
3. If the sample is small, add a plain sentence to the answer: "With 10 patients, this test finds only a difference of 1.8 hours or more."
4. Show the sentence in the review as a note, not as an error.

**First step.** Add a review rule that checks for an effect size and an interval next to each p value. Test it on the Student (1908) sleep sample.

**Check.** Run the benchmark before and after. The score must not drop, and the answers must now hold intervals.

### 2.3 Reporting guideline checklist built from the record

**Problem.** Journals ask for a reporting guideline: ARRIVE (Animal Research: Reporting of In Vivo Experiments) for animal work, CONSORT (Consolidated Standards of Reporting Trials) for trials, STROBE (Strengthening the Reporting of Observational Studies in Epidemiology) for cohort studies and MIQE (Minimum Information for Publication of Quantitative Real-Time PCR Experiments) for qPCR. The scientist fills the checklist by hand at the end, from memory.

**Plan.**
1. Store each guideline as a list of items in the adapter catalog. Each item names the record field that answers it, such as the unit of replication, the exclusions, the randomization and the blinding.
2. After the last step, fill each item from the record and the decisions. Mark an item "Covered", "Not in the record" or "Not applicable".
3. Show the missing items as question cards: "The record has no randomization method. Add it?"
4. Export the checklist with the report and the `.eln` file.

**First step.** Write the ARRIVE 2.0 essential 10 items. Link each to a record field. Test on one animal-study paper from the benchmark.

**Check.** A scientist reads the filled checklist for one paper and marks each wrong or missing item. The count must be zero wrong.

## 3. New features that all harnesses should have

### 3.1 Freeze the plan, then list each deviation

**Problem.** A scientist who sees the data can change the method to fit the result. Preregistration solves this in a clinical trial. An agent harness has no equivalent. The confirmed plan exists, but nothing marks a later change.

**Plan.**
1. When the scientist approves the plan, write its hash and the time into the record. This is the freeze.
2. Any later change to a method, an exclusion or a test is a deviation. The harness writes each one with the reason that the scientist gives.
3. The report has a "Deviations from the plan" section. It is empty if there are none. That fact is also useful.
4. A deviation after the scientist saw a result has a mark: "Changed after the result was seen."

**First step.** Add a plan hash to the record at approval. Compare each later `/change` and exclusion to it.

**Check.** A test where a session changes the test after the first result. The report must show the deviation with the mark.

### 3.2 Known-answer self-test on this computer

**Problem.** A program can give a different number after an update of R, Python or a package. The package lock records the versions but does not show that the numbers are the same.

**Plan.**
1. Each adapter ships one small data set with the expected values from a published source.
2. `cuvette doctor` runs this test for each installed adapter and shows "Passes" or "Fails by 0.003 on the t statistic."
3. The first session with an adapter, and the first one after a version change, runs the test and writes the result to the record.
4. A failed test shows a warning card before the analysis starts.

**First step.** Use the benchmark papers that have a published value (276 items). Take one small item for each of ten adapters.

**Check.** Change a package version on purpose to one that gives a different number. The test must fail.

### 3.3 Check new data against the data that a method used before

**Problem.** A saved method runs on new data. The new data can have a different unit, a different range or a different column order. The method runs without an error and gives a wrong result.

**Plan.**
1. When a method is saved, store a summary of its input: column names, types, units, ranges and group sizes.
2. When the method runs on new data, compare the new summary with the stored one.
3. Show each difference as a card: "Column `weight` has a median of 24,000. Before, the median was 24. The unit may be grams, not kilograms."
4. The scientist confirms each difference or stops the run.

**First step.** Reuse the data check in `src/core/datacheck.ts`. Add a function that compares two checks.

**Check.** A test that runs a saved method on data with a unit change. The comparison must show the change before any tool runs.

## Order of work

1. API key helper (Parker's item).
2. 1.3 Retry and resume. It fixes a failure that already happened in the benchmark.
3. 2.1 Test count and 2.2 Effect size and power. They change the numbers that a scientist reads.
4. 3.1 Plan freeze. It is small and it adds a new kind of record.
5. 1.2 Cost estimate and 3.2 Self-test.
6. 1.1, 2.3 and 3.3 after launch.
