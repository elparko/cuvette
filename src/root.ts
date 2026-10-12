import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This file is at src/root.ts, and the bundle is at dist/*.js. Both are one folder below the package root.
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
