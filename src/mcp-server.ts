import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Session } from "./core/session.ts";
import { trail } from "./core/trail.ts";
import type { Args } from "./core/types.ts";
import { FakeProvider } from "./providers/fake.ts";

type Handler = (a: Args) => Promise<{ text: string; isError?: boolean }>;

const SHARED = new Set(["read_file", "list_dir", "load_skill", "note", "plan", "propose_change", "compare_options"]);

export async function runMcpServer(opts: { adapters: string[] }) {
  const session = await Session.create({
    adapters: opts.adapters,
    provider: new FakeProvider([]),
    settings: { askWaits: false, autoResume: false, guidance: true },
  });
  session.bus.on((e) => {
    if (e.type === "permission") session.respondPermission(e.rid, false, "the MCP client cannot approve; run this step in the ga terminal");
    if (e.type === "instruction") session.followDone(e.step, "", true);
  });
  const json = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 1));
  const defs: { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, unknown>; run: Handler }[] = [];
  let n = 0;
  for (const tool of session.allTools()) {
    if (tool.source !== "adapter" && !SHARED.has(tool.name)) continue;
    defs.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: { readOnlyHint: !!tool.readOnly, title: tool.title },
      run: async (a) => {
        const r = await session.pipeline(tool, a, `mcp${++n}`, new AbortController().signal);
        return { text: r.text, isError: r.isError };
      },
    });
  }
  const obj = (props: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties: props, required });
  defs.push(
    {
      name: "ga_setup",
      description: "Show the decision fields, or lock the setup with values that the scientist gave.",
      inputSchema: obj({ values: { type: "object" }, profile: { type: "string" } }),
      run: async (a) => {
        if (a.values) session.decisions.applySetup(a.values as Args, { profile: a.profile as string | undefined, how: "set through the MCP client" });
        return { text: json({ fields: session.decisions.fields(), brief: session.decisions.brief() }) };
      },
    },
    { name: "ga_questions", description: "List the open questions for the scientist.", inputSchema: obj({}), run: async () => ({ text: json(session.questions.open()) }) },
    {
      name: "ga_answer",
      description: "Record the scientist's answer to a question. Use only the scientist's own answer.",
      inputSchema: obj({ qid: { type: "string" }, value: {}, note: { type: "string" } }, ["qid", "value"]),
      run: async (a) => {
        await session.answer(String(a.qid), a.value, `relayed by the MCP client${a.note ? `: ${a.note}` : ""}`);
        return { text: `Recorded the answer to ${a.qid}.` };
      },
    },
    {
      name: "ga_trail",
      description: "The audit trail of this session. Level 1 is one line for each step; 2 adds details; 3 adds the technical record.",
      inputSchema: obj({ level: { type: "integer", minimum: 1, maximum: 3 } }),
      run: async (a) => ({ text: json(trail(session.record, (Number(a.level) || 1) as 1 | 2 | 3, session.adapters)) }),
    },
    {
      name: "ga_export",
      description: "Export the trail, the protocol, a script, a notebook or a flow. Returns the file path.",
      inputSchema: obj({ format: { type: "string", enum: ["html", "md", "jsonl", "protocol", "script", "notebook", "flow"] } }, ["format"]),
      run: async (a) => ({ text: await session.exportAs(a.format as never) }),
    },
  );
  const server = new Server(
    { name: "guided-analysis", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Guided analysis harness. Program tools run under the scientist's decision record: the harness fills decisions, logs deviations, and blocks a call when a decision belongs to the scientist. Call ga_setup first. Ask the scientist before you call ga_answer. Each result has a manual route that the scientist can repeat by hand.",
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: defs.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema: inputSchema as never, annotations })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const def = defs.find((d) => d.name === req.params.name);
    if (!def) return { content: [{ type: "text", text: `no tool ${req.params.name}` }], isError: true };
    try {
      const r = await def.run((req.params.arguments ?? {}) as Args);
      return { content: [{ type: "text", text: r.text }], isError: !!r.isError };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  });
  const stop = () => {
    const force = setTimeout(() => process.exit(0), 3000);
    force.unref();
    session.close().finally(() => process.exit(0));
  };
  process.stdin.on("end", stop);
  process.stdin.on("close", stop);
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  await server.connect(new StdioServerTransport());
}
