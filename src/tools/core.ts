import { readFileSync } from "node:fs";
import type { LoadedAdapter } from "../adapters/manifest.ts";
import type { Args, Tool, ToolOutput } from "../core/types.ts";

export interface CoreDeps {
  adapters: LoadedAdapter[];
  allTools: () => Tool[];
  activate: (names: string[]) => void;
  ask: (spec: { question: string; options: string[]; recommendation?: string; reason?: string; wait: boolean }) => Promise<ToolOutput>;
  proposeChange: (spec: { key: string; value: unknown; reason: string; wait: boolean }) => Promise<ToolOutput>;
  compare: (spec: { key: string; values: unknown[] }) => Promise<ToolOutput>;
  proposeLab: (adapter: string, kind: string, payload: Record<string, unknown>, reason: string) => ToolOutput;
  log: (kind: "note", data: Record<string, unknown>) => void;
  plan?: (args: Args) => Promise<ToolOutput>;
  fullPlan?: () => boolean;
}

const PLAN_STEPS_SHORT = {
  type: "array",
  items: { type: "object", properties: { step: { type: "string" }, status: { type: "string", enum: ["todo", "doing", "done", "waiting", "skipped"] } }, required: ["step"] },
};

const PLAN_FULL = {
  type: "object",
  properties: {
    restatement: { type: "string", description: "What the scientist wants, in the scientist's own terms, as one sentence that starts with 'You want:'. For example: You want: for each field, the number of cells that took up red particles, and the number of all cells." },
    question: { type: "string", description: "The question, in one sentence." },
    definitions: {
      type: "array",
      description: "The proposed metrics: what counts as one n, what counts as one object, what counts as positive, and each metric, with its setting values, in plain words. For example: n 'one Set (4 per group)'; cell 'an object in CH1 of 300 to 15,000 px, outlined with Cellpose'; positive 'at least 1 red pixel (CH3, Otsu threshold for each image) inside the outline'; metric 'positive cells / all cells x 100 for each n'. Keep each one short.",
      items: { type: "object", properties: { measure: { type: "string" }, definition: { type: "string" } }, required: ["measure", "definition"] },
    },
    exclusions: {
      type: "array",
      description: "What I will leave out, and what it does: every filter or exclusion (size limits, edge objects, clumps, background), with its expected effect in plain numbers when you can estimate it.",
      items: { type: "object", properties: { what: { type: "string" }, effect: { type: "string" } }, required: ["what"] },
    },
    pilot: {
      type: "object",
      description: "Give a pilot when the method runs on more than one sample: the sample that runs first, and what the scientist will see (the QC image with outlines, the numbers, the settings). Leave it out for one sample, or when no step counts or changes data.",
      properties: { sample: { type: "string" }, shows: { type: "array", items: { type: "string" } } },
      required: ["sample"],
    },
    reference: {
      type: "object",
      description: "An earlier analysis or hand count of the same data, if one exists: the file, the sheet, the sample column and the value columns. In question, state the reference's measure in its own terms and ask if it is the same as yours, for example: The reference counts 'Red dots'. Is that the number of red-positive cells, or the number of red spots?",
      properties: { path: { type: "string" }, sheet: { type: "string" }, sample_column: { type: "string" }, columns: { type: "array", items: { type: "string" } }, question: { type: "string" } },
    },
    data: {
      type: "object",
      description: "The data.",
      properties: {
        files: { type: "array", items: { type: "string" } },
        row: { type: "string", description: "What one row or one file is." },
        replicate: { type: "string", description: "The unit of replication, for example one patient." },
        n: { type: "string", description: "The sample sizes, for example 10 patients, 2 drugs each." },
      },
    },
    programs: {
      type: "array",
      description: "The program and adapter for each part of the work, and why.",
      items: { type: "object", properties: { part: { type: "string" }, adapter: { type: "string", description: "The adapter name as list_adapters gives it, for example biostats." }, why: { type: "string" }, alternatives: { type: "array", items: { type: "string" }, description: "Other adapters that can do this part." } }, required: ["part", "adapter"] },
    },
    steps: {
      type: "array",
      description: "The steps, in order.",
      items: {
        type: "object",
        properties: {
          step: { type: "string", description: "What the step does, in a few words." },
          method: { type: "string", description: "The method, for example a paired t test." },
          tool: { type: "string", description: "The tool that runs the step, for example compare_two_groups or run_script." },
          settings: {
            type: "array",
            description: "The settings of the step, each with its value filled in and who set it: default, from your answer, or agent. Leave value out only if you cannot pick a sensible value (at most two in the whole plan).",
            items: { type: "object", properties: { key: { type: "string", description: "The decision key, if the decision record has one." }, label: { type: "string" }, value: {}, by: { type: "string", enum: ["default", "from your answer", "agent"] }, options: { type: "array", items: { type: "string" } }, recommendation: { type: "string" } }, required: ["label"] },
          },
          status: { type: "string", enum: ["todo", "doing", "done", "waiting", "skipped"] },
          reason: { type: "string", description: "Why the step was skipped or added." },
        },
        required: ["step"],
      },
    },
    outputs: { type: "array", items: { type: "string" }, description: "The numbers, tables and figures that the answer gives." },
    checks: { type: "array", description: "The assumptions to test.", items: { type: "object", properties: { check: { type: "string" }, if_fails: { type: "string", description: "What you do if the check fails." } }, required: ["check"] } },
    out_of_scope: { type: "array", items: { type: "string" }, description: "What this analysis does not do." },
    reason: { type: "string", description: "Why the plan changes. Give it when you add, remove or skip a step after the scientist approved the plan." },
  },
  required: ["steps"],
};

