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
      ["unsourced_numbers", "warning"],
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
