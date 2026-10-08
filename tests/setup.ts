import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readOldEnv } from "../src/core/old-names.ts";

readOldEnv();

process.env.CUVETTE_SPEND_FILE = join(mkdtempSync(join(tmpdir(), "cuvette-spend-")), "spend.jsonl");
