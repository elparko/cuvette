import { describe, expect, it } from "vitest";
import { PRICES } from "../src/pricing.ts";
import { answerPrice, loadUpstreams } from "../src/upstreams.ts";
import { OPENAI_MODEL, OPENAI_UPSTREAMS } from "./helpers.ts";

describe("upstream table", () => {
  it("has the Anthropic models from the price table when UPSTREAMS is not set", () => {
    for (const raw of [undefined, null, ""]) {
      const table = loadUpstreams(raw);
      expect([...table.keys()].sort()).toEqual(Object.keys(PRICES).sort());
      for (const [name, up] of table) {
        expect(up).toMatchObject({ kind: "anthropic", baseUrl: "https://api.anthropic.com/v1", keySecretName: "ANTHROPIC_API_KEY", upstreamModel: name, maxOutputTokens: 64000 });
        expect(up.price).toEqual(PRICES[name]);
      }
    }
  });

  it("adds entries from a JSON string and from an object", () => {
    for (const raw of [JSON.stringify(OPENAI_UPSTREAMS), OPENAI_UPSTREAMS]) {
      const table = loadUpstreams(raw);
      expect(table.size).toBe(Object.keys(PRICES).length + 1);
      expect(table.get(OPENAI_MODEL)).toEqual({
        kind: "openai",
        baseUrl: "https://llm.example.test/v1",
        keySecretName: "HOST_API_KEY",
        upstreamModel: "vendor/real-model",
        price: { input: 1, output: 4, cacheRead: 0.1, cacheWrite5m: 0, cacheWrite1h: 0 },
        maxOutputTokens: 8000,
      });
    }
  });

  it("lets an entry replace a default model", () => {
    const entry = { ...OPENAI_UPSTREAMS[OPENAI_MODEL] };
    const table = loadUpstreams({ "claude-sonnet-5-5": entry });
    expect(table.get("claude-sonnet-5-5")!.kind).toBe("openai");
    expect(table.get("claude-opus-5-5")!.kind).toBe("anthropic");
  });

  it("fills the cache price of an openai entry with the input price", () => {
    const { cache_read, ...price } = OPENAI_UPSTREAMS[OPENAI_MODEL].price;
    const table = loadUpstreams({ x: { ...OPENAI_UPSTREAMS[OPENAI_MODEL], price } });
    expect(table.get("x")!.price.cacheRead).toBe(1);
  });

  it("fills the cache write prices of an anthropic entry from the input price", () => {
    const table = loadUpstreams({ x: { ...OPENAI_UPSTREAMS[OPENAI_MODEL], kind: "anthropic", price: { input: 2, output: 10 } } });
    expect(table.get("x")!.price).toEqual({ input: 2, output: 10, cacheRead: 2, cacheWrite5m: 2.5, cacheWrite1h: 4 });
  });

  const good = OPENAI_UPSTREAMS[OPENAI_MODEL];
  const invalid: [string, unknown][] = [
    ["JSON that does not parse", "{nope"],
    ["an array", "[]"],
    ["an entry that is not an object", { x: 5 }],
    ["an unknown kind", { x: { ...good, kind: "gemini" } }],
    ["no base_url", { x: { ...good, base_url: undefined } }],
    ["a base_url that is not a URL", { x: { ...good, base_url: "llm" } }],
    ["a base_url with another protocol", { x: { ...good, base_url: "file:///etc" } }],
    ["a secret name with spaces", { x: { ...good, key_secret_name: "A B" } }],
    ["no upstream_model", { x: { ...good, upstream_model: "" } }],
    ["no price", { x: { ...good, price: undefined } }],
    ["a negative price", { x: { ...good, price: { input: -1, output: 1 } } }],
    ["a price that is not a number", { x: { ...good, price: { input: "1", output: 1 } } }],
    ["no max_output_tokens", { x: { ...good, max_output_tokens: undefined } }],
    ["max_output_tokens of zero", { x: { ...good, max_output_tokens: 0 } }],
  ];
  for (const [name, raw] of invalid) {
    it(`rejects ${name}`, () => {
      expect(() => loadUpstreams(raw)).toThrow();
    });
  }

  it("prices an answering model by public name or by upstream name, for anthropic entries only", () => {
    const table = loadUpstreams({
      ...OPENAI_UPSTREAMS,
      alias: { ...good, kind: "anthropic", upstream_model: "claude-real-1" },
    });
    expect(answerPrice(table, "claude-sonnet-5-5")).toEqual(PRICES["claude-sonnet-5-5"]);
    expect(answerPrice(table, "claude-real-1")!.input).toBe(1);
    expect(answerPrice(table, OPENAI_MODEL)).toBeUndefined();
    expect(answerPrice(table, "constructor")).toBeUndefined();
  });
});
