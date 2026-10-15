import { describe, expect, test } from "vitest";
import { CutReplyError } from "../src/core/types.ts";
import { EmptyReview, Findings, REFEREE_MAX_TOKENS, logText, parseReferee, readsLikeReply, referee, refereePrompt, runChecks } from "../src/core/review.ts";
import type { Claim, Entry, EntryKind, Provider } from "../src/core/types.ts";

function makeRecord(seed: { kind: EntryKind; data: Record<string, unknown>; node?: string }[] = [], nodes: any[] = [], stale: string[] = []) {
  const entries: Entry[] = seed.map((s, i) => ({ id: i + 1, ts: "", session: "s", kind: s.kind, node: s.node, data: s.data }));
  const record: any = {
    entries: (kinds?: EntryKind[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    live: (kinds?: EntryKind[]) => entries.filter((e) => !kinds || kinds.includes(e.kind)),
    rewound: () => new Set(),
    setAside: () => false,
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

describe("test families and power", () => {
  const test1 = (id: string, p: number) => ({
    id,
    tool: "compare_two_groups",
    args: { path: "/d/sleep.csv" },
    inputFiles: [{ path: "/d/sleep.csv" }],
    result: { metrics: { p_value: p, n_a: 200, n_b: 200, statistic: 3, mean_diff: 1 }, data: { test: "Welch t-test" } },
  });
  const nodes = [test1("n1", 0.01), test1("n2", 0.04), test1("n3", 0.03)];
  const claim = (node: string, value: number): Claim => ({ text: `The difference has p = ${value}.`, value, label: "measured", node });
  const answer = "Cohen d = 0.3 (95% CI 0.1 to 0.5), p = 0.01.";

  test("a raw p value from a family of three tests", async () => {
    const out = await runChecks(ctx(makeRecord([], nodes), answer, { claims: [claim("n1", 0.01)] }));
    expect(out.map((f) => f.check)).toEqual(["family_uncorrected"]);
    expect(out[0].severity).toBe("warning");
    expect(out[0].message).toMatch(/3 tests on sleep\.csv/);
    expect(out[0].message).toMatch(/test_correction/);
  });

  test("no finding if the answer names a correction", async () => {
    const out = await runChecks(ctx(makeRecord([], nodes), answer + " Holm p = 0.03.", { claims: [claim("n1", 0.01)] }));
    expect(out).toHaveLength(0);
  });

  test("no finding if the scientist said the extra tests were not part of the analysis", async () => {
    const seed = [{ kind: "decision" as EntryKind, data: { key: "test_correction", new: "not_part_of_analysis" } }];
    const out = await runChecks(ctx(makeRecord(seed, nodes), answer, { claims: [claim("n1", 0.01)] }));
    expect(out).toHaveLength(0);
  });

  test("a chosen correction asks for the corrected value", async () => {
    const seed = [{ kind: "decision" as EntryKind, data: { key: "test_correction", new: "holm" } }];
    const out = await runChecks(ctx(makeRecord(seed, nodes), answer, { claims: [claim("n1", 0.01)] }));
    expect(out[0].message).toMatch(/Report the corrected p value: 0\.03/);
  });

  test("no finding for a single test", async () => {
    const out = await runChecks(ctx(makeRecord([], [nodes[0]]), answer, { claims: [claim("n1", 0.01)] }));
    expect(out).toHaveLength(0);
  });

  test("a small sample gives a note", async () => {
    const small = { ...test1("n1", 0.0028), result: { metrics: { p_value: 0.0028, n_a: 10, n_b: 10, statistic: 4.0621, mean_diff: 1.58 }, data: { test: "paired t-test" } } };
    const out = await runChecks(ctx(makeRecord([], [small]), answer));
    expect(out.map((f) => [f.check, f.severity])).toEqual([["low_power", "info"]]);
    expect(out[0].message).toMatch(/^With 10 pairs/);
  });

  test("the finding names what the record holds", async () => {
    const held = { ...nodes[0], result: { metrics: { p_value: 0.01, mean_diff: 1.58, ci_lo: 0.7, ci_hi: 2.46, effect_size: 1.28 }, data: { test: "Welch t-test" } } };
    const out = await runChecks(ctx(makeRecord([], [held]), "Drug 2 is better, p = 0.01.", { claims: [claim("n1", 0.01)] }));
    expect(out.find((f) => f.check === "p_without_effect")!.message).toMatch(/step 1 holds mean_diff = 1\.58, effect_size = 1\.28/);
    expect(out.find((f) => f.check === "p_without_interval")!.message).toMatch(/ci_lo = 0\.7, ci_hi = 2\.46/);
  });
});

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

  test("a finding from a rewound answer is not listed, before or after a reload", () => {
    const record = makeRecord();
    const f = new Findings(record);
    f.add({ check: "c", severity: "warning", message: "kept" }, "rule");
    f.add({ check: "d", severity: "warning", message: "rewound" }, "rule");
    record.setAside = (id: number) => id === 2;
    expect(f.list("open").map((x) => x.message)).toEqual(["kept"]);
    expect(f.list().map((x) => x.message)).toEqual(["kept"]);
    expect(new Findings(record).list("open").map((x) => x.message)).toEqual(["kept"]);
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
    expect(out[0].message).toContain("The call to load failed and was not repeated");
  });

  test("a failed call has no step number, and the step number of a later call is the one that the views show", async () => {
    const seed: any[] = [
      { kind: "tool_call", data: { callId: "a", tool: "count" } },
      { kind: "tool_result", data: { callId: "a", tool: "count", ok: true }, node: "n1" },
      { kind: "tool_call", data: { callId: "b", tool: "boom" } },
      { kind: "tool_result", data: { callId: "b", tool: "boom", ok: false, error: "exit code 3" } },
      { kind: "tool_call", data: { callId: "c", tool: "plot" } },
      { kind: "tool_result", data: { callId: "c", tool: "plot", ok: false } , node: "n2" },
    ];
    const out = await runChecks(ctx(makeRecord(seed, [{ id: "n1", entry: 2 }, { id: "n2", entry: 6 }]), "done"));
    expect(out.map((f) => f.message.split(" failed")[0])).toEqual(["The call to boom", "Step 2 (plot)"]);
  });

  test("deviation not mentioned", async () => {
    const seed: any[] = [{ kind: "deviation", data: { tool: "fit", deviations: [{ arg: "params.tol", key: "tolerance", setup: 5, used: 9 }] } }];
    expect(await runChecks(ctx(makeRecord(seed), "all fine"))).toHaveLength(1);
    expect(await runChecks(ctx(makeRecord(seed), "I changed the tolerance"))).toHaveLength(0);
  });

  test("p value without effect size", async () => {
    const out = await runChecks(ctx(makeRecord(), "The groups differ, p = 0.01."));
    expect(out.map((f) => f.check)).toEqual(["p_without_effect", "p_without_interval"]);
    expect(await runChecks(ctx(makeRecord(), "AUC 0.9 (95% CI 0.8 to 0.95), p = 0.01."))).toHaveLength(0);
  });

  test("p value with an effect size but no interval", async () => {
    const out = await runChecks(ctx(makeRecord(), "Cohen d = 1.2, p = 0.01."));
    expect(out.map((f) => f.check)).toEqual(["p_without_interval"]);
    expect(out[0].severity).toBe("warning");
  });

  test("the effect size and interval in a neighbor block count", async () => {
    const answer = "Drug 2 gave more sleep, p = 0.003.\n\n| measure | value |\n| --- | --- |\n| mean difference | 1.58 h (95% CI 0.7 to 2.5) |";
    expect(await runChecks(ctx(makeRecord(), answer))).toHaveLength(0);
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

  test("a severity in capitals or mixed case keeps its level", () => {
    const raw = JSON.stringify([{ severity: "ERROR", message: "a" }, { severity: "Warning", message: "b" }, { severity: "loud", message: "c" }]);
    expect(parseReferee(raw).map((f) => f.severity)).toEqual(["error", "warning", "info"]);
  });

  test("a plain no-findings reply gives no finding", () => {
    expect(parseReferee("No findings.")).toEqual([]);
    expect(parseReferee("none")).toEqual([]);
    expect(parseReferee("No findings.\nThe answer follows the log in each part.")).toEqual([]);
    expect(parseReferee("```\nNone.\n```\nChecked all claims.")).toEqual([]);
  });

  test("a first line of none followed by JSON findings gives the findings", () => {
    const got = parseReferee('None.\n{"severity":"warning","message":"The claim has no node."}');
    expect(got.map((f) => f.message)).toEqual(["The claim has no node."]);
  });

  test("a first line of none followed by a pretty-printed object gives the finding", () => {
    const got = parseReferee('None\n{\n  "severity": "warning",\n  "message": "The claim has no node."\n}');
    expect(got.map((f) => f.message)).toEqual(["The claim has no node."]);
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

  test("the referee call carries the output cap and the same effort", async () => {
    let got: { effort?: string; maxTokens?: number; failIfCut?: boolean } | undefined;
    const provider = { complete: async (_s: string, _t: string, _g?: AbortSignal, opts?: { effort?: string; maxTokens?: number; failIfCut?: boolean }) => ((got = opts), "[]") } as unknown as Provider;
    await referee(provider, ctx(makeRecord(seed), "a"));
    expect(got).toEqual({ effort: "low", maxTokens: REFEREE_MAX_TOKENS, failIfCut: true });
      });

  test("the referee prompt asks for five findings of one line each, most severe first", () => {
    const { system } = refereePrompt(ctx(makeRecord(seed), "a"));
    expect(system).toMatch(/at most five findings/);
    expect(system).toMatch(/each finding on one line/);
    expect(system).toMatch(/most severe first/);
  });

  test("the referee call gets the stop signal of the turn", async () => {
    let got: AbortSignal | undefined;
    const provider = { complete: async (_s: string, _t: string, signal?: AbortSignal) => ((got = signal), "[]") } as unknown as Provider;
    const ac = new AbortController();
    await referee(provider, ctx(makeRecord(seed), "a"), ac.signal);
    expect(got).toBe(ac.signal);
  });
});

test("an answer that names the wrong choice of a decision is an error", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const adapter = { name: "x", manifest: { decisions: [{ key: "m", label: "Threshold method", kind: "choice", choices: ["Default", "Otsu"] }], checks: [] }, module: async () => ({}) };
  const ctx = { record: { entries: () => [], live: () => [], nodes: () => [], stale: () => new Set() }, decisions: { values: () => ({ m: "Default" }) }, adapters: [adapter], answer: "We used the Otsu method.", claims: [] };
  const found = await run(ctx as never);
  expect(found.find((f) => f.check === "decision_misreported")?.severity).toBe("error");
});

test("significant with no test in the record is an error", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const record = { entries: () => [], live: () => [], nodes: () => [{ id: "n1", result: { metrics: { mean_area: 3 } } }], numbers: () => [{ node: "n1", path: "metrics.mean_area", value: 3 }], stale: () => new Set() };
  const ctx = { record, decisions: { values: () => ({}) }, adapters: [], answer: "The treated cells are significantly larger.", claims: [] };
  expect((await run(ctx as never)).some((f) => f.check === "significance_without_test" && f.severity === "error")).toBe(true);
  const ok = { ...ctx, answer: "The treated cells are larger. No statistical test was run." };
  expect((await run(ok as never)).some((f) => f.check === "significance_without_test")).toBe(false);
});

test("a choice word in a sentence about something else is not a misreport", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const adapter = { name: "x", manifest: { decisions: [{ key: "norm", label: "Normalization", kind: "choice", choices: ["tic", "rms", "none"] }], checks: [] }, module: async () => ({}) };
  const record = { entries: () => [], live: () => [], nodes: () => [], numbers: () => [], stale: () => new Set() };
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

test("the review gets the approved plan: the referee reads it and the rule checks compare the steps with it", async () => {
  const plan = { steps: [{ step: "Paired t test", tool: "compare_two_groups", status: "todo" }] };
  const record = makeRecord([{ kind: "plan_approved", data: { version: 1, text: "Question: Does drug 2 help?\n\nSteps\n1. Paired t test\n   Tool: compare_two_groups", plan } }], [{ id: "n1", entry: 2, tool: "fit_ols", outputs: [], result: {} }]);
  const { system, text } = refereePrompt(ctx(record, "The answer."));
  expect(system).toContain("Check the final answer against it");
  expect(text).toContain("APPROVED PLAN (version 1)\nQuestion: Does drug 2 help?");
  expect(text).toContain("#1 the scientist approved plan version 1");
  const found = await runChecks(ctx(record, "The answer."));
  expect(found.filter((f) => f.check.startsWith("plan_")).map((f) => f.check)).toEqual(["plan_step_missing", "plan_step_extra"]);
  expect(refereePrompt(ctx(makeRecord(), "x")).text).not.toContain("APPROVED PLAN");
});

test("significant is not an error if the script output shows a p value or a test result names its test", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const answer = "The treated cells are significantly larger.";
  const base = { stale: () => new Set(), numbers: () => [] as unknown[], live: () => [] as unknown[], entries: () => [] as unknown[] };
  const nodes = [{ id: "n1", result: { metrics: { mean_area: 3 } } }];
  const scripted = { ...base, nodes: () => nodes, live: (kinds?: string[]) => [{ id: 1, kind: "tool_result", data: { ok: true, tool: "run_script", text: "Mann-Whitney U = 12.0, p = 0.004" } }].filter((e) => !kinds || kinds.includes(e.kind)) };
  const named = { ...base, nodes: () => [{ id: "n1", result: { data: { test: "Mann-Whitney U" } } }] };
  const none = { ...base, nodes: () => nodes };
  const make = (record: unknown) => ({ record, decisions: { values: () => ({}) }, adapters: [], answer, claims: [] }) as never;
  expect((await run(make(scripted))).some((f) => f.check === "significance_without_test")).toBe(false);
  expect((await run(make(named))).some((f) => f.check === "significance_without_test")).toBe(false);
  expect((await run(make(none))).some((f) => f.check === "significance_without_test")).toBe(true);
});

test("a p value in the text of a read_file result does not count as a test", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const text = "sample,p value\nS1,0.03";
  const record = {
    entries: () => [],
    live: (kinds?: string[]) => [{ id: 1, kind: "tool_result", data: { ok: true, tool: "read_file", text } }].filter((e) => !kinds || kinds.includes(e.kind)),
    nodes: () => [{ id: "n1", result: { metrics: { mean_area: 3 } } }],
    numbers: () => [],
    stale: () => new Set(),
  };
  const ctx = { record, decisions: { values: () => ({}) }, adapters: [], answer: "The treated cells are significantly larger.", claims: [] };
  expect((await run(ctx as never)).some((f) => f.check === "significance_without_test" && f.severity === "error")).toBe(true);
});

describe("an answer that reads like a reply to the referee", () => {
  const found = ["The missing weight is in row S15 and the answer does not say which row.", "The group sizes are not in the answer.", "Mean CRP has no source."];
  test("a numbered first line that quotes a finding is a reply", () => {
    expect(readsLikeReply("1. The missing weight is in row S15, and the answer does not say which row.", found)).toBe(true);
  });
  test("a first line that addresses the referee is a reply", () => {
    expect(readsLikeReply("As the referee noted, the weight is missing.", found)).toBe(true);
    expect(readsLikeReply("The referee is right. The mean is 21 g.", found)).toBe(true);
    expect(readsLikeReply("You are right. The weight is missing.", found)).toBe(true);
    expect(readsLikeReply("I agree with the finding. The weight is missing.", found)).toBe(true);
  });
  test("as noted above counts only after a numbered item", () => {
    expect(readsLikeReply("1. As noted above, the weight is missing.", found)).toBe(true);
    expect(readsLikeReply("As noted above, the mean is 21 g.", found)).toBe(false);
  });
  test("a legitimate numbered answer that shares words with a finding is not a reply", () => {
    expect(readsLikeReply("1. Group sizes: 8 and 9\n2. Missing weight: row S15", found)).toBe(false);
    expect(readsLikeReply("1. The missing weight is row S15. The group sizes are 8 and 9.", found)).toBe(false);
    expect(readsLikeReply("1. The findings support the hypothesis.", found)).toBe(false);
  });
  test("an answer about a review is not a reply", () => {
    expect(readsLikeReply("The review found 12 eligible trials.", found)).toBe(false);
    expect(readsLikeReply("1. The systematic review of 12 trials found a lower risk.", found)).toBe(false);
  });
  test("a short finding is never quoted", () => {
    expect(readsLikeReply("1. Mean CRP has no source.", found)).toBe(false);
  });
  test("an answer that starts with the result is not a reply", () => {
    expect(readsLikeReply("The mean weight is 21 g (n = 17). One animal has no weight.", found)).toBe(false);
  });
});

describe("a referee reply with no text", () => {
  const seed: any[] = [];
  const run = (reply: string) => referee({ complete: async () => reply } as unknown as Provider, ctx(makeRecord(seed), "a"));
  test("an empty reply is an error, not no findings", async () => {
    await expect(run("")).rejects.toBeInstanceOf(EmptyReview);
    await expect(run("  \n ")).rejects.toThrow("The review gave no text. The answer is not checked.");
  });
  test("the line No findings. means a clean answer", async () => {
    expect(await run("No findings.")).toEqual([]);
  });
  const cut = (text: string) => ({ complete: async () => { throw new CutReplyError("cut", text); } }) as unknown as Provider;
  const line = (m: string) => JSON.stringify({ severity: "warning", message: m });
  test("a reply that is cut but has complete finding lines gives those findings and calls the cut callback", async () => {
    let called = 0;
    const got = await referee(cut(`${line("First problem.")}\n${line("Second problem.")}\n{"severity":"warning","mess`), ctx(makeRecord(seed), "a"), undefined, () => called++);
    expect(got.map((f) => f.message)).toEqual(["First problem.", "Second problem."]);
    expect(called).toBe(1);
  });
  test("a reply that is cut with no complete finding line still fails", async () => {
    let called = 0;
    await expect(referee(cut('{"severity":"warning","mess'), ctx(makeRecord(seed), "a"), undefined, () => called++)).rejects.toBeInstanceOf(CutReplyError);
    await expect(referee(cut(""), ctx(makeRecord(seed), "a"))).rejects.toBeInstanceOf(CutReplyError);
    expect(called).toBe(0);
  });
  test("the prompt asks for that exact line", () => {
    expect(refereePrompt(ctx(makeRecord(seed), "a")).system).toContain("No findings.");
  });
  test("the output cap is 8000 tokens", () => {
    expect(REFEREE_MAX_TOKENS).toBe(8000);
  });
});

test("a tool result that says no p value was computed is not a test in the record", async () => {
  const { runChecks: run } = await import("../src/core/review.ts");
  const withText = (text: string) => ({
    record: { entries: () => [], live: (types: string[]) => (types.includes("tool_result") ? [{ data: { ok: true, tool: "run_script", text } }] : []), nodes: () => [], numbers: () => [], stale: () => new Set() },
    decisions: { values: () => ({}) },
    adapters: [],
    answer: "The treated cells are significantly larger.",
    claims: [],
  });
  const flagged = async (text: string) => (await run(withText(text) as never)).some((f) => f.check === "significance_without_test");
  expect(await flagged("mean area 3.1\nno p value computed")).toBe(true);
  expect(await flagged("The test failed to compute a p value")).toBe(true);
  expect(await flagged("Welch t test\np value = 0.03")).toBe(false);
  expect(await flagged("Not a large effect, p = 0.03")).toBe(false);
  expect(await flagged("The tool could not compute a p value")).toBe(true);
  expect(await flagged("There is no p value in the output")).toBe(true);
  expect(await flagged("not adjusted p values: 0.01")).toBe(false);
});

test("the finding and the log text keep the integer digits of a number", async () => {
  const held = { id: "n1", entry: 2, tool: "stats", outputs: [], parents: [], args: {}, result: { metrics: { p_value: 0.01, mean_diff: 12345.67 }, data: { test: "Welch t-test" }, table: { columns: ["a"], rows: [[1234567.89]] } } };
  const seed = [{ kind: "tool_call" as EntryKind, data: { callId: "c1", tool: "stats", args: {} } }, { kind: "tool_result" as EntryKind, data: { callId: "c1", ok: true, summary: "Done." }, node: "n1" }];
  const record = makeRecord(seed, [held]);
  const out = await runChecks(ctx(record, "Drug 2 is better, p = 0.01.", { claims: [{ text: "p = 0.01", value: 0.01, label: "measured", node: "n1" } as Claim] }));
  expect(out.find((f) => f.check === "p_without_effect")!.message).toContain("mean_diff = 12346");
  expect(logText(record)).toContain("1234568");
});
