import type { Message, Part, Provider, Tool, ToolOutput } from "../core/types.ts";

export interface TaskDeps {
  provider: () => Provider;
  tools: () => Tool[];
  run: (tool: Tool, args: Record<string, unknown>, callId: string, signal: AbortSignal) => Promise<{ text: string; isError: boolean }>;
  maxSteps?: number;
  guard?: (m: Message, history: Message[]) => Message | string;
  folders?: () => string;
}

const SYSTEM = `You are a helper agent inside a Cuvette session. You have read-only tools. Do the task you get, then answer with a short report: what you looked at, what you found, with the numbers from tool results. Do not guess values.`;

export function taskTool(d: TaskDeps): Tool {
  return {
    name: "task",
    description: "Give a read-only job to a helper agent with a fresh context, for example: inspect every image in a folder and report problems. The helper cannot change anything or ask the scientist. You get its report.",
    inputSchema: { type: "object", properties: { job: { type: "string" } }, required: ["job"] },
    source: "harness",
    readOnly: true,
    permission: "allow",
    async execute(args, ctx): Promise<ToolOutput> {
      const tools = d.tools().filter((t) => t.readOnly && t.name !== "task" && t.name !== "ask_scientist" && t.name !== "propose_change" && t.name !== "compare_options");
      const schemas = tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
      const job = d.folders ? `${d.folders()}\n\n${String(args.job)}` : String(args.job);
      const history: Message[] = [{ role: "user", parts: [{ type: "text", text: job }] }];
      for (let i = 0; i < (d.maxSteps ?? 12); i++) {
        const res = await d.provider().step({ system: SYSTEM, messages: history, tools: schemas, signal: ctx.signal });
        history.push(res.message);
        const calls = res.message.parts.filter((p): p is Extract<Part, { type: "tool_call" }> => p.type === "tool_call");
        if (!calls.length) {
          const text = res.message.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");
          return { ok: true, summary: "The helper agent finished.", text };
        }
        const results: Part[] = [];
        for (const c of calls) {
          const t = tools.find((x) => x.name === c.name);
          const r = t ? await d.run(t, (c.args ?? {}) as Record<string, unknown>, `${ctx.callId}.t${i}`, ctx.signal) : { text: `ERROR: no read-only tool ${c.name}`, isError: true };
          results.push({ type: "tool_result", callId: c.id, name: c.name, text: r.text, isError: r.isError });
        }
        const next = d.guard ? d.guard({ role: "user", parts: results }, history) : { role: "user" as const, parts: results };
        if (typeof next === "string") return { ok: false, error: next };
        history.push(next);
      }
      return { ok: false, error: "the helper agent did not finish in time" };
    },
  };
}
