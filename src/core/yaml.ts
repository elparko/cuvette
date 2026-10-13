import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// The yaml package loads at the first parse, not at the start of the CLI.
export function parseYaml(text: string): any {
  return (require("yaml") as typeof import("yaml")).parse(text);
}
