import type { CardType } from "./cards.ts";

export const COMMANDS = [
  "help", "setup", "config", "decisions", "change", "status", "rerun", "owner", "permissions", "trust", "mode", "plan", "proposal", "pilot", "questions", "samples", "answer", "trail", "graph", "review", "findings", "tests", "checklist",
  "rewind", "branch", "branches", "compare", "save-method", "method", "export", "cite", "databook", "open", "model", "key", "eln", "adapters", "program", "skills", "lab", "compact", "usage", "resume", "window", "app", "panel", "details", "programs", "clear", "quit",
];

export const CARDS: CardType[] = ["setup", "eln", "permission", "question", "instruction", "findings", "key", "config", "plan", "clarify", "programs", "rewind", "phi"];
