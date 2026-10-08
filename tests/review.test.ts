import { describe, expect, test } from "vitest";
import { Findings, parseReferee, referee, refereePrompt, runChecks } from "../src/core/review.ts";
import type { Claim, Entry, EntryKind, Provider } from "../src/core/types.ts";

function makeRecord(seed: { kind: EntryKind; data: Record<string, unknown>; node?: string }[] = [], nodes: any[] = [], stale: string[] = []) {
  const entries: Entry[] = seed.map((s, i) => ({ id: i + 1, ts: "", session: "s", kind: s.kind, node: s.node, data: s.data }));
  const record: any = {
    entries: (kinds?: EntryKind[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    append(kind: EntryKind, data: Record<string, unknown>) {
      const e = { id: entries.length + 1, ts: "", session: "s", kind, data } as Entry;
      entries.push(e);
      return e;
    },
    nodes: () => nodes,
    node: (id: string) => nodes.find((n: any) => n.id === id),
    stale: () => new Set(stale),
  };
  return record;
}

function adapter(checks: any[] = [], mod: any = {}, standards = "") {
  return {
    name: "demo",
    manifest: { adapter: { name: "demo" }, checks },
    standardsText: () => standards,
    module: async () => mod,
  } as any;
}

const decisions: any = { values: () => ({ q: "x" }) };

function ctx(record: any, answer: string, over: any = {}) {
  return { record, decisions, adapters: [], answer, claims: [] as Claim[], ...over };
}

describe("Findings", () => {
  test("adds, resolves and restores", () => {
    const record = makeRecord();
    const f = new Findings(record);
    const a = f.add({ check: "c", severity: "warning", message: "m", entries: [3] }, "rule");
    f.add({ check: "d", severity: "info", message: "n" }, "referee");
    expect(a.fid).toBe("f1");
    f.resolve("f1", "reject", "not relevant");
    expect(record.entries(["finding_resolution"])).toHaveLength(1);
    const again = new Findings(record);
    expect(again.list().map((x) => [x.fid, x.status])).toEqual([["f1", "rejected"], ["f2", "open"]]);
    expect(again.list("open")).toHaveLength(1);
    expect(again.add({ check: "e", severity: "info", message: "z" }, "hook").fid).toBe("f3");
  });
});

describe("runChecks", () => {
  test("failed step not repeated, repeated ok", async () => {
    const seed: any[] = [
      { kind: "tool_call", data: { callId: "a", tool: "load" } },
      { kind: "tool_result", data: { callId: "a", tool: "load", ok: false, error: "boom" } },
      { kind: "tool_call", data: { callId: "b", tool: "fit" } },
      { kind: "tool_result", data: { callId: "b", tool: "fit", ok: false } },
      { kind: "tool_call", data: { callId: "c", tool: "fit" } },
      { kind: "tool_result", data: { callId: "c", tool: "fit", ok: true } },
    ];
    const out = await runChecks(ctx(makeRecord(seed), "done"));
    expect(out).toHaveLength(1);
    expect(out[0].message).toContain("Step 1 (load) failed and was not repeated");
  });

  test("deviation not mentioned", async () => {
    const seed: any[] = [{ kind: "deviation", data: { tool: "fit", deviations: [{ arg: "params.tol", key: "tolerance", setup: 5, used: 9 }] } }];
    expect(await runChecks(ctx(makeRecord(seed), "all fine"))).toHaveLength(1);
    expect(await runChecks(ctx(makeRecord(seed), "I changed the tolerance"))).toHaveLength(0);
  });

  test("p value without effect size", async () => {
    const out = await runChecks(ctx(makeRecord(), "The groups differ, p = 0.01."));
    expect(out.map((f) => f.check)).toEqual(["p_without_effect"]);
    expect(await runChecks(ctx(makeRecord(), "AUC 0.9, p = 0.01."))).toHaveLength(0);
  });

  test("unsourced and stale numbers", async () => {
    const claims: Claim[] = [
      { text: "t", value: 3.7, label: "unsourced" },
      { text: "t", value: 0.8, label: "measured", node: "n2" },
    ];
    const out = await runChecks(ctx(makeRecord([], [], ["n2"]), "x", { claims }));
    expect(out.map((f) => [f.check, f.severity])).toEqual([
      ["unsourced_numbers", "error"],
      ["stale_used", "error"],
    ]);
  });

  test("open questions with a conclusion", async () => {
    const seed: any[] = [
      { kind: "question", data: { qid: "q1" } },
      { kind: "question", data: { qid: "q2" } },
      { kind: "answer", data: { qid: "q1" } },
    ];
    const out = await runChecks(ctx(makeRecord(seed), "We conclude the effect is real."));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ check: "open_questions", severity: "info", entries: [2] });
  });

  test("manifest rule and adapter module checks", async () => {
    const nodes = [
      { id: "n1", entry: 4, adapter: "demo", tool: "stats", args: { unit: "pixel" } },
      { id: "n2", entry: 6, adapter: "demo", tool: "stats", args: { unit: "animal" } },
    ];
    const checks = [
      { id: "unit", severity: "error", rule: { tool: "stats", arg: "unit", op: "==", value: "pixel", message: "Pixels are not replicates." }, text: "" },
      { id: "custom", severity: "warning", text: "" },
      { id: "broken", severity: "warning", text: "" },
      { id: "lit", severity: "info", text: "Check the claim against the standards." },
    ];
    const mod = {
      checks: {
        custom: (c: any) => [{ check: "custom", severity: "warning", message: `answer ${c.answer} q=${c.decisions.q}` }],
        broken: () => {
          throw new Error("bad");
        },
      },
    };
    const out = await runChecks(ctx(makeRecord([], nodes), "hi", { adapters: [adapter(checks, mod)] }));
    expect(out[0]).toMatchObject({ check: "unit", severity: "error", nodes: ["n1"], message: "Pixels are not replicates." });
    expect(out[1].message).toBe("answer hi q=x");
    expect(out[2].message).toBe("check broken failed to run: bad");
    expect(out).toHaveLength(3);
  });
});

