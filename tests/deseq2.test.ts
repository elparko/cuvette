import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { detectInput } from "../catalog/deseq2/adapter.ts";
import { Session } from "../src/core/session.ts";
import { FakeProvider } from "../src/providers/fake.ts";

const ADAPTER = join(__dirname, "../catalog/deseq2");
const TX = join(ADAPTER, "data/tx");
let session: Session | undefined;

beforeEach(() => {
  process.env.CUVETTE_HOME = mkdtempSync(join(tmpdir(), "cuvette-deseq2-"));
});
afterEach(async () => {
  await session?.close();
  session = undefined;
});

test.each([
  [{ counts: join(TX, "salmon") }, "transcript quantification", /Salmon quant\.sf/],
  [{ counts: join(TX, "kallisto") }, "transcript quantification", /kallisto/],
  [{ counts: join(TX, "rsem") }, "transcript quantification", /RSEM/],
  [{ counts: join(TX, "htseq") }, "count matrix", /HTSeq/],
  [{ counts: join(TX, "featurecounts.txt") }, "count matrix", /whole-number/],
  [{ counts: join(TX, "gene_counts_rounded.csv") }, "count matrix", /whole-number/],
  [{ counts: join(TX, "gene_counts.csv") }, "counts and lengths", /decimals/],
  [{ counts: join(TX, "gene_counts.csv"), lengths: join(TX, "gene_length.csv") }, "counts and lengths", /length table/],
  [{ counts: join(ADAPTER, "data/gse_subset.rds") }, "SummarizedExperiment rds", /\.rds/],
])("detects the input type of %o", (args, value, reason) => {
  const hit = detectInput(args);
  expect(hit?.value).toBe(value);
  expect(hit?.reason).toMatch(reason);
});

test("a missing path gives no suggestion", () => {
  expect(detectInput({ counts: join(TX, "nothing.csv") })).toBeUndefined();
  expect(detectInput({})).toBeUndefined();
});

test("the input type card shows the type that the harness detects from the files", async () => {
  const provider = new FakeProvider([
    { calls: [{ name: "run_deseq", args: { counts: join(TX, "salmon"), coldata: join(TX, "coldata.csv"), tx2gene: join(TX, "tx2gene.csv"), input_type: "count matrix" } }] },
    { text: "Stopped at the question." },
  ]);
  session = await Session.create({ adapters: [ADAPTER], provider, cwd: mkdtempSync(join(tmpdir(), "cuvette-proj-")), settings: { askWaits: false, autoResume: false } });
  session.decisions.applySetup({ question: "Which genes change?", min_samples: 3, alpha: 0.1, min_count: 10, lfc_threshold: 0 });
  await session.send("Run DESeq2 on the Salmon files");
  const q = session.questions.open().find((x) => x.decisionKey === "input_type");
  expect(q?.recommendation?.value).toBe("transcript quantification");
  expect(q?.recommendation?.reason).toMatch(/detected it from the files/);
  expect(q?.evidence).toMatch(/Detected from the files: transcript quantification\. The folder has 6 Salmon quant\.sf files\./);
});
