import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FindingIn } from "../../src/core/types.ts";
import { checkAdapter } from "../../src/onboarding/checker.ts";

export async function draftLint(dir = process.env.CUVETTE_DRAFT_DIR): Promise<FindingIn[]> {
  if (!dir || !existsSync(join(dir, "adapter.yaml"))) return [];
  const report = await checkAdapter(dir);
  if (!report.errors.length) return [];
  return [
    {
      check: "draft_lint",
      severity: "error",
      message: `The draft adapter in ${dir} still has ${report.errors.length} checklist error(s). Fix each one with write_adapter_file, call check_adapter, and finish only when it has no error:\n${report.errors.map((e) => `- ${e}`).join("\n")}`,
    },
  ];
}

export default {
  checks: {
    draft_lint: () => draftLint(),
  },
};
