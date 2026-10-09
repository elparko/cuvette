import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const server = new McpServer({ name: "lab", version: "1.0" });
const out = (o: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(o) }] });
const COUNTS: Record<string, number> = { Default: 64, Otsu: 41, Triangle: 66 };

server.registerTool("blur", { description: "Blur an image.", inputSchema: { input: z.string(), sigma: z.number().optional() } }, async ({ input, sigma }) => {
  const path = join(process.env.CUVETTE_WORK_DIR!, `blur-${Date.now()}.txt`);
  writeFileSync(path, `blurred ${input} ${sigma}`);
  return out({ ok: true, metrics: { sigma: sigma ?? 0 }, outputs: [{ path, kind: "file", name: "blurred" }] });
});
server.registerTool(
  "count",
  { description: "Count particles.", inputSchema: { input: z.string(), method: z.string().optional(), min_size: z.number().optional() } },
  async ({ method, min_size }) => out({ ok: true, metrics: { count: COUNTS[method ?? "Default"] ?? 0, min_size: min_size ?? -1 } }),
);
const STEPS = [
  { tool: "count", args: { input: "a.tif", method: "Otsu", min_size: 10 }, line: "Analyze > Count, Otsu, size 10" },
  { tool: "blur", args: { input: "a.tif", sigma: 3 }, line: "Process > Blur, sigma 3" },
  { tool: "mystery", args: {}, line: "Plugins > Mystery" },
  { tool: "count", args: { input: "a.tif", method: "Triangle", min_size: 5 }, line: "Analyze > Count, Triangle, size 5" },
];
server.registerTool("history", { description: "Steps the scientist did.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => out({ ok: true, steps: STEPS }));
server.registerTool("state", { description: "Program state.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => out({ ok: true, data: { open: "blobs" } }));
await server.connect(new StdioServerTransport());
