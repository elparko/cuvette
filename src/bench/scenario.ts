import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { BENCH_DIR } from "./datasets.ts";

export const TRAP_KINDS = [
  "pseudoreplication",
  "confounder",
  "normalization_artifact",
  "background_signal",
  "adduct_or_isotope",
  "saturation",
  "threshold_dependence",
  "uncalibrated_units",
] as const;

const Effect = z.strictObject({
  description: z.string(),
  keywords: z.array(z.string()).default([]),
  range: z.tuple([z.number(), z.number()]).optional(),
  path: z.string().default(""),
});

const Detect = z.strictObject({
  keywords: z.array(z.string()).default([]),
  finding: z.array(z.string()).default([]),
  question: z.array(z.string()).default([]),
  sensitivity: z.array(z.string()).default([]),
  tool_calls: z.array(z.string()).default([]),
});

const Condition = z.strictObject({
  answer_matches: z.array(z.string()).default([]),
  answer_lacks: z.array(z.string()).default([]),
  answer_numbers: z.array(z.tuple([z.number(), z.number()])).default([]),
  tool_calls_present: z.array(z.string()).default([]),
  tool_calls_absent: z.array(z.string()).default([]),
  not_asked: z.array(z.string()).default([]),
});

const Trap = z.strictObject({
  id: z.string(),
  kind: z.enum(TRAP_KINDS),
  detect: Detect,
  fell_in: z.array(Condition).min(1),
});

export const Scenario = z.strictObject({
  id: z.string(),
  adapter: z.string(),
  title: z.string(),
  prompt: z.string(),
  data: z.strictObject({ generator: z.string() }).optional(),
  setup: z.record(z.string(), z.unknown()).default({}),
  answers: z.strictObject({
    decisions: z.record(z.string(), z.unknown()).default({}),
    default: z.string().default("Use your best judgment."),
  }),
  decision_args: z.record(z.string(), z.string()).default({}),
  expected: z.strictObject({ effects: z.array(Effect).min(1) }),
  traps: z.array(Trap).default([]),
  human_decisions: z.array(z.string()).default([]),
  agent_decisions: z.array(z.string()).default([]),
});

export type Scenario = z.infer<typeof Scenario>;
export type Effect = z.infer<typeof Effect>;
export type Trap = z.infer<typeof Trap>;
export type Condition = z.infer<typeof Condition>;

export function loadScenario(id: string, root = BENCH_DIR): Scenario {
  const file = join(root, id, "scenario.yaml");
  return Scenario.parse(parseYaml(readFileSync(file, "utf8")));
}

export function scenarioIds(root = BENCH_DIR): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => existsSync(join(root, d, "scenario.yaml")))
    .sort();
}
