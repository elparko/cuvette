const SEQUENCE = new RegExp(
  [
    "\\x1b\\][^\\x07\\x1b\\x9c]*(?:\\x07|\\x1b\\\\|\\x9c)",
    "\\x1b[P^_X][^\\x1b\\x9c]*(?:\\x1b\\\\|\\x9c)",
    "\\x9d[^\\x07\\x1b\\x9c]*(?:\\x07|\\x1b\\\\|\\x9c)",
    "[\\x90\\x98\\x9e\\x9f][^\\x1b\\x9c]*(?:\\x1b\\\\|\\x9c)",
    "\\x1b\\[[0-?]*[ -/]*[@-~]?",
    "\\x9b[0-?]*[ -/]*[@-~]?",
    "\\x1b[ -/]*[0-~]?",
  ].join("|"),
  "g",
);
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f-\x9f‪-‮⁦-⁩]/g;

export function plainText(s: string): string {
  return s.replace(SEQUENCE, "").replace(CONTROL, "");
}

