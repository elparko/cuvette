import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { openAdapter, programOf, pyJson, type OpenAdapter } from "./independent.ts";

const found = await programOf("metaspace");
const python = join(homedir(), ".cuvette/envs/metaspace/bin/python");
const online = !!found && (await fetch("https://metaspace2020.org/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: '{"query":"{ allMolecularDBs { id } }"}', signal: AbortSignal.timeout(20_000) }).then((r) => r.ok).catch(() => false));
const first = "2022-08-16_10h14m23s";
const second = "2022-08-16_12h31m33s";
const slow = 600_000;
const cells = (text: string) => text.trim().split("\n").map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "")));

const graphql = `
import json, urllib.request
def q(query, variables=None):
    req = urllib.request.Request("https://metaspace2020.org/graphql", data=json.dumps({"query": query, "variables": variables or {}}).encode(), headers={"Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    if "errors" in r: raise RuntimeError(r["errors"])
    return r["data"]
dbs = q("{ allMolecularDBs { id name version } }")["allMolecularDBs"]
hmdb = [d["id"] for d in dbs if d["name"] == "HMDB" and d["version"] == "v4"][0]
def annotations(ds, level, off=None):
    f = {"databaseId": hmdb, "fdrLevel": level}
    if off is not None: f["offSample"] = off
    rows = q("query($f: AnnotationFilter, $d: DatasetFilter){ allAnnotations(filter:$f, datasetFilter:$d, limit: 5000) { sumFormula adduct offSample } }", {"f": f, "d": {"ids": ds}})["allAnnotations"]
    return rows
`;

describe.skipIf(!online || !existsSync(python))("metaspace against a direct GraphQL query", () => {
  let ms: OpenAdapter;
  beforeAll(async () => {
    ms = await openAdapter("metaspace");
  });
  afterAll(async () => {
    await ms?.close();
  });

  // The METASPACE web service answers a GraphQL query for the annotations of a public dataset. The query here uses urllib and the filter fdrLevel, which keeps the annotations at or below the level.
  test("the annotation counts at 5, 10 and 20 percent, with and without the off-sample ions, equal the direct query", { timeout: slow }, async () => {
    const hand = await pyJson<Record<string, number>>(
      python,
      `${graphql}
out = {}
for level in (0.05, 0.1, 0.2):
    rows = annotations(${JSON.stringify(first)}, level)
    k = str(round(level * 100))
    out["n" + k] = len(rows); out["off" + k] = sum(1 for r in rows if r["offSample"]); out["on" + k] = len(annotations(${JSON.stringify(first)}, level, False))
print(json.dumps(out))`,
    );
    const counts = await ms.run("compare_fdr_counts", { dataset_id: first, database: "HMDB v4" });
    expect(counts.metrics.n_fdr_05).toBe(hand.n5);
    expect(counts.metrics.n_fdr_10).toBe(hand.n10);
    expect(counts.metrics.n_fdr_20).toBe(hand.n20);
    expect(counts.metrics.n_off_sample_fdr_10).toBe(hand.off10);
    const without = await ms.run("compare_fdr_counts", { dataset_id: first, database: "HMDB v4", exclude_off_sample: true });
    expect(without.metrics.n_fdr_10).toBe(hand.on10);
    expect(without.metrics.n_fdr_20).toBe(hand.on20);
    expect(hand.n20).toBeGreaterThanOrEqual(hand.n10);
    expect(hand.n10).toBeGreaterThanOrEqual(hand.n5);
  });

  test("the annotation list holds the same ions as the direct query, and two datasets overlap by the set intersection of the ions", { timeout: slow }, async () => {
    const hand = await pyJson<{ ions: string[]; shared: number; union: number; a: number; b: number }>(
      python,
      `${graphql}
a = {(r["sumFormula"], r["adduct"]) for r in annotations(${JSON.stringify(first)}, 0.1, False)}
b = {(r["sumFormula"], r["adduct"]) for r in annotations(${JSON.stringify(second)}, 0.1, False)}
print(json.dumps({"ions": sorted(f + "|" + d for f, d in a), "shared": len(a & b), "union": len(a | b), "a": len(a), "b": len(b)}))`,
    );
    const list = await ms.run("list_annotations", { dataset_id: first, database: "HMDB v4", fdr: 0.1, exclude_off_sample: true });
    expect(list.data.n_annotations).toBe(hand.ions.length);
    const rows = cells(await readFile((list.table as { path: string }).path, "utf8")).slice(1);
    expect(rows.map((r) => `${r[0]}|${r[1]}`).sort()).toEqual(hand.ions);
    const overlap = await ms.run("overlap_annotations", { dataset_ids: `${first},${second}`, database: "HMDB v4", fdr: 0.1, exclude_off_sample: true });
    expect(overlap.data.n_dataset_1).toBe(hand.a);
    expect(overlap.data.n_dataset_2).toBe(hand.b);
    expect(overlap.data.n_in_all).toBe(hand.shared);
    expect(overlap.data.n_in_union).toBe(hand.union);
  });
});