function tool(name: string, description: string, properties: Record<string, unknown>, required: string[], execute: (a: Args) => Promise<ToolOutput> | ToolOutput): Tool {
  return {
    name,
    description,
    inputSchema: { type: "object", properties, required },
    source: "harness",
    readOnly: true,
    permission: "allow",
    execute: async (a) => execute(a),
  };
}

function words(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
}

export function searchTools(tools: Tool[], query: string, k = 6): Tool[] {
  const q = words(query);
  return tools
    .map((t) => {
      const hay = `${t.name.replace(/_/g, " ")} ${t.title ?? ""} ${t.description}`.toLowerCase();
      return { t, score: q.reduce((n, w) => n + (hay.includes(w) ? (t.name.includes(w) ? 3 : 1) : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.t);
}

export function coreTools(d: CoreDeps): Tool[] {
  const skillIndex = () => d.adapters.flatMap((a) => a.skills().map((s) => ({ ...s, adapter: a.name })));
  return [
    tool(
      "find_tools",
      "Search the program tools that are not in your list yet. The matching tools become available on your next step.",
      { query: { type: "string", description: "What you want to do, in a few words." } },
      ["query"],
      ({ query }) => {
        const hits = searchTools(d.allTools(), String(query));
        d.activate(hits.map((t) => t.name));
        return {
          ok: true,
          summary: hits.length ? `Found ${hits.length} tools.` : "No tool matches.",
          data: hits.map((t) => ({ name: t.name, description: t.description.split("\n")[0] })),
        };
      },
    ),
    tool(
      "load_skill",
      "Read a skill: a procedure for this program, written by the adapter author or the lab.",
      { name: { type: "string" } },
      ["name"],
      ({ name }) => {
        const s = skillIndex().find((x) => x.name === name);
        if (!s) return { ok: false, error: `No skill named ${name}. Skills: ${skillIndex().map((x) => x.name).join(", ") || "none"}` };
        return { ok: true, summary: `Loaded the skill ${s.name}.`, text: readFileSync(s.path, "utf8") };
      },
    ),
    tool(
      "ask_scientist",
      "Ask the scientist a question when a choice can change the conclusion. Give options, your recommendation and the reason. With wait false, the question waits in the queue and you can continue other work.",
      {
        question: { type: "string" },
        options: { type: "array", items: { type: "string" } },
        recommendation: { type: "string" },
        reason: { type: "string" },
        wait: { type: "boolean", default: true },
      },
      ["question"],
      (a) =>
        d.ask({
          question: String(a.question),
          options: Array.isArray(a.options) ? a.options.map(String) : [],
          recommendation: a.recommendation ? String(a.recommendation) : undefined,
          reason: a.reason ? String(a.reason) : undefined,
          wait: a.wait !== false,
        }),
    ),
    tool(
      "propose_change",
      "Ask the scientist to change a decision in the record, for example a setup value. Give the decision key, the new value and the reason. If the scientist agrees, the record changes and later steps use the new value. Use this, not ask_scientist, for any decision that has a key.",
      {
        key: { type: "string", description: "The decision key, for example particle_size_min." },
        value: { description: "The new value." },
        reason: { type: "string" },
        wait: { type: "boolean", default: true },
      },
      ["key", "value", "reason"],
      (a) => d.proposeChange({ key: String(a.key), value: a.value, reason: String(a.reason ?? ""), wait: a.wait !== false }),
    ),
    tool(
      "compare_options",
      "Run the last step that used a decision again with other values of that decision, as comparison runs. The record does not change. Use it for a check such as other threshold methods. Report comparison results as a range or a check, not as the result.",
      {
        key: { type: "string", description: "The decision key, for example threshold_method." },
        values: { type: "array", items: {}, description: "The values to compare. Leave empty to use the adapter's list." },
      },
      ["key"],
      (a) => d.compare({ key: String(a.key), values: Array.isArray(a.values) ? a.values : [] }),
    ),
    {
      ...tool(
        "plan",
        "",
        { steps: PLAN_STEPS_SHORT },
        ["steps"],
        (a) => {
          if (d.plan && d.fullPlan?.()) return d.plan(a);
          const steps = a.steps;
          const list = Array.isArray(steps) ? steps.map((s: any) => ({ step: String(s.step ?? s), status: String(s.status ?? "todo") })) : [];
          d.log("note", { text: "Plan:\n" + list.map((s, i) => `${i + 1}. [${s.status}] ${s.step}`).join("\n"), plan: list, by: "agent" });
          return { ok: true, summary: `Plan with ${list.length} steps.` };
        },
      ),
      get description() {
        return d.fullPlan?.()
          ? "Write or update the proposed analysis for the scientist. The scientist reads it and confirms it before any analysis step runs. Write short sentences in plain words."
          : "Write or update the analysis plan: a short list of steps. The scientist sees it in the trail.";
      },
      get inputSchema() {
        return d.fullPlan?.() ? PLAN_FULL : { type: "object", properties: { steps: PLAN_STEPS_SHORT }, required: ["steps"] };
      },
    },
    tool(
      "note",
      "Write an observation in the trail, for example a quality problem that you see in an image.",
      { text: { type: "string" } },
      ["text"],
      ({ text }) => {
        d.log("note", { text: String(text), by: "agent" });
        return { ok: true, summary: "Note saved." };
      },
    ),
    tool(
      "propose_lab_rule",
      "Propose a permanent lab rule after the scientist corrects you: a new default, a review check, a standards line or a known-answer test. The scientist must approve it.",
      {
        adapter: { type: "string" },
        kind: { type: "string", enum: ["default", "check", "standard", "test"] },
        payload: { type: "object" },
        reason: { type: "string" },
      },
      ["adapter", "kind", "payload", "reason"],
      (a) => d.proposeLab(String(a.adapter), String(a.kind), (a.payload ?? {}) as Record<string, unknown>, String(a.reason)),
    ),
  ];
}