describe("referee", () => {
  const seed: any[] = [
    { kind: "setup", data: { values: { question: "Does X differ?" } } },
    { kind: "tool_call", data: { callId: "a", tool: "stats", args: { n: 3 } } },
    { kind: "tool_result", data: { callId: "a", tool: "stats", ok: true, summary: "AUC 0.8", manualRoute: "Menu A" } },
  ];

  test("prompt carries log, text checks and standards but nothing else", () => {
    const checks = [{ id: "lit", severity: "info", text: "Check literature." }];
    const { system, text } = refereePrompt(ctx(makeRecord(seed), "Answer here", { adapters: [adapter(checks, {}, "Use replicates.")] }));
    expect(system).toContain("lit: Check literature.");
    expect(system).toContain("Use replicates.");
    expect(text).toContain("#3 step 1 result of stats: ok AUC 0.8; manual route: Menu A");
    expect(text).toContain("Answer here");
  });

  test("the log shows script output and labels comparison runs", () => {
    const more: any[] = [
      ...seed,
      { kind: "tool_call", data: { callId: "b", tool: "run_script", args: { code: "print(1)" } } },
      { kind: "tool_result", data: { callId: "b", tool: "run_script", ok: true, summary: "The script finished.", text: "n= 47 mean= 382.1" } },
      { kind: "tool_result", data: { callId: "b.s1", tool: "stats", ok: true, summary: "AUC 0.6", sensitivityOf: "method" } },
    ];
    const { text } = refereePrompt(ctx(makeRecord(more), "x"));
    expect(text).toContain("printed output: n= 47 mean= 382.1");
    expect(text).toContain("#6 comparison run for method result of stats: ok AUC 0.6");
  });

  test("the log gives the referee the table rows, the output files and the full summary of a step", () => {
    const long = `Mixed model current ~ C(lps) * C(time). ${"Intercept 6.238 (se 0.2363); ".repeat(12)}C(lps)[T.1]:C(time)[T.3] -0.9055 (se 0.3188).`;
    const rows = Array.from({ length: 25 }, (_, i) => [`term${i}`, -1.786 + i, 0.3157, 0.0045, -2.404, -1.167]);
    const node = { id: "n5", entry: 2, tool: "fit_mixed_model", outputs: [{ name: "mixed_model.csv", path: "/w/mixed_model.csv", kind: "table" }], result: { metrics: { n: 151 }, table: { columns: ["term", "coef", "se", "p", "ci_lo", "ci_hi"], rows } } };
    const rec = makeRecord(
      [
        { kind: "tool_call", data: { callId: "m", tool: "fit_mixed_model", args: {} } },
        { kind: "tool_result", node: "n5", data: { callId: "m", tool: "fit_mixed_model", ok: true, summary: long } },
      ],
      [node],
    );
    const { system, text } = refereePrompt(ctx(rec, "x"));
    expect(long.length).toBeGreaterThan(300);
    expect(text).toContain("C(lps)[T.1]:C(time)[T.3] -0.9055 (se 0.3188).");
    expect(text).toContain("table term, coef, se, p, ci_lo, ci_hi (first 20 of 25 rows): term0, -1.786, 0.3157, 0.0045, -2.404, -1.167 | term1,");
    expect(text).not.toContain("term20,");
    expect(text).toContain("output files mixed_model.csv");
    expect(system).toMatch(/"measured n5"\) means that the claim check found\nthe number in the logged result of that node/);
  });

  test("a plain no-findings reply gives no finding", () => {
    expect(parseReferee("No findings.")).toEqual([]);
    expect(parseReferee("none")).toEqual([]);
  });

  test("parses fenced JSON lines and arrays", () => {
    const lines = '```json\n{"severity":"warning","message":"A","entries":[3]}\n{"severity":"bogus","message":"B"}\n```';
    expect(parseReferee(lines)).toEqual([
      { check: "referee", severity: "warning", message: "A", entries: [3] },
      { check: "referee", severity: "info", message: "B", entries: undefined },
    ]);
    expect(parseReferee('[{"severity":"error","message":"C","entries":["#2"]}]')[0]).toMatchObject({ severity: "error", entries: [2] });
    expect(parseReferee("[]")).toEqual([]);
  });

  test("malformed output becomes one info finding", async () => {
    const provider = { complete: async () => "  I think it is fine overall.  " } as unknown as Provider;
    const out = await referee(provider, ctx(makeRecord(seed), "a"));
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe("info");
    expect(out[0].message).toContain("I think it is fine overall.");
  });
});

