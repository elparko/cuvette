import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Session } from "./core/session.ts";
import { trail } from "./core/trail.ts";
import { TRUST_TITLE } from "./core/trust.ts";
import type { Args } from "./core/types.ts";
import { FakeProvider } from "./providers/fake.ts";

type Handler = (a: Args) => Promise<{ text: string; isError?: boolean }>;

const SHARED = new Set(["read_file", "list_dir", "load_skill", "note", "plan", "propose_change", "compare_options", "calculate", "list_adapters", "use_adapter"]);

export async function runMcpServer(opts: { adapters: string[]; trustFolder?: boolean }) {
  const session = await Session.create({
    adapters: opts.adapters,
    trustFolder: opts.trustFolder,
    defaults: true,
    provider: new FakeProvider([]),
    settings: { askWaits: false, autoResume: false, guidance: true },
  });
  session.bus.on((e) => {
    if (e.type === "permission") session.respondPermission(e.rid, false, "the MCP client cannot approve; run this step in the cuvette terminal");
    if (e.type === "instruction") session.followDone(e.step, "", true);
  });
  const json = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 1));
  const defs: { name: string; description: string; inputSchema: Record<string, unknown>; annotations?: Record<string, unknown>; run: Handler }[] = [];
  let n = 0;
  let server: Server | undefined;
  const addSessionTools = () => {
    for (const tool of session.allTools()) {
      if ((tool.source !== "adapter" && !SHARED.has(tool.name)) || defs.some((d) => d.name === tool.name)) continue;
      defs.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: !!tool.readOnly, title: tool.title },
        run: async (a) => {
          const before = session.adapters.length;
          const r = await session.runTool(tool, a, `mcp${++n}`, new AbortController().signal);
          if (session.adapters.length > before) {
            addSessionTools();
            await server?.sendToolListChanged().catch(() => {});
          }
          return { text: r.text, isError: r.isError };
        },
      });
    }
  };
  addSessionTools();
  const obj = (props: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties: props, required });
  defs.push(
    {
      name: "cuvette_setup",
      description: "Show the decision fields, or lock the setup with values that the scientist gave.",
      inputSchema: obj({ values: { type: "object" }, profile: { type: "string" } }),
      run: async (a) => {
        if (a.values) session.decisions.applySetup(a.values as Args, { profile: a.profile as string | undefined, how: "set through the MCP client" });
        return { text: json({ fields: session.decisions.fields(), brief: session.decisions.brief() }) };
      },
    },
    { name: "cuvette_questions", description: "List the open questions for the scientist.", inputSchema: obj({}), run: async () => ({ text: json(session.questions.open()) }) },
    {
      name: "cuvette_answer",
      description: "Record the scientist's answer to a question. Use only the scientist's own answer.",
      inputSchema: obj({ qid: { type: "string" }, value: {}, note: { type: "string" } }, ["qid", "value"]),
      run: async (a) => {
        if (String(a.qid) === session.trustQid || session.questions.get(String(a.qid))?.title === TRUST_TITLE) return { text: "Only the scientist can trust the folder, in a terminal.", isError: true };
        await session.answer(String(a.qid), a.value, `relayed by the MCP client${a.note ? `: ${a.note}` : ""}`);
        return { text: `Recorded the answer to ${a.qid}.` };
      },
    },
    {
      name: "cuvette_trail",
      description: "The audit trail of this session. Level 1 is one line for each step; 2 adds details; 3 adds the technical record.",
      inputSchema: obj({ level: { type: "integer", minimum: 1, maximum: 3 } }),
      run: async (a) => ({ text: json(trail(session.record, (Number(a.level) || 1) as 1 | 2 | 3, session.adapters)) }),
    },
    {
      name: "cuvette_export",
      description: "Export the trail, the protocol, a script, a notebook or a flow. Returns the file path.",
      inputSchema: obj({ format: { type: "string", enum: ["html", "md", "jsonl", "protocol", "script", "notebook", "flow", "eln", "xlsx"] } }, ["format"]),
      run: async (a) => ({ text: await session.exportAs(a.format as never) }),
    },
    {
      name: "cuvette_eln_push",
      description: "Send this session to the scientist's eLabFTW notebook. The scientist must approve the list of data in the cuvette terminal. This client cannot approve, so the call refuses until the scientist runs `cuvette eln push <session>`.",
      inputSchema: obj({}),
      run: async () => {
        try {
          const r = await session.elnPush();
          return { text: json(r) };
        } catch (e) {
          return { text: (e as Error).message, isError: true };
        }
      },
    },
  );
  server = new Server(
    { name: "cuvette", version: "0.1.0" },
    {
      capabilities: { tools: { listChanged: true } },
      instructions:
        "Cuvette harness. Program tools run under the scientist's decision record: the harness fills decisions, logs deviations, and blocks a call when a decision belongs to the scientist. Call cuvette_setup first. Ask the scientist before you call cuvette_answer. Each result has a manual route that the scientist can repeat by hand." +
        (session.pick ? " No adapter is loaded at the start. Call list_adapters, then use_adapter with the adapter that fits the request. The program tools of that adapter are added to the tool list." : "") +
        (session.trustNotice ? ` ${session.trustNotice} Tell the scientist. Only the scientist can trust the folder, in a terminal.` : ""),
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
      return { content: [{ type: "text", text: session.phiForClient(r.text, def.name) }], isError: !!r.isError };
    } catch (e) {
      return { content: [{ type: "text", text: session.phiForClient((e as Error).message, def.name) }], isError: true };
    }
  });
  if (session.trustNotice) process.stderr.write(`Note: ${session.trustNotice}\n`);
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
