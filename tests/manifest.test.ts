import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { Manifest, loadAdapter } from "../src/adapters/manifest.ts";

test("map entries match on args and links resolve", () => {
  const a = loadAdapter("tests/fixtures/mini");
  expect(a.mapEntry("run", { step: "b" })?.route).toBe("A > C");
  expect(a.mapEntry("run", { step: "x" })?.route).toBe("A > B");
  expect(a.linksFor("run")).toEqual({ cutoff: "thr" });
  expect(a.manifest.map[0].fidelity).toBe("close");
});

test("program.citation takes a list or one citation; tools take method citations", () => {
  const base = { adapter: { name: "x" }, connection: { kind: "cli" } };
  const one = Manifest.parse({ ...base, program: { name: "X", citation: { text: "A. (2020). X.", doi: "10.1/x" } } });
  expect(one.program.citation).toEqual([{ text: "A. (2020). X.", doi: "10.1/x", url: "", bibtex: "", kind: "program", when: {} }]);
  const many = Manifest.parse({
    ...base,
    program: { name: "X", citation: [{ text: "A", doi: "10.1/a" }, { text: "B", url: "https://b", kind: "model" }] },
    tools: [{ name: "adjust", description: "Adjust p values.", citations: [{ text: "BH", doi: "10.1/bh", when: { method: "BH" } }] }],
    citations: [{ tool: "server_tool", text: "C", doi: "10.1/c" }],
  });
  expect(many.program.citation.map((c) => c.kind)).toEqual(["program", "model"]);
  expect(many.tools[0].citations[0]).toMatchObject({ kind: "method", when: { method: "BH" } });
  expect(many.citations[0]).toMatchObject({ tool: "server_tool", kind: "method" });
  expect(() => Manifest.parse({ ...base, program: { name: "X", citation: [{ doi: "10.1/x" }] } })).toThrow();
  expect(() => Manifest.parse({ ...base, program: { name: "X", citation: [{ text: "A", kind: "book" }] } })).toThrow();
});

test("the module loader takes a built adapter.mjs next to adapter.ts, for the desktop app", async () => {
  const dir = join(mkdtempSync(join(tmpdir(), "cuvette-mjs-")), "drive");
  cpSync("tests/fixtures/drive", dir, { recursive: true });
  expect(Object.keys(await loadAdapter(dir).module())).not.toContain("builtMarker");
  writeFileSync(join(dir, "adapter.mjs"), "export default { builtMarker: true };\n");
  expect(await loadAdapter(dir).module()).toEqual({ builtMarker: true });
});

test("a manifest homepage that is not a web address is dropped", () => {
  const base = { adapter: { name: "x" }, connection: { kind: "cli" } };
  expect(Manifest.parse({ ...base, program: { name: "X", homepage: "javascript:alert(1)" } }).program.homepage).toBe("");
  expect(Manifest.parse({ ...base, program: { name: "X", homepage: "https://x.org" } }).program.homepage).toBe("https://x.org");
});
