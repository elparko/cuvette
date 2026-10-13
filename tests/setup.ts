import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { readOldEnv } from "../src/core/old-names.ts";

readOldEnv();

const spendDir = mkdtempSync(join(tmpdir(), "cuvette-spend-"));
process.env.CUVETTE_SPEND_FILE = join(spendDir, "spend.jsonl");
afterAll(() => rmSync(spendDir, { recursive: true, force: true }));
