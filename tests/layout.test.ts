import { expect, test } from "vitest";
import { bridgeEdges, layoutGraph } from "../src/server/layout.ts";

const ids = (...a: string[]) => a.map((id) => ({ id }));

test("columns follow the longest path from the roots", () => {
  const l = layoutGraph(ids("a", "b", "c", "d"), [["a", "b"], ["b", "c"], ["a", "c"], ["c", "d"]]);
  expect(["a", "b", "c", "d"].map((i) => l.pos[i].col)).toEqual([0, 1, 2, 3]);
  expect(l.cols).toBe(4);
});

test("a child with two parents sits right of the deeper parent", () => {
  const l = layoutGraph(ids("a", "b", "c", "m"), [["a", "b"], ["b", "m"], ["c", "m"]]);
  expect(l.pos.m.col).toBe(2);
  expect(l.pos.c.col).toBe(0);
});

test("the first child shares the row of its parent and later children get new rows", () => {
  const l = layoutGraph(ids("a", "b", "c", "d"), [["a", "b"], ["a", "c"], ["b", "d"]]);
  expect(l.pos.a.row).toBe(l.pos.b.row);
  expect(l.pos.d.row).toBe(l.pos.b.row);
  expect(l.pos.c.row).toBe(l.pos.b.row + 1);
  const rows = Object.values(l.pos).filter((p) => p.col === 1).map((p) => p.y);
  expect(new Set(rows).size).toBe(rows.length);
});

test("nodes without edges go below the graph in a grid", () => {
  const l = layoutGraph(ids("a", "b", "x", "y", "z"), [["a", "b"]]);
  expect(l.looseY).not.toBeNull();
  for (const i of ["x", "y", "z"]) expect(l.pos[i].y).toBeGreaterThan(l.pos.b.y);
  expect(l.pos.x.x).toBeLessThan(l.pos.y.x);
});

test("comparison roots with one key stay together inside one group box", () => {
  const l = layoutGraph(
    [{ id: "r" }, { id: "s", compare: "m" }, { id: "t", compare: "m" }, { id: "s2", compare: "m" }, { id: "t2", compare: "m" }, { id: "u" }],
    [["r", "u"], ["s", "s2"], ["t", "t2"]],
  );
  expect(l.groups).toHaveLength(1);
  const g = l.groups[0];
  expect(g.ids.sort()).toEqual(["s", "s2", "t", "t2"]);
  for (const id of g.ids) {
    const p = l.pos[id];
    expect(p.x).toBeGreaterThanOrEqual(g.x);
    expect(p.y).toBeGreaterThanOrEqual(g.y);
    expect(p.x + 224).toBeLessThanOrEqual(g.x + g.w);
    expect(p.y + 84).toBeLessThanOrEqual(g.y + g.h);
  }
  for (const id of ["r", "u"]) expect(l.pos[id].y + 84 < g.y || l.pos[id].y > g.y + g.h).toBe(true);
});

test("a cycle does not hang the layout", () => {
  const l = layoutGraph(ids("a", "b"), [["a", "b"], ["b", "a"]]);
  expect(Object.keys(l.pos)).toEqual(["a", "b"]);
});

test("hidden steps are bridged so parents still link to children", () => {
  const edges: [string, string][] = [["a", "h"], ["h", "b"], ["a", "c"]];
  expect(bridgeEdges(ids("a", "h", "b", "c"), edges, new Set(["h"]))).toEqual(expect.arrayContaining([["a", "b"], ["a", "c"]]));
  expect(bridgeEdges(ids("a", "h", "b", "c"), edges, new Set(["h"]))).toHaveLength(2);
});
