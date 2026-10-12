import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { cuvetteHome } from "../adapters/manifest.ts";
import { ROOT } from "../root.ts";


export const GUIDE_PATH = join(ROOT, "docs", "onboarding-guide.md");
export const SPEC_PATH = join(ROOT, "docs", "adapter-spec.md");

export interface OnboardOptions {
  model: string;
  docs?: string[];
  kind?: string;
}

export interface OnboardSession {
  adapters: string[];
  model: string;
  mode: "watch";
  cwd: string;
  firstMessage: string;
  draftDir: string;
  env: Record<string, string>;
}

export function slug(program: string): string {
  return program.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "program";
}

export function onboardCommand(program: string, opts: OnboardOptions): OnboardSession {
  const name = slug(program);
  const draftDir = join(cuvetteHome(), "drafts", name);
  mkdirSync(draftDir, { recursive: true });
  const lines = [
    `Onboard this program: ${program}.`,
    `Draft adapter name: ${name}.`,
    `Draft folder: ${draftDir}. Write every file there with write_adapter_file.`,
    `Procedure: read ${GUIDE_PATH} first, and follow it. Its section "Adapter checklist" lists the rules that cuvette adapter check enforces.`,
    `Adapter spec: ${SPEC_PATH}.`,
  ];
  if (opts.kind) lines.push(`Connection kind hint from the scientist: ${opts.kind}. Check that it fits before you use it.`);
  if (opts.docs?.length) lines.push("Documentation addresses:", ...opts.docs.map((d) => `- ${d}`));
  lines.push("After you draft adapter.yaml, run check_adapter. Fix every checklist error before you finish. Tell me about each warning that you leave.");
  lines.push("Start with step 1 of the guide. Show each part to me for approval before the next part.");
  return {
    adapters: ["onboarding"],
    model: opts.model,
    mode: "watch",
    cwd: process.cwd(),
    firstMessage: lines.join("\n"),
    draftDir,
    env: { CUVETTE_DRAFT_DIR: draftDir },
  };
}
