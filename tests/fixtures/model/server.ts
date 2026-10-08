import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "model", version: "1.0" });
const out = (o: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(o) }] });

server.registerTool(
  "fit",
  { description: "Fit a model.", inputSchema: { data: z.string(), terms: z.string().optional(), perms: z.number().optional() } },
  async ({ terms, perms }) => (terms ? out({ ok: true, metrics: { p: 1 / ((perms ?? 99) + 1), n_terms: terms.split("+").length } }) : out({ ok: false, error: "argument is of length zero" })),
);
await server.connect(new StdioServerTransport());
