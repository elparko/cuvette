import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const hasPandoc = existsSync("/opt/homebrew/bin/pandoc") || existsSync("/usr/local/bin/pandoc") || existsSync("/usr/bin/pandoc");
let tmp: string;
let draft: string;
let client: Client;

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content as { type: string; text: string }[])[0].text;
  return JSON.parse(text) as { ok: boolean; error?: string; summary?: string; text?: string; data?: any };
}

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), "ga-onbsrv-"));
  draft = join(tmp, "draft");
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve("node_modules/tsx/dist/cli.mjs"), resolve("catalog/onboarding/server.ts")],
    env: { ...(process.env as Record<string, string>), GA_DRAFT_DIR: draft, GA_HOME: join(tmp, "home") },
  });
  client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
});

afterAll(async () => {
  await client?.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe("onboarding server", () => {
  test("lists the tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "check_adapter", "fetch_url", "list_files", "probe_program", "python_api",
      "read_file", "read_help", "record_demonstration", "write_adapter_file",
    ]);
  });

  test.skipIf(!hasPandoc)("probe_program finds pandoc", async () => {
    const r = await call("probe_program", { name: "pandoc" });
    expect(r.ok).toBe(true);
    expect(r.data.which[0]).toMatch(/pandoc$/);
    expect(r.data.version.flag).toBe("--version");
    expect(r.data.version.output).toMatch(/pandoc/);
  });

  test("probe_program reports a missing program", async () => {
    const r = await call("probe_program", { name: "no-such-program-xyz" });
    expect(r.ok).toBe(true);
    expect(r.data.which).toEqual([]);
    expect(r.data.python.importable).toBe(false);
  });

  test.skipIf(!hasPandoc)("read_help runs pandoc --help", async () => {
    const r = await call("read_help", { argv: ["pandoc", "--help"] });
    expect(r.ok).toBe(true);
    expect(r.text).toMatch(/pandoc/i);
  });

  test("read_help refuses extra flags", async () => {
    const r = await call("read_help", { argv: ["pandoc", "--output=/tmp/x", "--help"] });
    expect(r.ok).toBe(false);
  });

  test("python_api lists json functions", async () => {
    const r = await call("python_api", { module: "json" });
    expect(r.ok).toBe(true);
    const dumps = r.data.members.find((m: { name: string }) => m.name === "dumps");
    expect(dumps.kind).toBe("function");
    expect(dumps.signature).toMatch(/^\(/);
  });

  test("write_adapter_file writes inside the draft and refuses outside", async () => {
    const ok = await call("write_adapter_file", { rel_path: "skills/a.md", content: "hello" });
    expect(ok.ok).toBe(true);
    expect(readFileSync(join(draft, "skills", "a.md"), "utf8")).toBe("hello");
    for (const bad of ["../escape.txt", "/tmp/escape.txt", "skills/../../escape.txt"]) {
      const r = await call("write_adapter_file", { rel_path: bad, content: "x" });
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/outside the draft folder/);
    }
    expect(existsSync(join(tmp, "escape.txt"))).toBe(false);
  });

  test("write_adapter_file runs the lint once adapter.yaml exists and lists the errors", async () => {
    const yaml = "adapter: { name: draft }\nprogram: { name: draft }\nconnection: { kind: cli }\n";
    const r = await call("write_adapter_file", { rel_path: "adapter.yaml", content: yaml });
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/checklist error/);
    expect(r.summary).toMatch(/\[field\]/);
    expect(r.data.lint.errors.join("\n")).toMatch(/\[kat-present\]/);
    const c = await call("check_adapter", {});
    expect(c.ok).toBe(false);
    expect(c.error).toMatch(/^Fix each error/);
    rmSync(join(draft, "adapter.yaml"));
  });

  test("record_demonstration numbers its files", async () => {
    await call("record_demonstration", { text: "run(\"Gaussian Blur...\", \"sigma=2\");" });
    const r = await call("record_demonstration", { text: "second" });
    expect(r.summary).toBe("saved evidence/demonstration-2.txt");
    expect(readFileSync(join(draft, "evidence", "demonstration-2.txt"), "utf8")).toBe("second");
  });

  test("list_files and read_file", async () => {
    const l = await call("list_files", { path: draft });
    expect(l.data.entries.map((e: { name: string }) => e.name)).toContain("skills/");
    const f = await call("read_file", { path: join(draft, "skills", "a.md") });
    expect(f.text).toBe("hello");
  });

  test("check_adapter reports a draft that has no adapter.yaml", async () => {
    const r = await call("check_adapter", {});
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/adapter.yaml/);
  });
});
