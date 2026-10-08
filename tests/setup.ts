import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.GA_SPEND_FILE = join(mkdtempSync(join(tmpdir(), "ga-spend-")), "spend.jsonl");
