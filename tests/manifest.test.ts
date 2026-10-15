import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { CATALOG_DIR, Manifest, bundledManifestFile, findAdapter, loadAdapter } from "../src/adapters/manifest.ts";
import { parseYaml } from "../src/core/yaml.ts";

test("each catalog adapter.yaml gives the same manifest after a JSON round trip, as in dist/catalog/<name>/adapter.json", () => {
  const files = readdirSync(CATALOG_DIR).map((d) => join(CATALOG_DIR, d, "adapter.yaml")).filter(existsSync);
  expect(files.length).toBeGreaterThan(10);
  for (const f of files) {
    const raw = parseYaml(readFileSync(f, "utf8"));
    expect(JSON.parse(JSON.stringify(raw))).toEqual(raw);
    expect(Manifest.parse(JSON.parse(JSON.stringify(raw)))).toEqual(Manifest.parse(raw));
  }
});

test("only the bundle uses the parsed manifest file, only for a catalog adapter, and only if the file is not older than adapter.yaml", () => {
  const tables = join(CATALOG_DIR, "tables", "adapter.yaml");
  expect(bundledManifestFile(tables, false)).toBeUndefined();
  expect(bundledManifestFile("tests/fixtures/mini/adapter.yaml", true)).toBeUndefined();
  const got = bundledManifestFile(tables, true);
  if (got) expect(got).toMatch(/dist[\\/]catalog[\\/]tables[\\/]adapter\.json$/);
});

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

test("findAdapter with the name of an object property says that no adapter has that name", () => {
  for (const name of ["constructor", "toString", "__proto__", "hasOwnProperty"]) expect(() => findAdapter(name, mkdtempSync(join(tmpdir(), "cuvette-proj-")))).toThrow(/no adapter named/);
});

test("a skill file with bad frontmatter or a name that is not text does not stop the skill list", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-skills-"));
  cpSync(join(__dirname, "fixtures/lab"), dir, { recursive: true });
  mkdirSync(join(dir, "skills"));
  writeFileSync(join(dir, "skills", "bad.md"), "---\nname: a: b\n---\nText.\n");
  writeFileSync(join(dir, "skills", "num.md"), "---\nname: 123\ndescription: 7\n---\nText.\n");
  const skills = loadAdapter(dir).skills().sort((a, b) => a.name.localeCompare(b.name));
  expect(skills.map((k) => [k.name, k.description])).toEqual([["bad", ""], ["num", ""]]);
});

test("an adapter that names a module outside its folder is refused with a clear text", () => {
  const dir = mkdtempSync(join(tmpdir(), "cuvette-module-"));
  const base = "adapter: { name: m1 }\nprogram: { name: t }\nconnection: { kind: cli }\n";
  for (const module of ["../evil.ts", "/tmp/evil.ts", "sub/../../evil.ts"]) {
    writeFileSync(join(dir, "adapter.yaml"), `${base}module: ${module}\n`);
    expect(() => loadAdapter(dir)).toThrow(/outside the folder of the adapter/);
  }
  writeFileSync(join(dir, "adapter.yaml"), `${base}module: sub/adapter.ts\n`);
  expect(loadAdapter(dir).manifest.module).toBe("sub/adapter.ts");
});

test("call_timeout_s must be more than 0, finite and at most 86400", () => {
  const base = { adapter: { name: "x" }, program: { name: "X" } };
  const parse = (v: number) => Manifest.safeParse({ ...base, connection: { kind: "mcp", call_timeout_s: v } });
  expect(parse(600).success).toBe(true);
  expect(parse(86400).success).toBe(true);
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 86401]) expect(parse(bad).success, String(bad)).toBe(false);
  expect(parse(0).error?.issues[0].message).toContain("call_timeout_s must be more than 0");
});
