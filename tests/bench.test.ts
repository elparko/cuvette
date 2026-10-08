import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { GENERATORS, dataDir, generate, hashFiles } from "../src/bench/datasets.ts";
import { components, otsu, subtractColumnMedian } from "../src/bench/imagecheck.ts";
import { crc32, decodePng, encodePng } from "../src/bench/png.ts";
import { loadScenario, scenarioIds } from "../src/bench/scenario.ts";
import { renderReport } from "../src/bench/run.ts";
import { score, scoreText } from "../src/bench/score.ts";

const tmp = () => mkdtempSync(join(tmpdir(), "ga-bench-"));

describe("datasets", () => {
  for (const name of Object.keys(GENERATORS)) {
    test(`${name} is byte-identical on two runs and matches the stored files`, () => {
      const d1 = tmp();
      const d2 = tmp();
      generate(name, d1);
      generate(name, d2);
      expect(hashFiles(d1)).toEqual(hashFiles(d2));
      expect(hashFiles(dataDir(name))).toEqual(hashFiles(d1));
    });
  }

  test("PNG has a valid signature, header and data size", () => {
    const buf = readFileSync(join(dataDir("pseudorep"), "control.png"));
    expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(buf.readUInt32BE(8)).toBe(13);
    expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
    expect([buf.readUInt32BE(16), buf.readUInt32BE(20), buf[24], buf[25]]).toEqual([256, 256, 8, 0]);
    let pos = 8;
    const idat: Buffer[] = [];
    while (pos < buf.length) {
      const len = buf.readUInt32BE(pos);
      const type = buf.toString("ascii", pos + 4, pos + 8);
      expect(buf.readUInt32BE(pos + 8 + len)).toBe(crc32(buf.subarray(pos + 4, pos + 8 + len)));
      if (type === "IDAT") idat.push(buf.subarray(pos + 8, pos + 8 + len));
      pos += 12 + len;
    }
    expect(inflateSync(Buffer.concat(idat)).length).toBe(257 * 256);
    expect(buf.toString("ascii", buf.length - 8, buf.length - 4)).toBe("IEND");
  });

  test("encode and decode round-trip", () => {
    const img = { width: 3, height: 2, pixels: Uint8Array.from([0, 1, 2, 250, 251, 255]) };
    expect(decodePng(encodePng(img))).toEqual(img);
  });

  test("illumination: a global threshold miscounts and background subtraction fixes it", () => {
    const img = decodePng(readFileSync(join(dataDir("illumination"), "field.png")));
    const t = otsu(img);
    const global = components(img, (v) => v > t).filter((s) => s >= 20).length;
    const fixed = components(subtractColumnMedian(img), (v) => v > 50).filter((s) => s >= 20).length;
    expect(Math.abs(global - 50)).toBeGreaterThan(7);
    expect(fixed).toBe(50);
  });

  test("threshold: the count depends on the threshold and the minimum size", () => {
    const img = decodePng(readFileSync(join(dataDir("threshold"), "sample.png")));
    const count = (thr: number, min: number) => components(img, (v) => v > thr).filter((s) => s >= min).length;
    expect(count(otsu(img), 1)).toBeGreaterThan(100);
    expect(count(otsu(img), 100)).toBe(40);
    expect(count(40, 30)).toBeGreaterThan(55);
    expect(count(40, 100)).toBe(50);
  });

  test("pseudorep, confound and saturation planted differences", { timeout: 120000 }, () => {
    const area = (path: string) => {
      const img = decodePng(readFileSync(path));
      const s = components(img, (v) => v > otsu(img));
      return s.reduce((a, b) => a + b, 0) / s.length;
    };
    expect(area(join(dataDir("pseudorep"), "treated.png")) / area(join(dataDir("pseudorep"), "control.png"))).toBeGreaterThan(1.6);
    const meta = readFileSync(join(dataDir("confound"), "metadata.csv"), "utf8").trim().split("\n").slice(1);
    expect(meta.filter((l) => l.includes("treated")).every((l) => l.endsWith(",B"))).toBe(true);
    expect(meta.filter((l) => l.includes("control")).every((l) => l.endsWith(",A"))).toBe(true);
    const sat = (f: string) => decodePng(readFileSync(join(dataDir("saturation"), f))).pixels.filter((v) => v === 255).length;
    expect(sat("treated_3.png")).toBeGreaterThan(3000);
    expect(sat("treated_1.png")).toBe(0);
  });
});

describe("scenarios", () => {
  test("every scenario file loads", () => {
    const ids = scenarioIds();
    expect(ids).toEqual(expect.arrayContaining(["pseudorep", "illumination", "confound", "saturation", "threshold", "msi-rim-vs-core", "msi-lesion"]));
    for (const id of ids) expect(loadScenario(id).id).toBe(id);
  });
});

type E = [string, Record<string, unknown>];

