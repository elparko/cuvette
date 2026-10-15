import { createServer, type Server } from "node:http";
import { mkdtempSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";
import type { ToolContext } from "../src/core/types.ts";
import { loadAdapter } from "../src/adapters/manifest.ts";
import { startAdapter, type AdapterRuntime } from "../src/adapters/runtime.ts";

const root = mkdtempSync(join(tmpdir(), "cuvette-http-"));
let rt: AdapterRuntime | undefined;
let server: Server | undefined;

afterAll(async () => {
  await rt?.close();
  server?.closeAllConnections();
  server?.close();
});

test("http: a response of more than 16 MB is cut at 16 MB with a note", async () => {
  const chunk = Buffer.alloc(1024 * 1024, "a");
  server = createServer((req, res) => {
    const binary = req.url === "/bin";
    res.writeHead(200, { "content-type": binary ? "application/octet-stream" : "text/plain" });
    let sent = 0;
    const write = () => {
      while (sent < 20) {
        sent++;
        if (!res.write(chunk)) return void res.once("drain", write);
      }
      res.end();
    };
    write();
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  const dir = join(root, "adapter");
  const yaml = `adapter: { name: t-http }
program: { name: t }
connection:
  kind: http
  base_url: http://127.0.0.1:${port}
  network: true
tools:
  - name: big
    description: d
    request: { path: /big }
  - name: bin
    description: d
    outputs: { file: { kind: file, ext: .dat } }
    request: { path: /bin }
`;
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir);
  writeFileSync(join(dir, "adapter.yaml"), yaml);
  const dirs = { workDir: join(root, "work"), sessionDir: join(root, "session") };
  rt = await startAdapter(loadAdapter(dir), dirs);
  const tools = Object.fromEntries((await rt.tools()).map((t) => [t.name, t]));
  const ctx: ToolContext = { session: "s", callId: "c", workDir: dirs.workDir, sessionDir: dirs.sessionDir, signal: new AbortController().signal, log: () => { throw new Error("no log"); }, callTool: async () => ({ ok: true }) };

  const text = await tools.big.execute({}, ctx);
  expect(text.ok).toBe(true);
  expect(JSON.stringify(text.data)).toContain("cut at 16 MB");
  expect((text.data as string).length).toBeLessThan(16 * 1024 * 1024 + 100);

  const bin = await tools.bin.execute({}, ctx);
  expect(bin.summary).toContain("saved 16777216 bytes");
  expect(bin.summary).toContain("cut at 16 MB");
  expect(statSync(bin.outputs![0].path).size).toBe(16 * 1024 * 1024);
}, 60000);
