import { expect, test } from "vitest";
import type { Entry, ToolContext } from "../src/core/types.ts";
import { literatureTool } from "../src/tools/literature.ts";

const logs: Record<string, unknown>[] = [];
const ctx: ToolContext = { session: "s", callId: "c", workDir: ".", sessionDir: ".", signal: new AbortController().signal, log: (_k, d) => (logs.push(d), { id: 1 } as Entry), callTool: async () => ({ ok: true }) };

const fake = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => {
  const urls: string[] = [];
  const f = (async (url: string) => (urls.push(url), new Response(JSON.stringify(body), { status, headers }))) as unknown as typeof fetch;
  return { f, urls };
};

test("returns short records and logs the background step", async () => {
  const { f, urls } = fake(200, { results: [{ id: "W1", doi: "10.1/x", title: "HIF-1 in cardiomyocytes", abstract: "word ".repeat(200), year: 2020, venue: "Circ Res", citations: 12, is_oa: 1, mesh: "drop me" }] });
  const r = await literatureTool({ fetch: f }).execute({ query: "HIF-1 alpha in hypoxic cardiomyocytes", k: 50, type: "review" }, ctx);
  expect(r.ok).toBe(true);
  expect(urls[0]).toContain("k=20");
  expect(urls[0]).toContain("type=review");
  const s = (r.data as { studies: Record<string, unknown>[] }).studies[0]!;
  expect(s.mesh).toBeUndefined();
  expect(String(s.abstract).length).toBeLessThanOrEqual(500);
  expect(r.text).toContain("https://doi.org/10.1/x");
  expect(logs.at(-1)).toMatchObject({ phase: "Background" });
});

test("reports rate limits and outages without a retry", async () => {
  const busy = fake(429, {}, { "retry-after": "12" });
  expect((await literatureTool({ fetch: busy.f }).execute({ query: "coffee and sleep" }, ctx)).error).toMatch(/Wait 12 s/);
  const down = fake(503);
  expect((await literatureTool({ fetch: down.f }).execute({ query: "coffee and sleep" }, ctx)).error).toMatch(/HTTP 503.*without background/);
  expect(busy.urls.length + down.urls.length).toBe(2);
});

test("refuses a query with patient identifiers", async () => {
  const { f, urls } = fake(200, { results: [] });
  const r = await literatureTool({ fetch: f }).execute({ query: "troponin in patient MRN 12345678 born 03/14/1962" }, ctx);
  expect(r.ok).toBe(false);
  expect(urls).toHaveLength(0);
});

test("is read-only and asks before it sends the query", () => {
  const t = literatureTool();
  expect(t).toMatchObject({ readOnly: true, permission: "ask", source: "harness" });
});