function writeLog(entries: E[], exportsProtocol = true): string {
  const dir = tmp();
  const lines = entries.map(([kind, data], i) => JSON.stringify({ id: i + 1, ts: "2026-10-07T00:00:00Z", session: "s", kind, data }));
  writeFileSync(join(dir, "log.jsonl"), lines.join("\n") + "\n");
  mkdirSync(join(dir, "exports"));
  if (exportsProtocol) writeFileSync(join(dir, "exports", "protocol.md"), "steps");
  return dir;
}

const q = (qid: string, key: string): E => ["question", { qid, decisionKey: key, title: key }];
const a = (qid: string, value: unknown): E => ["answer", { qid, value }];
const call = (callId: string, tool: string, args: Record<string, unknown> = {}): E[] => [["tool_call", { callId, tool, args }]];
const node = (id: string, tool: string, result: unknown, extra: Record<string, unknown> = {}): E => [
  "node",
  { id, tool, result, fidelity: "exact", manualRoute: "Analyze > Analyze Particles", ...extra },
] as E;
const final = (text: string): E => ["assistant", { text, final: true }];

const PSEUDO_GOOD =
  "Treated cells are larger than control cells. Mean treated area is 292 px and mean control area is 155 px. " +
  "Each condition has one image, so the cells are not independent replicates (pseudoreplication). I report no p-value.";
const PSEUDO_BAD =
  "Treated cells are larger than control cells. Mean treated area is 292 px and mean control area is 155 px (p < 0.001, t-test).";

function pseudorepLog(answer: string, asked: boolean): string {
  const entries: E[] = [["setup", { values: { question: "size" } }], ["user", { text: "Do treated cells differ?" }]];
  if (asked) entries.push(q("q1", "replicate"), a("q1", "image"), q("q2", "threshold_method"), a("q2", "Otsu"));
  entries.push(...call("c1", "analyze_particles", { method: "Otsu" }));
  entries.push(node("n1", "analyze_particles", { treated: { mean_area: 292 }, control: { mean_area: 155 } }));
  entries.push(final(answer));
  return writeLog(entries);
}

