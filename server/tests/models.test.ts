import { describe, expect, it } from "vitest";
import { PRICES } from "../src/pricing.ts";
import { OPENAI_MODEL, addAccount, call, makeEnv, makeOpenAiEnv } from "./helpers.ts";

describe("GET /v1/models", () => {
  it("lists the public model names with nothing else", async () => {
    const env = makeOpenAiEnv();
    const acct = await addAccount(env, 0);
    const { res } = await call(env, "/v1/models", { headers: { authorization: `Bearer ${acct.token}` } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.object).toBe("list");
    expect(body.data.map((m: any) => m.id).sort()).toEqual([...Object.keys(PRICES), OPENAI_MODEL].sort());
    for (const m of body.data) expect(Object.keys(m).sort()).toEqual(["id", "object", "owned_by"]);
    const text = JSON.stringify(body);
    for (const hidden of ["price", "input", "output", "base_url", "llm.example.test", "vendor/real-model", "HOST_API_KEY", "ANTHROPIC_API_KEY", "max_output_tokens", "anthropic.com"]) expect(text).not.toContain(hidden);
  });

  it("lists the default Anthropic models when UPSTREAMS is not set", async () => {
    const env = makeEnv();
    const acct = await addAccount(env, 0);
    const body = (await (await call(env, "/v1/models", { headers: { authorization: `Bearer ${acct.token}` } })).res.json()) as any;
    expect(body.data.map((m: any) => m.id).sort()).toEqual(Object.keys(PRICES).sort());
  });

  it("answers 401 without a token", async () => {
    expect((await call(makeEnv(), "/v1/models")).res.status).toBe(401);
  });

  it("answers 500 without details when UPSTREAMS is not valid", async () => {
    const env = makeEnv({ UPSTREAMS: "{nope" });
    const acct = await addAccount(env, 0);
    const { res } = await call(env, "/v1/models", { headers: { authorization: `Bearer ${acct.token}` } });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("UPSTREAMS");
  });
});
