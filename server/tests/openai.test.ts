import { describe, expect, it } from "vitest";
import { OpenAiUsage, openAiTokens } from "../src/openai.ts";
import { chunk } from "./helpers.ts";

const enc = new TextEncoder();

describe("openAiTokens", () => {
  it("splits cached tokens out of the prompt tokens", () => {
    expect(openAiTokens({ prompt_tokens: 1000, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 600 } })).toEqual({ input: 400, output: 50, cacheRead: 600, cacheWrite5m: 0, cacheWrite1h: 0 });
  });

  it("works without prompt_tokens_details", () => {
    expect(openAiTokens({ prompt_tokens: 10, completion_tokens: 5 })).toEqual({ input: 10, output: 5, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 });
    expect(openAiTokens({ prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: null })!.cacheRead).toBe(0);
  });

  it("never lets cached tokens exceed the prompt tokens", () => {
    expect(openAiTokens({ prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 99 } })).toMatchObject({ input: 0, cacheRead: 10 });
  });

  it("returns nothing for missing or bad usage", () => {
    for (const u of [undefined, null, 5, {}, { prompt_tokens: 1 }, { completion_tokens: 1 }, { prompt_tokens: -1, completion_tokens: 1 }, { prompt_tokens: "1", completion_tokens: 1 }]) {
      expect(openAiTokens(u)).toBeUndefined();
    }
  });
});

describe("OpenAiUsage", () => {
  const text =
    chunk({ choices: [{ delta: { content: "Hi" } }], usage: null }) +
    chunk({ choices: [], usage: { prompt_tokens: 20, completion_tokens: 7 } }) +
    chunk("[DONE]");

  it("reads the usage chunk and the end marker across chunk edges", () => {
    for (const size of [1, 5, 64, 10000]) {
      const u = new OpenAiUsage();
      const bytes = enc.encode(text);
      for (let i = 0; i < bytes.length; i += size) u.push(bytes.slice(i, i + size));
      expect(u.tokens).toMatchObject({ input: 20, output: 7 });
      expect(u.done).toBe(true);
    }
  });

  it("reads CRLF line ends and comment lines", () => {
    const u = new OpenAiUsage();
    u.push(enc.encode(`: keep-alive\n\n${text}`.replace(/\n/g, "\r\n")));
    expect(u.tokens).toMatchObject({ input: 20, output: 7 });
    expect(u.done).toBe(true);
  });

  it("keeps the last usage and ignores chunks that are not JSON", () => {
    const u = new OpenAiUsage();
    u.push(enc.encode(chunk({ usage: { prompt_tokens: 1, completion_tokens: 1 } }) + chunk("not json") + chunk({ usage: { prompt_tokens: 3, completion_tokens: 9 } })));
    expect(u.tokens).toMatchObject({ input: 3, output: 9 });
    expect(u.done).toBe(false);
  });
});