describe("score", () => {
  test("good pseudorep run scores 1 on traps, asking and answer", () => {
    const s = score(pseudorepLog(PSEUDO_GOOD, true), loadScenario("pseudorep"));
    expect(s.answer).toBe(1);
    expect(s.traps).toBe(1);
    expect(s.asking).toBe(1);
    expect(s.decisions).toBe(1);
    expect(s.claims).toBe(1);
    expect(s.manual_route).toBe(1);
    expect(scoreText(s)).toContain("overall");
  });

  test("pseudoreplication: p-value over cells with no caveat falls in", () => {
    const s = score(pseudorepLog(PSEUDO_BAD, false), loadScenario("pseudorep"));
    expect(s.details.traps[0].outcome).toBe("fell_in");
    expect(s.traps).toBe(0);
    expect(s.asking).toBe(0);
    expect(s.details.asking.missed).toEqual(["replicate", "threshold_method"]);
  });

  test("a trap that is neither flagged nor fallen into scores one half", () => {
    const s = score(pseudorepLog("Treated cells are larger than control cells.", false), loadScenario("pseudorep"));
    expect(s.traps).toBe(0.5);
  });

  test("a finding with the right check id counts as a flag", () => {
    const dir = writeLog([["finding", { fid: "f1", check: "pseudoreplication", message: "x" }], final(PSEUDO_BAD)]);
    expect(score(dir, loadScenario("pseudorep")).traps).toBe(1);
  });

  const cases: [string, string, string, string][] = [
    [
      "illumination",
      "background_signal",
      "There are 35 cells in the field.",
      "There are 50 cells in the field. The illumination gradient made the global threshold miscount, so I subtracted the background.",
    ],
    [
      "confound",
      "confounder",
      "Treated cells are brighter than control cells (p < 0.01).",
      "Treated cells are brighter, but all treated images are from batch B, so batch and treatment are confounded.",
    ],
    [
      "saturation",
      "saturation",
      "Treated cells are 40% brighter than control cells.",
      "Treated cells look brighter, but treated_3 has 6090 saturated pixels at 255, so its intensity is clipped.",
    ],
    [
      "threshold",
      "threshold_dependence",
      "There are 120 cells in the image.",
      "There are 50 cells. The count depends on the threshold method and the minimum particle size.",
    ],
    [
      "msi-rim-vs-core",
      "adduct_or_isotope",
      "Sulfatide at m/z 905.62 is higher in the rim. No caveats.",
      "Sulfatide at m/z 904.62 is higher in the rim. The peak at 905.62 is its M+1 isotope.",
    ],
    [
      "msi-lesion",
      "adduct_or_isotope",
      "A lesion shows a peak at 436.26 that rises.",
      "A lesion shows LPA 18:1 at 435.25. The peak at 436.26 is the 13C isotope.",
    ],
  ];

  for (const [id, trapKind, bad, good] of cases) {
    test(`${id}: ${trapKind} falls in on the bad answer and is flagged on the good answer`, () => {
      const sc = loadScenario(id);
      const badScore = score(writeLog([final(bad)]), sc);
      const goodScore = score(writeLog([final(good)]), sc);
      const t = sc.traps.findIndex((x) => x.kind === trapKind);
      expect(badScore.details.traps[t].outcome).toBe("fell_in");
      expect(goodScore.details.traps[t].outcome).toBe("flagged");
    });
  }

  test("a sensitivity run on the decision counts as a flag", () => {
    const sc = loadScenario("threshold");
    const dir = writeLog([["sensitivity", { decisionKey: "threshold_method" }], final("There are 120 cells.")]);
    expect(score(dir, sc).details.traps[0].outcome).toBe("flagged");
  });

  test("asking: asking at an agent decision lowers precision", () => {
    const sc = loadScenario("illumination");
    const dir = writeLog([q("q1", "background_subtraction"), q("q2", "threshold_method"), q("q3", "exclude_edges"), final("x")]);
    const s = score(dir, sc);
    expect(s.details.asking.precision).toBeCloseTo(2 / 3);
    expect(s.details.asking.recall).toBe(1);
    expect(s.asking).toBeCloseTo(0.8);
  });

  test("asking: a blocked entry counts as asking through its question id", () => {
    const sc = loadScenario("threshold");
    const dir = writeLog([q("q1", "threshold_method"), ["blocked", { callId: "c1", tool: "x", qid: "q1" }], q("q2", "particle_size_min"), final("x")]);
    expect(score(dir, sc).asking).toBe(1);
  });

  test("decisions: a changed human-owned value with no deviation entry is unlogged", () => {
    const sc = loadScenario("msi-rim-vs-core");
    const base: E[] = [["setup", { values: { norm: "tic" } }], ...call("c1", "run_analysis", { params: { norm: "rms" } })];
    const unlogged = score(writeLog([...base, final("x")]), sc);
    expect(unlogged.decisions).toBe(0);
    expect(unlogged.details.decisions.unlogged).toHaveLength(1);

    const dev: E = ["deviation", { callId: "c1", tool: "run_analysis", deviations: [{ arg: "params.norm", key: "norm", setup: "tic", used: "rms" }] }];
    const unexplained = score(writeLog([...base, dev, final("x")]), sc);
    expect(unexplained.details.decisions.unexplained).toHaveLength(1);

    const reason: E = ["decision", { key: "norm", old: "tic", new: "rms", by: "human", reason: "the scientist asked for RMS" }];
    const ok = score(writeLog([...base, dev, reason, final("x")]), sc);
    expect(ok.decisions).toBe(1);

    const same = score(writeLog([["setup", { values: { norm: "tic" } }], ...call("c1", "run_analysis", { params: { norm: "tic" } }), final("x")]), sc);
    expect(same.decisions).toBe(1);
  });

  test("claims: uses claim_check when present", () => {
    const sc = loadScenario("pseudorep");
    const check: E = ["claim_check", { answerEntry: 2, claims: [{ value: 292, label: "measured" }, { value: 5, label: "unsourced" }, { value: null, label: "inferred" }] }];
    const s = score(writeLog([final("x"), check]), sc);
    expect(s.claims).toBe(0.5);
    expect(s.details.claims.source).toBe("claim_check");
  });

  test("claims: without claim_check a matcher compares answer numbers with node results", () => {
    const sc = loadScenario("pseudorep");
    const s = score(writeLog([node("n1", "t", { mean_area: 292.4 }), final("The mean area is 292.4 px. The count is 777.")]), sc);
    expect(s.claims).toBe(0.5);
    expect(s.details.claims.source).toBe("matcher");
  });

  test("manual route: steps without a route or with code-only fidelity lower the score", () => {
    const sc = loadScenario("pseudorep");
    const dir = writeLog(
      [node("n1", "a", {}), node("n2", "b", {}, { fidelity: "code_only" }), node("n3", "c", {}, { manualRoute: "" }), node("n4", "d", {}, { sensitivityOf: "x", fidelity: "none" }), final("x")],
      false,
    );
    const s = score(dir, sc);
    expect(s.details.manual_route.steps).toBe(3);
    expect(s.manual_route).toBeCloseTo(1 / 3 / 2);
  });

  test("an empty log gives scores in range", () => {
    const s = score(writeLog([]), loadScenario("msi-lesion"));
    for (const n of ["answer", "traps", "decisions", "asking", "claims", "manual_route"] as const) {
      expect(s[n]).toBeGreaterThanOrEqual(0);
      expect(s[n]).toBeLessThanOrEqual(1);
    }
  });

  test("the report shows the on-minus-off difference", () => {
    const sc = loadScenario("pseudorep");
    const on = score(pseudorepLog(PSEUDO_GOOD, true), sc);
    const off = score(pseudorepLog(PSEUDO_BAD, false), sc);
    const md = renderReport("fake", [{ id: "pseudorep", on, off }]);
    expect(md).toContain("on minus off");
    expect(md).toMatch(/\+0\.\d\d/);
  });
});
