import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { solidPng } from "../../../src/adapters/kinds/common.ts";

const server = new McpServer({ name: "fake-mcp", version: "1.0.0" }, { instructions: "Use echo to repeat text." });
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const workDir = () => process.env.CUVETTE_WORK_DIR ?? process.cwd();

server.registerTool("echo", { description: "Repeat the text.", inputSchema: { text: z.string() }, annotations: { readOnlyHint: true, title: "Echo" } }, async ({ text: t }) => text(`echo: ${t}`));

server.registerTool("add", { description: "Add two numbers.", inputSchema: { a: z.number(), b: z.number() } }, async ({ a, b }) =>
  text(JSON.stringify({ ok: true, summary: `${a} + ${b} = ${a + b}`, metrics: { sum: a + b }, manual_route: `Calculator: ${a} + ${b}`, fidelity: "exact" })));

server.registerTool("structured", { description: "Return structured content.", inputSchema: { n: z.number() } }, async ({ n }) => ({
  content: [{ type: "text" as const, text: "see structured content" }],
  structuredContent: { value: n * 2, metrics: { doubled: n * 2, label: "x" } },
}));

server.registerTool("table", { description: "Return a table.", inputSchema: {} }, async () =>
  text(JSON.stringify({ table: { columns: ["x", "y"], rows: [[1, 2], [3, 4]], n_rows: 2 }, manualRoute: "Open the table", fidelity: "close" })));

server.registerTool("reject", { description: "Report ok false in the JSON.", inputSchema: {} }, async () => text(JSON.stringify({ ok: false, error: "the data is empty" })));

server.registerTool("make_image", { description: "Write a PNG in the work folder.", inputSchema: { width: z.number().default(8), height: z.number().default(6) } }, async ({ width, height }) => {
  const path = join(workDir(), `fake-${width}x${height}.png`);
  writeFileSync(path, solidPng(width, height));
  return text(JSON.stringify({ result: "saved", path }));
});

server.registerTool("image_content", { description: "Return an MCP image.", inputSchema: {} }, async () => ({
  content: [{ type: "image" as const, data: solidPng(4, 4).toString("base64"), mimeType: "image/png" }, { type: "text" as const, text: "an image" }],
}));

server.registerTool("fail", { description: "Always fail.", inputSchema: {} }, async () => ({ isError: true, content: [{ type: "text" as const, text: "it failed on purpose" }] }));

server.registerTool("slow", { description: "Wait, and stop when cancelled.", inputSchema: { seconds: z.number() } }, async ({ seconds }, extra) => {
  await new Promise<void>((done) => {
    const t = setTimeout(done, seconds * 1000);
    extra.signal.addEventListener("abort", () => { clearTimeout(t); done(); });
  });
  return text("done");
});

server.registerTool("spin", { description: "Block the event loop.", inputSchema: { seconds: z.number() } }, async ({ seconds }) => {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end);
  return text("spun");
});

server.registerTool("crash", { description: "Stop the process.", inputSchema: {} }, async () => {
  process.stderr.write("crashing on purpose\n");
  process.exit(1);
});

await server.connect(new StdioServerTransport());