test("an answer that names the wrong choice of a decision is an error", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const adapter = { name: "x", manifest: { decisions: [{ key: "m", label: "Threshold method", kind: "choice", choices: ["Default", "Otsu"] }], checks: [] }, module: async () => ({}) };
  const ctx = { record: { entries: () => [], nodes: () => [], stale: () => new Set() }, decisions: { values: () => ({ m: "Default" }) }, adapters: [adapter], answer: "We used the Otsu method.", claims: [] };
  const found = await run(ctx as never);
  expect(found.find((f) => f.check === "decision_misreported")?.severity).toBe("error");
});

test("significant with no test in the record is an error", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const record = { entries: () => [], nodes: () => [{ id: "n1", result: { metrics: { mean_area: 3 } } }], numbers: () => [{ node: "n1", path: "metrics.mean_area", value: 3 }], stale: () => new Set() };
  const ctx = { record, decisions: { values: () => ({}) }, adapters: [], answer: "The treated cells are significantly larger.", claims: [] };
  expect((await run(ctx as never)).some((f) => f.check === "significance_without_test" && f.severity === "error")).toBe(true);
  const ok = { ...ctx, answer: "The treated cells are larger. No statistical test was run." };
  expect((await run(ok as never)).some((f) => f.check === "significance_without_test")).toBe(false);
});

test("a choice word in a sentence about something else is not a misreport", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const adapter = { name: "x", manifest: { decisions: [{ key: "norm", label: "Normalization", kind: "choice", choices: ["tic", "rms", "none"] }], checks: [] }, module: async () => ({}) };
  const record = { entries: () => [], nodes: () => [], numbers: () => [], stale: () => new Set() };
  const base = { record, decisions: { values: () => ({ norm: "none" }) }, adapters: [adapter], claims: [] };
  const fine = await run({ ...base, answer: "The total ion current (TIC) image is bright at the rim. Normalization: none." } as never);
  expect(fine.some((f) => f.check === "decision_misreported")).toBe(false);
  const wrong = await run({ ...base, answer: "We used TIC normalization." } as never);
  expect(wrong.some((f) => f.check === "decision_misreported")).toBe(true);
});

test("a number from the comparison run of the chosen value is not flagged; another option's is", async () => {
  const nodes = [
    { id: "n2", tool: "count", args: { method: "Default" }, sensitivityOf: "method" },
    { id: "n3", tool: "count", args: { method: "Otsu" }, sensitivityOf: "method" },
  ];
  const record = makeRecord([], nodes);
  const dec: any = { values: () => ({ method: "Default" }), value: (k: string) => (k === "method" ? "Default" : undefined) };
  const claims: Claim[] = [{ text: "46 cells", value: 46, label: "measured", node: "n2" } as Claim];
  const ok = await runChecks(ctx(record, "There are 46 cells.", { decisions: dec, claims }));
  expect(ok.some((f) => f.check === "number_from_comparison")).toBe(false);
  const bad = await runChecks(ctx(record, "There are 50 cells.", { decisions: dec, claims: [{ text: "50 cells", value: 50, label: "measured", node: "n3" } as Claim] }));
  expect(bad.some((f) => f.check === "number_from_comparison")).toBe(true);
});

test("a sentence that says comparison is not a misreport and its numbers are not flagged", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const adapter = { name: "x", manifest: { decisions: [{ key: "db", label: "Molecular database", kind: "choice", choices: ["LipidMaps", "HMDB v4"] }], checks: [] }, module: async () => ({}) };
  const nodes = [{ id: "n3", tool: "count", args: { db: "HMDB v4" }, sensitivityOf: "db" }];
  const record = { ...makeRecord([], nodes), numbers: () => [] };
  const dec: any = { values: () => ({ db: "LipidMaps" }), value: (k: string) => (k === "db" ? "LipidMaps" : undefined) };
  const claims: Claim[] = [{ text: "In comparison runs with the database HMDB v4, the count was 263.", value: 263, label: "measured", node: "n3" } as Claim];
  const base = { decisions: dec, adapters: [adapter], claims };
  const ok = await run(ctx(record, "In comparison runs with the database HMDB v4, the count was 263.", base) as never);
  expect(ok.some((f) => f.check === "decision_misreported" || f.check === "number_from_comparison")).toBe(false);
  const bad = await run(ctx(record, "The database was HMDB v4 and the count was 263.", { ...base, claims: [{ ...claims[0], text: "The database was HMDB v4 and the count was 263." }] }) as never);
  expect(bad.some((f) => f.check === "decision_misreported")).toBe(true);
  expect(bad.some((f) => f.check === "number_from_comparison")).toBe(true);
});
